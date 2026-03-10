const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

console.log('Initializing WhatsApp Client...');

const SESSION_DIR = path.join(__dirname, '../.wwebjs_auth/session');

if (fs.existsSync(SESSION_DIR)) {
    const lockFiles = ['lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'];
    lockFiles.forEach(file => {
        const filePath = path.join(SESSION_DIR, file);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`Cleared previous WhatsApp session lock: ${file}`);
            } catch (err) {
                console.error(`Warning: Could not clear ${file}:`, err.message);
            }
        }
    });
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    }
});

let isClientReady = false;
let currentQR = null;

client.on('qr', (qr) => {
    currentQR = qr;
    isClientReady = false;
    console.log('\n======================================================');
    console.log('SCAN THIS QR CODE IN WHATSAPP TO LINK THE BILLING SERVER');
    console.log('======================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isClientReady = true;
    currentQR = null;
    console.log('\n======================================================');
    console.log('WHATSAPP CLIENT READY! SERVER CAN NOW SEND INVOICE PDFS');
    console.log('======================================================\n');
});

client.on('disconnected', (reason) => {
    isClientReady = false;
    currentQR = null;
    console.log('WhatsApp Client was disconnected:', reason);
    client.initialize().catch(err => console.error(err));
});

client.initialize().catch(err => {
    console.error('Failed to initialize WhatsApp Client:', err);
});

const sendInvoiceToWhatsApp = async (phone, text, pdfBuffer, filename) => {
    if (!isClientReady) {
        console.error('Attempted to send WhatsApp message but client is not ready.');
        throw new Error('WhatsApp Client is not ready. Please scan the QR code on the server terminal.');
    }

    try {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }
        const chatId = `${cleanPhone}@c.us`;

        const base64Data = Buffer.from(pdfBuffer).toString('base64');
        const media = new MessageMedia('application/pdf', base64Data, filename);

        console.log(`Sending WhatsApp Invoice PDF to ${cleanPhone}...`);
        await client.sendMessage(chatId, text, { media });
        console.log(`Invoice PDF successfully sent to ${cleanPhone}!`);

        return { success: true };
    } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        throw error;
    }
};

module.exports = {
    client,
    sendInvoiceToWhatsApp,
    isClientReady: () => isClientReady,
    getCurrentQR: () => currentQR
};
