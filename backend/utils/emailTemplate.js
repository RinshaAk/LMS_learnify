export const otpTemplate = (otp) => {
  return `
    <div style="font-family: Arial; padding: 20px;">
      <h2>Verify Your Account</h2>
      <p>Your OTP code is:</p>
      <h1>${otp}</h1>
      <p>This expires in 5 minutes.</p>
    </div>
  `;
};

export const instructorApprovalTemplate = ({
  instructorName,
  instructorLoginUrl,
  adminEmail = "learnify279@gmail.com",
}) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-top: 0; color: #2563eb;">Your Learnify Instructor Account Has Been Approved</h2>
      <p>Hello ${instructorName},</p>
      <p>Great news! Your application to become an instructor on Learnify has been reviewed and approved.</p>
      <p>You can now sign in to your instructor account and access the dashboard to create courses, manage learning content, and connect with students.</p>
      <p>
        Login here:
        <a href="${instructorLoginUrl}" style="color: #2563eb; font-weight: 700;">${instructorLoginUrl}</a>
      </p>
      <p>We're excited to have you as part of the Learnify teaching community and look forward to the knowledge you'll share with our learners.</p>
      <p>If you need any assistance, please contact our support team.</p>
      <p>
        Best regards,<br />
        The Learnify Team<br />
        ${adminEmail}
      </p>
    </div>
  `;
};
