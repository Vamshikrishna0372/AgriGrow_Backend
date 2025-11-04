import express from "express";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const router = express.Router();

// ------------------------------------------------------------------
// Helper function: Get populated cart for a user
// ------------------------------------------------------------------
const getPopulatedCart = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return null; 
    }
    // Note: 'quantity' in select refers to the product's available stock.
    return await Cart.findOne({ userId }).populate({
        path: "items.productId",
        // Included necessary fields from the Product model
        select: "name price category photo brand quantity", 
    });
};

// ------------------------------------------------------------------
// 1. GET user cart → GET /api/cart/:userId
// ------------------------------------------------------------------
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid or missing userId" });
        }

        const cart = await getPopulatedCart(userId);
        if (!cart) {
            // Return an empty cart object structure if no cart is found
            return res.status(200).json({ userId, items: [] }); 
        }

        res.status(200).json(cart);
    } catch (err) {
        console.error("❌ Error fetching cart:", err);
        res.status(500).json({ message: "Error fetching cart", error: err.message });
    }
});

// ------------------------------------------------------------------
// 🔑 Add item or Increment quantity → POST /api/cart/add 
// ------------------------------------------------------------------
router.post("/add", async (req, res) => {
    try {
        // Dashboard sends quantity: 1 when clicking the product card button.
        const { userId, productId, quantity = 1 } = req.body; 

        if (!userId || !productId || !mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId) || quantity < 1) {
            return res.status(400).json({ message: "Invalid input data or quantity" });
        }

        const productDetails = await Product.findById(productId);
        if (!productDetails) return res.status(404).json({ message: "Product not found" });
        if (productDetails.quantity < 1) return res.status(400).json({ message: "Product is out of stock" });

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            // Case 1: Cart doesn't exist, create new cart.
            if (quantity > productDetails.quantity) return res.status(400).json({ message: `Only ${productDetails.quantity} available in stock.` });
            
            cart = new Cart({ userId, items: [{ productId, quantity }] });
            await cart.save();
            const populated = await getPopulatedCart(userId);
            return res.status(201).json({ message: "Product added to cart", cart: populated });
        }
        
        // Case 2: Cart exists, update it.
        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);

        if (itemIndex > -1) {
            // Item exists, increment quantity
            const currentQuantity = cart.items[itemIndex].quantity;
            const newQuantity = currentQuantity + quantity;
            
            if (newQuantity > productDetails.quantity) {
                 return res.status(400).json({ 
                    message: `Cannot add more. Only ${productDetails.quantity} available in stock.`, 
                    maxQuantity: productDetails.quantity 
                });
            }
            // Update the quantity
            cart.items[itemIndex].quantity = newQuantity;

        } else {
            // Item does not exist, add new item
            if (quantity > productDetails.quantity) return res.status(400).json({ message: `Only ${productDetails.quantity} available in stock.` });
            cart.items.push({ productId, quantity });
        }

        await cart.save();
        const populated = await getPopulatedCart(userId);
        return res.status(200).json({ message: "Cart updated successfully", cart: populated });

    } catch (err) {
        console.error("❌ Error adding to cart:", err);
        res.status(500).json({ message: "Error adding to cart", error: err.message });
    }
});


// ------------------------------------------------------------------
// 2. Toggle item (for FULL REMOVAL) → POST /api/cart/toggle 
// ------------------------------------------------------------------
router.post("/toggle", async (req, res) => {
    try {
        const { userId, productId } = req.body;

        if (!userId || !productId || !mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
             return res.status(400).json({ message: "Invalid or missing userId/productId" });
        }
        
        let cart = await Cart.findOne({ userId });
        
        if (!cart) {
            return res.status(200).json({ message: "Cart does not exist.", cart: { userId, items: [] } }); 
        }
        
        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        
        if (itemIndex > -1) {
            // REMOVE ITEM
            cart.items.splice(itemIndex, 1);
            
            // If the cart is now empty, delete the whole document
            if (cart.items.length === 0) {
                await Cart.deleteOne({ _id: cart._id });
                return res.status(200).json({ 
                    message: "Product removed, cart is now empty and deleted.", 
                    cart: { userId, items: [] } 
                });
            }
        } else {
            // Item wasn't in cart, but we still return 200 with the current cart
            const populated = await getPopulatedCart(userId);
            return res.status(200).json({ message: "Product not found in cart.", cart: populated });
        }

        await cart.save();
        const populated = await getPopulatedCart(userId);
        return res.status(200).json({ 
            message: `Product removed from cart`, 
            cart: populated 
        });

    } catch (err) {
        console.error("❌ Error updating cart:", err);
        res.status(500).json({ message: "Error updating cart", error: err.message });
    }
});

// ------------------------------------------------------------------
// 3. Update quantity → PUT /api/cart/quantity 
// ------------------------------------------------------------------
router.put("/quantity", async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;

        if (!userId || !productId || !mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId) || quantity < 1) {
            return res.status(400).json({ message: "Invalid input data" });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // ✅ Check if requested quantity exceeds actual product stock
        if (quantity > product.quantity) {
            return res.status(400).json({ message: `Only ${product.quantity} available in stock. Cannot set quantity higher.`, maxQuantity: product.quantity });
        }

        let cart = await Cart.findOne({ userId });

        // ⭐ FIX APPLIED HERE: If cart is not found, create a new one.
        if (!cart) {
            cart = new Cart({ userId, items: [{ productId, quantity }] });
            await cart.save();
            const populated = await getPopulatedCart(userId);
            return res.status(201).json({ message: "Cart created and quantity set", cart: populated });
        }
        
        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        
        if (itemIndex === -1) { 
            // If item wasn't in cart, add it.
            cart.items.push({ productId, quantity }); 
        } 
        else { 
            // Update quantity for existing item
            cart.items[itemIndex].quantity = quantity; 
        }

        await cart.save();
        const populated = await getPopulatedCart(userId);
        res.status(200).json({ message: "Quantity updated", cart: populated });
    } catch (err) {
        console.error("❌ Error updating quantity:", err);
        res.status(500).json({ message: "Error updating quantity", error: err.message });
    }
});

export default router;