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
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: `"BeHope" <${process.env.EMAIL || 'orders@behope.ca'}>`,
      to: ["abdullah@behope.ca", "haroon@behope.ca", "hader@behope.ca", "shahin@behope.ca", "shahana@behope.ca", "nadia@behope.ca", "orders@behope.ca"],
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

export function generateWarningEmailHtml(shippingDetails, productDetails) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <p>Hi Operations Team,</p>
        <p><strong>⚠️ Address validation returned “WARNING”.</strong><br/>
           Please contact the customer <em>before</em> fulfillment.</p>

        <h3>Shipping details</h3>
        <ul>
          <li><strong>Name:</strong> ${shippingDetails.name}</li>
          <li><strong>Address:</strong> ${shippingDetails.address}</li>
          <li><strong>Phone:</strong> ${shippingDetails.contactNumber}</li>
        </ul>

        <h3>Product details</h3>
        <ul>
          <li><strong>SKU:</strong> ${productDetails.sku}</li>
          <li><strong>Title:</strong> ${productDetails.productTitle}</li>
          <li><strong>Qty:</strong> ${productDetails.quantity}</li>
          <li><strong>PO #:</strong> ${productDetails.poNumber}</li>
          <li><strong>Price:</strong> $${productDetails.price}</li>
        </ul>

        <p>If the item is unavailable in the primary warehouse, please ship from any warehouse with stock.<br/>
           Send Order Confirmation once processed.</p>

        <p>Thank you,<br/>BeHope Team</p>
      </body>
    </html>`;
}

export function generateWarningEmailHtml2(shippingDetails, productDetails) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <p>Hi Operations Team,</p>
        <p><strong>⚠️ Address validation returned “WARNING”.</strong><br/>
           Please contact the customer <em>before</em> fulfillment.</p>

        <h3>Shipping details</h3>
        <ul>
          <li><strong>Name:</strong> ${shippingDetails.name}</li>
          <li><strong>Address:</strong> ${shippingDetails.address}</li>
          <li><strong>Phone:</strong> ${shippingDetails.contactNumber}</li>
        </ul>

        <h3>Product details</h3>
        <ul>
          <li><strong>SKU:</strong> ${productDetails.sku}</li>
          <li><strong>Title:</strong> ${productDetails.productTitle}</li>
          <li><strong>Qty:</strong> ${productDetails.quantity}</li>
          <li><strong>PO #:</strong> ${productDetails.poNumber}</li>
          <li><strong>Price:</strong> $${productDetails.price}</li>
        </ul>

        <p>Send Order Confirmation once processed.</p>

        <p>Thank you,<br/>Dev Team</p>
      </body>
    </html>`;
}

export const sendAutomatedEmailWarning = async (emailHtml, poNumber) => {
  try {
    console.log("Attempting to send email...");
    console.log("Email config:", {
      user: process.env.EMAIL ? "Email exists" : "Email missing",
      pass: process.env.PASSWORD ? "Password exists" : "Password missing"
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: `"BeHope" <${process.env.EMAIL || 'orders@behope.ca'}>`,
      to: ["abdullah@behope.ca", "haroon@behope.ca"],
      subject: `⚠️ Address issue for PO ${poNumber}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
};


export const sendAutomatedEmailRisk = async (emailHtml, poNumber) => {
  try {
    console.log("Attempting to send email...");
    console.log("Email config:", {
      user: process.env.EMAIL ? "Email exists" : "Email missing",
      pass: process.env.PASSWORD ? "Password exists" : "Password missing"
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: `"BeHope" <${process.env.EMAIL || 'orders@behope.ca'}>`,
      to: ["abdullah@behope.ca", "haroon@behope.ca",],
      subject: `🚩 High-Risk Order PO ${poNumber}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
};

export function generateEmailHtmlRisk(shippingDetails, productDetails) {
  return `
    <!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="background:#f7f7f7; padding:40px 15px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">
            <!-- banner -->
            <tr>
              <td style="background:#c1121f; padding:12px 24px; color:#ffffff; font-size:18px; font-weight:bold;">
                🚩 High-Risk Order Detected
              </td>
            </tr>

            <!-- intro -->
            <tr>
              <td style="padding:24px 24px 8px; font-size:14px; line-height:1.5; color:#555;">
                Hi Operations Team,<br/><br/>
                Shopify has flagged <strong>${productDetails.poNumber}</strong> as <em>high risk</em>.
                Please investigate and contact the customer <strong>before</strong> fulfilling the order.
              </td>
            </tr>

            <!-- shipping -->
            <tr>
              <td style="padding:0 24px 16px;">
                <h3 style="margin:16px 0 8px; font-size:16px; color:#333;">Shipping details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#555;">
                  <tr><td width="120">Name:</td><td>${shippingDetails.name}</td></tr>
                  <tr><td>Address:</td><td>${shippingDetails.address}</td></tr>
                  <tr><td>Phone:</td><td>${shippingDetails.contactNumber || "—"}</td></tr>
                </table>
              </td>
            </tr>

            <!-- product -->
            <tr>
              <td style="padding:0 24px 16px;">
                <h3 style="margin:16px 0 8px; font-size:16px; color:#333;">Product details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#555;">
                  <tr><td width="120">SKU:</td><td>${productDetails.sku}</td></tr>
                  <tr><td>Title:</td><td>${productDetails.productTitle}</td></tr>
                  <tr><td>Quantity:</td><td>${productDetails.quantity}</td></tr>
                  <tr><td>PO #:</td><td>${productDetails.poNumber}</td></tr>
                  <tr><td>Price:</td><td>$${productDetails.price}</td></tr>
                </table>
              </td>
            </tr>

            <!-- next steps -->
            <tr>
              <td style="padding:0 24px 24px; font-size:14px; line-height:1.5; color:#555;">
                Follow internal fraud-check procedures.  
                Mark the order safe or cancel it once verified.
              </td>
            </tr>

            <!-- footer -->
            <tr>
              <td style="background:#f7f7f7; padding:16px 24px; font-size:13px; color:#777;">
                Thank you,<br/><strong>Dev&nbsp;Team</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}