const router = require('express').Router();
const { getContact } = require('../../controllers/public/contactController');

router.get('/contact', getContact);

module.exports = router;