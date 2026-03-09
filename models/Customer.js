const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
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
    creditLimit: {
        type: Number,
        default: 0
    },
    totalDue: {
        type: Number,
        default: 0
    },
    notes: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Customer', CustomerSchema);
