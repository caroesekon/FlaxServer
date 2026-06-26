const readline = require('readline');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('./dnsSet');
const Admin = require('../models/admin/Admin');
const User = require('../models/client/User');
const Transaction = require('../models/client/Transaction');
const Settings = require('../models/admin/Settings');
const Legal = require('../models/admin/Legal');
const Financial = require('../models/admin/Financial');
const Backup = require('../models/admin/Backup');
const SystemLog = require('../models/admin/SystemLog');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

// ─── Database Connect/Disconnect ─────────────────────

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

const disconnect = async () => {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
};




// ─── MAIN MENU ───────────────────────────────────────

const showMenu = () => {
    console.log('\n═══════════════════════════════════════');
    console.log('  FLAX ADMIN CLI');
    console.log('═══════════════════════════════════════');
    console.log('  1.  List admins');
    console.log('  2.  Create admin');
    console.log('  3.  Update admin');
    console.log('  4.  Delete admin');
    console.log('  5.  List database collections');
    console.log('  6.  Drop a collection');
    console.log('  7.  Drop entire database');
    console.log('  0.  Exit');
    console.log('═══════════════════════════════════════\n');
};

// ─── LIST ADMINS ─────────────────────────────────────

const listAdmins = async () => {
    console.log('\n📋 All Admins:\n');
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });

    if (admins.length === 0) {
        console.log('  No admins found.');
        return;
    }

    admins.forEach((admin, i) => {
        console.log(`  ${i + 1}. ${admin.firstName} ${admin.lastName}`);
        console.log(`     Email: ${admin.email}`);
        console.log(`     Role: ${admin.role}`);
        console.log(`     Active: ${admin.isActive ? '✅' : '❌'}`);
        console.log(`     Last Login: ${admin.lastLogin || 'Never'}`);
        console.log('');
    });
};

// ─── CREATE ADMIN ────────────────────────────────────

const createAdmin = async () => {
    console.log('\n➕ Create New Admin\n');

    const email = await question('  Email: ');
    const password = await question('  Password: ');
    const firstName = await question('  First Name: ');
    const lastName = await question('  Last Name: ');
    console.log('\n  Roles: super_admin, agent, support, finance, viewer');
    const role = await question('  Role: ');

    if (!email || !password || !firstName || !lastName || !role) {
        console.log('\n❌ All fields are required.');
        return;
    }

    const validRoles = ['super_admin', 'agent', 'support', 'finance', 'viewer'];
    if (!validRoles.includes(role)) {
        console.log(`\n❌ Invalid role. Must be one of: ${validRoles.join(', ')}`);
        return;
    }

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
        console.log('\n❌ Admin with that email already exists.');
        return;
    }

    const admin = await Admin.create({
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        role
    });

    console.log(`\n✅ Admin created: ${admin.firstName} ${admin.lastName} (${admin.role})`);

    // Send welcome email
    const emailService = require('../services/emailService');
    const result = await emailService.sendAdminWelcome({
        to: admin.email,
        name: admin.firstName,
        tempPassword: password
    });

    if (result.success) {
        console.log(`  📧 Welcome email sent to ${admin.email}`);
    } else {
        console.log(`  ⚠️  Welcome email not sent: ${result.reason}`);
    }
};

// ─── UPDATE ADMIN ────────────────────────────────────

const updateAdmin = async () => {
    await listAdmins();

    const email = await question('\n  Enter admin email to update: ');
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
        console.log('\n❌ Admin not found.');
        return;
    }

    console.log(`\n  Updating: ${admin.firstName} ${admin.lastName}`);
    console.log(`  Current role: ${admin.role}`);
    console.log(`  Current status: ${admin.isActive ? 'Active' : 'Inactive'}\n`);

    const newRole = await question('  New role (leave blank to keep): ');
    const newStatus = await question('  Active? (y/n, leave blank to keep): ');

    if (newRole) {
        const validRoles = ['super_admin', 'agent', 'support', 'finance', 'viewer'];
        if (validRoles.includes(newRole)) {
            admin.role = newRole;
        } else {
            console.log(`\n⚠️  Invalid role. Keeping: ${admin.role}`);
        }
    }

    if (newStatus.toLowerCase() === 'y') admin.isActive = true;
    if (newStatus.toLowerCase() === 'n') admin.isActive = false;

    await admin.save();
    console.log(`\n✅ Admin updated.`);
};

// ─── DELETE ADMIN ────────────────────────────────────

const deleteAdmin = async () => {
    await listAdmins();

    const email = await question('\n  Enter admin email to delete: ');
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
        console.log('\n❌ Admin not found.');
        return;
    }

    const confirm = await question(`\n  ⚠️  Delete ${admin.firstName} ${admin.lastName}? (yes/no): `);

    if (confirm.toLowerCase() !== 'yes') {
        console.log('\n  Cancelled.');
        return;
    }

    await Admin.findByIdAndDelete(admin._id);
    console.log(`\n✅ Admin deleted.`);
};

// ─── LIST COLLECTIONS ────────────────────────────────

const listCollections = async () => {
    console.log('\n📦 Database Collections:\n');

    const collections = await mongoose.connection.db.listCollections().toArray();
    const names = collections.map((c) => c.name).sort();

    names.forEach((name, i) => {
        console.log(`  ${i + 1}. ${name}`);
    });

    console.log(`\n  Total: ${names.length} collections`);
};

// ─── DROP COLLECTION ─────────────────────────────────

const dropCollection = async () => {
    await listCollections();

    const name = await question('\n  Enter collection name to drop: ');

    const confirm = await question(`\n  ⚠️  This will DELETE all data in "${name}". Continue? (yes/no): `);

    if (confirm.toLowerCase() !== 'yes') {
        console.log('\n  Cancelled.');
        return;
    }

    try {
        await mongoose.connection.db.dropCollection(name);
        console.log(`\n✅ Collection "${name}" dropped.`);
    } catch (error) {
        console.log(`\n❌ Failed: ${error.message}`);
    }
};

// ─── DROP DATABASE ───────────────────────────────────

const dropDatabase = async () => {
    console.log('\n⚠️  DROP ENTIRE DATABASE');
    console.log('  This will delete ALL data permanently.\n');

    const dbName = mongoose.connection.db.databaseName;
    const confirm = await question(`  Type the database name "${dbName}" to confirm: `);

    if (confirm !== dbName) {
        console.log('\n  Cancelled. Database name did not match.');
        return;
    }

    const finalConfirm = await question('  Are you ABSOLUTELY sure? (yes/no): ');

    if (finalConfirm.toLowerCase() !== 'yes') {
        console.log('\n  Cancelled.');
        return;
    }

    await mongoose.connection.db.dropDatabase();
    console.log(`\n✅ Database "${dbName}" dropped completely.`);
};

// ─── RUN ─────────────────────────────────────────────

const run = async () => {
    await connect();

    let running = true;

    while (running) {
        showMenu();
        const choice = await question('  Select option: ');

        switch (choice) {
            case '1': await listAdmins(); break;
            case '2': await createAdmin(); break;
            case '3': await updateAdmin(); break;
            case '4': await deleteAdmin(); break;
            case '5': await listCollections(); break;
            case '6': await dropCollection(); break;
            case '7': await dropDatabase(); break;
            case '0':
                running = false;
                console.log('\n👋 Goodbye!\n');
                break;
            default:
                console.log('\n❌ Invalid option.');
        }

        if (running) await question('\n  Press Enter to continue...');
    }

    await disconnect();
    rl.close();
};

run();