// notice.model.js
import mongoose, { Schema } from "mongoose";

const noticeSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    pdfLink: {
      type: String,
       // Assuming this is a URL to a PDF file
    },
  }, 
  { timestamps: true }
);

export const Notice = mongoose.model("Notice", noticeSchema);