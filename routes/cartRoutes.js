import express from "express";
import Cart from "../models/Cart.js";

const router = express.Router();

// Toggle Add/Remove from Cart
router.post("/toggle", async (req, res) => {
  const { userId, productId } = req.body;

  try {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Create new cart if none exists
      cart = new Cart({ userId, items: [{ productId, quantity: 1 }] });
      await cart.save();
      return res.status(201).json({ message: "Added to cart", cart });
    }

    // Check if product exists in cart
    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);

    if (itemIndex > -1) {
      // If exists → remove it
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return res.status(200).json({ message: "Removed from cart", cart });
    } else {
      // If not exists → add it
      cart.items.push({ productId, quantity: 1 });
      await cart.save();
      return res.status(200).json({ message: "Added to cart", cart });
    }
  } catch (err) {
    console.error("❌ Error updating cart:", err);
    res.status(500).json({ message: "Error updating cart" });
  }
});

// Get user cart
router.get("/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate("items.productId");
    res.status(200).json(cart || { userId: req.params.userId, items: [] });
  } catch (err) {
    res.status(500).json({ message: "Error fetching cart" });
  }
});

export default router;
