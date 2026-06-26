const router = require('express').Router();
const { getBalance, getProfile, changePin } = require('../../controllers/client/userController');

router.get('/:phoneNumber/balance', getBalance);
router.get('/:phoneNumber/profile', getProfile);
router.put('/:phoneNumber/pin', changePin);

module.exports = router;