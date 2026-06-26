const rateLimit = require('express-rate-limit');

const ussdRateLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 10,                     // 10 requests per minute per phone
    keyGenerator: (req) => {
        // Rate limit by phone number from Africa's Talking request body
        return req.body?.phoneNumber || req.ip;
    },
    handler: (req, res) => {
        res.status(429).send('END Too many requests. Please try again shortly.');
    },
    standardHeaders: true,
    legacyHeaders: false
});

const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,                    // 100 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { ussdRateLimiter, apiRateLimiter };