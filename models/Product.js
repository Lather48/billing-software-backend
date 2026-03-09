const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    category: {
        type: String
    },
    unit: {
        type: String,
        default: 'pcs'
    },
    purchasePrice: {
        type: Number,
        default: 0
    },
    sellingPrice: {
        type: Number,
        required: true
    },
    gstRate: {
        type: Number,
        enum: [0, 5, 12, 18, 28],
        default: 0
    },
    stock: {
        type: Number,
        default: 0
    },
    minStockAlert: {
        type: Number,
        default: 10
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure product code is unique per business
ProductSchema.index({ business: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Product', ProductSchema);
