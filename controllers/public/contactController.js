const Settings = require('../../models/admin/Settings');

// @desc    Get public contact information
// @route   GET /api/public/contact
// @access  Public
const getContact = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        res.json({
            success: true,
            data: {
                supportEmail: settings.contact.supportEmail,
                supportPhone: settings.contact.supportPhone,
                whatsappNumber: settings.contact.whatsappNumber,
                physicalAddress: settings.contact.physicalAddress
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getContact };