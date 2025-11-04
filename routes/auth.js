import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js"; // Ensure this imports the fixed Schema

const router = express.Router();

// ✅ Signup (Logic remains the same)
router.post("/signup", async (req, res) => {
    // ... (existing signup logic)
    const { name, email, password } = req.body;

    if (!name || !email || !password)
        return res.status(400).json({ message: "All fields are required" });

    if (password.length < 8)
        return res.status(400).json({ message: "Password must be at least 8 characters" });

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        // New user will now include default values for new schema fields
        const newUser = new User({ name, email, password: hashedPassword, joinDate: new Date() }); 
        await newUser.save();

        res.status(201).json({ message: "Signup successful!" });
    } catch (err) {
        res.status(500).json({ message: "Error during signup", error: err.message });
    }
});

// ✅ Login (Logic remains the same)
router.post("/login", async (req, res) => {
    // ... (existing login logic)
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: "All fields are required" });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: "Invalid credentials" });

        res.status(200).json({
            message: "Login successful!",
            user: { name: user.name, email: user.email },
        });
    } catch (err) {
        res.status(500).json({ message: "Error during login", error: err.message });
    }
});

// ✅ Profile (by email) - **This is the key route, and it is correct.**
router.get("/profile/:email", async (req, res) => {
    try {
        // Mongoose finds the user and automatically includes all fields defined in the fixed schema
        const user = await User.findOne({ email: req.params.email }).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        // Sends the complete, rich user object to the frontend
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: "Error fetching user profile", error: err.message });
    }
});

export default router;