import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Transaction } from "../models/transaction.model.js";
import { Payment } from "../models/payment.model.js";
import { Booking } from "../models/booking.model.js";
import { User } from "../models/user.model.js";
import { sendEmail, sendSMS } from "../utils/notificationService.js";
import mongoose from "mongoose";
import cron from "node-cron";

// 1. Record a Transaction
const recordTransaction = asyncHandler(async (req, res) => {
    const { userId, paymentId, amount, transactionType } = req.body;
    if (!userId || !paymentId || !amount || !transactionType) {
        throw new ApiError(400, "All fields are required");
    }
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
        throw new ApiError(404, "Payment not found");
    }
    
    const transaction = await Transaction.create({
        userId,
        paymentId,
        amountTransferred:amount,
        transactionType,
        status: "completed"
    });
    
    res.status(201).json(new ApiResponse(201, transaction, "Transaction recorded successfully"));
});

// 2. Fetch User Transactions
const getUserTransactions = asyncHandler(async (req, res) => {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, transactions, "User transactions fetched successfully"));
});

// 3. Fetch All Transactions (Admin Only)
const getAllTransactions = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Unauthorized");
    }
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, transactions, "All transactions fetched successfully"));
});

// 4. Issue Refund (Admin Only)
const issueRefund = asyncHandler(async (req, res) => {
    const { transactionId, amount } = req.body;
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Unauthorized");
    }
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
        throw new ApiError(404, "Transaction not found");
    }
    if (transaction.status === "refunded") {
        throw new ApiError(400, "Transaction already refunded");
    }
    
    transaction.status = "refunded";
    await transaction.save();
    
    const user = await User.findById(transaction.userId);
    sendEmail(user.email, "Refund Processed", `Your refund of $${amount} has been successfully processed.`);
    
    res.status(200).json(new ApiResponse(200, {}, "Refund issued successfully"));
});

// 5. Automated Payout to Providers (Scheduled Job)
cron.schedule("0 0 * * *", async () => {
    console.log("Running scheduled provider payouts...");
    const pendingTransactions = await Transaction.find({ transactionType: "provider_payout", status: "pending" });
    
    for (const transaction of pendingTransactions) {
        transaction.status = "completed";
        await transaction.save();
    }
    console.log("Provider payouts completed.");
});



export { recordTransaction, getUserTransactions, getAllTransactions, issueRefund };
