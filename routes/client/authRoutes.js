const router = require('express').Router();
const { register, verifyPin } = require('../../controllers/client/authController');

router.post('/register', register);
router.post('/verify-pin', verifyPin);

module.exports = router;