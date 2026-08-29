export const otpTemplate = (otp) => {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #0f172a; line-height: 1.6;">
      <p>Hello,</p>
      <p>We received a request to verify your email address for StackVerseHub.</p>
      <p>Your verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.18em; color: #2563eb; margin: 16px 0;">${otp}</p>
      <p>This code will expire in 10 minutes. Please do not share it with anyone.</p>
      <p>If you did not request this code, you can safely ignore this email.</p>
      <p>Best regards,<br />StackVerseHub Team</p>
    </div>
  `;
};

export const instructorApprovalTemplate = ({
  instructorName,
  instructorLoginUrl,
  adminEmail = "stackversehub@gmail.com",
}) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-top: 0; color: #2563eb;">Your StackVerseHub Instructor Account Has Been Approved</h2>
      <p>Hello ${instructorName},</p>
      <p>Great news! Your application to become an instructor on StackVerseHub has been reviewed and approved.</p>
      <p>You can now sign in to your instructor account and access the dashboard to create courses, manage learning content, and connect with students.</p>
      <p>
        Login here:
        <a href="${instructorLoginUrl}" style="color: #2563eb; font-weight: 700;">${instructorLoginUrl}</a>
      </p>
      <p>We're excited to have you as part of the StackVerseHub teaching community and look forward to the knowledge you'll share with our learners.</p>
      <p>If you need any assistance, please contact our support team.</p>
      <p>
        Best regards,<br />
        The StackVerseHub Team<br />
        ${adminEmail}
      </p>
    </div>
  `;
};
