import mongoose from "mongoose";
import { Schema } from "mongoose";

const bookingSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        campingSiteId: {
            type: Schema.Types.ObjectId,
            ref: "CampingSite",
            required: true
        },
        checkInDate: {
            type: Date,
            required: true
        },
        checkOutDate: {
            type: Date,
            required: true
        },
        totalPrice: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "cancelled"],
            default: "pending"
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "refunded"],
            default: "pending"
        },
        paymentId: {
            type: Schema.Types.ObjectId,
            ref: "Payment"
        }
    },
    { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);
