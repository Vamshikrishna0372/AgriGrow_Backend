// =============================
// 🌱 AgriGrow Backend Server
// =============================

// ===== Imports =====
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path"; // <-- REQUIRED for file paths
import { fileURLToPath } from "url"; // <-- REQUIRED for ES Modules __dirname

// ===== Route Imports =====
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import ordersRoutes from "./routes/orders.js";

// ===== Initialize Environment Variables =====
dotenv.config();

// ===== Initialize Express App =====
const app = express();

// 🟢 FIX: Define __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// 🧩 Middleware Configuration
// =============================

// Enable Cross-Origin Requests (Frontend ↔ Backend)
app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Parse incoming JSON requests
app.use(express.json());

// 🟢 CRITICAL FIX: Serve Static Files (Images)
// This tells the server: whenever you get a request starting with '/uploads', 
// look in the actual 'uploads' folder on the server's file system.
// This assumes your product.photo paths start with 'uploads/'
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Example image path: http://localhost:5000/uploads/product-123.jpg

// =============================
// 🛠️ API Routes
// =============================

// User Authentication (Register, Login, Profile)
app.use("/api/auth", authRoutes);

// Product Management (List, Add, Delete, Update)
app.use("/api/products", productRoutes);

// Shopping Cart Management (Add to cart, View cart, Update quantity, Remove)
app.use("/api/cart", cartRoutes);

// Wishlist Handling (Add/Remove/Fetch)
app.use("/api/wishlist", wishlistRoutes);

// Payment Processing (Razorpay, Stripe, or others)
app.use("/api/payments", paymentRoutes);

// Orders and Delivery Management
app.use("/api/orders", ordersRoutes);

// =============================
// 💾 MongoDB Connection
// =============================
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// =============================
// 🩺 Health Check Route
// =============================
app.get("/", (req, res) => {
  res.send("🌾 AgriGrow API is running successfully...");
});

// =============================
// 🚀 Start Express Server
// =============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});