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
        maxBookingsPerDay: {
            type: Number,
            required: true,
            default: 6  // Default limit set by provider
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
        providerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        rating: {
            type: Number,
            default: 0
        },
        availability: {
            type: [Date]
        },
        status:{
            
                type:String,
                enum: ["active", "deactive","pending"],
                default:"pending"
            
        },
      
        govtId:{
            idType:{
                type:String,
                require:true
            },
            idImage:{
                type:String,
                require:true
            }
        }
    },
    { timestamps: true }
);

export const CampingSite = mongoose.models.CampingSite || mongoose.model("CampingSite", campingSiteSchema);
