const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Enable CORS
app.use(cors());

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/reports', require('./routes/reports'));

// Initialize WhatsApp Client (Headless Bot)
const { client } = require('./services/whatsappClient');

// Default message
app.get('/', (req, res) => {
    res.send('BillEasy API is running...');
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
console.log('Attempting to connect to MongoDB at:', process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/billeasy');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/billeasy')
    .then(() => {
        console.log('MongoDB connected successfully');
        const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

        // Graceful shutdown to destroy WhatsApp Client so nodemon reloads don't hang Chrome
        const gracefulShutdown = () => {
            console.log('\nShutting down server gracefully...');
            if (client) {
                console.log('Destroying WhatsApp Client...');
                client.destroy().then(() => {
                    console.log('WhatsApp Client destroyed.');
                    server.close(() => {
                        console.log('Express Server closed. Exiting process.');
                        process.exit(0);
                    });
                }).catch(err => {
                    console.error('Error destroying WhatsApp Client:', err);
                    server.close(() => process.exit(1));
                });
            } else {
                server.close(() => process.exit(0));
            }
        };

        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGUSR2', gracefulShutdown); // Nodemon restart signal
    })
    .catch(error => {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    });
