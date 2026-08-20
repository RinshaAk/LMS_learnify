import nodemailer from "nodemailer";

export class EmailDeliveryError extends Error {
  constructor(message = "Unable to send verification email. Please try again later.") {
    super(message);
    this.name = "EmailDeliveryError";
    this.statusCode = 503;
  }
}

const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.error("EMAIL_USER or EMAIL_PASS missing in environment variables");
    throw new EmailDeliveryError("Email service is not configured. Please contact support.");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL/TLS
    auth: {
      user: emailUser,
      pass: emailPass,


    },


    tls: {
      rejectUnauthorized: false, // Bypass SSL certificate verification
    },

  });
};

export const sendEmail = async (to, subject, html) => {
  try {
    const emailUser = process.env.EMAIL_USER?.trim();
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"Learnify" <${emailUser}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email sending failed detail:", {
      message: error.message,
      code: error.code,
      command: error.command,
    });
    if (error.code === 'EENVELOPE') {
      const deliveryError = new Error("The email address provided is invalid or could not be reached.");
      deliveryError.statusCode = 400;
      throw deliveryError;
    }

    if (error instanceof EmailDeliveryError) {
      throw error;
    }

    // Check for common Gmail errors
    if (error.message.includes('Invalid login') || error.message.includes('Username and Password not accepted')) {
       throw new EmailDeliveryError("Email authentication failed. Please check your App Password.");
    }

    // Default to 503 if it's likely a configuration/service issue
    throw new EmailDeliveryError();
  }
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};




export const getOtpExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000);
};

export const isOtpExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000);
}
