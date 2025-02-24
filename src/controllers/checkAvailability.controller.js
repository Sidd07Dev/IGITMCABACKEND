import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Booking } from "../models/booking.model.js";
import {ApiError} from "../utils/ApiError.js";
import { CampingSite } from "../models/campingsite.model.js";

const checkAvailability = asyncHandler(async (req, res) => {
    const { campsiteId, checkInDate,checkOutDate } = req.query;

    if (!campsiteId || !checkInDate || !checkOutDate) {
        throw new ApiError(400, "Campsite ID checkOutDate,and Check-in date are required");
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    // Fetch the campsite details
    const campsite = await CampingSite.findById(campsiteId);
    if (!campsite) {
        throw new ApiError(404, "Campsite not found");
    }

    // Count the number of bookings for the given date
    const existingBookingsCount = await Booking.countDocuments({
        campingSiteId: campsiteId,
        checkInDate: checkIn,
        checkOutDate:checkOut,
        'status':"confirmed"
    });

    // Check if booking limit is reached
    if (existingBookingsCount >= campsite.maxBookingsPerDay) {
        return res.status(200).json(new ApiResponse(200, {
            available: false,
            message: `Fully booked on ${checkIn.toDateString()} to ${checkOut.toDateString()} . Try another date.`,
            maxBookings: campsite.maxBookingsPerDay
        }));
    }

    // Campsite is available
    return res.status(200).json(new ApiResponse(200, {
        available: true,
        message: `Available! Only ${campsite.maxBookingsPerDay - existingBookingsCount} spots left.`,
        maxBookings: campsite.maxBookingsPerDay,
        remainingSpots: campsite.maxBookingsPerDay - existingBookingsCount
    }));
});

export { checkAvailability };
