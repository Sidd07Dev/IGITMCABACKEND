const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true
        },
        amountPaid: {
            type: Number,
            required: true
        },
        paymentMethod: {
            type: String,
            required: true
        },
        transactionId: {
            type: String,
            required: true,
            unique: true
        },
        status: {
            type: String,
            enum: ["pending", "failed", "successful"],
            default: "pending"
        },
        companyShare: {
            type: Number,
            required: true
        },
        advancePaidToProvider: {
            type: Number,
            required: true
        },
        remainingBalance: {
            type: Number,
            required: true
        },
        finalSettlementStatus: {
            type: String,
            enum: ["pending", "completed"],
            default: "pending"
        }
    },
    { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
