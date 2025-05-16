import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  getWarehouseType,
  getProductSupplier,
  updateOrderTags
} from '../../../lib/shopify.js';
import { sendAutomatedEmail, generateEmailHtml } from '../../../lib/email.js';

dotenv.config();
const SHOPIFY_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

// Helper function to determine if email should be sent
function shouldSendEmail(warehouseType, supplier, shippingCountry) {
  const isCanadaShipping = shippingCountry === "Canada";
  if (!isCanadaShipping) return false;
  const isBestBuySupplier = supplier === "Best Buy";
  if (!isBestBuySupplier) return false;
  const isDropShipWarehouse = warehouseType === "A - Dropship (Abbey Lane)";
  return isDropShipWarehouse;
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
    res.status(200).json({ message: 'Webhook received' });

    // Rest of your order processing logic
    if (order.line_items.length > 1) {
      console.log('Order contains multiple SKUs - processing manually');
      return;
    }

    // Extract Shipping & Product Details
    const shippingDetails = {
      name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
      address: `${order.shipping_address.address1}, ${order.shipping_address.city}, ${order.shipping_address.province_code} ${order.shipping_address.zip} ${order.shipping_address.country}`,
      contactNumber: order.shipping_address.phone,
    };

    const shippingCountry = order.shipping_address.country;
    const product = order.line_items[0];

    const productDetails = {
      sku: product.sku,
      productTitle: product.title + (product.variant_title ? ` - ${product.variant_title}` : ''),
      quantity: product.quantity,
      poNumber: order.order_number.toString(),
      price: product.price
    };

    const warehouseType = await getWarehouseType(order);
    const supplier = await getProductSupplier(product.product_id);

    // let emailSent = false;
    // let emailHtml = '';



    if (shouldSendEmail(warehouseType, supplier, shippingCountry)) {
      const emailHtml = generateEmailHtml(shippingDetails, productDetails);
      // emailHtml = generateEmailHtml(shippingDetails, productDetails);
      emailSent = await sendAutomatedEmail(emailHtml, productDetails.poNumber);

      if (emailSent) {
        await updateOrderTags(order.id, 'Test-Ordered');
        console.log("Email sent successfully, returning 200 response");
      } else {
        console.log("Email sending failed, returning 500 response");
        res.status(500).json({ success: false, message: "Failed to send test email" });
      }
    }

    // Final Output for logging
    const extractedData = {
      shippingDetails,
      productDetails,
      warehouseType,
      supplier,
      shippingCountry,
      emailSent,
      action: emailSent ? 'processed' : 'skipped'
    };

    console.log(':package: Extracted Order Data:', extractedData);

  } catch (error) {
    console.error('Error processing webhook:', error);

    // If we haven't sent a response yet, send an error
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}