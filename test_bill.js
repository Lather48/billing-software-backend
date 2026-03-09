const mongoose = require('mongoose');
const User = require('./models/User');
const Bill = require('./models/Bill');
const Business = require('./models/Business');
const dotenv = require('dotenv');
const { generateInvoicePDF } = require('./services/pdfGenerator');
const whatsapp = require('./services/whatsappClient');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/billeasy')
    .then(async () => {
        console.log('Connected to DB for test');
        const user = await User.findOne({ email: 'robinlather20@gmail.com' });
        if (!user) {
            console.log('User not found');
            return process.exit(1);
        }

        const business = await Business.findById(user.business);

        const testBill = new Bill({
            business: business._id,
            billNumber: 'TEST-001',
            customerName: 'Test Automator',
            customerPhone: '9999999999',
            items: [{ name: 'Test Product', qty: 1, price: 500, total: 500 }],
            subtotal: 500,
            grandTotal: 500,
            paymentMode: 'cash',
            amountPaid: 500,
            balanceDue: 0,
            status: 'paid',
            billDate: new Date()
        });

        console.log('Generating PDF...');
        const pdfBuffer = await generateInvoicePDF(testBill, business);

        console.log('Is WhatsApp Ready?', whatsapp.isClientReady());

        if (whatsapp.isClientReady()) {
            console.log('Sending to WhatsApp...');
            try {
                await whatsapp.sendInvoiceToWhatsApp(
                    '9999999999',
                    'Test message',
                    pdfBuffer,
                    'Test_Invoice.pdf'
                );
                console.log('Successfully Sent!');
            } catch (e) {
                console.error('WhatsApp Send Error:', e);
            }
        }

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
