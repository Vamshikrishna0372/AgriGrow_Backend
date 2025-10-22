// server.js (or index.js)
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

// Import Routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";

dotenv.config();
const app = express();

// ================= Middleware =================
app.use(cors());
app.use(express.json());

// ================= Routes =================
app.use("/api/auth", authRoutes);          // User login/register
app.use("/api/products", productRoutes);   // Products CRUD
app.use("/api/cart", cartRoutes);          // Cart operations
app.use("/api/wishlist", wishlistRoutes);  // Wishlist operations

// ================= MongoDB Connection =================
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ================= Health Check =================
app.get("/", (req, res) => {
  res.send("🌱 AgriGrow API is running...");
});

// ================= Start Server =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
