// server/utils/emailService.js
import dotenv from "dotenv";
dotenv.config(); // Force load .env immediately
import nodemailer from "nodemailer";
import dayjs from "dayjs";




if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error("❌ SMTP credentials are missing. Check your .env file.");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP connection
transporter.verify((error, success) => {
  if (error) {
    console.error("user: ", process.env.SMTP_USER);
     console.error("pass: ", process.env.SMTP_PASS);
    console.error("❌ SMTP connection error:", error);
  } else {
    console.log("✅ SMTP server is ready to send emails");
  }
});

// Reusable auto-generated email footer
const AUTO_EMAIL_FOOTER = `<p style="margin-top:20px; font-size:0.9em; color:#555;">
⚠️ This is an auto-generated email. Please do not reply.</p>`;

export const sendEmail = async (to, subject, html) => {
  try {
    console.log(`📧 Sending email to: ${to}, Subject: ${subject}`);
    await transporter.sendMail({
      from: `"Room Reservation System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to} - ${subject}`);
  } catch (err) {
    console.error("❌ Email failed:", err);
  }
};

export const sendStatusEmail = async (reservation, type) => {

   if (type === "pending") return;
   
  const { reserved_by, email, room_name, date_reserved, reservation_start, reservation_end } = reservation;

// Example
const formatted = dayjs(date_reserved).format("ddd, MMM, DD YYYY");
console.log(formatted);

  let subject = "";
  let body = "";

  switch (type) {
    case "approved":
      subject = "✅ Reservation Approved";
      body = `<p>Hi ${reserved_by},</p>
              <p>Your reservation for <b>${room_name}</b> on <b>${formatted}</b>
              from <b>${reservation_start}</b> to <b>${reservation_end}</b> has been <b>approved</b>.</p>`;
      break;

    case "rejected":
      subject = "❌ Reservation Rejected";
      body = `<p>Hi ${reserved_by},</p>
              <p>Your reservation for <b>${room_name}</b> on <b>${formatted}</b> 
               from <b>${reservation_start}</b> to <b>${reservation_end}</b>
              was <b>rejected</b> by the admin.</p>`;
      break;

    case "autoRejected":
      subject = "⚠️ Reservation Auto-Rejected (Overlap)";
      body = `<p>Hi ${reserved_by},</p>
              <p>Your reservation for <b>${room_name}</b> on <b>${formatted}</b> 
              from <b>${reservation_start}</b> to <b>${reservation_end}</b> overlapped 
              with another approved booking and was <b>auto-rejected</b>.</p>`;
      break;

    case "cancelled":
      subject = "🚫 Reservation Cancelled";
      body = `<p>Hi ${reserved_by},</p>
              <p>You have <b>cancelled</b> your Approved reservation for <b>${room_name}</b> on <b>${formatted}</b> 
              from <b>${reservation_start}</b> to <b>${reservation_end}</b> .</p>`;
      break;

    case "cancelled_not_approved_before_start":
      subject = "⚠️ Reservation Cancelled (Not Approved Before Start)";
      body = `<p>Hi ${reserved_by},</p>
              <p>Your reservation for <b>${room_name}</b> on <b>${formatted}</b> 
              starting at <b>${reservation_start}</b> was <b>cancelled</b> because it was not approved before the start time.</p>`;
      break;



    default:
      console.warn("⚠️ Unknown email type:", type);
      return;
  }

  // Append auto-generated footer to every email
  body += AUTO_EMAIL_FOOTER;

  // Log email content for debugging
  console.log("Email content:", { to: email, subject, body });

  await sendEmail(email, subject, body);
};
