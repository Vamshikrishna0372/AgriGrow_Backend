import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    }, 
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String, required: true }, // 🔑 Added required: true
        price: { type: Number, required: true }, // 🔑 Added required: true
        quantity: { type: Number, default: 1, required: true }, // 🔑 Added required: true
        photo: String, 
    }],
    deliveryDetails: {
        name: { type: String, required: true }, // 🔑 Added required: true
        phone: { type: String, required: true }, // 🔑 Added required: true
        address: { type: String, required: true }, // 🔑 Added required: true
        city: { type: String, required: true }, // 🔑 Added required: true
        pincode: { type: String, required: true }, // 🔑 Added required: true
        email: String,
    },
    totalAmount: { type: Number, required: true },
    payment: {
        txnId: { type: String, required: true },
        utrId: { type: String, required: true },
        status: { 
            type: String, 
            enum: ['Pending Verification', 'Paid', 'Shipped', 'Delivered', 'Failed', 'Cancelled'],
            default: 'Pending Verification',
            required: true // 🔑 Added required: true
        },
    },
    shippedAt: {
        type: Date,
        default: null,
    },
    cancelledAt: {
        type: Date,
        default: null,
    },
    // REMOVED explicit createdAt field. Mongoose will create 'createdAt' and 'updatedAt'
}, { timestamps: true }); // 🛑 FIX: Rely on timestamps for accurate automatic date fields

// Export the Mongoose Model
export default mongoose.model('Order', orderSchema);