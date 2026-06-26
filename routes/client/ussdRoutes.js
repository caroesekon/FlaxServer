const router = require('express').Router();
const { handleUssd } = require('../../services/ussdMenuService');
const { ussdRateLimiter } = require('../../middleware/client/rateLimiter');

// @desc    USSD webhook from Africa's Talking
// @route   POST /api/ussd
// @access  Public
router.post('/', ussdRateLimiter, async (req, res, next) => {
    try {
        const { sessionId, phoneNumber, text } = req.body;

        if (!sessionId || !phoneNumber) {
            return res.status(400).send('END System error. Please try again.');
        }

        const response = await handleUssd(text || '', phoneNumber, sessionId);
        res.set('Content-Type', 'text/plain');
        res.send(response);
    } catch (error) {
        next(error);
    }
});

module.exports = router;