const router = require('express').Router();
const { getHistory, getOne } = require('../../controllers/client/transactionController');

router.get('/:phoneNumber', getHistory);
router.get('/detail/:transactionId', getOne);

module.exports = router;