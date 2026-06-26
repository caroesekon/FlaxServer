const mongoose = require('mongoose');

const financialSchema = new mongoose.Schema({
    _id: { type: String, default: 'global' },

    currency: { type: String, default: 'KES' },

    sendMoneyFlatFee: { type: Number, default: 0 },
    sendMoneyPercentageFee: { type: Number, default: 0 },

    withdrawalFlatFee: { type: Number, default: 0 },
    withdrawalPercentageFee: { type: Number, default: 0 },

    minSendAmount: { type: Number, default: 10 },
    maxSendAmount: { type: Number, default: 70000 },
    maxDailySend: { type: Number, default: 140000 },
    maxPerTransaction: { type: Number, default: 70000 },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    }
}, {
    timestamps: true
});

// Singleton
financialSchema.statics.getFinancial = async function () {
    let financial = await this.findById('global');
    if (!financial) {
        financial = await this.create({ _id: 'global' });
    }
    return financial;
};

module.exports = mongoose.model('Financial', financialSchema);