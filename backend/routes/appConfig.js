const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { AppConfig } = require('../models');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/app-logos');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const { appName, email, contact } = req.body;
    const logoPath = req.file ? `/images/app-logos/${req.file.filename}` : null;

    let appConfig = await AppConfig.findOne();

    if (appConfig) {
      await appConfig.update({
        app_name: appName,
        logo: logoPath || appConfig.logo,
        email,
        contact
      });
    } else {
      appConfig = await AppConfig.create({
        app_name: appName,
        logo: logoPath,
        email,
        contact
      });
    }

    res.json({ success: true, data: appConfig });
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ success: false, error: 'Error saving configuration' });
  }
});

  
router.get('/', async (req, res) => {
  try {
    const appConfig = await AppConfig.findOne();
    res.json({ success: true, data: appConfig });
  } catch (error) {
    console.error('Error retrieving configuration:', error);
    res.status(500).json({ success: false, error: 'Error retrieving configuration' });
  }
});

module.exports = router;