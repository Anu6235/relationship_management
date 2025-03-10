const express = require('express');
const { Member, sequelize, ParentId, ParentTable, User, MemberParentTable } = require('../models');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { Op, where } = require('sequelize');
const { v4: uuidv4 } = require('uuid'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { profile } = require('console');
const router = express.Router();

//MEMBER MANAGEMENT ROUTES

//Admin verification
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
    try {
        const memberId = req.params.id;
        const userId = req.user.id;

        // Get current user (verifier) info first
        const currentUser = await User.findByPk(userId, {
            attributes: ['id', 'username']
        });

        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'Verifier not found'
            });
        }

        // Find and update the member
        const member = await Member.findByPk(memberId);
        
        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Update member verification details
        await member.update({
            is_verified: true,
            verified_by: userId,
            verified_at: new Date()
        });

        // Fetch updated member with verifier info
        const updatedMember = await Member.findByPk(memberId, {
            include: [{
                model: User,
                as: 'verifier',
                attributes: ['id', 'username']
            }]
        });

        // Explicitly structure the response
        const response = {
            ...updatedMember.get({ plain: true }),
            verifier: {
                id: currentUser.id,
                username: currentUser.username
            }
        };

        res.status(200).json({
            success: true,
            data: response
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Set up multer storage for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = 'public/images/member-images';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        cb(null, `member-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // limit to 5MB
    },
    fileFilter: fileFilter
});

router.use(protect);
router.use(adminOnly);


// Get all members (with optional gender filter)
router.get('/', async (req, res) => {
  try {
      const { gender } = req.query; // Extract gender query parameter

      const whereCondition = gender ? { gender } : {}; // Filter only if gender is provided

      const members = await Member.findAll({
          where: whereCondition, // Apply the condition dynamically
          include: [
              {
                  model: User,
                  as: 'verifier',
                  attributes: ['id', 'username']
              }
          ]
      });

      res.status(200).json({
          success: true,
          data: members
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({
          success: false,
          message: 'Server Error'
      });
  }
});



//Get single member
router.get('/:id', async (req, res) => {
    try {
        const member = await Member.findByPk(req.params.id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.status(200).json({
            success: true,
            data: member
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.member
        });
    }
});


// Create a new member with image upload
router.post('/', upload.single('profile_image'), async (req, res) => {
  const t = await sequelize.transaction();

  try {
      console.log("Request Body:", req.body);
      
      // Handle is_verified and related fields
      let isVerified = false;
      if (typeof req.body.is_verified === 'string') {
          isVerified = req.body.is_verified.toLowerCase() === 'yes' || req.body.is_verified.toLowerCase() === 'true';
      } else if (typeof req.body.is_verified === 'boolean') {
          isVerified = req.body.is_verified;
      }

      const memberData = {
          ...req.body,
          is_verified: isVerified,
          verified_at: isVerified ? new Date() : null,
          verified_by: isVerified ? req.user?.id : null,
          parent_id: null // No marriage handling here
      };

      // Handle profile image path
      if (req.file) {
          memberData.profile_image = `/images/member-images/${req.file.filename}`;
      } else {
          memberData.profile_image = null;
      }
      
      const member = await Member.create(memberData, { transaction: t });

      await t.commit();

      // Fetch the complete member data
      const completeMember = await Member.findByPk(member.id);

      res.status(201).json({
          success: true,
          data: completeMember
      });
  } catch (error) {
      await t.rollback();
      
      if (req.file) {
          fs.unlink(path.join('public/images/member-images', req.file.filename), (err) => {
              if (err) console.error("Error deleting file:", err);
          });
      }
      
      console.error("Database Error:", error); 
      res.status(500).json({
          success: false,
          message: error.message
      });
  }
});


// Update the member with image upload - needs to handle parent_id
router.put('/:id', upload.single('profile_image'), async (req, res) => {
  const t = await sequelize.transaction();

  try {
      const member = await Member.findByPk(req.params.id);
      if (!member) {
          await t.rollback();
          return res.status(404).json({
              success: false,
              message: 'Member not found'
          });
      }

      console.log("Update Request Body:", req.body);

      // Handle is_verified and related fields
      let isVerified = member.is_verified; // Default to existing value
      if (typeof req.body.is_verified === 'string') {
          isVerified = req.body.is_verified.toLowerCase() === 'yes' || req.body.is_verified.toLowerCase() === 'true';
      } else if (typeof req.body.is_verified === 'boolean') {
          isVerified = req.body.is_verified;
      }

      const updatedData = {
          ...req.body,
          is_verified: isVerified,
          verified_at: isVerified ? new Date() : member.verified_at,
          verified_by: isVerified ? req.user?.id : member.verified_by
      };

      // Handle profile image update
      if (req.file) {
          updatedData.profile_image = `/images/member-images/${req.file.filename}`;
          if (member.profile_image) {
              fs.unlink(path.join('public', member.profile_image), (err) => {
                  if (err) console.error("Error deleting old profile image:", err);
              });
          }
      }

      await member.update(updatedData, { transaction: t });
      await t.commit();

      res.status(200).json({
          success: true,
          data: member
      });

  } catch (error) {
      await t.rollback();
      
      if (req.file) {
          fs.unlink(path.join('public/images/member-images', req.file.filename), (err) => {
              if (err) console.error("Error deleting uploaded file:", err);
          });
      }

      console.error("Database Error:", error);
      res.status(500).json({
          success: false,
          message: error.message
      });
  }
});



// Delete member (with complete relationship cleanup)
router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
      const { id } = req.params;

      // First find the member without eager loading
      const member = await Member.findByPk(id);

      if (!member) {
          await t.rollback();
          return res.status(404).json({
              success: false,
              message: 'Member not found'
          });
      }

      // Delete associated image if exists
      if (member.profile_image) {
          const imagePath = path.join('public', member.profile_image);
          fs.unlink(imagePath, (err) => {
              if (err && err.code !== 'ENOENT') console.error("Error deleting file:", err);
          });
      }

      // Find marriages where this member is husband or wife
      const husbandMarriages = await sequelize.models.ParentTable.findAll({
          where: { husband_id: id },
          transaction: t
      });
      
      const wifeMarriages = await sequelize.models.ParentTable.findAll({
          where: { wife_id: id },
          transaction: t
      });

      // Handle MemberParentTable junction records
      await sequelize.models.MemberParentTable.destroy({
          where: {
              [Op.or]: [
                  { child_id: id },
                  { parent_id: id }
              ]
          },
          transaction: t
      });

      // Handle husband marriages
      for (const marriage of husbandMarriages) {
          if (marriage.wife_id) {
              const wife = await Member.findByPk(marriage.wife_id);
              if (wife) {
                  // Update wife's parent_id to remove this marriage
                  const wifeParentIds = wife.parent_id ? 
                      wife.parent_id.split(',').map(Number).filter(pid => pid !== marriage.id) : 
                      [];
                  
                  await wife.update({ 
                      parent_id: wifeParentIds.length > 0 ? wifeParentIds.join(',') : null,
                      marital_status: wifeParentIds.length > 0 ? wife.marital_status : 'single'
                  }, { transaction: t });
              }
          }
          // Delete the marriage record
          await marriage.destroy({ transaction: t });
      }

      // Handle wife marriages
      for (const marriage of wifeMarriages) {
          if (marriage.husband_id) {
              const husband = await Member.findByPk(marriage.husband_id);
              if (husband) {
                  // Update husband's parent_id to remove this marriage
                  const husbandParentIds = husband.parent_id ? 
                      husband.parent_id.split(',').map(Number).filter(pid => pid !== marriage.id) : 
                      [];
                  
                  await husband.update({ 
                      parent_id: husbandParentIds.length > 0 ? husbandParentIds.join(',') : null,
                      marital_status: husbandParentIds.length > 0 ? husband.marital_status : 'single'
                  }, { transaction: t });
              }
          }
          // Delete the marriage record
          await marriage.destroy({ transaction: t });
      }

      // Now delete the member
      await member.destroy({ transaction: t });

      await t.commit();

      res.status(200).json({
          success: true,
          message: 'Member and associated records deleted successfully'
      });
  } catch (error) {
      await t.rollback();
      console.error('Delete member error:', error); // Log the full error
      res.status(500).json({
          success: false,
          message: error.message
      });
  }
});


//MARRIAGE ROUTES
// Create a new marriage
router.post('/marriage', async (req, res) => {
  const t = await sequelize.transaction();

  try {
      const { husband_id, wife_id, marriage_date, requested_by } = req.body;

      // Verify both members exist
      const [husband, wife] = await Promise.all([
          Member.findByPk(husband_id),
          Member.findByPk(wife_id)
      ]);

      if (!husband || !wife) {
          await t.rollback();
          return res.status(404).json({
              success: false,
              message: 'One or both members not found'
          });
      }

      // Verify gender
      if (husband.gender !== 'male' || wife.gender !== 'female') {
          await t.rollback();
          return res.status(400).json({
              success: false,
              message: 'Invalid gender combination'
          });
      }

      // Check if the same husband and wife have already married before
      const existingMarriage = await ParentTable.findOne({
          where: {
              husband_id,
              wife_id
          }
      });

      if (existingMarriage) {
          await t.rollback();
          return res.status(400).json({
              success: false,
              message: 'This couple is already married and cannot remarry'
          });
      }

      // Create a new marriage record
      const marriage = await ParentTable.create(
          { husband_id, wife_id, marriage_date, status: 'pending', requested_by },
          { transaction: t }
      );

      // Update the parent_id in the members table
      await Promise.all([
          husband.update({ parent_id: marriage.id }, { transaction: t }),
          wife.update({ parent_id: marriage.id }, { transaction: t })
      ]);

      await t.commit();
      res.status(201).json({
          success: true,
          data: marriage
      });

  } catch (error) {
      await t.rollback();
      console.error(error);
      res.status(500).json({
          success: false,
          message: error.message
      });
  }
});

// Confirm the marriage and update parent_id
router.put("/marriage/:id/confirm", async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params; // Marriage ID (ParentTable ID)
    const { responding_member_id } = req.body;

    // Find the pending marriage in the ParentTable
    const marriage = await ParentTable.findOne({
      where: {
        id,
        status: "pending",
      },
      transaction: t
    });

    if (!marriage) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Pending marriage request not found",
      });
    }

    console.log(marriage.husband_id,'marriage.husband_id')
    console.log(marriage.wife_id,'marriage.wife_id')
    console.log(marriage.requested_by,'marriage.requested_by')
    console.log(responding_member_id,'responding_member_id')

    // Fixed authorization check:
    // 1. Responding member must be part of the marriage (husband or wife)
    // 2. If there is a requester, the responding member should not be the requester
    if (
      (responding_member_id != marriage.husband_id && responding_member_id != marriage.wife_id) || 
      (marriage.requested_by && responding_member_id == marriage.requested_by)
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "You are not authorized to confirm this marriage request",
      });
    }

    // Check if there's already an active marriage for each party
    // and make it no longer current if it exists
    await ParentTable.update(
      { is_current: false },
      { 
        where: {
          [Op.or]: [
            { husband_id: marriage.husband_id, is_current: true, status: 'confirmed' },
            { wife_id: marriage.wife_id, is_current: true, status: 'confirmed' }
          ]
        },
        transaction: t 
      }
    );

    // Confirm the marriage: update ParentTable
    await marriage.update(
      {
        status: "confirmed",
        is_current: true
      },
      { transaction: t }
    );

    // Get the husband and wife members
    const husband = await Member.findByPk(marriage.husband_id, { transaction: t });
    const wife = await Member.findByPk(marriage.wife_id, { transaction: t });

    if (!husband || !wife) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "One or both members of this marriage could not be found",
      });
    }

    // Update parent_id for husband using the helper method
    husband.addParentId(id);
    await husband.update({ 
      parent_id: husband.parent_id,
      marital_status: 'married' 
    }, { transaction: t });

    // Update parent_id for wife using the helper method
    wife.addParentId(id);
    await wife.update({ 
      parent_id: wife.parent_id,
      marital_status: 'married' 
    }, { transaction: t });

    await t.commit();
    res.status(200).json({
      success: true,
      message: "Marriage confirmed successfully, parent_id updated for both members",
      data: marriage,
    });

  } catch (error) {
    await t.rollback();
    console.error("Marriage confirmation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred while confirming the marriage",
    });
  }
});

// Decline a marriage request
router.put('/marriage/:id/decline', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { responding_member_id } = req.body;
    
    // Find the pending marriage
    const marriage = await ParentTable.findOne({
      where: { 
        id,
        status: 'pending'
      }
    });
    
    if (!marriage) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending marriage request not found'
      });
    }
    
    // Fixed authorization check
    if (
      (responding_member_id != marriage.husband_id && responding_member_id != marriage.wife_id) ||
      (marriage.requested_by && responding_member_id == marriage.requested_by)
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to decline this marriage request'
      });
    }
    
    // Delete the marriage record
    await marriage.destroy({ transaction: t });
    
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Marriage request declined successfully'
    });
    
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// Get pending marriage requests for a specific member
router.get('/marriage-requests/:memberId', protect, async (req, res) => {
  try {
    const memberId = req.params.memberId;
    
    // Find pending marriage requests where the member is either husband or wife
    const pendingRequests = await ParentTable.findAll({
      attributes: ['id', 'status', 'husband_id', 'wife_id', 'requested_by', 'marriage_date'],
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId },
          // {id : id}
        ],
        status: 'pending'
      },
      include: [
        {
          model: Member,
          as: 'husband',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
        },
        {
          model: Member,
          as: 'wife',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
        }
      ]
    });
    console.log(pendingRequests,'pendingRequests')
    
    res.status(200).json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    console.error('Error fetching marriage requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// Get all relationships for a member
router.get('/:id/relationships', async (req, res) => {
  try {
    const memberId = parseInt(req.params.id);
    
    // Get the member with their details
    const member = await Member.findByPk(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // 1. SPOUSE RELATIONSHIPS
    
    // Get all marriages (current, divorced, widowed)
    const marriageRecords = await ParentTable.findAll({
      where: { 
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId }
        ],
        status: { [Op.in]: ['confirmed', 'divorced', 'widowed'] }
      },
      include: [
        { model: Member, as: 'husband', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender', 'deceased'] },
        { model: Member, as: 'wife', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender', 'deceased'] }
      ]
    });
    
    // Process each marriage to categorize spouses
    const currentSpouse = [];
    const divorcedSpouses = [];
    const widowedSpouses = [];
    const marriages = [];
    
    for (const marriage of marriageRecords) {
      marriages.push(marriage);
      
      let spouse;
      if (marriage.husband_id === memberId) {
        spouse = marriage.wife;
      } else {
        spouse = marriage.husband;
      }
      
      // Skip if spouse not found
      if (!spouse) continue;
      
      // Add marriage info to spouse data
      spouse.dataValues.marriage_date = marriage.marriage_date || marriage.createdAt;
      spouse.dataValues.marriage_id = marriage.id;
      spouse.dataValues.is_current = marriage.is_current;
      spouse.dataValues.relationship_status = marriage.status;
      
      // Categorize by relationship status
      if (marriage.status === 'confirmed' && marriage.is_current) {
        currentSpouse.push(spouse);
      } else if (marriage.status === 'divorced') {
        spouse.dataValues.divorce_date = marriage.divorce_date;
        divorcedSpouses.push(spouse);
      } else if (marriage.status === 'widowed') {
        spouse.dataValues.death_date = marriage.death_date;
        widowedSpouses.push(spouse);
      }
    }
    
    // 2. PENDING SPOUSE RELATIONSHIPS
    
    const pendingMarriageRequests = await ParentTable.findAll({
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId }
        ],
        status: 'pending'
      },
      include: [
        { model: Member, as: 'husband', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender'] },
        { model: Member, as: 'wife', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender'] }
      ]
    });
    
    // Format pending spouse requests
    const pendingSpouses = pendingMarriageRequests.map(request => {
      const isRequester = request.requested_by === memberId;
      const potentialSpouse = request.husband_id === memberId ? request.wife : request.husband;
      
      if (!potentialSpouse) return null;
      
      potentialSpouse.dataValues.request_id = request.id;
      potentialSpouse.dataValues.is_outgoing = isRequester;
      potentialSpouse.dataValues.created_at = request.createdAt;
      potentialSpouse.dataValues.relationship_status = 'pending';
      
      return potentialSpouse;
    }).filter(Boolean);

    // 3. CHILDREN RELATIONSHIPS
    // Instead of using a non-existing table, we'll derive child relationships from the ParentTable
    const childrenData = [];
    
    // Check if MemberParentTable exists
    let memberParentTableExists = false;
    try {
      await sequelize.query('SELECT 1 FROM member_parent_table LIMIT 1');
      memberParentTableExists = true;
    } catch (e) {
      // Table doesn't exist
    }
    
    if (memberParentTableExists) {
      // If the table exists, use it
      const children = await sequelize.query(`
        SELECT m.id, m.first_name, m.last_name, m.profile_image, m.gender, 
               m.dob, m.deceased, m.marital_status, mpt.status as relationship_status,
               IFNULL(mpt.relationship_type, 'biological') as relationship_type
        FROM members m
        JOIN member_parent_table mpt ON m.id = mpt.child_id
        WHERE mpt.parent_id = :memberId
      `, {
        replacements: { memberId },
        type: sequelize.QueryTypes.SELECT
      });
      
      childrenData.push(...children);
    } else {
      // Derive children from ParentTable
      // This is a temporary solution until MemberParentTable exists
      
      // For male members, find children through marriages
      if (member.gender === 'male') {
        const husbandMarriages = await ParentTable.findAll({
          where: { 
            husband_id: memberId,
            status: 'confirmed'
          },
          include: [{
            model: Member,
            as: 'wife',
            attributes: ['id']
          }]
        });
        
        // Find children who have marriages with their mothers
        for (const marriage of husbandMarriages) {
          if (!marriage.wife) continue;
          
          // Assume members who are 18+ years younger than the marriage date are children
          const potentialChildren = await Member.findAll({
            where: {
              dob: {
                [Op.gte]: sequelize.literal(`DATE_SUB(${marriage.marriage_date ? `'${marriage.marriage_date.toISOString()}'` : 'NOW()'}, INTERVAL 18 YEAR)`)
              }
            },
            attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
          });
          
          // Add to children with derived relationship status
          for (const child of potentialChildren) {
            child.dataValues.relationship_status = 'confirmed';
            child.dataValues.relationship_type = 'biological';
            childrenData.push(child);
          }
        }
      }
      
      // For female members, similar approach
      if (member.gender === 'female') {
        const wifeMarriages = await ParentTable.findAll({
          where: { 
            wife_id: memberId,
            status: 'confirmed'
          },
          include: [{
            model: Member,
            as: 'husband',
            attributes: ['id']
          }]
        });
        
        // Similar logic as above
        for (const marriage of wifeMarriages) {
          // Similar code as for male members
          if (!marriage.husband) continue;
          
          const potentialChildren = await Member.findAll({
            where: {
              dob: {
                [Op.gte]: sequelize.literal(`DATE_SUB(${marriage.marriage_date ? `'${marriage.marriage_date.toISOString()}'` : 'NOW()'}, INTERVAL 18 YEAR)`)
              }
            },
            attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
          });
          
          for (const child of potentialChildren) {
            child.dataValues.relationship_status = 'confirmed';
            child.dataValues.relationship_type = 'biological';
            childrenData.push(child);
          }
        }
      }
    }
    
    // 4. PARENT RELATIONSHIPS
    // Similar approach as with children
    const parentsData = [];
    
    if (memberParentTableExists) {
      // If the table exists, use it
      const parents = await sequelize.query(`
        SELECT m.id, m.first_name, m.last_name, m.profile_image, m.gender, 
               m.dob, m.deceased, m.marital_status, mpt.status as relationship_status,
               IFNULL(mpt.relationship_type, 'biological') as relationship_type
        FROM members m
        JOIN member_parent_table mpt ON m.id = mpt.parent_id
        WHERE mpt.child_id = :memberId
      `, {
        replacements: { memberId },
        type: sequelize.QueryTypes.SELECT
      });
      
      parentsData.push(...parents);
    } else {
      // Use the parent_id field from members table
      if (member.parent_id) {
        const parentIds = member.getParentIds();
        
        // Fetch all parent marriages
        const parentMarriages = await ParentTable.findAll({
          where: { 
            id: { [Op.in]: parentIds },
            status: 'confirmed'
          },
          include: [
            { model: Member, as: 'husband', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status'] },
            { model: Member, as: 'wife', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status'] }
          ]
        });
        
        // Add both parents from each marriage
        for (const marriage of parentMarriages) {
          if (marriage.husband) {
            const father = marriage.husband;
            father.dataValues.relationship_status = 'confirmed';
            father.dataValues.relationship_type = 'biological';
            parentsData.push(father);
          }
          
          if (marriage.wife) {
            const mother = marriage.wife;
            mother.dataValues.relationship_status = 'confirmed';
            mother.dataValues.relationship_type = 'biological';
            parentsData.push(mother);
          }
        }
      }
    }
    
    // Return comprehensive relationship data
    return res.json({
      success: true,
      data: {
        member: {
          ...member.dataValues,
          marital_relationship_status: member.marital_status
        },
        relationships: {
          spouse: currentSpouse[0] || null, 
          divorced_spouses: divorcedSpouses,
          widowed_spouses: widowedSpouses,
          pending_spouses: pendingSpouses,
          children: childrenData,
          parents: parentsData,
          marriages: marriages.map(marriage => ({
            ...marriage.dataValues,
            relationship_status: marriage.status
          }))
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});


// ============== DIVORCE ROUTES ==============

// Create divorce request for existing marriage
router.post('/divorce/existing', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { marriage_id, divorce_date, requested_by } = req.body;

    // Find the existing marriage
    const existingMarriage = await ParentTable.findOne({
      where: {
        id: marriage_id,
        status: 'confirmed'
      },
      transaction: t
    });

    if (!existingMarriage) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Confirmed marriage record not found'
      });
    }

    // Update to pending divorce
    const divorce = await existingMarriage.update({
      status: 'pending divorce',
      divorce_date,
      requested_by
    }, { transaction: t });

    await t.commit();
    res.status(200).json({
      success: true,
      data: divorce
    });

  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create divorce request for marriage not in system
router.post('/divorce/new', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { husband_id, wife_id, marriage_date, divorce_date, requested_by } = req.body;

    if (!marriage_date) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Marriage date is required for new divorce entries'
      });
    }

    // Verify both members exist
    const [husband, wife] = await Promise.all([
      Member.findByPk(husband_id, { transaction: t }),
      Member.findByPk(wife_id, { transaction: t })
    ]);

    if (!husband || !wife) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'One or both members not found'
      });
    }

    // Verify gender - keeping consistent with marriage route
    if (husband.gender !== 'male' || wife.gender !== 'female') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid gender combination'
      });
    }

    // Check if any marriage record exists between these members
    const existingMarriage = await ParentTable.findOne({
      where: {
        husband_id,
        wife_id
      },
      transaction: t
    });

    if (existingMarriage) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'A marriage record already exists for this couple. Use /divorce/existing endpoint instead.'
      });
    }

    // Create new parent table entry with pending divorce status
    const divorce = await ParentTable.create(
      {
        husband_id,
        wife_id,
        marriage_date,
        divorce_date,
        status: 'pending divorce',
        requested_by,
        is_current: true
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({
      success: true,
      data: divorce
    });

  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Confirm divorce request
router.put('/divorce/:id/confirm', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { responding_member_id, marriage_date } = req.body;

    // Find the pending divorce
    const divorce = await ParentTable.findOne({
      where: {
        id,
        status: 'pending divorce'
      },
      transaction: t
    });

    if (!divorce) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending divorce request not found'
      });
    }

    // Ensure the responding member is part of this marriage but not the initiator
    if (
      (responding_member_id != divorce.husband_id && responding_member_id != divorce.wife_id) ||
      responding_member_id != divorce.requested_by
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to confirm this divorce request'
      });
    }

    // If this is a new entry without marriage date, update it
    if (!divorce.marriage_date && marriage_date) {
      await divorce.update({ marriage_date }, { transaction: t });
    } else if (!divorce.marriage_date && !marriage_date) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Marriage date is required to confirm this divorce'
      });
    }

    // Confirm the divorce
    await divorce.update(
      {
        status: 'divorced',
        is_current: false
      },
      { transaction: t }
    );

    // Get the husband and wife members
    const [husband, wife] = await Promise.all([
      Member.findByPk(divorce.husband_id, { transaction: t }),
      Member.findByPk(divorce.wife_id, { transaction: t })
    ]);

    if (!husband || !wife) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'One or both members of this marriage could not be found'
      });
    }

    // Update parent_id for both members
    husband.addParentId(id);
    wife.addParentId(id);

    // Update marital status
    await Promise.all([
      husband.update({
        parent_id: husband.parent_id,
        marital_status: 'divorced'
      }, { transaction: t }),
      wife.update({
        parent_id: wife.parent_id,
        marital_status: 'divorced'
      }, { transaction: t })
    ]);

    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Divorce confirmed successfully, marital status updated for both members',
      data: divorce
    });

  } catch (error) {
    await t.rollback();
    console.error('Divorce confirmation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while confirming the divorce'
    });
  }
});

// Decline divorce request
router.put('/divorce/:id/decline', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { responding_member_id } = req.body;

    // Find the pending divorce
    const divorceRequest = await ParentTable.findOne({
      where: {
        id,
        status: 'pending divorce'
      },
      transaction: t
    });

    if (!divorceRequest) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending divorce request not found'
      });
    }

    // Verify that the responding member is part of this marriage and not the initiator
    if (
      (responding_member_id != divorceRequest.husband_id && responding_member_id != divorceRequest.wife_id) ||
      responding_member_id != divorceRequest.requested_by
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to decline this divorce request'
      });
    }

    // Check if this was a modification to an existing marriage or a new entry
    const wasExistingRecord = await ParentTable.findOne({
      where: {
        id: divorceRequest.id,
        status: { [Op.ne]: 'pending divorce' }
      },
      paranoid: true,
      transaction: t
    });

    if (wasExistingRecord) {
      // This was an update to an existing marriage, revert to 'confirmed'
      await divorceRequest.update({
        status: 'confirmed',
        divorce_date: null
      }, { transaction: t });
    } else {
      // This was a new entry, delete it
      await divorceRequest.destroy({ transaction: t });
    }

    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Divorce request declined successfully'
    });

  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


router.get('/get_marriage/spouses', async (req, res) => {
  try {
    // Get husband_id and wife_id from query parameters
    const husbandId = req.query.husband_id;
    const wifeId = req.query.wife_id;
    
    // Validate that both IDs are provided
    if (!husbandId || !wifeId) {
      return res.status(400).json({
        success: false,
        message: 'Both husband_id and wife_id are required as query parameters'
      });
    }
    
    // Find the marriage record that matches both husband and wife IDs
    const marriage = await ParentTable.findOne({
      where: {
        husband_id: husbandId,
        wife_id: wifeId
      },
      include: [
        {
          model: Member,
          as: 'husband',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
        },
        {
          model: Member,
          as: 'wife',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
        }
      ]
    });
    
    if (!marriage) {
      return res.status(404).json({
        success: false,
        message: 'No marriage record found for the provided husband and wife IDs'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: marriage.id,
        husband: marriage.husband,
        wife: marriage.wife,
        status: marriage.status,
        marriage_date: marriage.marriage_date,
        requested_by: marriage.requested_by,
        is_current: marriage.is_current
      }
    });
    
  } catch (error) {
    console.error('Error fetching marriage data:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// Get pending divorce requests for a specific member
router.get('/divorce-requests/:memberId', protect, async (req, res) => {
  try {
    const memberId = req.params.memberId;
    
    // Find pending divorce requests where the member is either husband or wife
    const pendingRequests = await ParentTable.findAll({
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId }
        ],
        status: 'pending divorce'
      },
      include: [
        {
          model: Member,
          as: 'husband',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
        },
        {
          model: Member,
          as: 'wife',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    console.error('Error fetching divorce requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});


// Handle widowed status
router.post('/marriage/:id/widowed', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { deceased_spouse_id, death_date } = req.body;
    
    // Find the confirmed marriage
    const marriage = await ParentTable.findOne({
      where: { 
        id,
        status: 'confirmed'
      },
      include: [
        { model: Member, as: 'husband' },
        { model: Member, as: 'wife' }
      ]
    });
    
    if (!marriage) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Confirmed marriage not found'
      });
    }
    
    // Validate that deceased_spouse_id is part of this marriage
    if (deceased_spouse_id != marriage.husband_id && deceased_spouse_id != marriage.wife_id) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Deceased spouse ID must match husband or wife in this marriage'
      });
    }
    
    // Get surviving spouse ID
    const survivingSpouseId = deceased_spouse_id == marriage.husband_id ? 
      marriage.wife_id : marriage.husband_id;
    
    // Update marriage status to widowed
    await marriage.update({
      status: 'widowed',
      death_date: death_date || new Date(),
      deceased_spouse_id,
      is_current: false
    }, { transaction: t });
    
    // Update deceased member status
    await Member.update(
      { 
        deceased: true,
        marital_status: 'widowed'
      },
      { 
        where: { id: deceased_spouse_id },
        transaction: t 
      }
    );
    
    // Update surviving spouse marital status
    await Member.update(
      { marital_status: 'widowed' },
      { 
        where: { id: survivingSpouseId },
        transaction: t 
      }
    );
    
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Widowed status recorded successfully',
      data: marriage
    });
    
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

//Handle deceased
router.put('/members/:id/mark-deceased', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { death_date } = req.body;
    
    const member = await Member.findByPk(id);
    
    if (!member) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Mark member as deceased
    await member.update({
      deceased: true,
      marital_status: member.marital_status === 'married' ? 'widowed' : member.marital_status
    }, { transaction: t });
    
    // Find all active marriages where this member is a spouse
    const marriages = await ParentTable.findAll({
      where: {
        [Op.or]: [
          { husband_id: id, status: 'confirmed' },
          { wife_id: id, status: 'confirmed' }
        ]
      }
    });
    
    // Update each marriage and surviving spouse
    for (const marriage of marriages) {
      // Determine surviving spouse
      const survivingSpouseId = marriage.husband_id == id ? 
        marriage.wife_id : marriage.husband_id;
      
      // Update marriage
      await marriage.update({
        status: 'widowed',
        death_date: death_date || new Date(),
        deceased_spouse_id: id,
        is_current: false
      }, { transaction: t });
      
      // Update surviving spouse status
      await Member.update(
        { marital_status: 'widowed' },
        { 
          where: { id: survivingSpouseId },
          transaction: t 
        }
      );
    }
    
    await t.commit();
    
    res.status(200).json({
      success: true,
      message: 'Member marked as deceased and all marriages updated',
      data: {
        member,
        affected_marriages: marriages.length
      }
    });
    
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add route to get member with all marriage history
router.get('/:id/marriages', async (req, res) => {
  try {
    const { id } = req.params;
    
    const member = await Member.findByPk(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Get all marriages from parent_id array
    const parentIds = member.parent_id;
    
    let marriages = [];
    if (parentIds && parentIds.length > 0) {
      marriages = await ParentTable.findAll({
        where: { 
          id: {
            [Op.in]: parentIds
          }
        },
        include: [
          {
            model: Member,
            as: 'husband',
            attributes: ['id', 'first_name', 'last_name', 'profile_image', 'deceased']
          },
          {
            model: Member,
            as: 'wife',
            attributes: ['id', 'first_name', 'last_name', 'profile_image', 'deceased']
          },
          {
            model: Member,
            as: 'deceasedSpouse',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    }
    
    // Get current marriage
    const currentMarriage = marriages.find(m => m.is_current) || null;
    
    res.status(200).json({
      success: true,
      data: {
        member,
        marriages,
        current_marriage: currentMarriage
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


router.get('/get_wife/:id', protect, async (req, res) => {
  try {
    const husbandId = req.params.id;
    
    // Find the current marriage where the given ID is the husband
    const marriage = await ParentTable.findOne({
      where: {
        husband_id: husbandId,
        is_current: true,
        status: {
          [Op.in]: ['pending', 'confirmed'] // Only get active marriages
        }
      },
      include: [
        {
          model: Member,
          as: 'wife',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
          // Add any other wife attributes you need
        }
      ]
    });
    
    if (!marriage || !marriage.wife) {
      return res.status(404).json({
        success: false,
        message: 'No wife found for this husband'
      });
    }
    
    res.status(200).json({
      success: true,
      data: marriage.wife
    });
    
  } catch (error) {
    console.error('Error fetching wife data:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

module.exports = router;