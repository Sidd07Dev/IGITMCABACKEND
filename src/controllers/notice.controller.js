// notice.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notice } from "../models/notice.model.js";
import axios from "axios";
import { load } from "cheerio";
import cron from "node-cron";

const NOTICE_URL = "https://igitsarang.ac.in/notice/2025"; // Target URL for scraping
/**
 * Scrapes notices from the IGIT Sarang notice page and only includes new notices based on ID.
 * @returns {Promise<Array>} Array of new scraped notices
 */
async function scrapeNotices() {
  try {
    const { data } = await axios.get(NOTICE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = load(data);
    const noticePromises = [];

    $("#table_notice tbody tr").each((index, element) => {
      const $row = $(element);
      const id = $row.attr("id")?.replace("noticerow_", "") || null; // Extract ID
      const title = $row.find("td").eq(0).text().trim().replace(/\s+/g, " ");
      const dateStr = $row.find("td").eq(1).text().trim();
      const pdfLink = $row.find("td").eq(2).find("a").attr("href") || null;
      const isNew = $row.find("td").eq(0).find('img[src*="new.gif"]').length > 0;

      // Convert DD-MM-YYYY string to Date object
      let formattedDate;
      try {
        const [day, month, year] = dateStr.split("-").map(Number);
        formattedDate = new Date(year, month - 1, day + 1); // month is 0-based in JS
        if (isNaN(formattedDate.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (error) {
        formattedDate = null;
        console.warn(`Failed to parse date: ${dateStr}`);
      }

      // Push a promise to check if the notice exists in the DB by ID
      noticePromises.push(
        (async () => {
          if (!id) {
            console.warn(`No ID found for notice: ${title}, skipping`);
            return null; // Skip notices without an ID
          }

          const existingNotice = await Notice.findOne({ id }); // Check by ID
          if (!existingNotice) {
            return { id, title, date: formattedDate, pdfLink, isNew };
          }    
          console.log(`Notice with ID ${id} already exists in DB, skipping: ${title}`);
          return null; // Return null for existing notices
        })()
      );
    });

    // Resolve all promises and filter out null values (existing notices)
    const notices = (await Promise.all(noticePromises)).filter((notice) => notice !== null);
    return notices;
  } catch (error) {
    console.error("Error scraping notices:", error.message);
    return [];
  }
}

/**
 * Scrapes notices and saves new ones to the database.
 */
const createNoticeFromScraping = async () => {
  const scrapedNotices = await scrapeNotices();

  if (!scrapedNotices.length) {
    console.log("No new notices scraped");
    return;
  }

  for (const scrapedNotice of scrapedNotices) {
    const { id, title, date, pdfLink, isNew } = scrapedNotice;

    try {
      await Notice.create({
        id, // Store the ID
        title,
        pdfLink,
        date: date ? new Date(date) : new Date(), // Fallback to current date if null
        isNew: isNew || false, // Store the isNew flag if needed
      });
      console.log(`New notice saved with ID ${id}: ${title}`);
    } catch (error) {
      console.error(`Error saving notice with ID ${id}: ${title} -`, error.message);
    }
  }
};

// Example usage
createNoticeFromScraping().catch((err) =>
  console.error("Error in notice scraping process:", err)
);

/**
 * Creates a new notice manually via API.
 */
const createNotice = asyncHandler(async (req, res) => {
  const { title, pdfLink } = req.body;

  if (!title || !pdfLink) {
    throw new ApiError(400, "Title and PDF link are required");
  }

  // Check if notice already exists by title
  const existingNotice = await Notice.findOne({ title });
  if (existingNotice) {
    throw new ApiError(400, "Notice with this title already exists");
  }

  const notice = await Notice.create({
    title,
    pdfLink,
    date: new Date(),
  });

  if (!notice) {
    throw new ApiError(500, "Failed to create notice");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, notice, "Notice created successfully"));
});

/**
 * Fetches all notices, sorted by date (newest first).
 */
const getAllNotices = asyncHandler(async (req, res) => {
  const notices = await Notice.find({})
    .sort({ date: -1 }) // Newest first
    .lean();

  if (!notices || notices.length === 0) {
    throw new ApiError(404, "No notices found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, notices, "Notices fetched successfully"));
});

/**
 * Updates an existing notice.
 */
const editNotice = asyncHandler(async (req, res) => {
  const { noticeId } = req.params;
  const { title, pdfLink } = req.body;

  if (!noticeId) {
    throw new ApiError(400, "Notice ID is required");
  }

  if (!title && !pdfLink) {
    throw new ApiError(400, "At least one field (title or pdfLink) must be provided to update");
  }

  const notice = await Notice.findById(noticeId);
  if (!notice) {
    throw new ApiError(404, "Notice not found");
  }

  if (title) notice.title = title;
  if (pdfLink) notice.pdfLink = pdfLink;

  const updatedNotice = await notice.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedNotice, "Notice updated successfully"));
});

/**
 * Deletes a notice by ID.
 */
const deleteNotice = asyncHandler(async (req, res) => {
  const { noticeId } = req.params;

  if (!noticeId) {
    throw new ApiError(400, "Notice ID is required");
  }

  const notice = await Notice.findByIdAndDelete(noticeId);
  if (!notice) {
    throw new ApiError(404, "Notice not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Notice deleted successfully"));
});

// Schedule scraping every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  console.log("Running notice scraping task...");
  await createNoticeFromScraping();
});



export { createNotice, getAllNotices, editNotice, deleteNotice };