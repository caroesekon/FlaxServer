const Legal = require('../../models/admin/Legal');

// @desc    Get all public legal documents
// @route   GET /api/public/legals
// @access  Public
const getLegals = async (req, res, next) => {
    try {
        const legals = await Legal.find({ publishedAt: { $ne: null } }).select('type title version publishedAt');
        res.json({ success: true, data: { legals } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single public legal document
// @route   GET /api/public/legals/:type
// @access  Public
const getLegal = async (req, res, next) => {
    try {
        const legal = await Legal.findOne({ type: req.params.type, publishedAt: { $ne: null } }).select('type title content version publishedAt');
        if (!legal) return res.status(404).json({ success: false, message: 'Document not found.' });

        res.json({ success: true, data: { legal } });
    } catch (error) {
        next(error);
    }
};

module.exports = { getLegals, getLegal };