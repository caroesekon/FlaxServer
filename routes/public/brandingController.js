const Settings = require('../../models/admin/Settings');

// @desc    Get public branding info
// @route   GET /api/public/branding
// @access  Public
const getBranding = async (req, res, next) => {
    try {
        const settings = await Settings.getSettings();
        res.json({
            success: true,
            data: {
                appName: settings.branding.appName,
                tagline: settings.branding.tagline,
                logo: settings.branding.logo,
                favicon: settings.branding.favicon
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getBranding };