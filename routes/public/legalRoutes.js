const router = require('express').Router();
const { getLegals, getLegal } = require('../../controllers/public/legalController');

router.get('/legals', getLegals);
router.get('/legals/:type', getLegal);

module.exports = router;