import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  photo: { type: String },
  price: { type: Number, required: true },
  description: { type: String },
  rating: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },
  brand: { type: String },
  type: { type: String, enum: ["Soil", "Nutrients", "Tools", "Irrigation"], default: "Soil" },
  sku: { type: String }
}, { timestamps: true });

export default mongoose.model("Product", productSchema);
