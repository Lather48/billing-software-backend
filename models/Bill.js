const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    billNumber: {
        type: String,
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    customerName: {
        type: String // Fallback if no customer reference
    },
    customerPhone: {
        type: String // Fallback if no customer reference
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: String,
        qty: Number,
        unit: String,
        price: Number,
        discount: { type: Number, default: 0 },
        gstRate: { type: Number, default: 0 },
        gstAmount: { type: Number, default: 0 },
        total: Number
    }],
    subtotal: {
        type: Number,
        required: true
    },
    totalDiscount: {
        type: Number,
        default: 0
    },
    taxableAmount: {
        type: Number,
        required: true
    },
    totalGST: {
        type: Number,
        default: 0
    },
    cgst: {
        type: Number,
        default: 0
    },
    sgst: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        required: true
    },
    paymentMode: {
        type: String,
        enum: ['cash', 'upi', 'card', 'credit', 'cheque'],
        default: 'cash'
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    balanceDue: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['paid', 'pending', 'partial', 'cancelled'],
        default: 'paid'
    },
    notes: {
        type: String
    },
    billDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure billNumber is unique per business
BillSchema.index({ business: 1, billNumber: 1 }, { unique: true });

module.exports = mongoose.model('Bill', BillSchema);
