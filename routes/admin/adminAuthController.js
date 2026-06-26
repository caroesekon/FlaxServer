const jwt = require('jsonwebtoken');
const Admin = require('../../models/admin/Admin');
const SystemLog = require('../../models/admin/SystemLog');
const env = require('../../config/env');
const emailService = require('../../services/emailService');

// @desc    Login admin and return JWT
// @route   POST /api/admin/auth/login
// @access  Public
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });

        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        if (!admin.isActive) return res.status(403).json({ success: false, message: 'Account deactivated.' });

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        admin.lastLogin = new Date();
        await admin.save();

        const token = jwt.sign({ id: admin._id, role: admin.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

        await SystemLog.create({ level: 'info', source: 'admin', message: `Admin login: ${admin.email}` });

        res.json({ success: true, data: { token, admin: admin.toJSON() } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current admin profile
// @route   GET /api/admin/auth/profile
// @access  Private
const getProfile = async (req, res, next) => {
    try {
        res.json({ success: true, data: { admin: req.admin } });
    } catch (error) {
        next(error);
    }
};

// @desc    List all admins
// @route   GET /api/admin/auth/admins
// @access  Private (super_admin)
const getAdmins = async (req, res, next) => {
    try {
        const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: { admins } });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new admin
// @route   POST /api/admin/auth/admins
// @access  Private (super_admin)
const createAdmin = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role } = req.body;
        if (!email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const existing = await Admin.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(409).json({ success: false, message: 'Email already in use.' });

        const admin = await Admin.create({ email: email.toLowerCase(), password, firstName, lastName, role, createdBy: req.admin._id });

        await SystemLog.create({ level: 'info', source: 'admin', message: `Admin created: ${admin.email} by ${req.admin.email}` });

        await emailService.sendAdminWelcome({ to: admin.email, name: admin.firstName, tempPassword: password });

        res.status(201).json({ success: true, message: 'Admin created.', data: { admin: admin.toJSON() } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update admin role or status
// @route   PUT /api/admin/auth/admins/:id
// @access  Private (super_admin)
const updateAdmin = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });

        const { role, isActive } = req.body;
        if (role) admin.role = role;
        if (typeof isActive === 'boolean') admin.isActive = isActive;
        await admin.save();

        await SystemLog.create({ level: 'info', source: 'admin', message: `Admin updated: ${admin.email} by ${req.admin.email}` });

        res.json({ success: true, message: 'Admin updated.', data: { admin: admin.toJSON() } });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an admin
// @route   DELETE /api/admin/auth/admins/:id
// @access  Private (super_admin)
const deleteAdmin = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
        if (admin._id.equals(req.admin._id)) return res.status(400).json({ success: false, message: 'Cannot delete yourself.' });

        await Admin.findByIdAndDelete(req.params.id);

        await SystemLog.create({ level: 'warning', source: 'admin', message: `Admin deleted: ${admin.email} by ${req.admin.email}` });

        res.json({ success: true, message: 'Admin deleted.' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get admin activity log
// @route   GET /api/admin/auth/activity-log
// @access  Private
const getActivityLog = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const query = { source: 'admin' };
        const total = await SystemLog.countDocuments(query);
        const logs = await SystemLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

        res.json({ success: true, data: { logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } } });
    } catch (error) {
        next(error);
    }
};

module.exports = { login, getProfile, getAdmins, createAdmin, updateAdmin, deleteAdmin, getActivityLog };