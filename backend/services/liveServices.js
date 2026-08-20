import { LiveSession } from "../models/LiveSetion.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { getReceiverSocketId, getIo } from "../sockets/chatSocket.js";
import { sendEmail } from "../utils/sendEmail.js";

// create
export const createLiveSessionService = async ({
  course,
  instructor,
  title,
  startTime,
  meetingLink,
}) => {
  const courseDoc = await Course.findById(course);
  if (!courseDoc) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  if (courseDoc.instructor.toString() !== instructor) {
    const error = new Error("Not authorized for this course");
    error.statusCode = 403;
    throw error;
  }

  const session = await LiveSession.create({
    course,
    instructor,
    title,
    startTime,
    meetingLink,
  });

  const populatedSession = await LiveSession.findById(session._id)
    .populate("course", "title")
    .populate("instructor", "name profileImage");

  try {
    const io = getIo();
    io.emit("liveClassCreated", populatedSession);
  } catch (err) {
    console.error("[Socket] Failed to emit liveClassCreated:", err);
  }

  // Notify enrolled students via email asynchronously
  try {
    const enrollments = await Enrollment.find({ course }).populate("user", "name email");

    // We send emails in background so we don't block the request
    (async () => {
      const courseTitle = populatedSession.course?.title || "your enrolled course";
      const instructorName = populatedSession.instructor?.name || "your instructor";
      const formattedDate = new Date(startTime).toLocaleDateString("en-US", {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      for (const enrollment of enrollments) {
        if (enrollment.user && enrollment.user.email) {
          const studentEmail = enrollment.user.email;
          const studentName = enrollment.user.name || "Student";

          const mailSubject = `New Live Class Scheduled: ${title}`;
          const mailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px;">New Live Class Scheduled</h1>
              </div>
              <div style="padding: 24px; color: #334155; line-height: 1.6;">
                <p>Hello <strong>${studentName}</strong>,</p>
                <p>A new live class has been scheduled for your course: <strong>${courseTitle}</strong>.</p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Class Details</h3>
                  <p style="margin: 8px 0;"><strong>Topic:</strong> ${title}</p>
                  <p style="margin: 8px 0;"><strong>Instructor:</strong> ${instructorName}</p>
                  <p style="margin: 8px 0;"><strong>Start Time:</strong> ${formattedDate}</p>
                </div>

                <p>You can join the session directly through your dashboard or using the link below:</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${meetingLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Join Live Class</a>
                </div>

                <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                  This is an automated notification from Learnify. Please do not reply directly to this email.
                </p>
              </div>
            </div>
          `;

          sendEmail(studentEmail, mailSubject, mailHtml).catch(err => {
            console.error(`[Email] Failed to send live class email to ${studentEmail}:`, err.message);
          });
        }
      }
    })();
  } catch (notifyErr) {
    console.error("[Email Notification] Error fetching enrollments for notification:", notifyErr);
  }

  return populatedSession;
};

// get sessions
export const getLiveSessionsService = async (courseId) => {
  return await LiveSession.find({ course: courseId })
    .populate("instructor", "name");
};

// get my sessions (for student / instructor)
export const getMyLiveSessionsService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.role === "instructor") {
    return await LiveSession.find({ instructor: userId })
      .populate("course", "title")
      .populate("instructor", "name profileImage");
  } else {
    const enrollments = await Enrollment.find({ user: userId });
    const courseIds = enrollments.map((e) => e.course);

    return await LiveSession.find({ course: { $in: courseIds } })
      .populate("course", "title")
      .populate("instructor", "name profileImage");
  }
};

// start session
export const startLiveSessionService = async ({ sessionId, userId }) => {
  const session = await LiveSession.findById(sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.instructor.toString() !== userId) {
    const err = new Error("Not authorized");
    err.statusCode = 403;
    throw err;
  }

  if (session.isLive) {
    throw new Error("Session already live");
  }

  session.isLive = true;
  await session.save();

  const populatedSession = await LiveSession.findById(sessionId)
    .populate("course", "title")
    .populate("instructor", "name profileImage");

  try {
    const io = getIo();
    io.emit("live-session-started", {
      sessionId: session._id,
      courseId: session.course,
      title: session.title,
      startTime: session.startTime,
      meetingLink: session.meetingLink,
      instructor: session.instructor,
    });
    io.emit("liveClassUpdated", populatedSession);
  } catch (err) {
    console.error("[Socket] Failed to emit live-session-started / liveClassUpdated:", err);
  }

  return true;
};

// end session
export const endLiveSessionService = async ({ sessionId, userId }) => {
  const session = await LiveSession.findById(sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.instructor.toString() !== userId) {
    const err = new Error("Not authorized");
    err.statusCode = 403;
    throw err;
  }

  if (!session.isLive) {
    throw new Error("Session is not live");
  }

  session.isLive = false;
  session.isCompleted = true;
  await session.save();

  const populatedSession = await LiveSession.findById(sessionId)
    .populate("course", "title")
    .populate("instructor", "name profileImage");

  try {
    const io = getIo();
    io.emit("live-session-ended", {
      sessionId: session._id,
      courseId: session.course,
    });
    io.emit("liveClassUpdated", populatedSession);
  } catch (err) {
    console.error("[Socket] Failed to emit live-session-ended / liveClassUpdated:", err);
  }

  return true;
};

// delete session
export const deleteLiveSessionService = async (instructorId, sessionId) => {
  const session = await LiveSession.findById(sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.instructor.toString() !== instructorId) {
    const err = new Error("Not authorized");
    err.statusCode = 403;
    throw err;
  }

  await LiveSession.findByIdAndDelete(sessionId);

  try {
    const io = getIo();
    io.emit("liveClassDeleted", { sessionId });
  } catch (err) {
    console.error("[Socket] Failed to emit liveClassDeleted:", err);
  }

  return true;
};
