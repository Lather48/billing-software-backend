const puppeteer = require('puppeteer');

/**
 * Generates a PDF buffer from bill data and business details.
 * 
 * @param {Object} bill - The bill object containing items and totals
 * @param {Object} business - The business profile settings
 * @returns {Buffer} A promise that resolves to the generated PDF Buffer
 */
const generateInvoicePDF = async (bill, business) => {
    try {
        // Launch a new headless browser instance
        console.log('Generating PDF Invoice for Bill', bill.billNumber);
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Construct HTML content mimicking the BillPreview.jsx template
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice ${bill.billNumber}</title>
            <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
            </style>
        </head>
                <body class="bg-gray-100 text-gray-800 p-0 m-0 text-sm">
            <div class="max-w-4xl mx-auto bg-white min-h-[1056px] p-12 shadow-sm font-sans relative">
                <!-- Header -->
                <div class="flex justify-between items-start pb-8 border-b-2 border-gray-100">
                    <div class="flex gap-6 items-center">
                        ${business?.logo ? `<img src="${business.logo}" class="w-20 h-20 object-contain rounded" />` : ''}
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900 tracking-tight">${business?.name || 'Your Business Name'}</h1>
                            <p class="text-gray-500 mt-1">${business?.address || 'City, State, ZIP'}</p>
                            <div class="text-gray-400 mt-1 flex gap-3">
                                ${business?.phone ? `<span>Ph: ${business.phone}</span>` : ''}
                                ${business?.email ? `<span>| ${business.email}</span>` : ''}
                            </div>
                            ${business?.gstNumber ? `<p class="text-gray-500 mt-1 font-medium">GSTIN: ${business.gstNumber}</p>` : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <h2 class="text-5xl font-light text-gray-200 uppercase tracking-widest mb-4">Invoice</h2>
                        <div class="text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 text-left min-w-[200px]">
                            <div class="flex justify-between mb-2"><span class="text-gray-400">Invoice No:</span> <span class="font-bold text-gray-900">${bill.billNumber}</span></div>
                            <div class="flex justify-between mb-2"><span class="text-gray-400">Date:</span> <span class="font-medium text-gray-900">${new Date(bill.billDate).toLocaleDateString('en-GB')}</span></div>
                            ${bill.dueDate ? `<div class="flex justify-between"><span class="text-gray-400">Due:</span> <span class="font-medium text-gray-900">${new Date(bill.dueDate).toLocaleDateString('en-GB')}</span></div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Bill To -->
                <div class="py-10 flex justify-between items-center bg-white relative">
                    <div class="w-1/2">
                        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Billed To</h3>
                        <p class="text-xl font-semibold text-gray-900">${bill.customerName || 'Walk-in Customer'}</p>
                        ${bill.customerPhone ? `<p class="text-gray-600 mt-1">Ph: ${bill.customerPhone}</p>` : ''}
                    </div>
                    ${bill.status === 'paid' || bill.balanceDue === 0 ? '<div class="absolute right-0 top-1/2 -translate-y-1/2 border-4 border-green-500 text-green-500 px-6 py-2 rounded-xl text-3xl font-black uppercase tracking-widest -rotate-12 opacity-50">PAID</div>' : ''}
                </div>

                <!-- Table -->
                <div class="mb-10 rounded-xl overflow-hidden border border-gray-200">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200">
                                <th class="py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider w-2/5">Description</th>
                                <th class="py-4 px-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                                <th class="py-4 px-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                                <th class="py-4 px-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Dis.</th>
                                <th class="py-4 px-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tax</th>
                                <th class="py-4 px-5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${bill.items.map((item, index) => `
                                <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
                                    <td class="py-4 px-5">
                                        <p class="font-semibold text-gray-900">${item.name}</p>
                                        ${item.code ? `<p class="text-xs text-gray-400 mt-1">${item.code}</p>` : ''}
                                    </td>
                                    <td class="py-4 px-3 text-center text-gray-600">${item.qty} <span class="text-xs text-gray-400">${item.unit || 'pcs'}</span></td>
                                    <td class="py-4 px-3 text-right text-gray-600">₹${item.price.toFixed(2)}</td>
                                    <td class="py-4 px-3 text-right ${item.discount > 0 ? 'text-green-600' : 'text-gray-400'}">${item.discount > 0 ? `${item.discount}%` : '-'}</td>
                                    <td class="py-4 px-3 text-right text-gray-500">${item.gstRate || 0}%</td>
                                    <td class="py-4 px-5 text-right font-semibold text-gray-900">₹${item.total.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Totals & Payment -->
                <div class="flex justify-between pt-4 gap-12">
                    <div class="w-1/2">
                        ${business?.bankDetails?.accountNumber ? `
                            <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Payment Details</h4>
                            <div class="text-gray-600 bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <p class="mb-2 flex justify-between"><span class="text-gray-400">Bank:</span> <span class="font-medium text-gray-900">${business.bankDetails.bankName}</span></p>
                                <p class="mb-2 flex justify-between"><span class="text-gray-400">Account:</span> <span class="font-medium text-gray-900">${business.bankDetails.accountName}</span></p>
                                <p class="mb-2 flex justify-between"><span class="text-gray-400">A/C No:</span> <span class="font-medium text-gray-900">${business.bankDetails.accountNumber}</span></p>
                                <p class="flex justify-between"><span class="text-gray-400">IFSC:</span> <span class="font-medium text-gray-900">${business.bankDetails.ifscCode}</span></p>
                                ${business?.upiId ? `<p class="mt-4 pt-4 border-t border-gray-200 flex justify-between"><span class="text-gray-400">UPI ID:</span> <span class="font-bold text-indigo-600">${business.upiId}</span></p>` : ''}
                            </div>
                        ` : (business?.upiId ? `
                            <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">UPI Payment</h4>
                            <div class="text-gray-600 bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <p class="font-bold text-indigo-600 text-lg">${business.upiId}</p>
                            </div>
                        ` : '')}
                    </div>
                    
                    <div class="w-1/2">
                        <div class="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                            <div class="flex justify-between py-2"><span class="text-gray-500">Subtotal</span><span class="font-medium text-gray-900">₹${bill.subtotal?.toFixed(2) || '0.00'}</span></div>
                            ${bill.totalDiscount > 0 ? `<div class="flex justify-between py-2"><span class="text-gray-500">Discount</span><span class="font-medium text-green-600">-₹${bill.totalDiscount?.toFixed(2) || '0.00'}</span></div>` : ''}
                            ${bill.totalGST > 0 ? `<div class="flex justify-between py-2"><span class="text-gray-500">Tax/GST</span><span class="font-medium text-gray-900">₹${bill.totalGST?.toFixed(2) || '0.00'}</span></div>` : ''}
                            
                            <div class="mt-4 bg-gray-900 text-white rounded-xl p-5 flex justify-between items-center shadow-md">
                                <span class="text-sm uppercase tracking-widest font-semibold text-gray-300">Total Due</span>
                                <span class="text-3xl font-bold tracking-tight">₹${bill.grandTotal?.toLocaleString('en-IN') || '0'}</span>
                            </div>
                            
                            ${bill.amountPaid > 0 ? `
                            <div class="flex justify-between py-3 mt-4 border-t border-gray-200"><span class="text-gray-500">Amount Paid</span><span class="font-medium text-gray-900">₹${bill.amountPaid?.toLocaleString('en-IN') || '0'}</span></div>
                            <div class="flex justify-between py-2"><span class="text-gray-500">Balance</span><span class="font-bold border px-2 py-0.5 rounded ${bill.balanceDue > 0 ? 'text-red-600 border-red-200 bg-red-50' : 'text-green-600 border-green-200 bg-green-50'}">₹${bill.balanceDue?.toLocaleString('en-IN') || '0'}</span></div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="absolute bottom-12 left-12 right-12 border-t-2 border-gray-100 pt-8 flex justify-between items-end">
                    <div class="w-2/3 pr-8">
                        <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Terms & Conditions</h4>
                        <p class="text-[11px] text-gray-500 whitespace-pre-line leading-relaxed">${business?.termsConditions || "1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is delayed."}</p>
                    </div>
                    <div class="w-1/3 text-right">
                        <p class="text-indigo-600 font-medium mb-3">Thank you for your business!</p>
                        ${business?.socialLinks ? `
                        <div class="flex flex-col items-end gap-1.5 text-[11px] text-gray-400 font-medium tracking-wide">
                            ${business.socialLinks.website ? `<span>${business.socialLinks.website.replace('https://', '')}</span>` : ''}
                            ${business.socialLinks.instagram ? `<span>@${business.socialLinks.instagram}</span>` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        // Set the content and wait for Tailwind to compile inline
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // Generate the PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();
        console.log('PDF Generated successfully!');

        // Return the raw buffer to be attached in WhatsApp
        return pdfBuffer;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

module.exports = { generateInvoicePDF };
