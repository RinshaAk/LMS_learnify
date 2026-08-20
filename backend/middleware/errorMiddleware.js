import { env } from "../config/env.config.js";

const errorMiddleware = (err, req, res, next) => {
  console.error("Error Middleware Caught:", err);
  const statusCode = err.statusCode || 500;

  // Render a beautiful HTML page for download routes instead of raw JSON!
  if (req.originalUrl && req.originalUrl.includes("/certificate/download/")) {
    res.setHeader("Content-Type", "text/html");

    // Choose icon / styling based on status
    const isDanger = statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 500;

    let title = "Request Error";
    let subtitle = "Something went wrong during your request.";

    if (statusCode === 401 || statusCode === 403) {
      title = "Access Denied";
      subtitle = "We were unable to verify your session details.";
    } else if (statusCode === 404) {
      title = "Certificate Not Found";
      subtitle = "The requested certificate record could not be found.";
    } else if (statusCode === 400 && err.message && err.message.toLowerCase().includes("approved")) {
      title = "Awaiting Instructor Approval";
      subtitle = "Your certificate has not been approved and issued yet.";
    }

    const details = err.message || "An unexpected error occurred.";

    return res.status(statusCode).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Learnify Verification</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    }
    .icon-container {
      width: 72px;
      height: 72px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      color: #d97706;
    }
    .icon-container.danger {
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #dc2626;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 12px;
      letter-spacing: -0.02em;
    }
    p.subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 24px;
      line-height: 1.6;
    }
    .details {
      background: #f8fafc;
      border-radius: 16px;
      padding: 16px;
      font-size: 13px;
      color: #475569;
      text-align: left;
      margin-bottom: 28px;
      line-height: 1.5;
      border: 1px dashed #e2e8f0;
    }
    .details strong {
      color: #1e293b;
      display: block;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
    }
    .btn {
      display: inline-block;
      width: 100%;
      box-sizing: border-box;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 24px;
      border-radius: 16px;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    }
    .btn:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container ${isDanger ? 'danger' : ''}">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <h1>${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <div class="details">
      <strong>Verification System Notice</strong>
      ${details}
    </div>
    <a href="${env.CLIENT_URL || "http://localhost:5173"}/student/certificates" class="btn">Back to Certificates</a>
  </div>
</body>
</html>
    `);
  }

  res.status(statusCode).json({
    message: err.message || 'Server Error',
  });
};

export default errorMiddleware;





