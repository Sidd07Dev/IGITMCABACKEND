import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notice } from "../models/notice.model.js";
import { User } from "../models/user.model.js"; // Import User model
import axios from "axios";
import { load } from "cheerio";
import cron from "node-cron";
import { Expo } from "expo-server-sdk"; // Import Expo SDK

const NOTICE_URL = "https://igitsarang.ac.in/notice/2025"; // Target URL for scraping

// Initialize Expo
const expo = new Expo();

/**
 * Sends push notifications to all users with a valid Expo push token.
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
async function sendPushNotifications(title, body) {
  try {
    // Fetch all users with an Expo push token
    const users = await User.find({ expoPushToken: { $exists: true, $ne: null } }).lean();
    if (!users.length) {
      console.log("No users with push tokens found");
      return;
    }

    const messages = [];
    for (const user of users) {
      if (!Expo.isExpoPushToken(user.expoPushToken)) {
        console.warn(`Invalid Expo push token for user: ${user._id}`);
        continue;
      }

      messages.push({
        to: user.expoPushToken,
        sound: "default",
        title: title,
        body: body,
        data: { noticeTitle: title }, // Optional: Extra data
      });
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log("Push notifications sent successfully:", ticketChunk);
      } catch (error) {
        console.error("Error sending push notification chunk:", error.message);
      }
    }

    // Optionally handle receipts (e.g., to check for errors)
    // const receiptIds = tickets.filter(ticket => ticket.id).map(ticket => ticket.id);
    // if (receiptIds.length) {
    //   const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);
    //   console.log("Notification receipts:", receipts);
    // }
  } catch (error) {
    console.error("Error in sendPushNotifications:", error.message);
  }
}

/**
 * Scrapes notices from the IGIT Sarang notice page and only includes new notices based on ID.
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
      const id = $row.attr("id")?.replace("noticerow_", "") || null;
      const title = $row.find("td").eq(0).text().trim().replace(/\s+/g, " ");
      const dateStr = $row.find("td").eq(1).text().trim();
      const pdfLink = $row.find("td").eq(2).find("a").attr("href") || null;
      const isNew = $row.find("td").eq(0).find('img[src*="new.gif"]').length > 0;

      let formattedDate;
      try {
        const [day, month, year] = dateStr.split("-").map(Number);
        formattedDate = new Date(year, month - 1, day + 1);
        if (isNaN(formattedDate.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (error) {
        formattedDate = null;
        console.warn(`Failed to parse date: ${dateStr}`);
      }

      noticePromises.push(
        (async () => {
          if (!id) {
            console.warn(`No ID found for notice: ${title}, skipping`);
            return null;
          }

          const existingNotice = await Notice.findOne({ id });
          if (!existingNotice) {
            return { id, title, date: formattedDate, pdfLink, isNew };
          }
          console.log(`Notice with ID ${id} already exists in DB, skipping: ${title}`);
          return null;
        })()
      );
    });

    const notices = (await Promise.all(noticePromises)).filter((notice) => notice !== null);
    return notices;
  } catch (error) {
    console.error("Error scraping notices:", error.message);
    return [];
  }
}
    
/**
 * Scrapes notices, saves new ones to the database, and sends push notifications.
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
      const newNotice = await Notice.create({
        id,
        title,
        pdfLink,
        date: date ? new Date(date) : new Date(),
        isNew: isNew || false,
      });
      console.log(`New notice saved with ID ${id}: ${title}`);

      // Send push notification for the new notice
      await sendPushNotifications(
        "New Notice",
        `A new notice has been posted: ${title}`
      );
    } catch (error) {
      console.error(`Error saving notice with ID ${id}: ${title} -`, error.message);
    }
  }
};

/**
 * Creates a new notice manually via API and sends push notifications.
 */
const createNotice = asyncHandler(async (req, res) => {
  const { title, pdfLink } = req.body;

  if (!title || !pdfLink) {
    throw new ApiError(400, "Title and PDF link are required");
  }

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

  // Send push notification for the manually created notice
  await sendPushNotifications(
    "New Notice",
    `A new notice has been posted: ${title}`
  );

  return res
    .status(201)
    .json(new ApiResponse(201, notice, "Notice created successfully"));
});

/**
 * Fetches all notices, sorted by date (newest first).
 */
const getAllNotices = asyncHandler(async (req, res) => {
  const notices = await Notice.find({})
    .sort({ date: -1 })
    .lean();

  if (!notices || notices.length === 0) {
    throw new ApiError(404, "No notices found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, notices, "Notices fetched successfully"));
});

/**
 * Updates an existing notice (no notification needed for updates).
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
 * Deletes a notice by ID (no notification needed for deletion).
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
createNoticeFromScraping()   
export { createNotice, getAllNotices, editNotice, deleteNotice };  