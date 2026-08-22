import nodemailer from "nodemailer";

export class EmailDeliveryError extends Error {
  constructor(
    message = "Unable to send verification email. Please try again later."
  ) {
    super(message);
    this.name = "EmailDeliveryError";
    this.statusCode = 503;
  }
}

const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER?.trim();

  // Gmail App Passwords are sometimes copied with spaces.
  const emailPass = process.env.EMAIL_PASS?.replace(
    /\s/g,
    ""
  );

  if (!emailUser || !emailPass) {
    console.error(
      "EMAIL_USER or EMAIL_PASS is missing"
    );

    throw new EmailDeliveryError(
      "Email service is not configured. Please contact support."
    );
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,

    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

export const sendEmail = async (
  to,
  subject,
  html,
  text
) => {
  try {
    const emailUser = process.env.EMAIL_USER?.trim();

    if (!to?.trim()) {
      const error = new Error(
        "Recipient email is required"
      );

      error.statusCode = 400;
      throw error;
    }

    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"Learnify" <${emailUser}>`,
      to: to.trim(),
      subject,
      html,
      ...(text ? { text } : {}),
    });

    console.log(
      "Email sent successfully:",
      info.messageId
    );

    return true;
  } catch (error) {
    console.error("Email sending failed:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
    });

    if (error.statusCode === 400) {
      throw error;
    }

    if (error.code === "EENVELOPE") {
      const deliveryError = new Error(
        "The provided email address is invalid or could not be reached."
      );

      deliveryError.statusCode = 400;
      throw deliveryError;
    }

    if (error instanceof EmailDeliveryError) {
      throw error;
    }

    const errorMessage = error.message || "";

    if (
      error.code === "EAUTH" ||
      errorMessage.includes("Invalid login") ||
      errorMessage.includes(
        "Username and Password not accepted"
      )
    ) {
      throw new EmailDeliveryError(
        "Email authentication failed. Please check your Gmail App Password."
      );
    }

    throw new EmailDeliveryError();
  }
};

export const generateOTP = () => {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
};

// OTP expires three minutes after generation.
export const getOtpExpiry = () => {
  return new Date(
    Date.now() + 3 * 60 * 1000
  );
};

/*
 * Keep this temporarily only if another file imports
 * isOtpExpiry. Both functions return the expiry Date.
 */
export const isOtpExpiry = getOtpExpiry;
