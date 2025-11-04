import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Address from "../models/Address.js";

const router = express.Router();

// 🔧 TEMPORARY USER ID FOR DEVELOPMENT (MATCHES FRONTEND MOCK)
const TEMP_USER_ID = "65b121e780d603417855f70a";

// ------------------------------------------------
// 🔐 Mock Authentication Middleware
// ------------------------------------------------
const mockAuthMiddleware = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(TEMP_USER_ID)) {
        console.error("Invalid TEMP_USER_ID format.");
        return res.status(500).json({ message: "Server configuration error. Please check TEMP_USER_ID." });
    }
    req.userId = TEMP_USER_ID; 
    next();
};

// =======================================================
// 🛒 A. PLACE ORDER (POST /api/orders/place) - FIXED FOR DB UPDATE
// =======================================================
router.post("/place", mockAuthMiddleware, async (req, res) => {
    const { items, deliveryDetails, totalAmount, payment, saveAddress } = req.body;
    const userId = req.userId;

    if (!items || !deliveryDetails || !totalAmount || !payment) {
        return res.status(400).json({ message: "Missing required order information." });
    }

    try {
        // 1. Save the new Order
        // The frontend now sends the correct payment.status: 'Pending Verification'
        const newOrder = new Order({ 
            userId, 
            items, 
            deliveryDetails, 
            totalAmount, 
            payment 
        });
        const savedOrder = await newOrder.save();
        
        // 2. Fallback Conditional: Save address logic
        if (saveAddress && deliveryDetails.address && deliveryDetails.pincode) {
            const existingAddress = await Address.findOne({
                userId,
                address: deliveryDetails.address,
                pincode: deliveryDetails.pincode,
            });

            if (!existingAddress) {
                const newAddress = new Address({
                    userId,
                    ...deliveryDetails,
                    label: `${deliveryDetails.city} (${deliveryDetails.pincode})`,
                });
                await newAddress.save();
            }
        }
        
        res.status(201).json({ 
            message: "Order placed. Payment pending verification.",
            orderId: savedOrder._id
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            // FIX: Return clear, detailed Mongoose validation messages
            const validationErrors = Object.keys(err.errors).map(key => `${key}: ${err.errors[key].message}`).join('; ');
            return res.status(400).json({ message: "Order validation failed.", error: validationErrors });
        }
        console.error("Error placing order:", err);
        res.status(500).json({ message: "Failed to place order.", error: err.message });
    }
});

// =======================================================
// 📦 B. GET SAVED ADDRESSES (GET /api/orders/addresses)
// =======================================================
router.get("/addresses", mockAuthMiddleware, async (req, res) => {
    const userId = req.userId;
    try {
        const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: 1 });
        res.status(200).json(addresses);
    } catch (err) {
        console.error("Error fetching addresses:", err);
        res.status(500).json({ message: "Error fetching saved addresses." });
    }
});

// =======================================================
// ➕ NEW: ADD NEW ADDRESS (POST /api/orders/addresses) 🔑
// =======================================================
router.post("/addresses", mockAuthMiddleware, async (req, res) => {
    // Note: Use object destructuring to easily extract fields
    const { name, phone, email, address, city, pincode, label, isDefault } = req.body;
    const userId = req.userId;

    if (!name || !phone || !address || !city || !pincode) {
        return res.status(400).json({ message: "Missing required address fields." });
    }

    try {
        const newAddress = new Address({
            userId,
            name,
            phone,
            email,
            address,
            city,
            pincode,
            label: label || `${city}, ${pincode}`,
            isDefault: isDefault || false
        });

        // Set all other addresses to not default if this one is set as default
        if (newAddress.isDefault) {
            await Address.updateMany({ userId }, { isDefault: false });
        }

        const savedAddress = await newAddress.save();
        res.status(201).json({ message: "Address successfully added.", address: savedAddress });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: "Address validation failed.", error: err.message });
        }
        console.error("Error adding new address:", err);
        res.status(500).json({ message: "Failed to add new address." });
    }
});

// =======================================================
// ✏️ NEW: EDIT EXISTING ADDRESS (PUT /api/orders/addresses/:id) 🔑
// =======================================================
router.put("/addresses/:id", mockAuthMiddleware, async (req, res) => {
    const addressId = req.params.id;
    const updates = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
        return res.status(400).json({ message: "Invalid address ID format." });
    }

    try {
        // Ensure the user owns the address
        const address = await Address.findOne({ _id: addressId, userId });
        if (!address) {
            return res.status(404).json({ message: "Address not found or unauthorized." });
        }

        // Handle isDefault update separately to unset others
        if (updates.isDefault === true) {
            // Unset default for all other addresses
            await Address.updateMany({ userId, _id: { $ne: addressId } }, { isDefault: false });
        }

        // Prepare update object, avoiding changing userId
        const updateObject = {
            ...updates,
            userId: userId, 
            // Only update label if it was specifically passed or if city/pincode changed
            label: updates.label || (updates.city || updates.pincode ? `${updates.city || address.city}, ${updates.pincode || address.pincode}` : address.label)
        };


        const updatedAddress = await Address.findByIdAndUpdate(
            addressId,
            updateObject,
            { new: true, runValidators: true }
        );

        res.status(200).json({ 
            message: "Address successfully updated.", 
            address: updatedAddress 
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: "Address validation failed.", error: err.message });
        }
        console.error("Error updating address:", err);
        res.status(500).json({ message: "Failed to update address." });
    }
});

// =======================================================
// 📜 C. GET USER ORDER HISTORY (GET /api/orders/history)
// =======================================================
router.get("/history", mockAuthMiddleware, async (req, res) => {
    const userId = req.userId;
    try {
        const orders = await Order.find({ userId }) 
            .populate({
                path: 'items.productId',
                select: 'name photo', 
                model: 'Product'
            })
            .sort({ createdAt: -1 })
            .lean();

        // 🔧 Post-processing: Use saved fields if available, fall back to populated fields.
        const processedOrders = orders.map(order => ({
            ...order,
            items: order.items.map(item => ({
                ...item,
                photo: item.photo || item.productId?.photo || "https://via.placeholder.com/100",
                productId: item.productId?._id || item.productId,
                name: item.name || item.productId?.name || 'Product Not Found',
            })),
        }));
        
        res.status(200).json(processedOrders); 
    } catch (err) {
        console.error("Error fetching order history:", err);
        res.status(500).json({ message: "Error fetching order history." });
    }
});

// =======================================================
// 🧭 D. GET ALL ORDERS (ADMIN PANEL VIEW)
// =======================================================
router.get("/all", async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("userId", "name email")
            .populate({
                path: 'items.productId',
                select: 'name photo price',
                model: 'Product'
            })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(orders); 
    } catch (err) {
        console.error("Error fetching all orders for admin:", err);
        res.status(500).json({ message: "Failed to fetch all orders." });
    }
});

// =======================================================
// 🔄 E. UPDATE ORDER STATUS (PUT /api/orders/update-status/:id)
// =======================================================
router.put("/update-status/:id", mockAuthMiddleware, async (req, res) => {
    const orderId = req.params.id;
    const { status: newStatus } = req.body; 
    
    if (!newStatus) {
        return res.status(400).json({ message: "New status is required." });
    }

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }
        
        if (['Delivered', 'Failed', 'Cancelled'].includes(order.payment.status)) {
            return res.status(400).json({ 
                message: `Cannot change status of an order that is already ${order.payment.status}.` 
            });
        }
        
        const updateFields = { 'payment.status': newStatus };
        
        if (newStatus === 'Cancelled') {
            updateFields.cancelledAt = Date.now();
        }
        
        if (newStatus === 'Shipped' && !order.shippedAt) {
            updateFields.shippedAt = Date.now();
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            updateFields, 
            { new: true, runValidators: true } 
        );

        res.status(200).json({ 
            message: `Order status successfully updated to ${newStatus}.`,
            order: updatedOrder
        }); 
        
    } catch (err) {
        console.error("Error updating order status:", err);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                message: "Validation Failed. Check that the new status is in the Order schema enum.", 
                error: err.message 
            });
        }
        
        res.status(500).json({ message: "Server error during order status update." });
    }
});

export default router;