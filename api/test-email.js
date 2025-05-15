// api/test-email.js
import { sendAutomatedEmail, generateEmailHtml } from '../../lib/email.js';

export default async function handler(req, res) {
  try {
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
    
    const emailHtml = generateEmailHtml(shippingDetails, productDetails);
    const result = await sendAutomatedEmail(emailHtml, productDetails.poNumber);
    
    if (result) {
      res.status(200).json({ success: true, message: "Test email sent successfully!" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send test email" });
    }
  } catch (error) {
    console.error("Error in test email endpoint:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}