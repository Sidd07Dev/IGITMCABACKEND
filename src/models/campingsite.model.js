import mongoose from "mongoose";
import { Schema } from "mongoose";

const campingSiteSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        location: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        address: {
            type: String,
            required: true
        },
        pricePerNight: {
            type: Number,
            required: true
        },
        dynamicPricing: {
            seasonalRates: [
                {
                    season: String,
                    months: [Number],
                    priceMultiplier: Number
                }
            ],
            demandBased: {
                highDemandThreshold: Number,
                highDemandMultiplier: Number,
                lowDemandThreshold: Number,
                lowDemandMultiplier: Number
            },
            lastMinuteDiscount: {
                daysBeforeCheckIn: Number,
                discountMultiplier: Number
            }
        },
        maxGuests: {
            type: Number,
            required: true
        },
        amenities: {
            type: [String]
        },
        description: {
            type: String,
            required: true,
            index: true
        },
        images: {
            type: [String] // Array of Cloudinary URLs
        },
        availability: {
            type: [Date]
        },
        providerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        rating: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const CampingSite = mongoose.model("CampingSite", campingSiteSchema);
