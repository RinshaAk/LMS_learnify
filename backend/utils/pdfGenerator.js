import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "../config/env.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, "../assets/logo.png");

// Draw QR Code Mockup using standard pdfkit paths
const drawQRCodeMockup = (doc, x, y, size) => {
  // Main background
  doc.rect(x, y, size, size).fillColor("#ffffff").fill();
  doc.rect(x + 2, y + 2, size - 4, size - 4).strokeColor("#0f172a").lineWidth(1).stroke();

  // Corner Position Boxes (three large 3-nested boxes)
  const drawPositionPattern = (px, py) => {
    // Outer box (7x7 module equivalent)
    doc.rect(px, py, 18, 18).fillColor("#0f172a").fill();
    // Middle box (5x5 module equivalent)
    doc.rect(px + 3, py + 3, 12, 12).fillColor("#ffffff").fill();
    // Inner box (3x3 module equivalent)
    doc.rect(px + 5, py + 5, 8, 8).fillColor("#0f172a").fill();
  };

  drawPositionPattern(x + 4, y + 4); // Top Left
  drawPositionPattern(x + size - 22, y + 4); // Top Right
  drawPositionPattern(x + 4, y + size - 22); // Bottom Left

  // Bottom-right alignment patterns and randomly placed mock data blocks
  doc.fillColor("#0f172a");

  // Mock data blocks (dots / small rects)
  doc.rect(x + 26, y + 4, 6, 6).fill();
  doc.rect(x + 36, y + 6, 8, 4).fill();
  doc.rect(x + 26, y + 14, 12, 6).fill();

  doc.rect(x + 48, y + 26, 6, 12).fill();
  doc.rect(x + 26, y + 26, 8, 8).fill();
  doc.rect(x + 12, y + 26, 10, 6).fill();

  doc.rect(x + 26, y + 38, 12, 8).fill();
  doc.rect(x + 42, y + 38, 8, 14).fill();
  doc.rect(x + 4, y + 42, 6, 6).fill();
  doc.rect(x + 14, y + 48, 10, 4).fill();

  doc.rect(x + 26, y + 50, 14, 6).fill();
};

export const generateCertificatePDF = (certData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: "landscape",
        size: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const width = doc.page.width;
      const height = doc.page.height;

      // ── Background & Borders ──────────────────────────────────────
      doc.rect(0, 0, width, height).fillColor("#fbfcfd").fill();

      // Outer border (Navy slate)
      doc
        .rect(30, 30, width - 60, height - 60)
        .lineWidth(6)
        .strokeColor("#0f172a")
        .stroke();

      // Inner thin border (Metallic Gold/Bronze tone)
      doc
        .rect(42, 42, width - 84, height - 84)
        .lineWidth(1.5)
        .strokeColor("#b45309")
        .stroke();

      // Fancy corner accents
      const drawCornerAccent = (cx, cy, rotation) => {
        doc.save();
        doc.translate(cx, cy);
        doc.rotate(rotation);
        doc.rect(-10, -10, 30, 3).fillColor("#b45309").fill();
        doc.rect(-10, -10, 3, 30).fillColor("#b45309").fill();
        doc.restore();
      };
      drawCornerAccent(45, 45, 0);
      drawCornerAccent(width - 45, 45, 90);
      drawCornerAccent(width - 45, height - 45, 180);
      drawCornerAccent(45, height - 45, 270);

      // ── Certificate Seal / Ribbon Graphic ──────────────────────────
      const drawGoldSeal = (sx, sy) => {
        const points = 16;
        const outerRadius = 35;
        const innerRadius = 28;
        doc.save();
        doc.translate(sx, sy);
        for (let i = 0; i < points * 2; i++) {
          const angle = (i * Math.PI) / points;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) doc.moveTo(x, y);
          else doc.lineTo(x, y);
        }
        doc.closePath();
        doc.fillColor("#d97706").fill();

        doc.circle(0, 0, 24).fillColor("#b45309").fill();
        doc.circle(0, 0, 22).fillColor("#d97706").fill();

        doc.fillColor("#ffffff");
        doc.fontSize(14).text("★", -5.5, -9);
        doc.restore();
      };

      // ── Header Section ──────────────────────────────────────────
      const logoWidth = 110;
      const logoX = (width - logoWidth) / 2;
      doc.image(logoPath, logoX, 55, { width: logoWidth });

      doc
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .fontSize(30)
        .text("CERTIFICATE OF COMPLETION", 0, 135, { align: "center" });

      doc
        .font("Helvetica-Oblique")
        .fillColor("#475569")
        .fontSize(13)
        .text("This is proudly presented to", 0, 178, { align: "center" });

      // ── Student Name ─────────────────────────────────────────────
      const studentName = certData.studentName || "Student Name";
      doc
        .font("Helvetica-Bold")
        .fillColor("#0284c7")
        .fontSize(26)
        .text(studentName.toUpperCase(), 0, 210, { align: "center" });

      doc
        .moveTo(width / 2 - 120, 244)
        .lineTo(width / 2 + 120, 244)
        .lineWidth(1)
        .strokeColor("#cbd5e1")
        .stroke();

      doc
        .font("Helvetica")
        .fillColor("#475569")
        .fontSize(12)
        .text("for successfully completing and passing all evaluation tasks in the course", 0, 256, { align: "center" });

      // ── Course Title ─────────────────────────────────────────────
      doc
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .fontSize(20)
        .text(`"${certData.courseTitle}"`, 0, 282, { align: "center" });

      doc
        .font("Helvetica")
        .fillColor("#64748b")
        .fontSize(10.5)
        .text("A comprehensive training program encompassing theory sessions, hands-on lab exercises, and final assessments.", 0, 312, { align: "center" });

      // ── Signatures & Issue Date ──────────────────────────────────
      // Left side: Instructor Signature
      doc
        .moveTo(130, 425)
        .lineTo(310, 425)
        .lineWidth(1)
        .strokeColor("#94a3b8")
        .stroke();

      doc
        .font("Helvetica-Oblique")
        .fillColor("#0f172a")
        .fontSize(16)
        .text(certData.instructorName, 130, 398, { width: 180, align: "center" });

      doc
        .font("Helvetica-Bold")
        .fillColor("#475569")
        .fontSize(11)
        .text("Authorized Instructor", 130, 432, { width: 180, align: "center" });

      // Center: Gold Seal of Authenticity
      drawGoldSeal(width / 2, 410);

      // Right side: Date of Issue
      doc
        .moveTo(width - 310, 425)
        .lineTo(width - 130, 425)
        .lineWidth(1)
        .strokeColor("#94a3b8")
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .fontSize(12)
        .text(certData.date, width - 310, 404, { width: 180, align: "center" });

      doc
        .font("Helvetica-Bold")
        .fillColor("#475569")
        .fontSize(11)
        .text("Date of Issue", width - 310, 432, { width: 180, align: "center" });

      // ── Footer: QR Code & Unique ID Verification ─────────────────
      drawQRCodeMockup(doc, 60, height - 120, 60);

      doc
        .font("Helvetica")
        .fillColor("#64748b")
        .fontSize(8.5)
        .text("Scan QR code or visit:", 130, height - 110);

      const verificationUrl = `${env.CLIENT_URL || "http://localhost:5173"}/verify/${certData.certificateId}`;
      doc
        .font("Helvetica-Bold")
        .fillColor("#0284c7")
        .text(verificationUrl, 130, height - 98, { underline: true });

      doc
        .font("Helvetica")
        .fillColor("#64748b")
        .fontSize(8.5)
        .text("Certificate Code: ", width - 290, height - 110, { continued: true })
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text(certData.certificateId);

      doc
        .font("Helvetica")
        .fillColor("#94a3b8")
        .fontSize(8)
        .text("StackVerseHub e-Learning Platform. Verified Certificate of Achievement.", width - 290, height - 98);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
