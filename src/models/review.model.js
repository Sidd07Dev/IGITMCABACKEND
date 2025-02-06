import mongoose from "mongoose";
import { Schema } from "mongoose";

const reviewSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        campingSiteId: {
            type: Schema.Types.ObjectId,
            ref: "CampingSite",
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

export const Review = mongoose.model("Review", reviewSchema);
