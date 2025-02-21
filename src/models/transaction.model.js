import mongoose from "mongoose";
const { Schema } = mongoose;

const transactionSchema = new Schema(
    {
        providerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true
        },
        amountTransferred: {
            type: Number,
            required: true
        },
        transactionType: {
            type: String,
            enum: ["provider_payout", "user_payment", "refund"],
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "completed"],
            default: "pending"
        }
    },
    { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
