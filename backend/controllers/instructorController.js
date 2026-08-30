import { 
  getInstructorCoursesService, 
  publishCourseService,
  createCourseDraftService,
  addModuleService,
  addLessonService,
  getCourseDetailsService,
  updateCourseService,
  updateLessonService,
  deleteCourseService,
  getInstructorDashboardService,
  getInstructorStudentsService,
  completeStudentCourseService
} from "../services/instructorService.js";
import { updateUserProfileService } from "../services/userServices.js";
import { asyncHandler } from "../middleware/trycatchmiddleware.js";
import StudentReview from "../models/StudentReview.js";
import Review from "../models/Review.js";
import { createNotification } from "./notificationController.js";
import { sendEmail } from "../utils/sendEmail.js";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildReviewScheduledEmail = ({
  studentName,
  instructorName,
  courseTitle,
  date,
  time,
  meetingLink,
}) => {
  const subject = `Review session scheduled for ${courseTitle}`;
  const safeStudentName = escapeHtml(studentName);
  const safeInstructorName = escapeHtml(instructorName);
  const safeCourseTitle = escapeHtml(courseTitle);
  const safeDate = escapeHtml(date);
  const safeTime = escapeHtml(time);
  const safeMeetingLink = escapeHtml(meetingLink);
  const text = [
    `Hi ${studentName},`,
    "",
    `${instructorName} has scheduled a 1-on-1 review session for ${courseTitle}.`,
    "",
    `Date: ${date}`,
    `Time: ${time}`,
    `Meeting link: ${meetingLink}`,
    "",
    "Please join the session on time.",
    "",
    "This is an automated notification from StackVerseHub.",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>Hi ${safeStudentName},</p>
      <p><strong>${safeInstructorName}</strong> has scheduled a 1-on-1 review session for <strong>${safeCourseTitle}</strong>.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #4b5563;">Date</td>
          <td style="padding: 6px 0;"><strong>${safeDate}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #4b5563;">Time</td>
          <td style="padding: 6px 0;"><strong>${safeTime}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #4b5563;">Meeting link</td>
          <td style="padding: 6px 0;"><a href="${safeMeetingLink}">${safeMeetingLink}</a></td>
        </tr>
      </table>
      <p>Please join the session on time.</p>
      <p style="color: #6b7280; font-size: 13px;">This is an automated notification from StackVerseHub.</p>
    </div>
  `;

  return { subject, html, text };
};

// ✅ Create Course Draft
export const createCourseDraft = asyncHandler(async (req, res) => {
  const course = await createCourseDraftService(req.user.id, req.body);
  res.status(201).json({ success: true, course });
});

// ✅ Add Module
export const addModule = asyncHandler(async (req, res) => {
  const module = await addModuleService(req.user.id, req.params.courseId, req.body);
  res.status(201).json({ success: true, module });
});

// ✅ Add Lesson
export const addLesson = asyncHandler(async (req, res) => {
  const { courseId, moduleId } = req.params;
  const lesson = await addLessonService(req.user.id, courseId, moduleId, req.body);
  res.status(201).json({ success: true, lesson });
});

// ✅ Get instructor dashboard stats
export const getInstructorDashboard = asyncHandler(async (req, res) => {
    const instructorId = req.user.id;
    const dashboardData = await getInstructorDashboardService(instructorId);
    
    res.json({
      success: true,
      ...dashboardData
    });
});

// ✅ Get instructor students
export const getInstructorStudents = asyncHandler(async (req, res) => {
    const students = await getInstructorStudentsService(req.user.id);
    res.json({ success: true, students });
});

// ✅ Mark student course complete
export const completeStudentCourse = asyncHandler(async (req, res) => {
    const { courseId, studentId } = req.params;
    const certificate = await completeStudentCourseService(req.user.id, courseId, studentId);
    res.status(200).json({
      success: true,
      message: "Student marked as completed and certificate generated successfully",
      certificate,
    });
});

// ✅ Get instructor courses
export const getInstructorCourses = asyncHandler(async (req, res) => {
    const courses = await getInstructorCoursesService(req.user.id);
    res.json(courses);
});

// ✅ Get single course details
export const getCourseDetails = asyncHandler(async (req, res) => {
    const course = await getCourseDetailsService(req.user.id, req.params.id);
    res.json({ success: true, course });
});

// ✅ Update course details
export const updateCourse = asyncHandler(async (req, res) => {
    const course = await updateCourseService(req.user.id, req.params.id, req.body);
    res.json({ success: true, message: "Course updated successfully", course });
});

// ✅ Update lesson details
export const updateLesson = asyncHandler(async (req, res) => {
    const lesson = await updateLessonService(req.user.id, req.params.courseId, req.params.lessonId, req.body);
    res.json({ success: true, message: "Lesson updated successfully", lesson });
});

// ✅ Publish course
export const publishCourse = asyncHandler(async (req, res) => {
    const course = await publishCourseService(req.user.id, req.params.id);
    res.json({ success: true, message: "Course published successfully", course });
});

// ✅ Delete course
export const deleteCourse = asyncHandler(async (req, res) => {
    await deleteCourseService(req.user.id, req.params.id);
    res.json({ success: true, message: "Course deleted successfully" });
});

// ✅ Submit Verification Details
export const submitVerification = asyncHandler(async (req, res) => {
    const { 
      name, age, education, college, degree, graduationYear,
      experience, expertise, certifications, bio, phone, location 
    } = req.body;

    const updateData = {
      name, phone, bio, location,
      approvalStatus: "pending",
      verificationDetails: {
        age, education, college, degree, graduationYear,
        experience, expertise, certifications,
      }
    };

    const user = await updateUserProfileService(req.user.id, updateData);
    res.json({ success: true, message: "Verification details submitted successfully", user });
});

export const getReviewHistory = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const history = await StudentReview.find({
      $or: [
        { instructor: instructorId },
        { instructorId: instructorId }
      ],
      status: { $in: ["Pass", "Failed", "Completed", "Cancelled"] }
    })
      .populate("student", "name email")
      .populate("studentId", "name email")
      .populate("course", "title")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Schedule a 1-on-1 review session
export const scheduleReviewSession = asyncHandler(async (req, res) => {
  const { courseId, studentId, date, time, meetingLink } = req.body;
  const instructorId = req.user.id;

  if (!courseId || !studentId || !date || !time || !meetingLink) {
    res.status(400);
    throw new Error("All fields (courseId, studentId, date, time, meetingLink) are required");
  }

  const session = await StudentReview.create({
    course: courseId,
    student: studentId,
    studentId: studentId,
    instructor: instructorId,
    instructorId: instructorId,
    reviewDate: date,
    scheduledDate: date,
    reviewTime: time,
    meetingLink: meetingLink,
    roomId: meetingLink,
    status: "Pending",
  });

  // 🔔 Notify the student about the scheduled review
  const populatedSession = await StudentReview.findById(session._id)
    .populate("course", "title")
    .populate("student", "name email")
    .populate("instructor", "name email");
  createNotification({
    recipient: studentId,
    type: 'review_scheduled',
    title: '📅 Review Session Scheduled',
    message: `Your instructor has scheduled a 1-on-1 review for "${populatedSession?.course?.title || 'your course'}" on ${date} at ${time}.`,
    link: '/student/reviews',
  });

  let reviewEmailSent = false;
  let reviewEmailError = null;

  if (populatedSession?.student?.email) {
    const studentName = populatedSession.student.name || "Student";
    const instructorName = populatedSession.instructor?.name || "Your instructor";
    const instructorEmail = populatedSession.instructor?.email;
    const courseTitle = populatedSession.course?.title || "your course";
    const reviewEmail = buildReviewScheduledEmail({
      studentName,
      instructorName,
      courseTitle,
      date,
      time,
      meetingLink,
    });

    try {
      await sendEmail(
        populatedSession.student.email,
        reviewEmail.subject,
        reviewEmail.html,
        reviewEmail.text,
        instructorEmail ? { replyTo: instructorEmail } : {}
      );
      reviewEmailSent = true;
    } catch (error) {
      reviewEmailError = error.message;
      console.error("Review session email failed:", {
        sessionId: session._id,
        studentId,
        email: populatedSession.student.email,
        error: error.message,
      });
    }
  }

  res.status(201).json({
    success: true,
    message: reviewEmailSent
      ? "Review session scheduled successfully and email sent"
      : "Review session scheduled successfully, but email could not be sent",
    data: session,
    reviewEmailSent,
    reviewEmailError,
  });
});

// ✅ Get all review sessions scheduled by this instructor
export const getInstructorScheduledReviews = asyncHandler(async (req, res) => {
  const instructorId = req.user.id;
  const sessions = await StudentReview.find({
    $or: [
      { instructor: instructorId },
      { instructorId: instructorId }
    ]
  })
    .populate("student", "name email")
    .populate("studentId", "name email")
    .populate("course", "title thumbnail")
    .sort({ createdAt: -1 });

  const formatted = sessions.map(session => {
    const doc = session.toObject();
    return {
      _id: doc._id,
      course: doc.course,
      student: doc.student || doc.studentId,
      instructor: doc.instructor || doc.instructorId,
      date: doc.reviewDate || doc.scheduledDate || "",
      time: doc.reviewTime || "",
      meetingLink: doc.meetingLink || doc.roomId || "",
      status: doc.status || "Scheduled",
      attempt: doc.attempt || 1,
      mark: doc.mark || 0,
      notes: doc.notes || "",
    };
  });

  res.status(200).json({
    success: true,
    data: formatted
  });
});

// ✅ Delete/Cancel a review session
export const deleteReviewSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await StudentReview.findById(id);

  if (!session) {
    res.status(404);
    throw new Error("Review session not found");
  }

  // Check authorization
  if (
    session.student.toString() !== req.user.id &&
    session.instructor.toString() !== req.user.id
  ) {
    res.status(403);
    throw new Error("Not authorized to delete this review session");
  }

  await StudentReview.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Review session deleted successfully",
  });
});

// ✅ Update status of a review session (Pass / Failed / Completed / Cancelled)
export const updateReviewStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, mark, notes } = req.body;

  const session = await StudentReview.findById(id);

  if (!session) {
    res.status(404);
    throw new Error("Review session not found");
  }

  // Check authorization (only the assigned instructor can update status)
  if (
    session.instructor.toString() !== req.user.id &&
    session.instructorId?.toString() !== req.user.id
  ) {
    res.status(403);
    throw new Error("Not authorized to update this review session");
  }

  if (status) {
    const validStatuses = ["Scheduled", "Pending", "Pass", "Failed", "Completed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      res.status(400);
      throw new Error("Invalid status value");
    }
    session.status = status;
  }

  if (mark !== undefined) {
    session.mark = Number(mark);
  }

  if (notes !== undefined) {
    session.notes = notes;
  }

  await session.save();

  // 🔔 Notify the student about their evaluation result
  const studentRecipient = session.student || session.studentId;
  if (studentRecipient && status) {
    const populatedSession = await StudentReview.findById(session._id).populate('course', 'title');
    const courseTitle = populatedSession?.course?.title || 'your course';
    const resultEmoji = status === 'Pass' ? '✅' : status === 'Failed' ? '❌' : '📋';
    createNotification({
      recipient: studentRecipient,
      type: 'review_evaluated',
      title: `${resultEmoji} Review Result: ${status}`,
      message: `Your review session for "${courseTitle}" has been evaluated. Result: ${status}${mark !== undefined ? ` (Score: ${mark}%)` : ''}.`,
      link: '/student/reviews',
    });
  }

  res.status(200).json({
    success: true,
    message: "Review session evaluation updated successfully",
    data: session,
  });
});


