import { Router } from "express";
import { 
    createBooking, 
    getUserBookings, 
    getAllBookings, 
    updateBookingStatus, 
    cancelBooking, 
     
   
} from "../controllers/booking.controller.js";
import { checkAvailability } from "../controllers/checkAvailability.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Create a new booking
router.post("/", verifyJWT, createBooking);

// Get user's booking history
router.get("/user", verifyJWT, getUserBookings);

// Get all bookings (Admin/Provider Only)
router.get("/all", verifyJWT, getAllBookings);

// Update booking status (Admin/Provider Only)
router.put("/status", verifyJWT, updateBookingStatus);

// Cancel a booking (User/Admin)
router.post("/cancel", verifyJWT, cancelBooking);

// Check campsite availability
router.get("/availability", checkAvailability);

// Generate booking invoice
// router.get("/invoice/:bookingId", verifyJWT, generateInvoice);


export default router;
