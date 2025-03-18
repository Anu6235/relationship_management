const express = require('express');
const memberController = require('../controllers/memberController');
const marriageController = require('../controllers/marriageController');
const divorceController = require('../controllers/divorceController');
const relationshipController = require('../controllers/relationshipController');
const deathController = require('../controllers/deathController');
const { Member, User } = require('../models');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// =================== IMAGE MANAGEMENT ===================

// Set up multer storage for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const threeFoldersBack = path.resolve(__dirname, '../');
    const uploadDir = path.join(threeFoldersBack, 'public/images/member-images');
    //   const uploadDir = 'public/images/member-images';
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

// =================== ADMIN MANAGEMENT ===================

router.use(protect);

//Admin verification
router.put('/:id/verify', protect, async (req, res) => {
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

// =================== MEMBER MANAGEMENT ===================

router.get('/', memberController.getAllMembers);
router.get('/:id', memberController.getMemberById);
router.post('/', protect, upload.single('profile_image'), memberController.createMember);
router.put('/:id', protect, upload.single('profile_image'), memberController.updateMember);
router.delete('/:id', protect, memberController.deleteMember);

// =================== MARRIAGE MANAGEMENT ===================

router.post('/marriage', marriageController.createMarriage);
router.put("/marriage/:id/confirm", marriageController.confirmMarriage);
router.put('/marriage/:id/decline', marriageController.declineMarriage);
router.get('/marriage-requests/:memberId', protect, marriageController.getMarriageRequests);
router.get('/:id/marriages', marriageController.getMemberMarriages);

// =================== RELATIONSHIP MANAGEMENT ===================

router.get('/get_wife/:id', protect, relationshipController.getWife);
router.get('/get_marriage/spouses', relationshipController.getMarriageBySpouses);
router.get('/:id/relationships', relationshipController.getMemberRelationships);

// =================== DIVORCE MANAGEMENT ===================

router.post('/divorce/existing', divorceController.createDivorceExisting);
router.post('/divorce/new', divorceController.createDivorceNew);
router.put('/divorce/:id/confirm', divorceController.confirmDivorce);
router.put('/divorce/:id/decline', divorceController.declineDivorce);
router.get('/divorce-requests/:memberId', protect, divorceController.getDivorceRequests);

// =================== DEATH MANAGEMENT ===================

router.post('/marriage/:id/widowed', deathController.markMarriageWidowed);
router.put('/members/:id/mark-deceased', deathController.markMemberDeceased);


module.exports = router;