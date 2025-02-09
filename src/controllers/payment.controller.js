import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Payment } from "../models/payment.model.js";
import { Booking } from "../models/booking.model.js";
import { Transaction } from "../models/transaction.model.js";
import Stripe from "stripe";
import { generateInvoicePDF } from "../utils/invoiceGenerator.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 1. Process Payment
const processPayment = asyncHandler(async (req, res) => {
    const { bookingId, paymentMethod } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");

    const paymentIntent = await stripe.paymentIntents.create({
        amount: booking.totalPrice * 100,
        currency: "usd",
        payment_method_types: [paymentMethod],
        metadata: { bookingId }
    });

    res.status(200).json(new ApiResponse(200, { clientSecret: paymentIntent.client_secret }, "Payment initiated"));
});

// 2. Verify Payment Status (Webhook)
const verifyPayment = asyncHandler(async (req, res) => {
    const event = req.body;
    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.bookingId;

        await Payment.create({
            bookingId,
            amountPaid: paymentIntent.amount / 100,
            transactionId: paymentIntent.id,
            status: "successful"
        });

        res.status(200).json(new ApiResponse(200, {}, "Payment verified successfully"));
    } else {
        throw new ApiError(400, "Invalid event type");
    }
});

// 3. Refund Payment
const refundPayment = asyncHandler(async (req, res) => {
    const { transactionId } = req.body;
    const payment = await Payment.findOne({ transactionId });
    if (!payment) throw new ApiError(404, "Payment not found");

    await stripe.refunds.create({
        payment_intent: transactionId
    });

    payment.status = "refunded";
    await payment.save();
    res.status(200).json(new ApiResponse(200, {}, "Payment refunded successfully"));
});

// 4. Fetch Payment History
const getUserPayments = asyncHandler(async (req, res) => {
    const payments = await Payment.find({ userId: req.user._id });
    res.status(200).json(new ApiResponse(200, payments, "Payment history fetched"));
});

// 5. Generate Invoice
const generateInvoice = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new ApiError(404, "Payment not found");

    const invoiceBuffer = await generateInvoicePDF(payment);
    res.set({ "Content-Type": "application/pdf" });
    res.send(invoiceBuffer);
});

export { processPayment, verifyPayment, refundPayment, getUserPayments, generateInvoice };
