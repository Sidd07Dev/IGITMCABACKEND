import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Alumni } from "../models/alumni.model.js"; // Import Alumni model

/**
 * Fetches all alumni with pagination, sorted by batch (newest first).
 * @route GET /api/v1/alumni
 * @access Public
 */
const getAllAlumni = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const total = await Alumni.countDocuments();
  const alumni = await Alumni.find({})
    .sort({ batch: -1, name: 1 }) // Sort by batch (descending) and name (ascending)
    .skip(skip)
    .limit(limit)
    .lean();

  if (!alumni || alumni.length === 0) {
    throw new ApiError(404, "No alumni found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: alumni,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      "Alumni fetched successfully"
    )
  );
});

/**
 * Fetches a single alumni by ID.
 * @route GET /api/v1/alumni/:id
 * @access Public
 */
const getAlumniById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Alumni ID is required");
  }

  const alumni = await Alumni.findById(id).lean();
  if (!alumni) {
    throw new ApiError(404, "Alumni not found");
  }

  return res.status(200).json(
    new ApiResponse(200, alumni, "Alumni fetched successfully")
  );
});

/**
 * Creates a new alumni record.
 * @route POST /api/v1/alumni
 * @access Private (requires authentication)
 */
const createAlumni = asyncHandler(async (req, res) => {
  const { name, designation, batch, linkedinUrl, companyLogo, profileImage } = req.body;

  if (!name || !designation || !batch) {
    throw new ApiError(400, "Name, designation, and batch are required");
  }

  const existingAlumni = await Alumni.findOne({ name, batch });
  if (existingAlumni) {
    throw new ApiError(400, "Alumni with this name and batch already exists");
  }

  const alumni = await Alumni.create({
    name,
    designation,
    batch,
    linkedinUrl,
    companyLogo,
    profileImage,
  });

  if (!alumni) {
    throw new ApiError(500, "Failed to create alumni");
  }

  return res.status(201).json(
    new ApiResponse(201, alumni, "Alumni created successfully")
  );
});

/**
 * Updates an existing alumni record by ID.
 * @route PUT /api/v1/alumni/:id
 * @access Private (requires authentication)
 */
const updateAlumni = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, designation, batch, linkedinUrl, companyLogo, profileImage } = req.body;

  if (!id) {
    throw new ApiError(400, "Alumni ID is required");
  }

  if (!name && !designation && !batch && !linkedinUrl && !companyLogo && !profileImage) {
    throw new ApiError(400, "At least one field must be provided to update");
  }

  const alumni = await Alumni.findById(id);
  if (!alumni) {
    throw new ApiError(404, "Alumni not found");
  }

  if (name) alumni.name = name;
  if (designation) alumni.designation = designation;
  if (batch) alumni.batch = batch;
  if (linkedinUrl) alumni.linkedinUrl = linkedinUrl;
  if (companyLogo) alumni.companyLogo = companyLogo;
  if (profileImage) alumni.profileImage = profileImage;

  const updatedAlumni = await alumni.save();

  return res.status(200).json(
    new ApiResponse(200, updatedAlumni, "Alumni updated successfully")
  );
});

/**
 * Deletes an alumni record by ID.
 * @route DELETE /api/v1/alumni/:id
 * @access Private (requires authentication)
 */
const deleteAlumni = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Alumni ID is required");
  }

  const alumni = await Alumni.findByIdAndDelete(id);
  if (!alumni) {
    throw new ApiError(404, "Alumni not found");
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "Alumni deleted successfully")
  );
});

export { getAllAlumni, getAlumniById, createAlumni, updateAlumni, deleteAlumni };