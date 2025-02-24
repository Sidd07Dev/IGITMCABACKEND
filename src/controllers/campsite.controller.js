import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  {CampingSite}  from "../models/campingsite.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { sendEmail } from "../utils/notificationService.js";
import mongoose from "mongoose";


// 1. Create a Camping Site (Admin/Provider Only)
const createCampingSite = asyncHandler(async (req, res) => {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "provider")) {
        throw new ApiError(403, "Unauthorized: Only admin or provider can create a campsite");
    }

    const { name, latitude,longitude, pricePerNight, amenities, description, providerId,address,maxGuests,idType } = req.body;

    if (!name || !latitude || !longitude || !pricePerNight || !amenities || !description || !providerId ||!address ||!maxGuests ||!idType) {
        throw new ApiError(400, "All fields are required");
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
        throw new ApiError(400, "Invalid provider ID format");
    }

    // if (typeof pricePerNight !== "number" || pricePerNight <= 0) {
    //     throw new ApiError(400, "Price per night must be a positive number");
    // }
     const localgovtIdImage = req.files?.idImage[0]?.path;
    
     
     if(!localgovtIdImage){
        throw new ApiError(400, "govt Id must be required");
     }
     const govtIdImage= await uploadOnCloudinary(localgovtIdImage);
    let uploadedImages = [];
    const size=req.files?.images?.length ;
    if(size<=0){
        throw new ApiError(400, "minimum one image  required");
    }
    for (const file of req.files?.images || []) {
        try {
            let localPath = file?.path;
    
            // Ensure the file exists before proceeding
            if (!localPath) {
                console.error("Error: One of the images is missing or undefined.");
                continue; // Skip this iteration
            }
    
            let uploadedPath = await uploadOnCloudinary(localPath);
    
            if (!uploadedPath?.url) {
                console.error("Error: Upload failed for an image.");
                continue;
            }
    
            // Push successfully uploaded image URL into the array
            uploadedImages.push(uploadedPath.url);
        } catch (error) {
            console.error("Error uploading image:", error.message);
        }
    }
    
    console.log(uploadedImages);
    

    const campsite = await CampingSite.create({
        name,
        'location':{
            latitude,
            longitude
        },
        pricePerNight,
        amenities,
        address,
        description,
        providerId,
        maxGuests,
        'images': uploadedImages,
       'govtId':{
        idType,
        'idImage':govtIdImage.url
       }
    });

    const providerData= await User.findById(providerId);
    const mailData={
        'companyLogo':"https://res.cloudinary.com/codebysidd/image/upload/v1739714720/cropped-20231015_222433_nj7ul2.png",
        'ownerName':providerData.fullname ,
        'campsiteName':campsite.name,
        'dashboardLink':"https://admincspcb.netlify.app",
        'year':2025
    }
    sendEmail(providerData.email,"Congratulations.Campsite Register Successfull!","campsite-register" , mailData);
    res.status(201).json(new ApiResponse(201, campsite, "Campsite created successfully"));
});


// 2. Get All Camping Sites with Filtering & Pagination
const getAllCampingSites = asyncHandler(async (req, res) => {
    const { location, minPrice, maxPrice, amenities, page = 1, limit = 10 } = req.query;
    let filters = { status: "active" }; // Only fetch approved (active) campsites

    if (location) filters["location"] = location;
    if (minPrice && maxPrice) filters["pricePerNight"] = { $gte: Number(minPrice), $lte: Number(maxPrice) };
    if (amenities) filters["amenities"] = { $in: amenities.split(",") };

    const campsites = await CampingSite.find(filters)
        .skip((page - 1) * limit)
        .limit(Number(limit));

    if (!campsites.length) {
        throw new ApiError(404, "No active camping sites found");
    }

    res.status(200).json(new ApiResponse(200, campsites, "Active camping sites fetched successfully"));
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

const approveOrRejectCampsite = asyncHandler(async (req, res) => {
    const { campsiteId } = req.params;  // Get campsite ID from request params
    const { status } = req.body;        // Get status (approved/rejected) from request body

    // ✅ Check if user is an Admin
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }

    // ✅ Validate Status
    if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value. Use 'approved' or 'rejected'." });
    }

    // ✅ Find the Campsite
    const campsite = await CampingSite.findById(campsiteId);
    if (!campsite) {
        return res.status(404).json({ error: "Campsite not found" });
    }

    const dbStatus = status==='approved'?"active":"deactive";

    if(dbStatus == campsite.status){
        return res.status(400).json({ error: `Campsite already ${status}` });
    }

    // ✅ Update Campsite Status
    campsite.status = dbStatus;
    await campsite.save();

    // ✅ Get Provider Info
    const provider = await User.findById(campsite.providerId);
    if (!provider) {
        return res.status(404).json({ error: "Campsite provider not found" });
    }

    // ✅ Prepare Email Notification
    const emailSubject = status === "approved"
        ? "🎉 Your Campsite has been Approved!"
        : "❌ Your Campsite Submission was Rejected";

    const emailTemplate = status === "approved" ? "campsite-approved" : "campsite-rejected";

    const mailData = {
        providerName: provider.fullname,
        campsiteName: campsite.name,
        year: new Date().getFullYear(),
        companyLogo: "https://res.cloudinary.com/codebysidd/image/upload/v1739714720/cropped-20231015_222433_nj7ul2.png",
        status: status.toUpperCase(),
        message: status === "approved"
            ? "Congratulations! Your campsite is now listed on our platform. 🎉"
            : "Unfortunately, your campsite does not meet our requirements at this time.",
    };
    console.log(mailData);
    

    // ✅ Send Email Notification
    sendEmail(provider.email, emailSubject, emailTemplate, mailData);

    res.status(200).json({
        message: `Campsite has been ${status} successfully`,
        campsite,
    });
});

const getPendingCampingSites = asyncHandler(async (req, res) => {
    // Check if the user is an admin
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json(new ApiError(403, "Access denied. Admins only."));
    }

    const { page = 1, limit = 10 } = req.query;
    let filters = { status: "pending" }; // Fetch only pending campsites

    const campsites = await CampingSite.find(filters)
        .skip((page - 1) * limit)
        .limit(Number(limit));

    if (!campsites.length) {
        throw new ApiError(404, "No pending camping sites found");
    }

    res.status(200).json(new ApiResponse(200, campsites, "Pending camping sites fetched successfully"));
});





export { createCampingSite, getAllCampingSites, getCampingSiteById, updateCampingSite, deleteCampingSite,approveOrRejectCampsite,getPendingCampingSites };
