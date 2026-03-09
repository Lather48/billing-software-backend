const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    bill: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    amount: {
        type: Number,
        required: true
    },
    mode: {
        type: String,
        enum: ['cash', 'upi', 'card', 'credit', 'cheque'],
        required: true
    },
    notes: {
        type: String
    },
    paidAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Payment', PaymentSchema);
