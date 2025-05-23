import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  getWarehouseType,
  getProductSupplier,
  updateOrderTags,
  riskOrders,
  checkAddressIssue,
} from '../../../lib/shopify.js';
import { sendAutomatedEmail, generateEmailHtml, generateEmailHtmlRisk, sendAutomatedEmailRisk, generateWarningEmailHtml, sendAutomatedEmailWarning } from '../../../lib/email.js';

dotenv.config();
const SHOPIFY_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;


function shouldSendEmailForProduct(warehouseType, supplier, shippingCountry) {
  const isCanadaShipping = shippingCountry === "Canada";
  if (!isCanadaShipping) return false;
  const isBestBuySupplier = supplier === "Best Buy";
  if (!isBestBuySupplier) return false;
  const isDropShipWarehouse = warehouseType === "A - Dropship (Abbey Lane)";
  return isDropShipWarehouse;
}

// Helper function to check if all products meet the criteria
async function checkAllProducts(order) {
  const shippingCountry = order.shipping_address.country;
  const isCanadaShipping = shippingCountry === "Canada";

  if (!isCanadaShipping) return false;

  // Check each product in the order
  for (const product of order.line_items) {
    const warehouseType = await getWarehouseType(order, product.variant_id);
    const supplier = await getProductSupplier(product.product_id);

    if (!shouldSendEmailForProduct(warehouseType, supplier, shippingCountry)) {
      return false;
    }
  }

  return true;
}

export const config = {
  api: {
    // IMPORTANT: This disables the default body parsing
    bodyParser: false,
  },
};

// Helper to get raw request body
const getRawBody = async (req) => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
  });
};

export default async function handler(req, res) {
  // Only allow POST method for webhooks
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the HMAC header
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    if (!hmacHeader) {
      console.error('Missing HMAC header');
      return res.status(401).json({ error: 'Unauthorized - Missing HMAC' });
    }

    // Get the raw request body as a string
    const rawBody = await getRawBody(req);
    console.log('Raw body received for signature verification');

    // Verify the HMAC signature
    const generatedHmac = crypto
      .createHmac('sha256', SHOPIFY_SECRET)
      .update(rawBody, 'utf8')
      .digest('base64');

    console.log('Expected:', hmacHeader);
    console.log('Generated:', generatedHmac);

    if (generatedHmac !== hmacHeader) {
      console.error('HMAC verification failed');
      return res.status(401).json({ error: 'Unauthorized - Invalid HMAC' });
    }

    // Parse the raw body as JSON
    const order = JSON.parse(rawBody);
    console.log('Order received:', order.id);

    // Return 200 response quickly to Shopify
    console.log("Webhook received");

    // Process address
    let address = order.shipping_address.address2;
    let processedAddress = "";

    if (!address || address.trim() === "") {
      processedAddress = address;
    } else {
      processedAddress = address.toLowerCase().replace(/\s+/g, '');
      if (/^\d+unit/.test(processedAddress)) {
        const number = processedAddress.match(/^(\d+)unit/)[1];
        processedAddress = 'Unit ' + number;
      }
      else if (!/unit\d*/.test(processedAddress)) {
        const unitNumberMatch = processedAddress.match(/\d+/);
        const unitNumber = unitNumberMatch ? unitNumberMatch[0] : '';
        processedAddress = 'Unit ' + unitNumber;
      }
      else {
        processedAddress = processedAddress.replace(/unit(\d+)/, 'Unit $1');
      }
      console.log(processedAddress);
    }

    // Extract Shipping Details
    const shippingDetails = {
      name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
      address: `${order.shipping_address.address1}, ${processedAddress ? processedAddress : ""}${processedAddress ? ", " : ""} ${order.shipping_address.city}, ${order.shipping_address.province_code} ${order.shipping_address.zip} ${order.shipping_address.country}`,
      contactNumber: order.shipping_address.phone,
      poNumber: order.name,
    };

    const shippingCountry = order.shipping_address.country;

    // Check if all products meet the criteria
    const allProductsQualify = await checkAllProducts(order);

    if (allProductsQualify) {
      console.log("All products qualify for email sending");

      // Prepare product details for all items
      const productDetailsList = order.line_items.map(product => ({
        sku: product.sku,
        productTitle: product.title + (product.variant_title ? ` - ${product.variant_title}` : ''),
        quantity: product.quantity,
        price: Number(
          ((Number(product.price) * product.quantity) - Number(product.total_discount)).toFixed(2)
        )
      }));

      const score = await riskOrders(order);
      if (score > 0.5) {
        const emailHtml = generateEmailHtmlRisk(shippingDetails, productDetailsList);
        const emailSent = await sendAutomatedEmailRisk(emailHtml, shippingDetails.poNumber);
        return res.status(200).json({ message: "Failed to send test email" });
      }


      const addressIssue = await checkAddressIssue(order);
      if (addressIssue === 'WARNING') {
        const emailHtml = generateWarningEmailHtml(shippingDetails, productDetailsList);
        const emailSent = await sendAutomatedEmailWarning(emailHtml, shippingDetails.poNumber);
        return res.status(200).json({ message: "Failed to send test email" });
      }

      // Generate email with all products
      const emailHtml = generateEmailHtml(shippingDetails, productDetailsList);
      const emailSent = await sendAutomatedEmail(emailHtml, order.name);

      if (emailSent) {
        await updateOrderTags(order.id, 'JARVIS - Ordered');
        console.log("Email sent successfully, returning 200 response");

      } else {
        console.log("Email sending failed for multiple products");
        res.status(500).json({ success: false, message: "Failed to send test email" });
      }
    } else {
      console.log("Not all products qualify for email sending");
    }


    // Final Output for logging
    const extractedData = {
      shippingDetails,
      productDetails: order.line_items.map(product => ({
        sku: product.sku,
        title: product.title,
        quantity: product.quantity
      })),
      shippingCountry,
      allProductsQualify
    };

    console.log(':package: Extracted Order Data:', extractedData);
    res.status(200).json({ message: 'All Done' });

  } catch (error) {
    console.error('Error processing webhook:', error);

    // If we haven't sent a response yet, send an error
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}