const router = require('express').Router();

router.use('/public', require('./public/index'));
router.use(require('./client/index'));
router.use('/admin', require('./admin/index'));

module.exports = router;