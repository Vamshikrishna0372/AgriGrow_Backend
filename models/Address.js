import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    // Link the address to the User model via the user's ObjectId
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    }, 
    
    // Address Details
    label: { type: String, default: 'Home' }, // e.g., Home, Office
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false } // Flag to identify a preferred address
}, { timestamps: true });

export default mongoose.model('Address', addressSchema);