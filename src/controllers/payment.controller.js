import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Payment } from "../models/payment.model.js";
import { Booking } from "../models/booking.model.js";
import { CampingSite } from "../models/campingsite.model.js";
import { Transaction } from "../models/transaction.model.js";
import { User } from "../models/user.model.js";
import { sendEmail } from "../utils/notificationService.js";
import Stripe from "stripe";
// import { generateInvoicePDF } from "../utils/invoiceGenerator.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Process Payment - Create a Stripe Checkout Session
 */
const processPayment = asyncHandler(async (req, res) => {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");
    const campSite = await CampingSite.findById(booking.campingSiteId);

    // Convert price to cents
    const totalAmount = Math.round(booking.totalPrice * 100);

    try {
        // Create a Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            success_url: `https://cspcb.netlify.app/`,
            cancel_url: `https://cspcb.netlify.app/`,
            customer_email: booking.userEmail, // Pre-fill email in Stripe Checkout
            metadata: {
                bookingId: booking._id.toString(), // Attach booking ID
            },
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `Campsite: ${campSite.name}`,
                            description: `Booking for ${booking.guestCount} guests, ${booking.totalNights} nights`,
                        },
                        unit_amount: totalAmount, // Stripe needs amount in cents
                    },
                    quantity: 1,
                },
            ],
        });
        console.log(session);
        

        res.status(200).json(new ApiResponse(200, { sessionId: session.id }, "Payment session created successfully"));
    } catch (error) {
        throw new ApiError(500, `Stripe error: ${error.message}`);
    }
});

/**
 * Verify Payment - Stripe Webhook Handler
 */
const verifyPayment = asyncHandler(async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        throw new ApiError(400, "Session ID is required");
    }

   
        // Retrieve the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
            throw new ApiError(400, "Payment not completed");
        }

        const bookingId = session.metadata.bookingId;
        const amountPaid = session.amount_total / 100; // Convert cents to dollars
        const transactionId = session.payment_intent;
        const paymentMethod = session.payment_method_types[0];

        const booking = await Booking.findById(bookingId);
        if (!booking) throw new ApiError(404, "Booking not found");

        const companyShare = amountPaid * 0.2; // Example: 20% goes to company
        const advancePaidToProvider = amountPaid * 0.8; // Example: 80% to provider
        const remainingBalance = 0; // Update logic as needed

        // Store Payment Record
        const paymentRecord = await Payment.create({
            bookingId,
            amountPaid,
            transactionId,
            status: "successful",
            paymentMethod,
            userId: booking.userId,
            remainingBalance,
            advancePaidToProvider,
            companyShare,
        });

        // Update Booking Status
        await Booking.findByIdAndUpdate(bookingId, {
            paymentStatus: "paid",
            status: "confirm",
        });

        // Fetch Additional Booking Details
        const campSite = await CampingSite.findById(booking.campingSiteId);
        const customer = await User.findById(booking.userId);
        const numberOfNights = Math.abs(new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 3600 * 24);

        // Prepare Email Data
        const mailData = {
            userName: customer.fullname,
            bookingLink: "https://cspcb.netlify.app",
            year: new Date().getFullYear(),
            companyLogo: "https://res.cloudinary.com/codebysidd/image/upload/v1739714720/cropped-20231015_222433_nj7ul2.png",
            amountPaid: paymentRecord.amountPaid,
            campsiteName: campSite.name,
            checkInDate: booking.checkInDate,
            numberOfNights: numberOfNights,
            guestCount: booking.guestCount,
            bookingId: bookingId,
        };

        // Send Confirmation Email
        sendEmail(customer.email, "✅ Payment Received! Your Campsite Booking is Confirmed ✅", "booking-confirm", mailData);

        res.status(200).json(new ApiResponse(200, {}, "Payment verified and booking confirmed"));
    
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

    await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: "refunded",
        status: "cancelled"
    });

    res.status(200).json(new ApiResponse(200, {}, "Payment refunded successfully"));
});

// 4. Fetch Payment History
const getUserPayments = asyncHandler(async (req, res) => {
    const payments = await Payment.find({ userId: req.user._id });
    res.status(200).json(new ApiResponse(200, payments, "Payment history fetched"));
});

// 5. Generate Invoice
// const generateInvoice = asyncHandler(async (req, res) => {
//     const { paymentId } = req.params;
//     const payment = await Payment.findById(paymentId);
//     if (!payment) throw new ApiError(404, "Payment not found");

//     const invoiceBuffer = await generateInvoicePDF(payment);
//     res.set({ "Content-Type": "application/pdf" });
//     res.send(invoiceBuffer);
// });

//6. Settle Payment
const settleProviderPayment = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        throw new ApiError(403, "Unauthorized: Only admins can settle provider payments");
    }

    const { bookingId } = req.body;
    if (!bookingId) {
        throw new ApiError(400, "Booking ID is required");
    }

    const booking = await Booking.findById(bookingId).populate("campingSiteId");
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }

    if (booking.status !== "completed") {
        throw new ApiError(400, "Provider payment can only be settled after booking completion");
    }

    if (booking.paymentStatus !== "paid") {
        throw new ApiError(400, "Payment must be completed before provider settlement");
    }

    const provider = await User.findById(booking.campingSiteId.providerId);
    if (!provider) {
        throw new ApiError(404, "Provider not found");
    }

    const existingTransaction = await Transaction.findOne({ bookingId, transactionType: "provider_payout" });
    if (existingTransaction) {
        throw new ApiError(400, "Payment to provider already settled");
    }

    const providerShare = booking.remainingBalance; // 70% goes to provider

    const transaction = await Transaction.create({
        userId: provider._id,
        bookingId,
        amountTransferred: providerShare,
        transactionType: "provider_payout",
        status: "completed"
    });

    sendEmail(provider.email, "Payment Settled", `Your payout of $${providerShare} for booking ${bookingId} has been successfully processed.`);

    res.status(200).json(new ApiResponse(200, transaction, "Provider payment settled successfully"));
});
export { processPayment, verifyPayment, refundPayment, getUserPayments, settleProviderPayment };
