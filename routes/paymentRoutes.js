// routes/paymentRoutes.js
import express from "express";
import Payment from "../models/Payment.js";

const router = express.Router();

// ✅ Create new payment/order
router.post("/", async (req, res) => {
  try {
    const { delivery, products, totalAmount, txnId, utrId } = req.body;

    if (!delivery || !products || !totalAmount || !txnId || !utrId) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const payment = new Payment({
      name: delivery.name,
      phone: delivery.phone,
      email: delivery.email,
      address: delivery.address,
      city: delivery.city,
      pincode: delivery.pincode,
      products,
      totalAmount,
      txnId,
      utrId,
      status: "success", // default status
    });

    await payment.save();
    res.status(201).json({ success: true, message: "Payment saved successfully!", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Get all payments (Admin panel)
router.get("/", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Update payment status (Admin verification)
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Payment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
