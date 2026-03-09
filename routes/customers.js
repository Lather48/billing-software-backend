const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');
const Bill = require('../models/Bill');

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const customers = await Customer.find({ business: req.user.businessId }).sort({ createdAt: -1 });
        res.json(customers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/customers
// @desc    Add new customer
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, phone, email, address, gstNumber, creditLimit, notes } = req.body;

    try {
        const newCustomer = new Customer({
            business: req.user.businessId,
            name,
            phone,
            email,
            address,
            gstNumber,
            creditLimit,
            notes
        });

        const customer = await newCustomer.save();
        res.json(customer);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/customers/:id
// @desc    Get single customer and their bills
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const customer = await Customer.findOne({ _id: req.params.id, business: req.user.businessId });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        // Fetch bills for this customer
        const bills = await Bill.find({ customer: req.params.id, business: req.user.businessId }).sort({ createdAt: -1 });

        res.json({ customer, bills });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Customer not found' });
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { name, phone, email, address, gstNumber, creditLimit, notes } = req.body;

    try {
        let customer = await Customer.findOne({ _id: req.params.id, business: req.user.businessId });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        const customerFields = {};
        if (name) customerFields.name = name;
        if (phone) customerFields.phone = phone;
        if (email !== undefined) customerFields.email = email;
        if (address !== undefined) customerFields.address = address;
        if (gstNumber !== undefined) customerFields.gstNumber = gstNumber;
        if (creditLimit !== undefined) customerFields.creditLimit = creditLimit;
        if (notes !== undefined) customerFields.notes = notes;

        customer = await Customer.findByIdAndUpdate(
            req.params.id,
            { $set: customerFields },
            { new: true }
        );

        res.json(customer);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Customer not found' });
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/customers/:id
// @desc    Delete a customer
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const customer = await Customer.findOne({ _id: req.params.id, business: req.user.businessId });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        // Prevent deletion if customer has bills
        const billCount = await Bill.countDocuments({ customer: req.params.id });
        if (billCount > 0) {
            return res.status(400).json({ message: 'Cannot delete customer with existing bills' });
        }

        await customer.deleteOne();
        res.json({ message: 'Customer removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Customer not found' });
        res.status(500).send('Server Error');
    }
});

module.exports = router;
