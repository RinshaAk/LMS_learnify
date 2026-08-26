import { LiveSession } from "../models/LiveSetion.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { getIo } from "../sockets/chatSocket.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
  createIvsChannel,
  getIvsStream,
  stopIvsStream,
  deleteIvsChannel,
} from "./ivsService.js";

let liveSessionModel = LiveSession;
let enrollmentModel = Enrollment;
let userModel = User;
let courseModel = Course;
let socketGetter = getIo;
let emailSender = sendEmail;
let ivsOps = {
  createIvsChannel,
  getIvsStream,
  stopIvsStream,
  deleteIvsChannel,
};

const makeError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const idsEqual = (left, right) => {
  return left?.toString() === right?.toString();
};

const toPlainSession = (session) => {
  if (!session) return session;
  return typeof session.toObject === "function" ? session.toObject() : { ...session };
};

const publicSession = (session) => {
  const plain = toPlainSession(session);
  if (!plain) return plain;

  delete plain.ivsIngestEndpoint;
  delete plain.streamKeyArn;
  delete plain.playbackUrl;
  delete plain.streamKeyValue;
  delete plain.meetingLink;
  delete plain.startTime;
  delete plain.isLive;
  delete plain.isCompleted;

  return plain;
};

const playbackSession = (session, stream = { isLive: false, viewerCount: 0 }) => {
  const plain = toPlainSession(session);

  return {
    id: plain._id,
    title: plain.title,
    course: plain.course,
    status: stream.isLive ? "live" : plain.status,
    scheduledAt: plain.scheduledAt,
    startedAt: plain.startedAt,
    isLive: stream.isLive,
    viewerCount: stream.viewerCount ?? 0,
    chatEnabled: plain.chatEnabled,
    attendanceEnabled: plain.attendanceEnabled,
    playbackUrl: plain.playbackUrl,
  };
};

const emitLiveEvent = (event, payload) => {
  try {
    socketGetter().emit(event, payload);
  } catch (error) {
    console.error(`[Socket] Failed to emit ${event}:`, error.message);
  }
};

const findSessionById = async (sessionId, selectFields = "") => {
  let query = liveSessionModel.findById(sessionId);

  if (selectFields && typeof query.select === "function") {
    query = query.select(selectFields);
  }

  return await query;
};

const findSessionList = async (criteria) => {
  return await liveSessionModel
    .find(criteria)
    .populate("course", "title")
    .populate("instructor", "name profileImage")
    .sort({ scheduledAt: -1 });
};

const resetSessionAfterStartFailure = async (sessionId, status = "scheduled") => {
  await liveSessionModel
    .findByIdAndUpdate(sessionId, {
      status,
      ivsChannelArn: null,
      ivsChannelName: null,
      ivsIngestEndpoint: null,
      streamKeyArn: null,
      playbackUrl: null,
    })
    .catch(() => {});
};

export const __setLiveServiceDependenciesForTest = (overrides = {}) => {
  liveSessionModel = overrides.LiveSession || liveSessionModel;
  enrollmentModel = overrides.Enrollment || enrollmentModel;
  userModel = overrides.User || userModel;
  courseModel = overrides.Course || courseModel;
  socketGetter = overrides.getIo || socketGetter;
  emailSender = overrides.sendEmail || emailSender;
  ivsOps = {
    ...ivsOps,
    ...(overrides.ivsOps || {}),
  };
};

export const __resetLiveServiceDependenciesForTest = () => {
  liveSessionModel = LiveSession;
  enrollmentModel = Enrollment;
  userModel = User;
  courseModel = Course;
  socketGetter = getIo;
  emailSender = sendEmail;
  ivsOps = {
    createIvsChannel,
    getIvsStream,
    stopIvsStream,
    deleteIvsChannel,
  };
};

export const createLiveSessionService = async ({
  course,
  courseId,
  instructor,
  title,
  description = "",
  scheduledAt,
  startTime,
  chatEnabled = true,
  attendanceEnabled = true,
}) => {
  const canonicalCourseId = courseId ?? course;
  const canonicalScheduledAt = scheduledAt ?? startTime;

  if (!canonicalCourseId || !title || !canonicalScheduledAt) {
    throw makeError("Course, title and scheduled time are required", 400);
  }

  const scheduledDate = new Date(canonicalScheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw makeError("Invalid scheduled date", 400);
  }

  const courseDoc = await courseModel.findById(canonicalCourseId);
  if (!courseDoc) {
    throw makeError("Course not found", 404);
  }

  if (!idsEqual(courseDoc.instructor, instructor)) {
    throw makeError("Not authorized for this course", 403);
  }

  const session = await liveSessionModel.create({
    course: canonicalCourseId,
    instructor,
    title: title.trim(),
    description: description.trim(),
    scheduledAt: scheduledDate,
    chatEnabled,
    attendanceEnabled,
    status: "scheduled",
  });

  const populatedSession = await liveSessionModel
    .findById(session._id)
    .populate("course", "title")
    .populate("instructor", "name profileImage");

  emitLiveEvent("liveClassCreated", publicSession(populatedSession));

  try {
    const enrollments = await enrollmentModel
      .find({ course: canonicalCourseId })
      .populate("user", "name email");

    (async () => {
      const courseTitle = populatedSession.course?.title || "your enrolled course";
      const instructorName = populatedSession.instructor?.name || "your instructor";
      const formattedDate = scheduledDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });

      for (const enrollment of enrollments) {
        if (!enrollment.user?.email) continue;

        const studentName = enrollment.user.name || "Student";
        const mailSubject = `New Live Class Scheduled: ${title}`;
        const mailHtml = `
          <p>Hello <strong>${studentName}</strong>,</p>
          <p>A new live class has been scheduled for <strong>${courseTitle}</strong>.</p>
          <p><strong>Topic:</strong> ${title}</p>
          <p><strong>Instructor:</strong> ${instructorName}</p>
          <p><strong>Scheduled At:</strong> ${formattedDate}</p>
          <p>You can join from your Learnify dashboard when the instructor starts the stream.</p>
        `;

        emailSender(enrollment.user.email, mailSubject, mailHtml).catch((error) => {
          console.error("[Email] Failed to send live class email:", error.message);
        });
      }
    })();
  } catch (error) {
    console.error("[Email Notification] Error fetching enrollments:", error.message);
  }

  return publicSession(populatedSession);
};

export const getLiveSessionsService = async (courseId) => {
  const sessions = await findSessionList({ course: courseId });
  return sessions.map(publicSession);
};

export const getMyLiveSessionsService = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw makeError("User not found", 404);
  }

  if (user.role === "instructor") {
    const sessions = await findSessionList({ instructor: userId });
    return sessions.map(publicSession);
  }

  const enrollments = await enrollmentModel.find({ user: userId });
  const courseIds = enrollments.map((enrollment) => enrollment.course);
  const sessions = await findSessionList({ course: { $in: courseIds } });

  return sessions.map(publicSession);
};

export const startLiveSessionService = async ({ sessionId, userId }) => {
  let createdChannelArn = null;

  try {
    const session = await findSessionById(
      sessionId,
      "+playbackUrl +ivsIngestEndpoint +streamKeyArn"
    );

    if (!session) {
      throw makeError("Live session not found", 404);
    }

    if (!idsEqual(session.instructor, userId)) {
      throw makeError("Only the assigned instructor can start this session", 403);
    }

    if (session.status === "ended") {
      throw makeError("This live session has already ended", 400);
    }

    if (session.status === "cancelled") {
      throw makeError("This live session has been cancelled", 400);
    }

    if (session.ivsChannelArn) {
      throw makeError("An IVS channel already exists for this session", 409);
    }

    session.status = "starting";
    await session.save();

    const ivsChannel = await ivsOps.createIvsChannel({
      sessionId: session._id,
      instructorId: session.instructor,
    });

    createdChannelArn = ivsChannel.channelArn;

    session.ivsChannelArn = ivsChannel.channelArn;
    session.ivsChannelName = ivsChannel.channelName;
    session.ivsIngestEndpoint = ivsChannel.ingestEndpoint;
    session.streamKeyArn = ivsChannel.streamKeyArn;
    session.playbackUrl = ivsChannel.playbackUrl;

    await session.save();

    emitLiveEvent("liveClassUpdated", publicSession(session));

    return {
      session: publicSession(session),
      broadcast: {
        serverUrl: `rtmps://${ivsChannel.ingestEndpoint}:443/app/`,
        streamKey: ivsChannel.streamKeyValue,
      },
    };
  } catch (error) {
    if (createdChannelArn) {
      try {
        await ivsOps.deleteIvsChannel(createdChannelArn);
        await resetSessionAfterStartFailure(sessionId, "scheduled");
      } catch (cleanupError) {
        console.error("IVS cleanup error:", cleanupError.message);
        await resetSessionAfterStartFailure(sessionId, "failed");
      }
    } else if (!error.statusCode || error.statusCode >= 500) {
      await resetSessionAfterStartFailure(sessionId, "scheduled");
    }

    throw error;
  }
};

export const getLiveSessionStatusService = async ({ sessionId }) => {
  const session = await findSessionById(sessionId);

  if (!session) {
    throw makeError("Live session not found", 404);
  }

  if (!session.ivsChannelArn) {
    return {
      status: session.status,
      isLive: false,
      viewerCount: 0,
    };
  }

  const stream = await ivsOps.getIvsStream(session.ivsChannelArn);

  if (stream.isLive) {
    const update = {
      status: "live",
      viewerCount: stream.viewerCount ?? 0,
    };

    if (!session.startedAt) {
      update.startedAt = stream.startedAt || new Date();
    }

    if ((stream.viewerCount ?? 0) > (session.peakViewerCount ?? 0)) {
      update.peakViewerCount = stream.viewerCount;
    }

    await liveSessionModel.findByIdAndUpdate(session._id, update);

    return {
      status: "live",
      isLive: true,
      health: stream.health,
      viewerCount: stream.viewerCount ?? 0,
      startedAt: update.startedAt || session.startedAt,
    };
  }

  const status = session.status === "ended" || session.status === "cancelled"
    ? session.status
    : "starting";

  return {
    status,
    isLive: false,
    viewerCount: 0,
  };
};

export const getBroadcastDetailsService = async ({ sessionId, userId }) => {
  const session = await findSessionById(sessionId, "+ivsIngestEndpoint");

  if (!session) {
    throw makeError("Live session not found", 404);
  }

  if (!idsEqual(session.instructor, userId)) {
    throw makeError("You cannot access this session's broadcast details", 403);
  }

  if (!session.ivsChannelArn || !session.ivsIngestEndpoint) {
    throw makeError("Start the live session before requesting broadcast details", 400);
  }

  return {
    serverUrl: `rtmps://${session.ivsIngestEndpoint}:443/app/`,
    streamKeyAvailable: false,
    message: "The stream key value is only returned once when the channel is created.",
  };
};

export const watchLiveSessionService = async ({ sessionId, userId, userRole }) => {
  if (userRole !== "student") {
    throw makeError("Only students can watch this live session", 403);
  }

  const session = await findSessionById(sessionId, "+playbackUrl");

  if (!session) {
    throw makeError("Live session not found", 404);
  }

  const enrollment = await enrollmentModel.findOne({
    user: userId,
    course: session.course,
  });

  if (!enrollment) {
    throw makeError("You are not enrolled in this course", 403);
  }

  if (session.status === "cancelled") {
    throw makeError("This live session was cancelled", 400);
  }

  if (!session.playbackUrl) {
    throw makeError("The instructor has not prepared this stream yet", 409);
  }

  const stream = session.ivsChannelArn
    ? await ivsOps.getIvsStream(session.ivsChannelArn)
    : { isLive: false, viewerCount: 0 };

  if (stream.isLive && session.status !== "live") {
    await liveSessionModel.findByIdAndUpdate(session._id, {
      status: "live",
      startedAt: session.startedAt || stream.startedAt || new Date(),
      viewerCount: stream.viewerCount ?? 0,
    });
  }

  return {
    session: playbackSession(session, stream),
    playbackSecurity:
      "Development mode: IVS authorized playback is false, so the playback URL is shareable until private playback authorization is added.",
  };
};

export const endLiveSessionService = async ({ sessionId, userId }) => {
  const session = await findSessionById(sessionId);

  if (!session) {
    throw makeError("Live session not found", 404);
  }

  if (!idsEqual(session.instructor, userId)) {
    throw makeError("Only the assigned instructor can end this session", 403);
  }

  if (session.status === "ended") {
    return {
      alreadyEnded: true,
      session: publicSession(session),
    };
  }

  if (session.ivsChannelArn) {
    await ivsOps.stopIvsStream(session.ivsChannelArn);
  }

  session.status = "ended";
  session.endedAt = new Date();
  session.endedBy = userId;
  session.viewerCount = 0;

  await session.save();

  emitLiveEvent("live-session-ended", {
    sessionId: session._id,
    courseId: session.course,
  });
  emitLiveEvent("liveClassUpdated", publicSession(session));

  return {
    alreadyEnded: false,
    session: publicSession(session),
  };
};

export const cancelLiveSessionService = async ({ sessionId, userId, reason = "" }) => {
  const session = await findSessionById(sessionId, "+playbackUrl +ivsIngestEndpoint +streamKeyArn");

  if (!session) {
    throw makeError("Live session not found", 404);
  }

  if (!idsEqual(session.instructor, userId)) {
    throw makeError("Only the assigned instructor can cancel this session", 403);
  }

  if (session.status === "ended") {
    throw makeError("An ended session cannot be cancelled", 400);
  }

  if (session.ivsChannelArn) {
    await ivsOps.deleteIvsChannel(session.ivsChannelArn);
    session.ivsChannelArn = null;
    session.ivsChannelName = null;
    session.ivsIngestEndpoint = null;
    session.streamKeyArn = null;
    session.playbackUrl = null;
  }

  session.status = "cancelled";
  session.cancellationReason = reason.trim();
  session.viewerCount = 0;

  await session.save();

  emitLiveEvent("liveClassUpdated", publicSession(session));

  return publicSession(session);
};

export const deleteLiveSessionService = async (instructorId, sessionId) => {
  const session = await findSessionById(sessionId, "+playbackUrl +ivsIngestEndpoint +streamKeyArn");

  if (!session) {
    throw makeError("Live session not found", 404);
  }

  if (!idsEqual(session.instructor, instructorId)) {
    throw makeError("Not authorized", 403);
  }

  if (session.ivsChannelArn) {
    await ivsOps.deleteIvsChannel(session.ivsChannelArn);
  }

  await liveSessionModel.findByIdAndDelete(sessionId);

  emitLiveEvent("liveClassDeleted", { sessionId });

  return true;
};
