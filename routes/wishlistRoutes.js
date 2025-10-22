import express from "express";
import Wishlist from "../models/Wishlist.js";

const router = express.Router();

// Toggle Add/Remove from Wishlist
router.post("/toggle", async (req, res) => {
  const { userId, productId } = req.body;

  try {
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [{ productId }] });
      await wishlist.save();
      return res.status(201).json({ message: "Added to wishlist", wishlist });
    }

    // Check if product exists
    const itemIndex = wishlist.items.findIndex((item) => item.productId.toString() === productId);

    if (itemIndex > -1) {
      wishlist.items.splice(itemIndex, 1);
      await wishlist.save();
      return res.status(200).json({ message: "Removed from wishlist", wishlist });
    } else {
      wishlist.items.push({ productId });
      await wishlist.save();
      return res.status(200).json({ message: "Added to wishlist", wishlist });
    }
  } catch (err) {
    console.error("❌ Error updating wishlist:", err);
    res.status(500).json({ message: "Error updating wishlist" });
  }
});

// Get user wishlist
router.get("/:userId", async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.params.userId }).populate("items.productId");
    res.status(200).json(wishlist || { userId: req.params.userId, items: [] });
  } catch (err) {
    res.status(500).json({ message: "Error fetching wishlist" });
  }
});

export default router;
