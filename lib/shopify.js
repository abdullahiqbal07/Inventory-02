import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function getWarehouseType(order) {
    try {
        const fulfillmentOrders = await axios.get(
            `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/orders/${order.id}/fulfillment_orders.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_KEY,
                },
            }
        );

        // Check for fulfillment orders array
        if (fulfillmentOrders.data?.fulfillment_orders?.length > 0) {
            const [firstFulfillmentOrder] = fulfillmentOrders.data.fulfillment_orders;

            // Check assigned_location structure
            if (firstFulfillmentOrder.assigned_location?.name) {
                return firstFulfillmentOrder.assigned_location.name;
            }

            // Fallback to location ID lookup
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

        // Handle line items safely
        if (order.line_items?.length > 0) {
            const [firstLineItem] = order.line_items;
            if (firstLineItem.vendor) {
                return `${firstLineItem.vendor} (Vendor Fulfilled)`;
            }
        }

        // Handle shipping lines safely
        if (order.shipping_lines?.length > 0) {
            return order.shipping_lines[0].title;
        }

        return "Unknown Warehouse";
    } catch (error) {
        console.log(":x: Failed to fetch warehouse type:", error.response?.data || error.message);
        return "Unknown Warehouse";
    }
}

export async function getProductSupplier(productId) {
    try {
        const response = await axios.get(
            `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/products/${productId}/metafields.json`,
            { headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_KEY } }
        );
        const supplierMetafield = response.data.metafields.find(
            (meta) => meta.key === "supplier" && meta.namespace === "custom"
        );
        return supplierMetafield?.value || "No Supplier Found";
    } catch (error) {
        console.log(":x: Failed to fetch supplier:", error.message);
        return "Unknown Supplier";
    }
}

export async function updateOrderTags(orderId, newTag) {
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

        // Check if tag already exists
        if (!tagsArray.includes(newTag)) {
            tagsArray.push(newTag);
            const updatedTags = tagsArray.join(', ');

            // Update the order with new tags
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
            console.log(`:information_source: Tag "${newTag}" already exists on order ${orderId}`);
            return true;
        }
    } catch (error) {
        console.log(`:x: Failed to update tags for order ${orderId}:`, error.message);
        return false;
    }
}

export async function riskOrders(order) {
    try {
        const riskResponse = await axios.get(
            `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/orders/${order.id}/risks.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_KEY,
                }
            },
        );
        const risks = riskResponse.data.risks;

        if (Array.isArray(risks) && risks.length > 0) {
            const score = parseFloat(risks[0].score); // or just risks[0].score if you want it as a string
            console.log(`Risk score for order ${order.id}: ${score}`);
            return score;
        } else {
            console.log(`No risk data found for order ${order.id}`);
            return null;
        }
    } catch (error) {
        console.log(`Failed to while fetching the risk order ${order.id}:`, error.message);
        return null;
    }
}

export async function checkAddressIssue(order) {
    try {
        const query = `
            query {
                order(id: "gid://shopify/Order/${order.id}") {
                    shippingAddress {
                        validationResultSummary
                    }
                }
            }
        `;

        const response = await axios.post(
            `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-10/graphql.json`,
            { query },
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        const validationResult = response?.data?.data?.order?.shippingAddress?.validationResultSummary;
        console.log(`Validation result for order ${order.id}:`, validationResult);
        return validationResult || null;

    } catch (error) {
        console.log(`Failed to fetch validationResultSummary for order ${order.id}:`, error.message);
        return null;
    }
}
