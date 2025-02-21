import nodemailer from "nodemailer";
import twilio from "twilio";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

// Manually define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
    
    host: 'mail.batoibhai.com', // Use your SMTP server
    port: 465, // Usually 587 for secure connections
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send Modern HTML Email Notification
const sendEmail = async (to, subject, template, data) => {
    try {
        const emailTemplate = await ejs.renderFile(
            path.join(__dirname, "../templates", `${template}.ejs`), // Now __dirname works
            data
        );

        await transporter.sendMail({
            from: `BatoiBhai <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: emailTemplate,
        });

        console.log(`✅ Email sent to ${to}`);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};

// Send Professional SMS Notification
const sendSMS = async (to, message) => {
    try {
        await twilioClient.messages.create({
            body: `🚀 ${message} \n - Your Company`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to,
        });
        console.log(`✅ SMS sent to ${to}`);
    } catch (error) {
        console.error("❌ Error sending SMS:", error);
    }
};

export { sendEmail, sendSMS };
