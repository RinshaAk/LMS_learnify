import { asyncHandler } from "../middleware/trycatchmiddleware.js";
import {
  createMissionService,
  getCourseMissionsService,
  submitMissionService,
  getMissionSubmissionsService,
  evaluateSubmissionService,
} from "../services/missionService.js";

// ✅ Create Mission
export const createMission = asyncHandler(async (req, res) => {
  const mission = await createMissionService(req.user.id, req.body);
  res.status(201).json(mission);
});

// ✅ Get Course Missions (For student / instructor)
export const getCourseMissions = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const missions = await getCourseMissionsService(courseId, req.user?.id, req.user?.role);
  res.json(missions);
});

// ✅ Submit Mission Task
export const submitMission = asyncHandler(async (req, res) => {
  const { id } = req.params; // mission ID
  const submission = await submitMissionService(req.user.id, id, req.body);
  res.status(201).json(submission);
});

// ✅ Get Submissions for a Mission
export const getMissionSubmissions = asyncHandler(async (req, res) => {
  const { id } = req.params; // mission ID
  const submissions = await getMissionSubmissionsService(id, req.user.id, req.user.role);
  res.json(submissions);
});

// ✅ Evaluate Submission
export const evaluateSubmission = asyncHandler(async (req, res) => {
  const { subId } = req.params;
  const submission = await evaluateSubmissionService(subId, req.user.id, req.body);
  res.json(submission);
});
