import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Review } from "../models/review.model.js";
import { Booking } from "../models/booking.model.js";

// 1. Create a Review (Only After Trip Completion)
const createReview = asyncHandler(async (req, res) => {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating || !comment) {
        throw new ApiError(400, "All fields are required");
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized to review this booking");
    }

    if (new Date(booking.checkOutDate) > new Date()) {
        throw new ApiError(400, "You can only review after your trip has ended");
    }

    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
        throw new ApiError(400, "You have already reviewed this trip");
    }

    const review = await Review.create({
        userId: req.user._id,
        campingSiteId: booking.campingSiteId,
        bookingId,
        rating,
        comment
    });

    res.status(201).json(new ApiResponse(201, review, "Review submitted successfully"));
});

// 2. Fetch Reviews for a Camping Site
const getReviewsForCampsite = asyncHandler(async (req, res) => {
    const { campsiteId } = req.params;
    const reviews = await Review.find({ campingSiteId: campsiteId }).populate("userId", "fullname avatar");
    res.status(200).json(new ApiResponse(200, reviews, "Reviews fetched successfully"));
});

export { createReview, getReviewsForCampsite };
