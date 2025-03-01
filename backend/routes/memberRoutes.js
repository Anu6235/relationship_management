const express = require('express');
const { Member, sequelize, ParentId, Marriage, User } = require('../models');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { Op, where } = require('sequelize');
const { v4: uuidv4 } = require('uuid'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { profile } = require('console');

const router = express.Router();

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
                    model: ParentId,
                    as: 'parentId',
                    attributes: ['parent_id']
                },
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
        const member = await Member.findByPk(req.params.id, {
            include: [{
                model: ParentId,
                as: 'parentId',
                attributes: ['parent_id']
            }]
        });

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

//Update the member with image upload
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

        // Handle marriage status and parent ID
        if (memberData.marital_status.toLowerCase() === 'married') {
            await ParentId.create({
                member_id: member.id,
                parent_id: `${member.gender.toUpperCase()}_${uuidv4()}`,
                gender: member.gender
            }, { transaction: t });
        }

        await t.commit();

        // Fetch the complete member data with associations
        const completeMember = await Member.findByPk(member.id, {
            include: [{
                model: ParentId,
                as: 'parentId',
                attributes: ['parent_id']
            }]
        });

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

router.put('/:id', upload.single('profile_image'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        const member = await Member.findByPk(id, {
            include: [{
                model: ParentId,
                as: 'parentId',
                attributes: ['parent_id']
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

        // Handle Parent ID changes based on marital status
        if (req.body.marital_status === 'married' && !member.parentId) {
            await ParentId.create({
                member_id: member.id,
                parent_id: `${member.gender.toUpperCase()}_${uuidv4()}`,
                gender: member.gender
            }, { transaction: t });
        } else if (req.body.marital_status === 'single' && member.parentId) {
            await ParentId.destroy({
                where: { member_id: member.id },
                transaction: t
            });
        }

        await t.commit();

        // Fetch updated member with association
        const updatedMember = await Member.findByPk(id, {
            include: [{
                model: ParentId,
                as: 'parentId',
                attributes: ['parent_id']
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


router.get('/potential-spouses/:memberId', async (req, res) => {
    // Existing code for potential spouses
    try {
        const member = await Member.findByPk(req.params.memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        // Find potential spouses of opposite gender who are marked as married
        // but not yet linked to anyone
        const potentialSpouses = await Member.findAll({
            where: {
                gender: member.gender === 'male' ? 'female' : 'male',
                marital_status: 'married',
                deceased: false,
                id: {
                    [Op.notIn]: sequelize.literal(`
                        (SELECT husband_id FROM marriages WHERE status = 'confirmed'
                        UNION 
                        SELECT wife_id FROM marriages WHERE status = 'confirmed')
                        `)
                }
            },
            attributes: ['id', 'first_name', 'last_name', 'gender'],
            include: [{
                model: ParentId,
                as: 'parentId',
                attributes: ['parent_id']
            }]
        });

        res.status(200).json({ success: true, data: potentialSpouses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });        
    }
});

router.post('/marriage', async (req, res) => {
    // Existing code for marriage creation
    const t = await sequelize.transaction();

    try {
        const { husband_id, wife_id, marriage_date } = req.body;

        //verfiy both members exist and are eligible
        const [ husband, wife] = await Promise.all([
            Member.findByPk(husband_id, { include: ['parentId'] }),
            Member.findByPk(wife_id, { include: ['parentId'] })
        ]);

        if (!husband || !wife) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'One or both members not found'
            });
        }

         // Check if both members have parent IDs
         if (!husband.parentId || !wife.parentId) {
            await t.rollback();
            return res.status(400).json({
            success: false,
            message: 'One or both members do not have parent IDs. Ensure both members are marked as married.'
        });
      }

        //verify gender
        if (husband.gender !== 'male' || wife.gender !== 'female') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid gender combination'
            });
        }

        //create marriage record
        const coupleId = `${husband.parentId.parent_id}_${wife.parentId.parent_id}`;
        const marriage = await Marriage.create({
            couple_id: coupleId,
            husband_id,
            wife_id,
            marriage_date,
            status: 'pending'
        }, { transaction: t });

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

router.put('/marriage/:id/confirm', async (req, res) => {
    const marriageId = req.params.id;
    const confirmingMemberId = req.params.id;
  
    if (!marriageId || marriageId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Valid marriage ID is required'
      });
    }

    if (!confirmingMemberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required to confirm marriage'
      });
    }
    
    const t = await sequelize.transaction();

    try {
        const marriage = await Marriage.findByPk(req.params.id, {
            include: [
                {
                    model: Member,
                    as: 'husband',
                    include: ['parentId']
                },
                {
                    model: Member,
                    as: 'wife',
                    include: ['parentId']
                }
            ]
        });

        if (!marriage) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Marriage record not found'
            });
        }

        // Check if the confirming member is either husband or wife
        if (confirmingMemberId != marriage.husband_id && confirmingMemberId != marriage.wife_id) {
            await t.rollback();
            return res.status(403).json({
                success: false,
                message: 'Only parties involved in the marriage can confirm it'
            });
        }

        if (marriage.status === 'confirmed') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Marriage is already confirmed'
            });
        }

        // Update marriage status
        await marriage.update({
            status: 'confirmed',
            confirmed_by: confirmingMemberId,
            confirmed_at: new Date()
        }, { transaction: t });

        // Verify the status change
        const updatedMarriage = await Marriage.findByPk(req.params.id, { transaction: t });
        if (updatedMarriage.status !== 'confirmed') {
            await t.rollback();
            return res.status(500).json({
                success: false,
                message: 'Failed to update marriage status'
            });
        }

        // Update both members' marital status and link them as spouses
        await Promise.all([
            Member.update(
                { 
                    marital_status: 'married',
                    spouse_id: marriage.wife_id
                },
                {
                    where: { id: marriage.husband_id },
                    transaction: t
                }
            ),
            Member.update(
                { 
                    marital_status: 'married',
                    spouse_id: marriage.husband_id
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
            message: 'Marriage confirmed successfully',
            confirmedBy: confirmingMemberId === marriage.husband_id ? 'husband' : 'wife'
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
                  (SELECT husband_id FROM marriages WHERE status = 'confirmed'
                  UNION 
                  SELECT wife_id FROM marriages WHERE status = 'confirmed')
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
          attributes: ['parent_id']
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
      const pendingRequests = await Marriage.findAll({
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
      const asHusband = await Marriage.findOne({
        where: { husband_id: memberId, status: 'confirmed' },
        include: [{ model: Member, as: 'wife' }]
      });
      
      const asWife = await Marriage.findOne({
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
        const requests = await Marriage.findAll({
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
        const requests = await Marriage.findAll({
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

        const marriage = await Marriage.findByPk(req.params.id, {
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

        const marriage = await Marriage.findByPk(req.params.id, {
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



// Get pending marriage requests for a member
router.get('/members/:id/marriage-requests', protect, async (req, res) => {
    try {
      const memberId = req.params.id;
      
      // Query for pending marriage requests
      // Fixed: Changed db.query to use Sequelize instead
      const pendingRequests = await sequelize.query(
        `SELECT mr.*, 
          r.first_name as requester_first_name, r.last_name as requester_last_name,
          e.first_name as requestee_first_name, e.last_name as requestee_last_name
        FROM marriage_requests mr
        JOIN members r ON mr.requester_id = r.id
        JOIN members e ON mr.requestee_id = e.id
        WHERE mr.requestee_id = :memberId AND mr.status = 'pending'`,
        {
          replacements: { memberId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      // Format the response
      const formattedRequests = pendingRequests.map(req => ({
        id: req.id,
        requester_id: req.requester_id,
        requestee_id: req.requestee_id,
        status: req.status,
        created_at: req.created_at,
        requester: {
          id: req.requester_id,
          first_name: req.requester_first_name,
          last_name: req.requester_last_name
        },
        requestee: {
          id: req.requestee_id,
          first_name: req.requestee_first_name,
          last_name: req.requestee_last_name
        }
      }));
      
      res.json({
        success: true,
        data: formattedRequests
      });
    } catch (error) {
      console.error('Error fetching marriage requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch marriage requests'
      });
    }
});
  
  // Send a marriage request
  router.post('/members/marriage-request', protect, async (req, res) => {
    try {
      const { requester_id, requestee_id } = req.body;
      
      // Validate request
      if (!requester_id || !requestee_id) {
        return res.status(400).json({
          success: false,
          message: 'Both requester_id and requestee_id are required'
        });
      }
      
      // Check if there's already a pending request
      // Fixed: Changed db.query to use Sequelize instead
      const existingRequest = await sequelize.query(
        `SELECT * FROM marriage_requests 
         WHERE ((requester_id = :requesterId AND requestee_id = :requesteeId) 
         OR (requester_id = :requesteeId AND requestee_id = :requesterId))
         AND status = 'pending'`,
        {
          replacements: { requesterId: requester_id, requesteeId: requestee_id },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (existingRequest.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A marriage request already exists between these members'
        });
      }
      
      // Create the marriage request
      // Fixed: Changed db.query to use Sequelize instead
      const result = await sequelize.query(
        `INSERT INTO marriage_requests (requester_id, requestee_id, status, created_at)
         VALUES (:requesterId, :requesteeId, 'pending', NOW())`,
        {
          replacements: { requesterId: requester_id, requesteeId: requestee_id },
          type: sequelize.QueryTypes.INSERT
        }
      );
      
      res.json({
        success: true,
        data: {
          id: result[0], // Sequelize returns the inserted ID as the first element
          requester_id,
          requestee_id,
          status: 'pending',
          created_at: new Date()
        }
      });
    } catch (error) {
      console.error('Error creating marriage request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create marriage request'
      });
    }
});
  
  
  // Respond to a marriage request
  router.put('/members/marriage-request/:id', protect, async (req, res) => {
    try {
      const requestId = req.params.id;
      const { status } = req.body;
      
      if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({
          success: false,
          message: 'Status must be either "approved" or "rejected"'
        });
      }
      
      // Get the marriage request
      // Fixed: Changed db.query to use Sequelize instead
      const [request] = await sequelize.query(
        'SELECT * FROM marriage_requests WHERE id = :requestId',
        {
          replacements: { requestId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Marriage request not found'
        });
      }
      
      // Update the request status
      // Fixed: Changed db.query to use Sequelize instead
      await sequelize.query(
        'UPDATE marriage_requests SET status = :status, updated_at = NOW() WHERE id = :requestId',
        {
          replacements: { status, requestId },
          type: sequelize.QueryTypes.UPDATE
        }
      );
      
      let marriageId = null;
      
      // If approved, create a marriage record
      if (status === 'approved') {
        // Get gender information to determine husband_id and wife_id
        const [requester] = await db.query('SELECT gender FROM members WHERE id = ?', [request.requester_id]);
        const [requestee] = await db.query('SELECT gender FROM members WHERE id = ?', [request.requestee_id]);
        
        let husband_id, wife_id;
        
        if (requester.gender === 'male') {
          husband_id = request.requester_id;
          wife_id = request.requestee_id;
        } else {
          husband_id = request.requestee_id;
          wife_id = request.requester_id;
        }
        
        // Create the marriage record
        const marriageResult = await db.query(
          `INSERT INTO marriages (husband_id, wife_id, marriage_date, status, created_at)
           VALUES (?, ?, NOW(), 'confirmed', NOW())`,
          [husband_id, wife_id]
        );
        
        marriageId = marriageResult.insertId;
        
        // Update both members' marital status
        await db.query(
          'UPDATE members SET marital_status = "Married", updated_at = NOW() WHERE id IN (?, ?)',
          [request.requester_id, request.requestee_id]
        );
      }
      
      res.json({
        success: true,
        data: {
          id: requestId,
          status,
          marriage_id: marriageId
        }
      });
    } catch (error) {
      console.error('Error processing marriage request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process marriage request'
      });
    }
  });

module.exports = router;