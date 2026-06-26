const readline = require('readline');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('./dnsSet');
const User = require('../models/client/User');
const Transaction = require('../models/client/Transaction');
const Settings = require('../models/admin/Settings');
const Legal = require('../models/admin/Legal');
const Financial = require('../models/admin/Financial');
const Admin = require('../models/admin/Admin');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

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

// ─── SEED: ALL ───────────────────────────────────────

const seedAll = async () => {
    console.log('\n🌱 Seeding all data (override)...\n');
    await seedSettings(true);
    await seedLegals(10, true);
    await seedFinancial(true);
    await seedAdmin(true);
    await seedTestData(true);
    console.log('\n✅ All data seeded successfully!');
};

// ─── SEED: SETTINGS ──────────────────────────────────

const seedSettings = async (override = false) => {
    if (override) {
        await Settings.findByIdAndDelete('global');
        console.log('  🗑️  Existing settings removed.');
    }

    const existing = await Settings.findById('global');
    if (existing) {
        console.log('  ⏭️  Settings already exist. Use override to replace.');
        return;
    }

    await Settings.create({
        _id: 'global',
        branding: {
            appName: 'Flax',
            tagline: 'Strong. Simple. Send.'
        },
        contact: {
            supportEmail: 'support@flax.co.ke',
            supportPhone: '+254700000000',
            whatsappNumber: '+254700000000',
            physicalAddress: 'Nairobi, Kenya'
        },
        security: {
            pinLength: 4,
            maxPinAttempts: 3,
            sessionTimeoutMinutes: 5,
            rateLimitPerMinute: 10
        },
        ussd: {
            shortCode: '*384#',
            gatewayProvider: 'africastalking',
            apiKey: '',
            callbackUrl: ''
        },
        notifications: {
            smsProvider: 'africastalking',
            smsSenderId: 'Flax',
            transactionReceipts: false,
            alertEmail: ''
        },
        backup: {
            frequency: 'daily',
            autoBackup: false,
            autoSendEmail: false,
            retentionDays: 30,
            lastBackup: null,
            nextBackup: null
        }
    });

    console.log('  ✅ Settings created.');
};

// ─── SEED: LEGALS ────────────────────────────────────

const seedLegals = async (count = 10, override = false) => {
    if (override) {
        await Legal.deleteMany({});
        console.log('  🗑️  Existing legals removed.');
    }

    const existing = await Legal.countDocuments();
    if (existing > 0) {
        console.log('  ⏭️  Legal documents already exist. Use override to replace.');
        return;
    }

    const types = ['terms', 'privacy', 'refund', 'kyc'];

    const templates = {
        terms: 'These Terms of Service ("Terms") govern your access to and use of the Flax mobile money platform. By registering for or using Flax, you agree to be bound by these Terms.\n\nIf you do not agree to these Terms, you may not use the Flax service.\n\nFlax reserves the right to modify these Terms at any time. Continued use of the service after changes constitutes acceptance of the new Terms.',
        privacy: 'Flax is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile money platform.\n\nWe collect information you provide directly, such as your name, phone number, national ID, and transaction data.\n\nWe do not sell your personal information to third parties.',
        refund: 'Flax strives to ensure all transactions are processed accurately. This Refund Policy outlines the circumstances under which a transaction may be reversed or refunded.\n\nIf you send money to the wrong recipient, contact support immediately. Reversals are only possible if the recipient has not withdrawn the funds.\n\nFlax is not responsible for funds sent to incorrect numbers due to user error.',
        kyc: 'Flax is required by law to verify the identity of all users. This Know Your Customer (KYC) Policy describes the identification requirements.\n\nAll users must provide a valid national ID during registration. Flax may request additional documentation for higher transaction limits.\n\nFailure to provide requested KYC documents may result in account restrictions.'
    };

    for (const type of types) {
        for (let v = 1; v <= count; v++) {
            await Legal.create({
                type,
                title: `${type.charAt(0).toUpperCase() + type.slice(1)} Policy v${v}.0`,
                content: `${templates[type]}\n\n---\nVersion ${v}.0 — Updated ${new Date(Date.now() - (count - v) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE')}.\nThis document outlines all relevant policies and procedures for Flax users.`,
                version: `${v}.0`,
                publishedAt: new Date(Date.now() - (count - v) * 30 * 24 * 60 * 60 * 1000)
            });
        }
    }

    console.log(`  ✅ ${types.length * count} legal documents created (${count} per type).`);
};

// ─── SEED: FINANCIAL ─────────────────────────────────

const seedFinancial = async (override = false) => {
    if (override) {
        await Financial.findByIdAndDelete('global');
        console.log('  🗑️  Existing financial settings removed.');
    }

    const existing = await Financial.findById('global');
    if (existing) {
        console.log('  ⏭️  Financial settings already exist. Use override to replace.');
        return;
    }

    await Financial.create({
        _id: 'global',
        currency: 'KES',
        sendMoneyFlatFee: 0,
        sendMoneyPercentageFee: 0,
        withdrawalFlatFee: 25,
        withdrawalPercentageFee: 0,
        minSendAmount: 10,
        maxSendAmount: 70000,
        maxDailySend: 140000,
        maxPerTransaction: 70000
    });

    console.log('  ✅ Financial settings created.');
};

// ─── SEED: ADMIN ─────────────────────────────────────

const seedAdmin = async (override = false) => {
    if (override) {
        await Admin.deleteMany({});
        console.log('  🗑️  Existing admins removed.');
    }

    const existing = await Admin.findOne({ email: 'admin@flax.co.ke' });
    if (existing) {
        console.log('  ⏭️  Default admin already exists. Use override to replace.');
        return;
    }

    await Admin.create({
        email: 'admin@flax.co.ke',
        password: 'Admin@123',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin'
    });

    console.log('  ✅ Default admin created (admin@flax.co.ke / Admin@123).');
};

// ─── SEED: TEST DATA ─────────────────────────────────

const seedTestData = async (override = false) => {
    if (override) {
        await User.deleteMany({});
        await Transaction.deleteMany({});
        console.log('  🗑️  Existing users and transactions removed.');
    }

    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
        console.log('  ⏭️  Test users already exist. Use override to replace.');
        return;
    }

    const users = [
        { phoneNumber: '254712345678', firstName: 'John', lastName: 'Doe', nationalId: '10000001', pin: '1234', balance: 5000 },
        { phoneNumber: '254712345679', firstName: 'Jane', lastName: 'Smith', nationalId: '10000002', pin: '1234', balance: 3000 },
        { phoneNumber: '254712345680', firstName: 'Bob', lastName: 'Mwangi', nationalId: '10000003', pin: '1234', balance: 10000 },
        { phoneNumber: '254712345681', firstName: 'Alice', lastName: 'Wanjiku', nationalId: '10000004', pin: '1234', balance: 2000 },
        { phoneNumber: '254712345682', firstName: 'Tom', lastName: 'Odhiambo', nationalId: '10000005', pin: '1234', balance: 7500 },
        { phoneNumber: '254712345683', firstName: 'Sarah', lastName: 'Kamau', nationalId: '10000006', pin: '1234', balance: 1500 },
        { phoneNumber: '254712345684', firstName: 'Mike', lastName: 'Omondi', nationalId: '10000007', pin: '1234', balance: 8000 },
        { phoneNumber: '254712345685', firstName: 'Grace', lastName: 'Njeri', nationalId: '10000008', pin: '1234', balance: 4500 },
        { phoneNumber: '254712345686', firstName: 'David', lastName: 'Kiprono', nationalId: '10000009', pin: '1234', balance: 6000 },
        { phoneNumber: '254712345687', firstName: 'Mary', lastName: 'Akinyi', nationalId: '10000010', pin: '1234', balance: 3500 }
    ];

    const created = await User.create(users);

    console.log(`  ✅ ${created.length} test users created.`);
    console.log('     All test users have PIN: 1234\n');
    console.log('  📱 Test Phone Numbers:');
    created.forEach((u) => {
        const display = u.phoneNumber.slice(0, 6) + '****' + u.phoneNumber.slice(-2);
        console.log(`     ${u.firstName} ${u.lastName}: ${display} | Balance: KES ${u.balance.toLocaleString()}`);
    });
};

// ─── MENU ────────────────────────────────────────────

const showMenu = () => {
    console.log('\n═══════════════════════════════════════');
    console.log('  FLAX SEED SCRIPT');
    console.log('═══════════════════════════════════════');
    console.log('  1.  Seed everything (override)');
    console.log('  2.  Seed settings only');
    console.log('  3.  Seed legals only (10 per type)');
    console.log('  4.  Seed financial only');
    console.log('  5.  Seed admin only');
    console.log('  6.  Seed test data only (10 users)');
    console.log('  7.  Seed settings (override)');
    console.log('  8.  Seed legals (override)');
    console.log('  9.  Seed financial (override)');
    console.log('  10. Seed admin (override)');
    console.log('  11. Seed test data (override)');
    console.log('  0.  Exit');
    console.log('═══════════════════════════════════════\n');
};

// ─── RUN ─────────────────────────────────────────────

const run = async () => {
    await connect();

    let running = true;

    while (running) {
        showMenu();
        const choice = await question('  Select option: ');

        switch (choice) {
            case '1': await seedAll(); break;
            case '2': await seedSettings(); break;
            case '3': await seedLegals(10); break;
            case '4': await seedFinancial(); break;
            case '5': await seedAdmin(); break;
            case '6': await seedTestData(); break;
            case '7': await seedSettings(true); break;
            case '8': await seedLegals(10, true); break;
            case '9': await seedFinancial(true); break;
            case '10': await seedAdmin(true); break;
            case '11': await seedTestData(true); break;
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