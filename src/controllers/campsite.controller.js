import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { CampingSite } from "../models/campingSite.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

// 1. Create a Camping Site (Admin/Provider Only)
const createCampingSite = asyncHandler(async (req, res) => {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "provider")) {
        throw new ApiError(403, "Unauthorized: Only admin or provider can create a campsite");
    }

    const { name, location, pricePerNight, amenities, description, providerId } = req.body;

    if (!name || !location || !pricePerNight || !amenities || !description || !providerId) {
        throw new ApiError(400, "All fields are required");
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
        throw new ApiError(400, "Invalid provider ID format");
    }

    if (typeof pricePerNight !== "number" || pricePerNight <= 0) {
        throw new ApiError(400, "Price per night must be a positive number");
    }

    let uploadedImages = [];
    if (req.files?.length > 0) {
        const images = req.files.map(file => file.path);
        uploadedImages = await Promise.all(images.map(imagePath => uploadOnCloudinary(imagePath)));
    }

    const campsite = await CampingSite.create({
        name,
        location,
        pricePerNight,
        amenities,
        description,
        providerId,
        images: uploadedImages.map(img => img.url),
    });

    res.status(201).json(new ApiResponse(201, campsite, "Campsite created successfully"));
});

// 2. Get All Camping Sites with Filtering & Pagination
const getAllCampingSites = asyncHandler(async (req, res) => {
    const { location, minPrice, maxPrice, amenities, page = 1, limit = 10 } = req.query;
    let filters = {};

    if (location) filters["location"] = location;
    if (minPrice && maxPrice) filters["pricePerNight"] = { $gte: Number(minPrice), $lte: Number(maxPrice) };
    if (amenities) filters["amenities"] = { $in: amenities.split(",") };

    const campsites = await CampingSite.find(filters)
        .skip((page - 1) * limit)
        .limit(Number(limit));

    if (!campsites.length) {
        throw new ApiError(404, "No camping sites found");
    }

    res.status(200).json(new ApiResponse(200, campsites, "Camping sites fetched successfully"));
});

// 3. Get a Single Camping Site by ID
const getCampingSiteById = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid campsite ID format");
    }

    const campsite = await CampingSite.findById(req.params.id);
    if (!campsite) {
        throw new ApiError(404, "Campsite not found");
    }
    res.status(200).json(new ApiResponse(200, campsite, "Campsite details fetched successfully"));
});

// 4. Update Camping Site Details (Admin/Provider Only)
const updateCampingSite = asyncHandler(async (req, res) => {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "provider")) {
        throw new ApiError(403, "Unauthorized: Only admin or provider can update a campsite");
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid campsite ID format");
    }

    const updatedCampsite = await CampingSite.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedCampsite) {
        throw new ApiError(404, "Campsite not found");
    }
    res.status(200).json(new ApiResponse(200, updatedCampsite, "Campsite updated successfully"));
});

// 5. Delete a Camping Site (Admin/Provider Only)
const deleteCampingSite = asyncHandler(async (req, res) => {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "provider")) {
        throw new ApiError(403, "Unauthorized: Only admin or provider can delete a campsite");
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid campsite ID format");
    }

    const campsite = await CampingSite.findByIdAndDelete(req.params.id);
    if (!campsite) {
        throw new ApiError(404, "Campsite not found");
    }

    res.status(200).json(new ApiResponse(200, {}, "Campsite deleted successfully"));
});

export { createCampingSite, getAllCampingSites, getCampingSiteById, updateCampingSite, deleteCampingSite };
