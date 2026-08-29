import Mission from "../models/Mission.js";
import MissionSubmission from "../models/MissionSubmission.js";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import { checkAndCreatePendingCertificate } from "./certificateService.js";
import { sendEmail } from "../utils/sendEmail.js";
import { env } from "../config/env.config.js";

const assertCourseOwner = async (courseId, instructorId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  if (course.instructor.toString() !== instructorId) {
    const error = new Error("Not authorized for this course");
    error.statusCode = 403;
    throw error;
  }

  return course;
};

// Create a new mission
export const createMissionService = async (instructorId, missionData) => {
  await assertCourseOwner(missionData.course, instructorId);

  const mission = new Mission({
    ...missionData,
    instructor: instructorId,
  });
  const savedMission = await mission.save();

  // Notify enrolled students via email asynchronously
  (async () => {
    try {
      const enrollments = await Enrollment.find({ course: missionData.course }).populate("user", "name email");
      const course = await Course.findById(missionData.course).select("title");
      const courseTitle = course?.title || "your enrolled course";

      const formattedDeadline = new Date(missionData.deadline).toLocaleDateString("en-US", {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      for (const enrollment of enrollments) {
        if (enrollment.user && enrollment.user.email) {
          const studentEmail = enrollment.user.email;
          const studentName = enrollment.user.name || "Student";

          const mailSubject = `New Task Assigned: ${missionData.title}`;
          const mailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="background-color: #f59e0b; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px;">New Task Assigned</h1>
              </div>
              <div style="padding: 24px; color: #334155; line-height: 1.6;">
                <p>Hello <strong>${studentName}</strong>,</p>
                <p>A new task has been assigned in your course: <strong>${courseTitle}</strong>.</p>

                <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #92400e; border-bottom: 1px solid #fde68a; padding-bottom: 8px;">Task Details</h3>
                  <p style="margin: 8px 0;"><strong>Title:</strong> ${missionData.title}</p>
                  <p style="margin: 8px 0;"><strong>Deadline:</strong> ${formattedDeadline}</p>
                  <p style="margin: 8px 0;"><strong>Pass Marks:</strong> ${missionData.passMarks} / ${missionData.totalMarks}</p>
                </div>

                <p>Log in to your dashboard to review the task description and submit your work before the deadline.</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${env.CLIENT_URL || 'http://localhost:5173'}" target="_blank" style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">View Task</a>
                </div>

                <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                  This is an automated notification from StackVerseHub. Please do not reply directly to this email.
                </p>
              </div>
            </div>
          `;

          await sendEmail(studentEmail, mailSubject, mailHtml);
        }
      }
    } catch (notifyErr) {
      console.error("[Email Notification] Error sending mission creation emails:", notifyErr);
    }
  })();

  return savedMission;
};

// Get missions for a course, optionally including the user's submission details
export const getCourseMissionsService = async (courseId, userId = null, userRole = null) => {
  const course = await Course.findById(courseId);
  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  if (userRole === "instructor" && course.instructor.toString() !== userId) {
    const error = new Error("Not authorized for this course");
    error.statusCode = 403;
    throw error;
  }

  if (userRole === "student") {
    const isEnrolled = await Enrollment.exists({ user: userId, course: courseId });
    if (!isEnrolled) {
      const error = new Error("You are not enrolled in this course");
      error.statusCode = 403;
      throw error;
    }
  }

  const missions = await Mission.find({ course: courseId })
    .populate("module", "name")
    .populate("lesson", "title")
    .sort({ deadline: 1 });

  if (!userId) {
    return missions;
  }

  // Fetch student submissions for these missions
  const missionIds = missions.map((m) => m._id);
  const submissions = await MissionSubmission.find({
    mission: { $in: missionIds },
    student: userId,
  });

  // Map submissions to missions
  const missionsWithSubmissions = missions.map((mission) => {
    const submission = submissions.find(
      (sub) => sub.mission.toString() === mission._id.toString()
    );
    return {
      ...mission.toObject(),
      submission: submission || null,
    };
  });

  return missionsWithSubmissions;
};

// Student submits a mission
export const submitMissionService = async (studentId, missionId, { submissionUrl, studentNotes }) => {
  // Check if mission exists
  const mission = await Mission.findById(missionId);
  if (!mission) {
    throw new Error("Mission not found");
  }

  const isEnrolled = await Enrollment.exists({
    user: studentId,
    course: mission.course,
  });

  if (!isEnrolled) {
    const error = new Error("You are not enrolled in this course");
    error.statusCode = 403;
    throw error;
  }

  // Check if student already submitted this mission
  let submission = await MissionSubmission.findOne({
    mission: missionId,
    student: studentId,
  });

  if (submission) {
    // If it exists, update it and reset status to pending
    submission.submissionUrl = submissionUrl;
    submission.studentNotes = studentNotes;
    submission.status = "pending";
    submission.submittedAt = Date.now();
  } else {
    // Create new submission
    submission = new MissionSubmission({
      mission: missionId,
      student: studentId,
      submissionUrl,
      studentNotes,
      status: "pending",
    });
  }

  return await submission.save();
};

// Instructor gets submissions for a mission
export const getMissionSubmissionsService = async (missionId, userId, userRole) => {
  const mission = await Mission.findById(missionId);
  if (!mission) {
    const error = new Error("Mission not found");
    error.statusCode = 404;
    throw error;
  }

  if (userRole !== "admin" && mission.instructor.toString() !== userId) {
    const error = new Error("Not authorized for this mission");
    error.statusCode = 403;
    throw error;
  }

  return await MissionSubmission.find({ mission: missionId })
    .populate("student", "name email")
    .sort({ submittedAt: -1 });
};

// Instructor evaluates a submission
export const evaluateSubmissionService = async (submissionId, instructorId, { status, feedback, obtainedMarks }) => {
  const submission = await MissionSubmission.findById(submissionId).populate("mission");
  if (!submission) {
    throw new Error("Submission not found");
  }

  if (!submission.mission || submission.mission.instructor.toString() !== instructorId) {
    const error = new Error("Not authorized for this submission");
    error.statusCode = 403;
    throw error;
  }

  submission.status = status; // 'completed' or 'rejected'
  submission.feedback = feedback;
  if (obtainedMarks !== undefined) {
    submission.obtainedMarks = obtainedMarks;
  }

  const savedSubmission = await submission.save();

  if (status === "completed" && submission.mission) {
    try {
      await checkAndCreatePendingCertificate(submission.student, submission.mission.course);
    } catch (certErr) {
      console.error("[Certificate] Check after mission evaluation failed:", certErr.message);
    }
  }

  return savedSubmission;
};
