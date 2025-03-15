import mongoose, { Schema } from "mongoose";

const alumniSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    batch: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}$/, 'Batch must be a 4-digit year (e.g., 2020)'], // Optional validation
    },
    linkedinUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/(www\.)?linkedin\.com\/.*$/, 'Please provide a valid LinkedIn URL'], // Optional validation
    },
    companyLogo: {
      type: String, // URL to company logo
      trim: true,
    },
    profileImage: {
      type: String, // URL to profile image
      trim: true,
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

export const Alumni = mongoose.model("Alumni", alumniSchema);