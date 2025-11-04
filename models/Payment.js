// models/Payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  city: { type: String },
  pincode: { type: String },
  txnId: { type: String, required: true },
  utrId: { type: String, required: true },
  amount: { type: Number, required: true },
  products: { type: Array, default: [] },
  status: { type: String, default: "Pending" }, // ✅ Admin can update this
  date: { type: Date, default: Date.now },
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
