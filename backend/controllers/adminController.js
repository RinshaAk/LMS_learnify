import { 
  deleteCourseAdminService, 
  deleteUserService, 
  getAllCoursesAdminService, 
  getAllUsersService,
  getInstructorRequestsService,
  updateInstructorStatusService,
  getAdminStatsService,
  getAllCategoriesService,
  addCategoryService,
  deleteCategoryService,
  updateCategoryService,
  getAllOffersService,
  addOfferService,
  deleteOfferService,
  getEarningsService,
  getInstructorAvailabilityService,
  updateCourseStatusService,
  getAdminLiveSessionsService,
  getAllPaymentsService,
  getPaymentByIdService,
  getBlockedUsersService,
  blockUserService,
  unblockUserService,
  getActivityFeedService,
  getReportsDataService
} from "../services/adminServices.js";

// âœ… Get admin dashboard stats
export const getAdminStats = async (req, res, next) => {
  try {
    const stats = await getAdminStatsService();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// âœ… Users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await getAllUsersService(req.query);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await deleteUserService(req.params.id);
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
};

// âœ… Courses
export const getAllCoursesAdmin = async (req, res, next) => {
  try {
    const courses = await getAllCoursesAdminService(req.query);
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

export const deleteCourseAdmin = async (req, res, next) => {
  try {
    await deleteCourseAdminService(req.params.id);
    res.json({ message: "Course deleted" });
  } catch (error) {
    next(error);
  }
};

export const updateCourseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    console.log(`[AdminController] Updating course ${id} status to: ${status}`);
    
    const course = await updateCourseStatusService(id, status);
    res.json({ 
      success: true,
      message: `Course ${status} successfully`, 
      course 
    });
  } catch (error) {
    console.error(`[AdminController] Error updating course status:`, error);
    res.status(500).json({ 
      success: false,
      message: error.message || "Internal server error during course status update"
    });
  }
};

// âœ… Instructor Requests
export const getInstructorRequests = async (req, res, next) => {
  try {
    const requests = await getInstructorRequestsService();
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

export const approveInstructor = async (req, res, next) => {
  try {
    const result = await updateInstructorStatusService(req.params.id, "approved");
    res.json({
      message: result.approvalEmailSent
        ? "Instructor approved and email sent"
        : "Instructor approved, but approval email could not be sent",
      user: result.user,
      approvalEmailSent: result.approvalEmailSent,
      approvalEmailError: result.approvalEmailError,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectInstructor = async (req, res, next) => {
  try {
    const result = await updateInstructorStatusService(req.params.id, "rejected");
    res.json({ message: "Instructor rejected", user: result.user });
  } catch (error) {
    next(error);
  }
};

// âœ… Categories
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await getAllCategoriesService();
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const addCategory = async (req, res, next) => {
  try {
    const category = await addCategoryService(req.body);
    res.json(category);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await deleteCategoryService(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await updateCategoryService(req.params.id, req.body);
    res.json(category);
  } catch (error) {
    next(error);
  }
};

// âœ… Offers
export const getAllOffers = async (req, res, next) => {
  try {
    const offers = await getAllOffersService();
    res.json(offers);
  } catch (error) {
    next(error);
  }
};

export const addOffer = async (req, res, next) => {
  try {
    const offer = await addOfferService(req.body);
    res.json(offer);
  } catch (error) {
    next(error);
  }
};

export const deleteOffer = async (req, res, next) => {
  try {
    await deleteOfferService(req.params.id);
    res.json({ message: "Offer deleted" });
  } catch (error) {
    next(error);
  }
};

// âœ… Earnings & Payments
export const getEarnings = async (req, res, next) => {
  try {
    const earnings = await getEarningsService();
    res.json(earnings);
  } catch (error) {
    next(error);
  }
};

export const getAllPayments = async (req, res, next) => {
  try {
    const payments = await getAllPaymentsService(req.query);
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await getPaymentByIdService(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

// âœ… Availability & Live Sessions
export const getInstructorAvailability = async (req, res, next) => {
  try {
    const availability = await getInstructorAvailabilityService(req.query);
    res.json(availability);
  } catch (error) {
    next(error);
  }
};

export const getAdminLiveSessions = async (req, res, next) => {
  try {
    const sessions = await getAdminLiveSessionsService(req.query);
    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

// âœ… User Blocking
export const getBlockedUsers = async (req, res, next) => {
  try {
    const users = await getBlockedUsersService(req.query);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await blockUserService(req.params.id, reason, req.user.id);
    res.json({ message: "User blocked successfully", user });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    const user = await unblockUserService(req.params.id);
    res.json({ message: "User unblocked successfully", user });
  } catch (error) {
    next(error);
  }
};

export const getActivityFeed = async (req, res, next) => {
  try {
    const activities = await getActivityFeedService();
    res.json(activities);
  } catch (error) {
    next(error);
  }
};

export const getReportsData = async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.query;

    if (fromDate || toDate) {
      const now = new Date();
      if (fromDate) {
        const from = new Date(fromDate);
        if (isNaN(from.getTime())) {
          return res.status(400).json({ message: "Invalid From Date format" });
        }
        if (from > now) {
          return res.status(400).json({ message: "From Date cannot be in the future" });
        }
      }
      if (toDate) {
        const to = new Date(toDate);
        if (isNaN(to.getTime())) {
          return res.status(400).json({ message: "Invalid To Date format" });
        }
        if (to > now) {
          return res.status(400).json({ message: "To Date cannot be in the future" });
        }
      }
      if (fromDate && toDate) {
        if (new Date(fromDate) > new Date(toDate)) {
          return res.status(400).json({ message: "From Date cannot be after To Date" });
        }
      }
    }

    const reports = await getReportsDataService(fromDate, toDate);
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

