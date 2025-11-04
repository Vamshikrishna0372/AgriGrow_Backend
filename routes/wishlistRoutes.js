import express from "express";
import mongoose from "mongoose";
import Wishlist from "../models/Wishlist.js";

const router = express.Router();

// Helper function to find the wishlist and populate product details
const getPopulatedWishlist = async (userId) => {
    return await Wishlist.findOne({ userId }).populate("products");
};

// --- 1. Toggle Add/Remove from Wishlist (POST /api/wishlist/toggle) ---
router.post("/toggle", async (req, res) => {
    const { userId, productId } = req.body;

    if (!userId || !productId || 
        !mongoose.Types.ObjectId.isValid(userId) || 
        !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid or missing userId/productId." });
    }

    try {
        let wishlist = await Wishlist.findOne({ userId });
        let action = "Added to wishlist";
        
        if (!wishlist) {
            // Case 1: Create a new wishlist (only happens if adding)
            wishlist = new Wishlist({ userId, products: [productId] });
            await wishlist.save();
        } else {
            const productIndex = wishlist.products.findIndex((id) => id.toString() === productId);

            if (productIndex > -1) {
                // Case 2: Product exists -> REMOVE IT
                action = "Removed from wishlist";
                
                // 🛑 FIX: Use findOneAndUpdate with $pull to remove and get the potentially empty document in one call.
                const updatedWishlist = await Wishlist.findOneAndUpdate(
                    { userId: userId },
                    { $pull: { products: productId } },
                    { new: true } // Return the modified document
                );

                // Check if the array is now empty and delete the document.
                if (updatedWishlist && updatedWishlist.products.length === 0) {
                     await Wishlist.deleteOne({ userId: userId });
                }

            } else {
                // Case 3: Product does not exist -> ADD IT
                action = "Added to wishlist";
                await Wishlist.updateOne(
                    { userId: userId },
                    { $push: { products: productId } }
                );
            }
        }
        
        // Refetch the final state (which might be null if the document was deleted)
        const populatedWishlist = await getPopulatedWishlist(userId);
        
        return res.status(200).json({ message: action, wishlist: populatedWishlist || { userId, products: [] } });

    } catch (err) {
        console.error("❌ Error updating wishlist:", err);
        res.status(500).json({ message: "Error updating wishlist", error: err.message });
    }
});

// --- 2. Get user wishlist (GET /api/wishlist/:userId) ---
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid or missing userId." });
    }

    try {
        const wishlist = await getPopulatedWishlist(userId);
        res.status(200).json(wishlist || { userId: userId, products: [] });

    } catch (err) {
        console.error("❌ Error fetching wishlist:", err);
        res.status(500).json({ message: "Error fetching wishlist", error: err.message });
    }
});

export default router;