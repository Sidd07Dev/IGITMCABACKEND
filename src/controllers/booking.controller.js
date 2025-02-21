import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Booking } from "../models/booking.model.js";
import { CampingSite } from "../models/campingsite.model.js";



import cron from "node-cron";
import { sendEmail, sendSMS } from "../utils/notificationService.js";

// 1. Create a Booking (User Initiated)
const createBooking = asyncHandler(async (req, res) => {
    const { campingSiteId, checkInDate, checkOutDate } = req.body;



    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);


    if (!campingSiteId || !checkInDate || !checkOutDate) {
        throw new ApiError(400, "All fields are required");
    }

    const campsite = await CampingSite.findById(campingSiteId);
    if (!campsite) {
        throw new ApiError(404, "Campsite not found");
    }



    // Count the number of bookings for the given date
    const existingBookingsCount = await Booking.countDocuments({
        campingSiteId: campingSiteId,
        checkInDate: checkIn,
        checkOutDate: checkOut
    });

    // Check if booking limit is reached
    if (existingBookingsCount >= campsite.maxBookingsPerDay) {
        return res.status(200).json(new ApiResponse(200, {
            available: false,
            message: `Fully booked on ${checkIn.toDateString()} to ${checkOut.toDateString()} . Try another date.`,
            maxBookings: campsite.maxBookingsPerDay
        }));
    }

    const nights = (checkOut - checkIn) / (1000 * 60 * 60 * 24);

    const pricePerNight = Number(campsite?.pricePerNight);
    if (isNaN(pricePerNight) || pricePerNight <= 0) {
        throw new Error("Invalid campsite price per night");
    }

    let totalPrice = nights * pricePerNight;
    // if (campsite.dynamicPricing) {
    //     totalPrice *= campsite.dynamicPricing.multiplier;
    // }



    const booking = await Booking.create({
        userId: req.user._id,
        campingSiteId,
        checkInDate,
        checkOutDate,
        totalPrice,
        status: "pending",
        paymentStatus: "pending"
    });

    res.status(201).json(new ApiResponse(201, booking, "Booking created successfully. Please complete payment."));
});

// 2. Get User's Bookings
const getUserBookings = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, bookings, "User bookings fetched successfully"));
});

// 3. Get All Bookings (Admin/Provider)
const getAllBookings = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "provider") {
        throw new ApiError(403, "Unauthorized");
    }
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, bookings, "All bookings fetched successfully"));
});

// 4. Update Booking Status (Admin/Provider)
const updateBookingStatus = asyncHandler(async (req, res) => {
    const { bookingId, status } = req.body;
    const booking = await Booking.findByIdAndUpdate(bookingId, { status }, { new: true });
    if (!booking) throw new ApiError(404, "Booking not found");
    sendEmail(booking.userId, "Booking Status Updated", `Your booking status is now: ${status}`);
    res.status(200).json(new ApiResponse(200, booking, "Booking status updated successfully"));
});

// 5. Cancel Booking
const cancelBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");
    booking.status = "cancelled";
    booking.paymentStatus = "refunded";
    await booking.save();
    res.status(200).json(new ApiResponse(200, {}, "Booking cancelled successfully"));
});



// 7. Auto Expire Unpaid Bookings
cron.schedule("*/15 * * * *", async () => {
    await Booking.updateMany({ status: "pending", createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } }, { status: "cancelled" });
});

// 8. Generate Booking Invoice
// const generateInvoice = asyncHandler(async (req, res) => {
//     const { bookingId } = req.params;
//     const booking = await Booking.findById(bookingId);
//     if (!booking) throw new ApiError(404, "Booking not found");
//     const invoiceBuffer = await generateInvoicePDF(booking);
//     res.set({ "Content-Type": "application/pdf" });
//     res.send(invoiceBuffer);
// });

export { createBooking, getUserBookings, getAllBookings, updateBookingStatus, cancelBooking, };
