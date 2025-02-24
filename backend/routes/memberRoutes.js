const express = require('express');
const { Member, sequelize, ParentId, Marriage, User } = require('../models');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// // Update the getRandomAvatar function to handle paths correctly
// const getRandomAvatar = (gender) => {
//     const avatarDir = gender.toLowerCase() === 'female' 
//         ? 'member-avatars/female-avatar'
//         : 'member-avatars/male-avatar';
    
//     try {
//         const fullPath = path.join('public/images', avatarDir);
//         const files = fs.readdirSync(fullPath);
//         const avatarFiles = files.filter(file => file.startsWith('avatar') && file.endsWith('.png'));
        
//         if (avatarFiles.length === 0) {
//             return gender.toLowerCase() === 'female' 
//                 ? 'member-avatars/female-avatar/avatar1.png' 
//                 : 'member-avatars/male-avatar/avatar1.png';
//         }
        
//         const randomIndex = Math.floor(Math.random() * avatarFiles.length);
//         return path.join(avatarDir, avatarFiles[randomIndex]);
//     } catch (error) {
//         console.error('Error reading avatar directory:', error);
//         return gender.toLowerCase() === 'female' 
//             ? 'member-avatars/female-avatar/avatar1.png' 
//             : 'member-avatars/male-avatar/avatar1.png';
//     }
// };

// const getGenderBasedAvatarPath = (gender) => {
//     return `/images/member-avatars/${gender.toLowerCase()}-avatar.png`;
// }

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

// const copyRandomAvatarToMemberImages = async (gender) => {
//     const avatarDir = gender.toLowerCase() === 'female' 
//         ? 'member-avatars/female-avatar'
//         : 'member-avatars/male-avatar';
    
//     try {
//         const fullPath = path.join('public/images', avatarDir);
//         const files = fs.readdirSync(fullPath);
//         const avatarFiles = files.filter(file => file.startsWith('avatar') && file.endsWith('.png'));
        
//         if (avatarFiles.length === 0) {
//             return '/images/member-avatars/default-avatar.png';
//         }
        
//         // Select random avatar file
//         const randomIndex = Math.floor(Math.random() * avatarFiles.length);
//         const selectedAvatar = avatarFiles[randomIndex];
        
//         // Generate a unique filename for the copied avatar
//         const newFilename = `avatar-${gender.toLowerCase()}-${Date.now()}${path.extname(selectedAvatar)}`;
//         const destPath = path.join('public/images/member-images', newFilename);
        
//         // Copy the file
//         await fs.promises.copyFile(
//             path.join(fullPath, selectedAvatar),
//             destPath
//         );
        
//         return `/images/member-images/${newFilename}`;
//     } catch (error) {
//         console.error('Error handling avatar:', error);
//         return '/images/member-avatars/default-avatar.png';
//     }
// };


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
    // Existing code for marriage confirmation
    const t = await sequelize.transaction();

    try {
        const marriage = await Marriage.findByPk(req.params.id);
        if (!marriage) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Marriage record not found'
            });
        }

        if (marriage.status === 'confirmed') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Marriage is already confirmed'
            });
        }

        //Update marriage status
        await marriage.update({
            status: 'confirmed'
        }, { transaction: t });

        //Update both members' marital status
        await Member.update(
            { marital_status: 'married' },
            {
                where: {
                    id: { [Op.in]: [marriage.husband_id, marriage.wife_id] }
                },
                transaction: t
            }
        );

        await t.commit();
        res.status(200).json({
            success: true,
            message: 'Marriage confirmed successfully'
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

module.exports = router;