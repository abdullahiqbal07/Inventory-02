// File: /api/webhook/orders/create.js
import crypto from 'crypto';
import axios from 'axios';
import nodemailer from 'nodemailer';

export const config = {
  api: {
    bodyParser: false, // We need raw body for HMAC verification
  },
};

// Helper functions (same as your original)
async function getWarehouseType(order) {
  try {
    const fulfillmentOrders = await axios.get(
      `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/orders/${order.id}/fulfillment_orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_KEY,
        },
      }
    );
    
    if (fulfillmentOrders.data?.fulfillment_orders?.length > 0) {
      const [firstFulfillmentOrder] = fulfillmentOrders.data.fulfillment_orders;
      
      if (firstFulfillmentOrder.assigned_location?.name) {
        return firstFulfillmentOrder.assigned_location.name;
      }
      
      if (firstFulfillmentOrder.assigned_location_id) {
        const location = await axios.get(
          `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/locations/${firstFulfillmentOrder.assigned_location_id}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_KEY,
            },
          }
        );
        return location.data?.location?.name || "Unknown Location";
      }
    }

    if (order.line_items?.length > 0) {
      const [firstLineItem] = order.line_items;
      if (firstLineItem.vendor) {
        return `${firstLineItem.vendor} (Vendor Fulfilled)`;
      }
    }

    if (order.shipping_lines?.length > 0) {
      return order.shipping_lines[0].title;
    }

    return "Unknown Warehouse";
  } catch (error) {
    console.error("Failed to fetch warehouse type:", error.response?.data || error.message);
    return "Unknown Warehouse";
  }
}

async function getProductSupplier(productId) {
  try {
    const response = await axios.get(
      `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/products/${productId}/metafields.json`,
      { headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_KEY } }
    );
    const supplierMetafield = response.data.metafields.find(
      (meta) => meta.key === "supplier" || meta.namespace === "custom"
    );
    return supplierMetafield?.value || "No Supplier Found";
  } catch (error) {
    console.error("Failed to fetch supplier:", error.message);
    return "Unknown Supplier";
  }
}

function shouldSendEmail(warehouseType, supplier, shippingCountry) {
  const isDropShipWarehouse = warehouseType === "Generic Shipping";
  return isDropShipWarehouse;
}

const sendAutomatedEmail = async (emailHtml, poNumber) => {
  try {
    console.log("Attempting to send email...");
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });
    const info = await transporter.sendMail({
      from: `"BeHope" <${process.env.EMAIL}>`,
      to: ["abdullah@behope.ca", "haroon@behope.ca", "hader@behope.ca"], 
      subject: `Order Request for Account #62317 - PO ${poNumber}`,
      html: emailHtml,
    });
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error.message);
    return false;
  }
};

async function updateOrderTags(orderId, newTag) {
  try {
    const orderResponse = await axios.get(
      `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/orders/${orderId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_KEY,
        },
      }
    );
    const currentTags = orderResponse.data.order.tags || '';
    const tagsArray = currentTags.split(',').map(tag => tag.trim());
    if (!tagsArray.includes(newTag)) {
      tagsArray.push(newTag);
      const updatedTags = tagsArray.join(', ');
      await axios.put(
        `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/orders/${orderId}.json`,
        {
          order: {
            id: orderId,
            tags: updatedTags
          }
        },
        {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`Successfully added tag "${newTag}" to order ${orderId}`);
      return true;
    } else {
      console.log(`Tag "${newTag}" already exists on order ${orderId}`);
      return true;
    }
  } catch (error) {
    console.error(`Failed to update tags for order ${orderId}:`, error.message);
    return false;
  }
}

function generateEmailHtml(shippingDetails, productDetails) {
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

// Main handler function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Read raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');

    // Verify HMAC
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    const generatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
      .update(rawBody, 'utf8')
      .digest('base64');

    if (generatedHmac !== hmacHeader) {
      return res.status(401).send('Unauthorized - Invalid HMAC');
    }

    const order = JSON.parse(rawBody);
    console.log(order);

    res.status(200).send('Webhook received');

    // Process order
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
      if (emailSent) {
        await updateOrderTags(order.id, 'Test-Ordered');
      }
    }
    
    const extractedData = {
      shippingDetails,
      productDetails,
      warehouseType,
      supplier,
      shippingCountry,
      emailSent,
      action: emailSent ? 'processed' : 'skipped'
    };
    
    console.log('Extracted Order Data:', extractedData);
    
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    return res.status(500).send('Internal Server Error');
  }
}