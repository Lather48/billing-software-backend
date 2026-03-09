const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Bill = require('../models/Bill');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { generateInvoicePDF } = require('../services/pdfGenerator');
const whatsapp = require('../services/whatsappClient');

// Helper function to generate bill number
const generateBillNumber = async (businessId) => {
    const business = await Business.findById(businessId);
    const counter = business.invoiceCounter;
    const year = new Date().getFullYear();
    const billNo = `${business.invoicePrefix}-${year}-${String(counter).padStart(4, '0')}`;

    // Increment the counter
    await Business.findByIdAndUpdate(businessId, { $inc: { invoiceCounter: 1 } });
    return billNo;
};

// @route   GET /api/bills
// @desc    Get all bills for a business with optional filters
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { status, paymentMode, startDate, endDate, search } = req.query;
        let query = { business: req.user.businessId };

        if (status) query.status = status;
        if (paymentMode) query.paymentMode = paymentMode;

        if (startDate && endDate) {
            query.billDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Populate customer to allow search (if applicable)
        let bills = await Bill.find(query)
            .populate('customer', 'name phone')
            .sort({ createdAt: -1 });

        // In-memory search if specific search query is present
        if (search) {
            const lowerSearch = search.toLowerCase();
            bills = bills.filter(bill => {
                return (
                    bill.billNumber.toLowerCase().includes(lowerSearch) ||
                    (bill.customer && bill.customer.name.toLowerCase().includes(lowerSearch)) ||
                    (bill.customerName && bill.customerName.toLowerCase().includes(lowerSearch))
                );
            });
        }

        res.json(bills);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/bills
// @desc    Create new bill
// @access  Private
router.post('/', auth, async (req, res) => {
    const {
        customer, customerName, customerPhone, items,
        subtotal, totalDiscount, taxableAmount, totalGST, cgst, sgst, grandTotal,
        paymentMode, amountPaid, balanceDue, status, notes, billDate, dueDate
    } = req.body;

    try {
        // --- SUBSCRIPTION LIMIT CHECK ---
        const businessInfo = await Business.findById(req.user.businessId);
        if (!businessInfo) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // If the plan is free OR the subscription has expired, enforce the limit
        const isFreePlan = !businessInfo.subscriptionPlan || businessInfo.subscriptionPlan === 'free';
        const isExpired = businessInfo.subscriptionExpiry && new Date() > new Date(businessInfo.subscriptionExpiry);

        if (isFreePlan || isExpired) {
            const billCount = await Bill.countDocuments({ business: req.user.businessId });
            if (billCount >= 100) {
                return res.status(403).json({
                    message: isExpired
                        ? 'Your subscription has expired. Please renew your plan to continue generating invoices.'
                        : 'You have reached the limit of 100 free invoices. Please upgrade your plan to generate more.',
                    requiresUpgrade: true
                });
            }
        }
        // --------------------------------

        // 1. Generate Bill Number
        const billNumber = await generateBillNumber(req.user.businessId);

        const newBill = new Bill({
            business: req.user.businessId,
            billNumber,
            customer,
            customerName,
            customerPhone,
            items,
            subtotal,
            totalDiscount,
            taxableAmount,
            totalGST,
            cgst,
            sgst,
            grandTotal,
            paymentMode,
            amountPaid,
            balanceDue,
            status,
            notes,
            billDate: billDate || Date.now(),
            dueDate
        });

        const bill = await newBill.save();

        // 2. Update Customer Total Due if balance > 0
        if (customer && balanceDue > 0) {
            await Customer.findByIdAndUpdate(customer, {
                $inc: { totalDue: balanceDue }
            });
        }

        // 3. Update Product Stock
        for (let item of items) {
            if (item.product) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: -item.qty } // Reduce stock
                });
            }
        }

        res.json(bill);

        // 4. Fire-and-Forget: Try generating PDF and sending via WhatsApp Bot
        const phoneToSend = customerPhone || (customer ? await Customer.findById(customer).then(c => c?.phone) : null);

        if (phoneToSend && whatsapp.isClientReady()) {
            const businessDetails = await Business.findById(req.user.businessId);
            const myBusinessName = businessDetails?.name || 'Our Store';
            const customerDisplayName = customerName || (customer ? await Customer.findById(customer).then(c => c?.name) : '');

            let socialText = '';
            if (businessDetails?.socialLinks) {
                const sl = businessDetails.socialLinks;
                if (sl.instagram || sl.facebook || sl.website) {
                    socialText = '\n\n💫 *Let\'s Stay Connected!* 💫\n';
                    if (sl.instagram) socialText += `📸 Insta: @${sl.instagram}\n`;
                    if (sl.facebook) socialText += `💙 FB: ${sl.facebook}\n`;
                    if (sl.website) socialText += `🌐 Web: ${sl.website}\n`;
                }
            }

            let messageBody = `Hi ${customerDisplayName}! 👋✨\n\nThank you sooo much for choosing *${myBusinessName}*! 🥰🛍️ We truly appreciate you.\n\nHere is your shiny new invoice #${billNumber} 🧾👇\n\n💰 *Total:* ₹${grandTotal.toLocaleString('en-IN')}\n`;

            if (balanceDue > 0) {
                messageBody += `💸 *Due left:* ₹${balanceDue.toLocaleString('en-IN')}`;
                if (bill.dueDate) messageBody += ` (by ${new Date(bill.dueDate).toLocaleDateString('en-GB')})`;
                messageBody += '\n';
            } else {
                messageBody += `✅ *Paid in Full!*\n`;
            }

            messageBody += `\nHave a beautiful and happy day! 🌸💖${socialText}`;

            generateInvoicePDF(bill, businessDetails)
                .then(pdfBuffer => {
                    return whatsapp.sendInvoiceToWhatsApp(
                        phoneToSend,
                        messageBody,
                        pdfBuffer,
                        `Invoice_${billNumber}.pdf`
                    );
                })
                .catch(botErr => {
                    console.error(`WhatsApp Bot failed for bill ${billNumber}:`, botErr.message);
                });
        } else if (phoneToSend && !whatsapp.isClientReady()) {
            console.warn(`WhatsApp Bot is NOT ready. Could not send PDF to ${phoneToSend} for bill ${billNumber}.`);
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/bills/:id
// @desc    Get single bill
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const bill = await Bill.findOne({ _id: req.params.id, business: req.user.businessId })
            .populate('customer', 'name phone email address gstNumber');

        if (!bill) return res.status(404).json({ message: 'Bill not found' });

        res.json(bill);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Bill not found' });
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/bills/:id
// @desc    Update a bill (primarily for payment status/balance updates)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { status, amountPaid, balanceDue, paymentMode, notes } = req.body;

    try {
        let bill = await Bill.findOne({ _id: req.params.id, business: req.user.businessId });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });

        // Calculate difference logic for customer total due if this is updating a balance
        // This gets complicated if we change the bill amount, so generally we only
        // allow updating payment status/balance, not the core items.

        const previousBalance = bill.balanceDue;

        if (status) bill.status = status;
        if (amountPaid !== undefined) bill.amountPaid = amountPaid;
        if (balanceDue !== undefined) bill.balanceDue = balanceDue;
        if (paymentMode) bill.paymentMode = paymentMode;
        if (notes !== undefined) bill.notes = notes;

        await bill.save();

        // If customer linked, adjust balance
        if (bill.customer && balanceDue !== undefined && balanceDue !== previousBalance) {
            const difference = balanceDue - previousBalance;
            await Customer.findByIdAndUpdate(bill.customer, {
                $inc: { totalDue: difference }
            });
        }

        res.json(bill);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Bill not found' });
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/bills/:id
// @desc    Delete a bill (Cancel it)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const bill = await Bill.findOne({ _id: req.params.id, business: req.user.businessId });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });

        // Reverse stock taking
        for (let item of bill.items) {
            if (item.product) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.qty } // Add back stock
                });
            }
        }

        // Reverse customer balance
        if (bill.customer && bill.balanceDue > 0) {
            await Customer.findByIdAndUpdate(bill.customer, {
                $inc: { totalDue: -bill.balanceDue }
            });
        }

        await bill.deleteOne();
        res.json({ message: 'Bill removed and stock/balance reversed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Bill not found' });
        res.status(500).send('Server Error');
    }
});

module.exports = router;
