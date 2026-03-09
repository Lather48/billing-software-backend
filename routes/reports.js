const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// @route   GET /api/reports/dashboard
// @desc    Dashboard quick stats
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Today's Sales
        const todaySalesData = await Bill.aggregate([
            {
                $match: {
                    business: Object(req.user.businessId), // Note: might need mongoose.Types.ObjectId in a strict setup, but let's try straight first or standard populate 
                    createdAt: { $gte: today },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$grandTotal' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const todaySales = todaySalesData.length > 0 ? todaySalesData[0].totalSales : 0;
        const todayBillsCount = todaySalesData.length > 0 ? todaySalesData[0].count : 0;

        // 2. Pending Bills Count
        const pendingBills = await Bill.countDocuments({
            business: req.user.businessId,
            status: 'pending'
        });

        // 3. Low Stock Items Count
        const lowStockCount = await Product.countDocuments({
            business: req.user.businessId,
            $expr: { $lte: ['$stock', '$minStockAlert'] }
        });

        // 4. Total Customers
        const totalCustomers = await Customer.countDocuments({
            business: req.user.businessId
        });

        // 5. Recent Bills (last 5)
        const recentBills = await Bill.find({ business: req.user.businessId })
            .populate('customer', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            todaySales,
            todayBillsCount,
            pendingBills,
            lowStockCount,
            totalCustomers,
            recentBills
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/reports/sales
// @desc    Sales report by date range
// @access  Private
router.get('/sales', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let matchQuery = { business: req.user.businessId, status: { $ne: 'cancelled' } };

        if (startDate && endDate) {
            matchQuery.billDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const bills = await Bill.find(matchQuery).sort({ billDate: 1 });

        // Calculate totals
        const totalSales = bills.reduce((acc, bill) => acc + bill.grandTotal, 0);
        const totalTaxable = bills.reduce((acc, bill) => acc + bill.taxableAmount, 0);
        const totalGST = bills.reduce((acc, bill) => acc + bill.totalGST, 0);

        // Grouping by date for line chart might be needed in frontend, we return the raw bills for flexibility
        res.json({
            summary: { totalSales, totalTaxable, totalGST, billCount: bills.length },
            bills
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
