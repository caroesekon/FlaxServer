const router = require('express').Router();
const { getBranding } = require('../../controllers/public/brandingController');

router.get('/branding', getBranding);

module.exports = router;