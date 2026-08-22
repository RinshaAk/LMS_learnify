const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getDetail = (user, key) => {
  const directValue = user?.[key];
  const verificationValue = user?.verificationDetails?.[key];
  return directValue || verificationValue || "";
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date ? new Date(date) : new Date());

const getInstructorDetails = (user) => [
  ["Name", user?.name],
  ["Email", user?.email],
  ["Phone", getDetail(user, "phone")],
  ["Education", getDetail(user, "education")],
  ["College", getDetail(user, "college")],
  ["Degree", getDetail(user, "degree")],
  ["Graduation Year", getDetail(user, "graduationYear")],
  ["Experience", getDetail(user, "experience")],
  ["Expertise", getDetail(user, "expertise")],
  ["Registration Date", formatDate(user?.createdAt)],
  ["Current Status", "Pending"],
];

const detailRows = (details) =>
  details
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join("");

const baseHtml = ({ title, badge, children }) => `
  <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:24px 28px;background:#2563eb;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;line-height:1.25;">Learnify</h1>
          <p style="margin:8px 0 0;font-size:14px;opacity:.9;">${escapeHtml(title)}</p>
        </div>
        <div style="padding:28px;">
          <span style="display:inline-block;padding:7px 12px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">
            ${escapeHtml(badge)}
          </span>
          ${children}
        </div>
      </div>
    </div>
  </div>
`;

export const buildAdminInstructorRegistrationEmail = (user) => {
  const details = getInstructorDetails(user);

  const html = baseHtml({
    title: "New instructor registration awaiting review",
    badge: "Pending Review",
    children: `
      <p style="margin:24px 0 12px;">Hello Admin,</p>
      <p style="margin:0 0 18px;line-height:1.6;">
        A new instructor has successfully submitted a registration application on Learnify.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e2e8f0;">
        <style>
          th { text-align:left; width:38%; background:#f8fafc; color:#334155; }
          th, td { padding:12px 14px; border-bottom:1px solid #e2e8f0; font-size:14px; vertical-align:top; }
          td { color:#0f172a; }
        </style>
        <tbody>${detailRows(details)}</tbody>
      </table>
      <p style="margin:18px 0 0;line-height:1.6;">
        Please review the instructor's application and arrange an interview when appropriate. After completing the interview and verification process, you can approve or reject the application through the Learnify admin dashboard.
      </p>
      <p style="margin:24px 0 0;line-height:1.6;">
        Regards,<br />Learnify Notification System
      </p>
    `,
  });

  const text = [
    "Hello Admin,",
    "",
    "A new instructor has successfully submitted a registration application on Learnify.",
    "",
    "Instructor details:",
    ...details
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`),
    "",
    "Please review the instructor's application and arrange an interview when appropriate. After completing the interview and verification process, you can approve or reject the application through the Learnify admin dashboard.",
    "",
    "Regards,",
    "Learnify Notification System",
  ].join("\n");

  return {
    subject: "New Instructor Registration Awaiting Review — Learnify",
    html,
    text,
  };
};

export const buildInstructorRegistrationConfirmationEmail = (user) => {
  const instructorName = user?.name || "Instructor";

  const html = baseHtml({
    title: "Instructor application received",
    badge: "Application Pending",
    children: `
      <p style="margin:24px 0 12px;">Hello ${escapeHtml(instructorName)},</p>
      <p style="margin:0 0 16px;line-height:1.6;">Thank you for applying to become an instructor on Learnify.</p>
      <p style="margin:0 0 16px;line-height:1.6;">Your registration has been submitted successfully and forwarded to our administration team for review.</p>
      <p style="margin:0 0 16px;line-height:1.6;">Our team will review the information you provided. If your application meets the initial requirements, we will contact you with the interview details. Following the interview and verification process, the administration team will notify you whether your instructor account has been approved.</p>
      <p style="margin:0 0 16px;line-height:1.6;">Until the review is completed, your application status will remain Pending.</p>
      <p style="margin:0 0 16px;line-height:1.6;">Please monitor this email address for further updates. You do not need to submit another registration application.</p>
      <p style="margin:0 0 20px;line-height:1.6;">We appreciate your interest in contributing to the Learnify learning community.</p>
      <p style="margin:24px 0 0;line-height:1.6;">Regards,<br />The Learnify Team</p>
    `,
  });

  const text = [
    `Hello ${instructorName},`,
    "",
    "Thank you for applying to become an instructor on Learnify.",
    "",
    "Your registration has been submitted successfully and forwarded to our administration team for review.",
    "",
    "Our team will review the information you provided. If your application meets the initial requirements, we will contact you with the interview details. Following the interview and verification process, the administration team will notify you whether your instructor account has been approved.",
    "",
    "Until the review is completed, your application status will remain Pending.",
    "",
    "Please monitor this email address for further updates. You do not need to submit another registration application.",
    "",
    "We appreciate your interest in contributing to the Learnify learning community.",
    "",
    "Regards,",
    "The Learnify Team",
  ].join("\n");

  return {
    subject: "Instructor Application Received — Learnify",
    html,
    text,
  };
};
