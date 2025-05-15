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

export default async function handler(req, res) {

  console.log('Webhook received');
  console.log('Headers:', req.headers);
  console.log('Body type:', typeof req.body);

  // Only allow POST method for webhooks
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    // Verify Shopify HMAC
    // const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];

    let rawBody;

    // If req.body is already parsed as JSON by Vercel
    if (typeof req.body === 'object') {
      rawBody = JSON.stringify(req.body);
    } else if (Buffer.isBuffer(req.body)) {
      // If body is a buffer (might happen in some cases)
      rawBody = req.body.toString('utf8');
    } else {
      // If body is a string
      rawBody = req.body;
    }

    const generatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
      .update(rawBody, 'utf8')
      .digest('base64');

    if (generatedHmac !== hmacHeader) {
      console.log('HMAC verification failed');
      console.log('Expected:', hmacHeader);
      console.log('Generated:', generatedHmac);
      return res.status(401).json({ error: 'Unauthorized - Invalid HMAC' });
    }

    const order = body;
    console.log('Order received:', order.id);

    // Return 200 response quickly to Shopify
    res.status(200).json({ message: 'Webhook received' });

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

    let emailSent = false;
    let emailHtml = '';

    if (shouldSendEmail(warehouseType, supplier, shippingCountry)) {
      emailHtml = generateEmailHtml(shippingDetails, productDetails);
      emailSent = await sendAutomatedEmail(emailHtml, productDetails.poNumber);

      // Update order tags if email was sent successfully
      if (emailSent) {
        await updateOrderTags(order.id, 'Test-Ordered');
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
    console.error('Error processing webhook:', error.message);
    // Note: We already sent 200 response to Shopify, 
    // so this error handling is for logging only
  }
}