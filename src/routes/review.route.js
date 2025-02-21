import { Router } from "express";
import { createReview, getReviewsForCampsite } from "../controllers/review.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Create a review (Only authenticated users after trip completion)
router.post("/", verifyJWT, createReview);

// Get reviews for a specific campsite
router.get("/:campsiteId", getReviewsForCampsite);

export default router;
