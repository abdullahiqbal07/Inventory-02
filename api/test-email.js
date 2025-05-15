// api/test-email.js
import { sendAutomatedEmail, generateEmailHtml } from '../lib/email.js';

export default async function handler(req, res) {
  try {
    console.log("Starting test email process...");
    
    // Simple test data
    const shippingDetails = {
      name: "Test Customer",
      address: "123 Test St, Test City, TS 12345 Canada",
      contactNumber: "555-123-4567"
    };
    
    const productDetails = {
      sku: "TEST-SKU-123",
      productTitle: "Test Product",
      quantity: 1,
      poNumber: "TEST-12345",
      price: "99.99"
    };
    
    console.log("Generating email HTML...");
    const emailHtml = generateEmailHtml(shippingDetails, productDetails);
    
    console.log("Sending automated email...");
    const result = await sendAutomatedEmail(emailHtml, productDetails.poNumber);
    
    if (result) {
      console.log("Email sent successfully, returning 200 response");
      res.status(200).json({ success: true, message: "Test email sent successfully!" });
    } else {
      console.log("Email sending failed, returning 500 response");
      res.status(500).json({ success: false, message: "Failed to send test email" });
    }
  } catch (error) {
    console.error("Error in test email endpoint:", error);
    res.status(500).json({ success: false, message: error.message || "Unknown error occurred" });
  }
}