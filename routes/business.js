const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Business = require('../models/Business');
const whatsapp = require('../services/whatsappClient');

// @route   PUT /api/business
// @desc    Update business settings
// @access  Private
router.put('/', auth, async (req, res) => {
    const {
        name, phone, email, address, gstNumber, panNumber,
        businessType, invoicePrefix, invoiceCounter, upiId,
        bankDetails, termsConditions, logo, socialLinks
    } = req.body;

    try {
        let business = await Business.findById(req.user.businessId);

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Check if user is authorized to edit business
        // Assuming user.role = 'admin' has permission. Older users might have undefined role, default them to allowed.
        if (req.user.role && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update business profile' });
        }

        const updatedFields = {};
        if (name !== undefined) updatedFields.name = name;
        if (phone !== undefined) updatedFields.phone = phone;
        if (email !== undefined) updatedFields.email = email;
        if (address !== undefined) updatedFields.address = address;
        if (gstNumber !== undefined) updatedFields.gstNumber = gstNumber;
        if (panNumber !== undefined) updatedFields.panNumber = panNumber;
        if (businessType !== undefined) updatedFields.businessType = businessType;
        if (invoicePrefix !== undefined) updatedFields.invoicePrefix = invoicePrefix;
        if (invoiceCounter !== undefined) updatedFields.invoiceCounter = invoiceCounter;
        if (upiId !== undefined) updatedFields.upiId = upiId;
        if (bankDetails !== undefined) updatedFields.bankDetails = bankDetails;
        if (termsConditions !== undefined) updatedFields.termsConditions = termsConditions;
        if (logo !== undefined) updatedFields.logo = logo;
        if (socialLinks !== undefined) updatedFields.socialLinks = socialLinks;

        business = await Business.findByIdAndUpdate(
            req.user.businessId,
            { $set: updatedFields },
            { new: true }
        );

        res.json(business);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/business/upgrade
// @desc    Mock upgrade subscription plan
// @access  Private
router.put('/upgrade', auth, async (req, res) => {
    const { plan } = req.body; // 'monthly', 'biannual', 'yearly'

    if (!['free', 'monthly', 'biannual', 'yearly'].includes(plan)) {
        return res.status(400).json({ message: 'Invalid subscription plan' });
    }

    try {
        let business = await Business.findById(req.user.businessId);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        let expiryDate = new Date();
        if (plan === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else if (plan === 'biannual') {
            expiryDate.setMonth(expiryDate.getMonth() + 6);
        } else if (plan === 'yearly') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else {
            expiryDate = null; // Free plan has no strict expiry, just the 100 limit
        }

        business.subscriptionPlan = plan;
        business.subscriptionExpiry = expiryDate;

        await business.save();

        res.json({ message: `Successfully upgraded to ${plan} plan`, business });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/business
// @desc    Get current business details
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const business = await Business.findById(req.user.businessId);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        res.json(business);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/business/whatsapp-status
// @desc    Get current WhatsApp Bot Connection Status & QR Code
// @access  Private
router.get('/whatsapp-status', auth, async (req, res) => {
    try {
        const isReady = whatsapp.isClientReady();
        const qr = whatsapp.getCurrentQR();

        res.json({
            status: isReady ? 'connected' : (qr ? 'qr_ready' : 'initializing'),
            qrCode: qr
        });
    } catch (err) {
        console.error('WhatsApp Status Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
