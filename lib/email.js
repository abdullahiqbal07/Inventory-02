// lib/email.js - Fixed import paths for Vercel
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

export function generateEmailHtml(shippingDetails, productDetails) {
    return `
    <html>
      <body>
        <p>Dear Team Best Buy,</p>
        <p>I hope this message finds you well. We are writing to formally place an order on behalf of our account number 62317 and would appreciate your assistance in processing it promptly.</p>
        <p><strong>Shipping Details:</strong></p>
        <ul>
          <li><strong>Name:</strong> ${shippingDetails.name}</li>
          <li><strong>Address:</strong> ${shippingDetails.address}</li>
          <li><strong>Contact Number:</strong> ${shippingDetails.contactNumber}</li>
        </ul>
        <p><strong>Product Details:</strong></p>
        <ul>
          <li><strong>SKU:</strong> ${productDetails.sku}</li>
          <li><strong>Product Title:</strong> ${productDetails.productTitle}</li>
          <li><strong>Quantity:</strong> ${productDetails.quantity}</li>
          <li><strong>PO #:</strong> ${productDetails.poNumber}</li>
          <li><strong>Max Approval Amount:</strong> $${productDetails.price}</li>
        </ul>
        <p>If the item is unavailable in the primary warehouse, please fulfill the order from any warehouse with available stock. Kindly send the Order Confirmation once processed.</p>
        <p>Thank you, <br/>BeHope Team</p>
      </body>
    </html>
  `;
}

export const sendAutomatedEmail = async (emailHtml, poNumber) => {
    try {
        console.log("Attempting to send email...");
        console.log("Email config:", { 
            user: process.env.EMAIL ? "Email exists" : "Email missing",
            pass: process.env.PASSWORD ? "Password exists" : "Password missing"
        });
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL || 'orders@behope.ca',
                pass: process.env.PASSWORD || 'qqdfmpiwtbjlkqec'
            }
        });
        
        const info = await transporter.sendMail({
            from: `"BeHope" <${process.env.EMAIL || 'orders@behope.ca'}>`,
            to: ["abdullah@behope.ca", "haroon@behope.ca", "hader@behope.ca"], 
            subject: `Order Request for Account #62317 - PO ${poNumber}`,
            html: emailHtml,
        });
        
        console.log("Email sent successfully:", info.messageId);
        return true;
    } catch (error) {
        console.error("Failed to send email:", error);
        return false;
    }
};