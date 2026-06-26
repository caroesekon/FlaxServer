const Legal = require('../../models/admin/Legal');
const SystemLog = require('../../models/admin/SystemLog');

// @desc    Get all legal documents (admin)
// @route   GET /api/admin/legals
// @access  Private
const getLegals = async (req, res, next) => {
    try {
        const legals = await Legal.find().sort({ type: 1 });
        res.json({ success: true, data: { legals } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single legal document by type
// @route   GET /api/admin/legals/:type
// @access  Private
const getLegal = async (req, res, next) => {
    try {
        const legal = await Legal.findOne({ type: req.params.type });
        if (!legal) return res.status(404).json({ success: false, message: 'Document not found.' });

        res.json({ success: true, data: { legal } });
    } catch (error) {
        next(error);
    }
};

// @desc    Create or update a legal document
// @route   PUT /api/admin/legals/:type
// @access  Private (super_admin)
const upsertLegal = async (req, res, next) => {
    try {
        const { type } = req.params;
        const { title, content, version } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Title and content are required.' });
        }

        const legal = await Legal.findOneAndUpdate(
            { type },
            { title, content, version: version || '1.0', publishedAt: new Date(), updatedBy: req.admin._id },
            { new: true, upsert: true, runValidators: true }
        );

        await SystemLog.create({ level: 'info', source: 'admin', message: `Legal document updated: ${type} by ${req.admin.email}` });

        res.json({ success: true, message: 'Document saved.', data: { legal } });
    } catch (error) {
        next(error);
    }
};

module.exports = { getLegals, getLegal, upsertLegal };