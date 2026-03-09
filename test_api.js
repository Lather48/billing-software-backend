const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign(
    { user: { id: '69abbf799ae87e6ae090d815', businessId: '69abbf799ae87e6ae090d817', role: 'admin' } },
    process.env.JWT_SECRET || 'secret123',
    { expiresIn: '1h' }
);

const testData = {
    customerName: 'REST Automation Test',
    customerPhone: '9999999999',
    items: [{ name: 'Test Product', qty: 1, price: 100, total: 100 }],
    subtotal: 100,
    totalDiscount: 0,
    taxableAmount: 100,
    totalGST: 0,
    cgst: 0,
    sgst: 0,
    grandTotal: 100,
    paymentMode: 'cash',
    amountPaid: 100,
    balanceDue: 0,
    status: 'paid',
    billDate: new Date()
};

console.log('Sending POST request to /api/bills...');
axios.post('http://localhost:5000/api/bills', testData, {
    headers: { Authorization: `Bearer ${token}` }
})
    .then(res => {
        console.log('✅ Bill created successfully:', res.data.billNumber);
        console.log('Waiting 10 seconds to allow background WhatsApp processing to complete...');
        setTimeout(() => {
            console.log('Test completed.');
            process.exit(0);
        }, 10000);
    })
    .catch(err => {
        console.error('❌ Error creating bill:', err.response ? err.response.data : err.message);
        process.exit(1);
    });
