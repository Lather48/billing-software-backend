const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');

// @route   GET /api/products
// @desc    Get all products for a business
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const products = await Product.find({ business: req.user.businessId }).sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/products/low-stock
// @desc    Get low stock items
// @access  Private
router.get('/low-stock', auth, async (req, res) => {
    try {
        const products = await Product.find({
            business: req.user.businessId,
            $expr: { $lte: ['$stock', '$minStockAlert'] }
        });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/products
// @desc    Add a new product
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, code, category, unit, purchasePrice, sellingPrice, gstRate, stock, minStockAlert } = req.body;

    try {
        // Check if product code already exists for this business
        let existingProduct = await Product.findOne({ business: req.user.businessId, code });
        if (existingProduct) {
            return res.status(400).json({ message: 'Product code already exists' });
        }

        const newProduct = new Product({
            business: req.user.businessId,
            name,
            code,
            category,
            unit,
            purchasePrice,
            sellingPrice,
            gstRate,
            stock,
            minStockAlert
        });

        const product = await newProduct.save();
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, business: req.user.businessId });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Product not found' });
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { name, code, category, unit, purchasePrice, sellingPrice, gstRate, stock, minStockAlert, isActive } = req.body;

    try {
        let product = await Product.findOne({ _id: req.params.id, business: req.user.businessId });
        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Build product object
        const productFields = {};
        if (name) productFields.name = name;
        if (code) productFields.code = code;
        if (category) productFields.category = category;
        if (unit) productFields.unit = unit;
        if (purchasePrice !== undefined) productFields.purchasePrice = purchasePrice;
        if (sellingPrice !== undefined) productFields.sellingPrice = sellingPrice;
        if (gstRate !== undefined) productFields.gstRate = gstRate;
        if (stock !== undefined) productFields.stock = stock;
        if (minStockAlert !== undefined) productFields.minStockAlert = minStockAlert;
        if (isActive !== undefined) productFields.isActive = isActive;

        product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: productFields },
            { new: true }
        );

        res.json(product);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Product not found' });
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, business: req.user.businessId });
        if (!product) return res.status(404).json({ message: 'Product not found' });

        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Product not found' });
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/products/:id/stock
// @desc    Update stock
// @access  Private
router.post('/:id/stock', auth, async (req, res) => {
    const { type, quantity, note } = req.body; // type: 'add' or 'remove'

    if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than zero' });
    }

    try {
        const product = await Product.findOne({ _id: req.params.id, business: req.user.businessId });
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (type === 'add') {
            product.stock += quantity;
        } else if (type === 'remove') {
            if (product.stock < quantity) {
                return res.status(400).json({ message: 'Insufficient stock' });
            }
            product.stock -= quantity;
        } else {
            return res.status(400).json({ message: 'Invalid operation type' });
        }

        await product.save();
        res.json(product);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Product not found' });
        res.status(500).send('Server Error');
    }
});

module.exports = router;
