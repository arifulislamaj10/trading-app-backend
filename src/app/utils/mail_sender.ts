import nodemailer from "nodemailer";
import { configs } from "../configs";

type TMailContent = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  name?: string;
};

// Create transporter with connection pool and timeout settings
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: configs.email.app_email!,
    pass: configs.email.app_password!,
  },
  connectionTimeout: 5000, // 5 second connection timeout
  socketTimeout: 10000, // 10 second socket timeout
  pool: true, // Enable connection pooling
  maxConnections: 5, // Max 5 concurrent connections
  maxMessages: 100, // Max messages per connection
});

// Verify transporter connection on startup (non-blocking)
transporter.verify((error, success) => {
  if (error) {
    console.warn("⚠️  Email transporter verification failed:", error.message);
    console.warn("Emails will not be sent until connection is established.");
  } else {
    console.log("✅ Email transporter ready");
  }
});

/**
 * Send email with timeout and error handling
 * @param payload - Email content
 * @param blocking - If true, waits for completion (default: false)
 */
const sendMail = async (
  payload: TMailContent,
  blocking: boolean = false,
): Promise<void> => {
  const sendPromise = transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "Trading Platform"}" <${process.env.SMTP_FROM_EMAIL || configs.email.app_email || "noreply@tradingplatform.com"}>`,
    to: payload.to,
    subject: payload.subject,
    text: payload.textBody,
    html: `
        <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>${payload.subject}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @media only screen and (max-width: 600px) {
            .container {
                padding: 20px !important;
            }
        }
    </style>
</head>

<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">

    <div style="max-width: 600px; margin: 40px auto; background-color: #f4f4f4; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);"
        class="container">

        <div style="font-size: 16px; color: #555555; line-height: 1.6;">
            <p style="margin-bottom: 30px;">Hi <strong>${payload?.name || ""}</strong>,</p>

            ${payload?.htmlBody}

            <div style="margin-top: 60px; text-align: center;">
                <img style="width: 50px; height: 50px; border-radius: 50%;"
                    src="${process.env.COMPANY_LOGO_URL || "https://via.placeholder.com/50"}"
                    alt="Company Logo">

                <p style="font-size: 12px;">The Support Team</p>
                <h3>${process.env.COMPANY_NAME || "Trading Platform"}</h3>
            </div>
        </div>
        
        <p style="font-size: 14px; color: #999999; margin-top: 20px; margin-bottom: 10px; text-align: center;">
            This is an automated message — please do not reply to this email.
            <br>
            If you need assistance, feel free to contact our support team.
            <br><br>
            Thank you for choosing us!
        </p>

        <hr>
        <div style="text-align: center; font-size: 12px; color: #999999; margin-top: 20px;">
            &copy; ${new Date().getFullYear()} Your Company. All rights reserved.
        </div>

    </div>
</body>
</html>
        `,
  });

  if (blocking) {
    await sendPromise;
  } else {
    // Non-blocking: send in background with error logging
    sendPromise.catch((err) => {
      console.error(`❌ Email failed to send to ${payload.to}:`, err.message);
    });
  }
};

export default sendMail;
