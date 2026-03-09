const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    phone: {
        type: String
    },
    email: {
        type: String
    },
    address: {
        type: String
    },
    gstNumber: {
        type: String
    },
    panNumber: {
        type: String
    },
    logo: {
        type: String
    },
    invoicePrefix: {
        type: String,
        default: 'BILL'
    },
    invoiceCounter: {
        type: Number,
        default: 1
    },
    upiId: {
        type: String
    },
    bankDetails: {
        accountName: String,
        accountNumber: String,
        ifscCode: String,
        bankName: String,
        branch: String
    },
    termsConditions: {
        type: String
    },
    businessType: {
        type: String,
        enum: ['Retail', 'Medical', 'Restaurant', 'Other'],
        default: 'Retail'
    },
    subscriptionPlan: {
        type: String,
        enum: ['free', 'monthly', 'biannual', 'yearly'],
        default: 'free'
    },
    subscriptionExpiry: {
        type: Date
    },
    socialLinks: {
        instagram: String,
        facebook: String,
        twitter: String,
        website: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Business', BusinessSchema);
