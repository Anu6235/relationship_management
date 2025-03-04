const express = require('express');
const { Member, sequelize, ParentId, ParentTable, User } = require('../models');
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


//Get all members 
router.get('/', async (req, res) => {
    try {
        const members = await Member.findAll({
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
          verified_by: isVerified ? req.user?.id : null
      };

      // Handle profile image path
      if (req.file) {
          // Prepend /images/member-images to make the path accessible from frontend
          memberData.profile_image = `/images/member-images/${req.file.filename}`;
      } else {
          memberData.profile_image = null;
      }
      
      const member = await Member.create(memberData, { transaction: t });

      // If member is married, create a pending entry in parent_table based on gender
      if (memberData.marital_status === 'married') {
          // Create a marriage record with pending status
          // This will be linked when they get married to someone
          if (member.gender === 'male') {
              await ParentTable.create({
                  husband_id: member.id,
                  wife_id: null, // Will be set when marriage is created
                  status: 'pending'
              }, { transaction: t });
          } else if (member.gender === 'female') {
              await ParentTable.create({
                  husband_id: null, // Will be set when marriage is created
                  wife_id: member.id,
                  status: 'pending'
              }, { transaction: t });
          }
      }

      await t.commit();

      // Fetch the complete member data
      const completeMember = await Member.findByPk(member.id);

      res.status(201).json({
          success: true,
          data: completeMember
      });
  } catch (error) {
      await t.rollback();
      
      // Clean up uploaded file if transaction failed
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

//Update the member with image upload
router.put('/:id', upload.single('profile_image'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        const member = await Member.findByPk(id, {
            include: [{
                model: ParentTable,
                as: 'husbandMarriages',
                where: { husband_id: sequelize.col('Member.id') },
                required: false
            }, {
                model: ParentTable,
                as: 'wifeMarriages',
                where: { wife_id: sequelize.col('Member.id') },
                required: false
            }]
        });

        if (!member) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Handle image update logic
        if (req.file) {
            // If there's an existing image, delete it
            if (member.profile_image) {
                const oldImagePath = path.join('public', member.profile_image);
                fs.unlink(oldImagePath, (err) => {
                    if (err && err.code !== 'ENOENT') console.error("Error deleting old file:", err);
                });
            }
            // Set new image path
            req.body.profile_image = `/images/member-images/${req.file.filename}`;
        } else if (req.body.remove_image === 'true') {
            req.body.profile_image = null;

            // If there's an existing image, delete it
            if (member.profile_image) {
                const oldImagePath = path.join('public', member.profile_image);
                fs.unlink(oldImagePath, (err) => {
                    if (err && err.code !== 'ENOENT') console.error("Error deleting old file:", err);
                });
            }
        }

        // Update member
        await member.update(req.body, { transaction: t });

        // Handle marital status changes
        if (req.body.marital_status === 'married') {
            // If member is now married but has no pending marriage record, create one
            const hasMarriageRecord = member.gender === 'male' 
                ? member.husbandMarriages && member.husbandMarriages.length > 0
                : member.wifeMarriages && member.wifeMarriages.length > 0;
                
            if (!hasMarriageRecord) {
                if (member.gender === 'male') {
                    await ParentTable.create({
                        husband_id: member.id,
                        wife_id: null,
                        status: 'pending'
                    }, { transaction: t });
                } else if (member.gender === 'female') {
                    await ParentTable.create({
                        husband_id: null,
                        wife_id: member.id,
                        status: 'pending'
                    }, { transaction: t });
                }
            }
        } else if (req.body.marital_status === 'single') {
            // If member is now single, remove any pending marriage records
            if (member.gender === 'male') {
                await ParentTable.destroy({
                    where: { 
                        husband_id: member.id,
                        status: 'pending'
                    },
                    transaction: t
                });
            } else if (member.gender === 'female') {
                await ParentTable.destroy({
                    where: { 
                        wife_id: member.id,
                        status: 'pending'
                    },
                    transaction: t
                });
            }
        }

        await t.commit();

        // Fetch updated member with association
        const updatedMember = await Member.findByPk(id, {
            include: [{
                model: ParentTable,
                as: 'husbandMarriages',
                where: { husband_id: sequelize.col('Member.id') },
                required: false
            }, {
                model: ParentTable,
                as: 'wifeMarriages',
                where: { wife_id: sequelize.col('Member.id') },
                required: false
            }]
        });

        res.status(200).json({
            success: true,
            data: updatedMember
        });
    } catch (error) {
        await t.rollback();
        
        // If file was uploaded but transaction failed, delete the file
        if (req.file) {
            fs.unlink(path.join('public', 'images', 'member-images', req.file.filename), (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// Delete member (with image cleanup)
router.delete('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

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
        const imagePath = path.join('public/images/member-images', member.profile_image);
        fs.unlink(imagePath, (err) => {
            if (err && !err.code === 'ENOENT') console.error("Error deleting file:", err);
        });
    }

        //Delete associated Parent ID
        await ParentId.destroy({
            where: { member_id: id },
            transaction: t
        });

        //Delete member
        await member.destroy({ transaction: t});

        await t.commit();

        res.status(200).json({
            success: true,
            message: 'Member and associated records deleted successfully'
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


//MARRIAGE MANAGEMENT ROUTES
//get list of potential spouses
router.get('/potential-spouses/:memberId', async (req, res) => {
  try {
      const member = await Member.findByPk(req.params.memberId);
      if (!member) {
          return res.status(404).json({ success: false, message: 'Member not found' });
      }

      // Find potential spouses of opposite gender who are marked as married
      // but not yet linked to anyone in a confirmed marriage
      const potentialSpouses = await Member.findAll({
          where: {
              gender: member.gender === 'male' ? 'female' : 'male',
              marital_status: 'married',
              deceased: false,
              id: {
                  [Op.notIn]: sequelize.literal(`
                      (SELECT husband_id FROM parent_table WHERE status = 'confirmed' AND husband_id IS NOT NULL
                      UNION 
                      SELECT wife_id FROM parent_table WHERE status = 'confirmed' AND wife_id IS NOT NULL)
                  `)
              }
          },
          attributes: ['id', 'first_name', 'last_name', 'gender']
      });

      res.status(200).json({ success: true, data: potentialSpouses });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server Error' });        
  }
});


// Create a new marriage
router.post('/marriage', async (req, res) => {
  const t = await sequelize.transaction();

  try {
      const { husband_id, wife_id, marriage_date, requested_by } = req.body;

      // verify both members exist and are eligible
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

      // verify gender
      if (husband.gender !== 'male' || wife.gender !== 'female') {
          await t.rollback();
          return res.status(400).json({
              success: false,
              message: 'Invalid gender combination'
          });
      }

      // Check if either member is already in a confirmed marriage
      const existingMarriage = await ParentTable.findOne({
          where: {
              [Op.or]: [
                  { husband_id, status: 'confirmed' },
                  { wife_id, status: 'confirmed' }
              ]
          }
      });

      if (existingMarriage) {
          await t.rollback();
          return res.status(400).json({
              success: false,
              message: 'One or both members are already in a confirmed marriage'
          });
      }

      // Find any pending records for husband and wife
      const [husbandPending, wifePending] = await Promise.all([
          ParentTable.findOne({
              where: { 
                  husband_id,
                  status: 'pending'
              }
          }),
          ParentTable.findOne({
              where: { 
                  wife_id,
                  status: 'pending'
              }
          })
      ]);

      // Use existing records or create new ones
      let marriage;
      if (husbandPending && wifePending) {
          // If both have pending records, use husband's and delete wife's
          await husbandPending.update({
              wife_id,
              marriage_date,
              requested_by // Store who initiated the request
          }, { transaction: t });
          
          await wifePending.destroy({ transaction: t });
          
          marriage = husbandPending;
      } else if (husbandPending) {
          // Update husband's record with wife ID
          await husbandPending.update({
              wife_id,
              marriage_date,
              requested_by
          }, { transaction: t });
          
          marriage = husbandPending;
      } else if (wifePending) {
          // Update wife's record with husband ID
          await wifePending.update({
              husband_id,
              marriage_date,
              requested_by
          }, { transaction: t });
          
          marriage = wifePending;
      } else {
          // Create new marriage record
          marriage = await ParentTable.create({
              husband_id,
              wife_id,
              marriage_date,
              status: 'pending',
              requested_by
          }, { transaction: t });
      }

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

//Confirm the marriage
router.put('/marriage/:id/confirm', async (req, res) => {
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
    
    // Verify that the responding member is part of this marriage
    // and is not the one who initiated the request
    if (
      (responding_member_id != marriage.husband_id && responding_member_id != marriage.wife_id) ||
      (responding_member_id == marriage.requested_by)
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to confirm this marriage request'
      });
    }
    
    // Update marriage status to confirmed
    await marriage.update({
      status: 'confirmed'
    }, { transaction: t });
    
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Marriage confirmed successfully',
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
    
    // Verify that the responding member is part of this marriage
    // and is not the one who initiated the request
    if (
      (responding_member_id != marriage.husband_id && responding_member_id != marriage.wife_id) ||
      (responding_member_id == marriage.requested_by)
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


//Get unmarried members
router.get('/unmarried/:gender', async (req, res) => {
  try {
    const { gender } = req.params;
    
    // Find members of the specified gender who are either:
    // - Single OR
    // - Marked as married but not linked to anyone in a confirmed marriage
    const potentialSpouses = await Member.findAll({
      where: {
        gender: gender,
        [Op.or]: [
          { marital_status: 'single' },
          {
            marital_status: 'married',
            id: {
              [Op.notIn]: sequelize.literal(`
                (SELECT husband_id FROM parent_table WHERE status = 'confirmed' AND husband_id IS NOT NULL
                UNION 
                SELECT wife_id FROM parent_table WHERE status = 'confirmed' AND wife_id IS NOT NULL)
              `)
            }
          }
        ],
        deceased: false
      },
      attributes: ['id', 'first_name', 'last_name', 'gender']
    });

    res.status(200).json({ success: true, data: potentialSpouses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });        
  }
});

// Get pending marriage requests for a specific member
router.get('/marriage-requests/:memberId', protect, async (req, res) => {
  try {
    const memberId = req.params.memberId;
    
    // Find pending marriage requests where the member is either husband or wife
    const pendingRequests = await ParentTable.findAll({
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId }
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

//Get unmarried members
router.get('/unmarried/:gender', async (req, res) => {
    try {
      const { gender } = req.params;
      
      // Find members of the specified gender who are either:
      // - Single OR
      // - Marked as married but not linked to anyone
      const potentialSpouses = await Member.findAll({
        where: {
          gender: gender,
          [Op.or]: [
            { marital_status: 'single' },
            {
              marital_status: 'married',
              id: {
                [Op.notIn]: sequelize.literal(`
                  (SELECT husband_id FROM parent_table WHERE status = 'confirmed'
                  UNION 
                  SELECT wife_id FROM parent_table WHERE status = 'confirmed')
                `)
              }
            }
          ],
          deceased: false
        },
        attributes: ['id', 'first_name', 'last_name', 'gender'],
        include: [{
          model: ParentId,
          as: 'parentId',
          attributes: ['id']
        }]
      });
  
      res.status(200).json({ success: true, data: potentialSpouses });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server Error' });        
    }
  });

  // Get pending marriage requests for a specific member
router.get('/marriage-requests/:memberId', protect, async (req, res) => {
    try {
      const memberId = req.params.memberId;
      
      // Find pending marriage requests where the member is either husband or wife
      const pendingRequests = await ParentTable.findAll({
        where: {
          [Op.or]: [
            { husband_id: memberId },
            { wife_id: memberId }
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
      
      // Find spouse (could be husband or wife)
      let spouse = null;
      const asHusband = await ParentTable.findOne({
        where: { husband_id: memberId, status: 'confirmed' },
        include: [{ model: Member, as: 'wife' }]
      });
      
      const asWife = await ParentTable.findOne({
        where: { wife_id: memberId, status: 'confirmed' },
        include: [{ model: Member, as: 'husband' }]
      });
      
      if (asHusband) {
        spouse = asHusband.wife;
        // Add marriage date to spouse
        spouse.dataValues.marriage_date = asHusband.marriage_date;
      } else if (asWife) {
        spouse = asWife.husband;
        // Add marriage date to spouse
        spouse.dataValues.marriage_date = asWife.marriage_date;
      }
      
      // Find children
      const fatherChildren = await Member.findAll({
        where: { father_id: memberId }
      });
      
      const motherChildren = await Member.findAll({
        where: { mother_id: memberId }
      });
      
      // Combine unique children
      const childrenMap = new Map();
      [...fatherChildren, ...motherChildren].forEach(child => {
        childrenMap.set(child.id, child);
      });
      
      const children = Array.from(childrenMap.values());
      
      // Find parents
      const parents = [];
      
      if (member.father_id) {
        const father = await Member.findByPk(member.father_id);
        if (father) parents.push(father);
      }
      
      if (member.mother_id) {
        const mother = await Member.findByPk(member.mother_id);
        if (mother) parents.push(mother);
      }
      
      // Get pending marriage requests if any
      const pendingMarriageRequests = [];
      if (member.gender === 'male') {
        const requests = await ParentTable.findAll({
          where: { 
            husband_id: memberId,
            status: 'pending'
          },
          include: [{ model: Member, as: 'wife' }]
        });
        
        requests.forEach(request => {
          pendingMarriageRequests.push({
            id: request.id,
            request_id: request.id,
            requester: request.wife,
            requestee_id: memberId,
            status: request.status,
            created_at: request.createdAt
          });
        });
      } else {
        const requests = await ParentTable.findAll({
          where: { 
            wife_id: memberId,
            status: 'pending'
          },
          include: [{ model: Member, as: 'husband' }]
        });
        
        requests.forEach(request => {
          pendingMarriageRequests.push({
            id: request.id,
            request_id: request.id,
            requester: request.husband,
            requestee_id: memberId,
            status: request.status,
            created_at: request.createdAt
          });
        });
      }
      
      // Add pending marriage requests to member
      member.dataValues.pending_marriage_requests = pendingMarriageRequests;
      
      // Format and return the data
      return res.json({
        success: true,
        data: {
          member,
          spouse,
          children,
          parents
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

// router to handle divorce
router.put('/marriage/:id/divorce', protect, adminOnly, async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { divorce_date } = req.body;
        if (!divorce_date) {
            throw new Error('Divorce date is required');
        }

        const marriage = await ParentTable.findByPk(req.params.id, {
            include: ['husband', 'wife']
        });

        if (!marriage || marriage.status !== 'confirmed') {
            throw new Error('Active marriage not found');
        }

        // Update marriage record
        await marriage.update({
            status: 'divorced',
            divorce_date: divorce_date
        }, { transaction: t });

        // Update both members' status
        await Promise.all([
            Member.update(
                { 
                    marital_status: 'divorced',
                    spouse_id: null 
                },
                { 
                    where: { id: marriage.husband_id },
                    transaction: t
                }
            ),
            Member.update(
                { 
                    marital_status: 'divorced',
                    spouse_id: null
                },
                { 
                    where: { id: marriage.wife_id },
                    transaction: t
                }
            )
        ]);

        await t.commit();
        res.status(200).json({
            success: true,
            message: 'Divorce recorded successfully'
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// router to handle death
router.put('/marriage/:id/death', protect, adminOnly, async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { deceased_member_id, death_date } = req.body;
        if (!deceased_member_id || !death_date) {
            throw new Error('Deceased member ID and death date are required');
        }

        const marriage = await ParentTable.findByPk(req.params.id, {
            include: ['husband', 'wife']
        });

        if (!marriage || marriage.status !== 'confirmed') {
            throw new Error('Active marriage not found');
        }

        // Verify deceased member is part of the marriage
        if (deceased_member_id !== marriage.husband_id && 
            deceased_member_id !== marriage.wife_id) {
            throw new Error('Deceased member is not part of this marriage');
        }

        // Get surviving spouse ID
        const surviving_spouse_id = deceased_member_id === marriage.husband_id 
            ? marriage.wife_id 
            : marriage.husband_id;

        // Update marriage record
        await marriage.update({
            status: 'widowed',
            death_date: death_date,
            deceased_spouse_id: deceased_member_id
        }, { transaction: t });

        // Update deceased member's status
        await Member.update(
            { 
                deceased: true,
                death_date: death_date,
                marital_status: 'deceased',
                spouse_id: null
            },
            { 
                where: { id: deceased_member_id },
                transaction: t
            }
        );

        // Update surviving spouse's status
        await Member.update(
            { 
                marital_status: 'widowed',
                spouse_id: null
            },
            { 
                where: { id: surviving_spouse_id },
                transaction: t
            }
        );

        await t.commit();
        res.status(200).json({
            success: true,
            message: 'Death recorded successfully'
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


router.get('/deceased/:gender', async (req, res) => {
  try {
    const { gender } = req.params;
    
    // Find deceased members of the specified gender
    const deceasedMembers = await Member.findAll({
      where: {
        gender: gender,
        deceased: true
      },
      attributes: ['id', 'first_name', 'last_name', 'gender', 'death_date']
    });

    res.status(200).json({ success: true, data: deceasedMembers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });        
  }
});

// Create a divorce request
router.post('/divorce', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { husband_id, wife_id, marriage_date, divorce_date } = req.body;

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

    // Find existing marriage record
    const existingMarriage = await ParentTable.findOne({
      where: {
        husband_id,
        wife_id,
        status: 'confirmed'
      },
      transaction: t
    });

    if (!existingMarriage) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'No confirmed marriage found for these members'
      });
    }

    // Create divorce record
    await existingMarriage.update({
      divorce_date,
      status: 'pending_divorce' // Using 'pending_divorce' for consistency with original code
    }, { transaction: t });

    await t.commit();
    res.status(201).json({
      success: true,
      data: existingMarriage
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

// Confirm the divorce
router.put('/divorce/:id/confirm', async (req, res) => {
  const divorceId = req.params.id;
  const confirmingMemberId = req.body.confirming_member_id;
  
  if (!divorceId || divorceId === 'undefined') {
    return res.status(400).json({
      success: false,
      message: 'Valid divorce ID is required'
    });
  }

  if (!confirmingMemberId) {
    return res.status(400).json({
      success: false,
      message: 'Member ID is required to confirm divorce'
    });
  }
  
  const t = await sequelize.transaction();

  try {
    const divorceRecord = await ParentTable.findByPk(divorceId, {
      include: [
        {
          model: Member,
          as: 'husband'
        },
        {
          model: Member,
          as: 'wife'
        }
      ]
    });

    if (!divorceRecord) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Divorce record not found'
      });
    }

    // Check if the confirming member is either husband or wife
    if (confirmingMemberId != divorceRecord.husband_id && confirmingMemberId != divorceRecord.wife_id) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only parties involved in the divorce can confirm it'
      });
    }

    if (divorceRecord.status !== 'pending_divorce') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'This record is not a pending divorce'
      });
    }

    // Update divorce status
    await divorceRecord.update({
      status: 'divorced',
      confirmed_by: confirmingMemberId,
      confirmed_at: new Date()
    }, { transaction: t });

    // Update both members' marital status
    await Promise.all([
      Member.update(
        { 
          marital_status: 'Divorced',
          spouse_id: null
        },
        {
          where: { id: divorceRecord.husband_id },
          transaction: t
        }
      ),
      Member.update(
        { 
          marital_status: 'Divorced',
          spouse_id: null
        },
        {
          where: { id: divorceRecord.wife_id },
          transaction: t
        }
      )
    ]);

    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Divorce confirmed successfully',
      confirmedBy: confirmingMemberId === divorceRecord.husband_id ? 'husband' : 'wife'
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

// Add endpoint to record widowed status
router.post('/widowed', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { living_member_id, deceased_spouse_id, marriage_date, death_date } = req.body;
    
    // Verify both members exist
    const [livingMember, deceasedSpouse] = await Promise.all([
      Member.findByPk(living_member_id),
      Member.findByPk(deceased_spouse_id)
    ]);

    if (!livingMember || !deceasedSpouse) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'One or both members not found'
      });
    }

    // Verify the deceased spouse is actually marked as deceased
    if (!deceasedSpouse.deceased) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'The spouse must be marked as deceased to record a widowed status'
      });
    }

    // Determine husband_id and wife_id based on gender
    const husbandId = livingMember.gender === 'male' ? living_member_id : deceased_spouse_id;
    const wifeId = livingMember.gender === 'female' ? living_member_id : deceased_spouse_id;
    
    // Check if there's an existing marriage record
    let marriageRecord = await ParentTable.findOne({
      where: {
        husband_id: husbandId, 
        wife_id: wifeId
      }
    });
    
    // If no existing marriage record, create one
    if (!marriageRecord) {
      // Create marriage record
      marriageRecord = await ParentTable.create({
        husband_id: husbandId,
        wife_id: wifeId,
        marriage_date,
        status: 'widowed',
        death_date,
        deceased_spouse_id
      }, { transaction: t });
    } else {
      // Update existing marriage record
      await marriageRecord.update({
        status: 'widowed',
        death_date,
        deceased_spouse_id
      }, { transaction: t });
    }
    
    // Update living member's status
    await livingMember.update({
      marital_status: 'Widowed',
      spouse_id: deceased_spouse_id
    }, { transaction: t });
    
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Widowed status recorded successfully',
      data: marriageRecord
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

// Add a route to get pending divorce requests for a member
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
        status: 'pending_divorce'
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

module.exports = router;