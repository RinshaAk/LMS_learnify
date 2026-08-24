import User from "../models/User.js";
import Course from "../models/Course.js";
import Category from "../models/Category.js";
import Offer from "../models/Offer.js";
import Payment from "../models/Payment.js";
import { LiveSession } from "../models/LiveSetion.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Enrollment from "../models/Enrollment.js";
import Exam from "../models/Exam.js";
import ExamAttempt from "../models/ExamAttempt.js";
import { sendEmail } from "../utils/sendEmail.js";
import { instructorApprovalTemplate } from "../utils/emailTemplate.js";


// ✅ User management
export const getAllUsersService = async () => {
  return await User.find().select("-password");
};

export const deleteUserService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  await user.deleteOne();
  return true;
};

// ✅ Course management
export const getAllCoursesAdminService = async () => {
  return await Course.find()
    .populate("instructor", "name")
    .populate({
      path: "modules",
      options: { sort: { order: 1 } },
      populate: {
        path: "lessons",
        options: { sort: { order: 1 } },
      },
    });
};

export const deleteCourseAdminService = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");
  
  // Delete all related data
  await Module.deleteMany({ courseId });
  await Lesson.deleteMany({ courseId });
  await Enrollment.deleteMany({ course: courseId });
  await Exam.deleteMany({ course: courseId });
  await ExamAttempt.deleteMany({ course: courseId });
  
  await course.deleteOne();
  return true;
};

export const updateCourseStatusService = async (courseId, status) => {
  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");
  
  if (status === "approved" || status === "rejected" || status === "pending") {
    course.approvalStatus = status;
    if (status === "rejected") {
      course.isBlocked = true;
    } else if (status === "approved") {
      course.isBlocked = false;
    }
  } else if (status === "hide") {
    course.isHidden = true;
  } else if (status === "unhide") {
    course.isHidden = false;
  } else if (status === "published" || status === "draft") {
    course.status = status;
  }
  
  await course.save();
  return course;
};

// ✅ Instructor management
export const getInstructorRequestsService = async () => {
  return await User.find({ 
    role: "instructor", 
    approvalStatus: "pending" 
  }).select("-password");
};

export const updateInstructorStatusService = async (userId, status) => {
  const user = await User.findById(userId);
  if (!user || user.role !== "instructor") throw new Error("Instructor not found");
  user.approvalStatus = status;
  await user.save();

  let approvalEmailSent = false;
  let approvalEmailError = null;

  if (status === "approved") {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const instructorLoginUrl = `${clientUrl.replace(/\/$/, "")}/instructor/login`;
    const adminEmail = process.env.EMAIL_USER?.trim() || "learnify279@gmail.com";

    try {
      await sendEmail(
        user.email,
        "Your Learnify Instructor Account Has Been Approved",
        instructorApprovalTemplate({
          instructorName: user.name,
          instructorLoginUrl,
          adminEmail,
        })
      );
      approvalEmailSent = true;
    } catch (error) {
      approvalEmailError = error.message;
      console.error("Instructor approval email failed:", {
        instructorId: user._id,
        email: user.email,
        message: error.message,
      });
    }
  }

  return {
    user,
    approvalEmailSent,
    approvalEmailError,
  };
};

// ✅ Platform Stats
export const getAdminStatsService = async () => {
  const [totalStudents, totalInstructors, totalCourses, pendingApprovals, totalRevenueAgg] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "instructor" }),
    Course.countDocuments(),
    User.countDocuments({ role: "instructor", approvalStatus: "pending" }),
    Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);

  const monthlyData = await Payment.aggregate([
    { $match: { status: "paid" } },
    { $group: { 
        _id: { $month: "$createdAt" }, 
        revenue: { $sum: "$amount" } 
      } 
    },
    { $sort: { "_id": 1 } }
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = monthlyData.map(d => ({
    name: months[d._id - 1],
    revenue: d.revenue
  }));

  return {
    totalStudents,
    totalInstructors,
    totalCourses,
    pendingApprovals,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
    chartData
  };
};

// ✅ Categories
export const getAllCategoriesService = async () => {
  return await Category.find();
};

export const addCategoryService = async (data) => {
  return await Category.create(data);
};

export const deleteCategoryService = async (id) => {
  return await Category.findByIdAndDelete(id);
};

export const updateCategoryService = async (id, data) => {
  return await Category.findByIdAndUpdate(id, data, { new: true });
};

// ✅ Offers
export const getAllOffersService = async () => {
  return await Offer.find();
};

export const addOfferService = async (data) => {
  return await Offer.create(data);
};

export const deleteOfferService = async (id) => {
  return await Offer.findByIdAndDelete(id);
};

// ✅ Earnings & Payments
export const getEarningsService = async () => {
  const payments = await Payment.find({ status: "paid" }).populate("course", "title category");
  
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const platformProfit = totalRevenue * 0.2;
  const instructorPayouts = totalRevenue * 0.8;

  // Monthly data for chart
  const monthlyData = await Payment.aggregate([
    { $match: { status: "paid" } },
    { $group: { 
        _id: { $month: "$createdAt" }, 
        revenue: { $sum: "$amount" } 
      } 
    },
    { $sort: { "_id": 1 } }
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = monthlyData.map(d => ({
    name: months[d._id - 1],
    revenue: d.revenue
  }));

  // Category data
  const categoryRevenueMap = {};
  payments.forEach(p => {
    if (p.course && p.course.category) {
      const cat = p.course.category;
      categoryRevenueMap[cat] = (categoryRevenueMap[cat] || 0) + p.amount;
    } else {
      categoryRevenueMap['Uncategorized'] = (categoryRevenueMap['Uncategorized'] || 0) + p.amount;
    }
  });

  const categoryData = Object.keys(categoryRevenueMap).map(cat => ({
    label: cat,
    value: categoryRevenueMap[cat],
    percent: totalRevenue > 0 ? Math.round((categoryRevenueMap[cat] / totalRevenue) * 100) : 0
  }));

  return {
    totalRevenue,
    platformProfit,
    instructorPayouts,
    pendingPayouts: 0,
    chartData,
    categoryData
  };
};

export const getAllPaymentsService = async () => {
  return await Payment.find()
    .populate("user", "name email")
    .populate("course", "title")
    .sort({ createdAt: -1 });
};

export const getPaymentByIdService = async (id) => {
  return await Payment.findById(id)
    .populate("user", "name email")
    .populate("course", "title");
};

// ✅ Live Sessions
export const getInstructorAvailabilityService = async () => {
  return await LiveSession.find().populate("instructor", "name").populate("course", "title");
};

export const getAdminLiveSessionsService = async () => {
  return await LiveSession.find()
    .populate("instructor", "name email")
    .populate("course", "title")
    .sort({ startTime: -1 });
};

// ✅ User Blocking
export const getBlockedUsersService = async () => {
  return await User.find({ isBlocked: true }).select("-password");
};

export const blockUserService = async (userId, reason, adminId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  
  user.isBlocked = true;
  user.blockedReason = reason;
  user.blockedAt = new Date();
  user.blockedBy = adminId;
  
  await user.save();
  return user;
};

export const unblockUserService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  
  user.isBlocked = false;
  user.blockedReason = "";
  user.blockedAt = undefined;
  user.blockedBy = undefined;
  
  await user.save();
  return user;
};

// ✅ Activity Feed
export const getActivityFeedService = async () => {
  const [recentUsers, recentCourses, recentPayments] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(5).select("name role createdAt"),
    Course.find().sort({ createdAt: -1 }).limit(5).select("title createdAt"),
    Payment.find({ status: "paid" }).sort({ createdAt: -1 }).limit(5).select("amount createdAt studentName")
  ]);

  const activities = [
    ...recentUsers.map(u => ({
      id: u._id,
      user: u.name,
      action: `joined as a ${u.role}`,
      time: u.createdAt,
      type: u.role === 'instructor' ? 'instructor' : 'student'
    })),
    ...recentCourses.map(c => ({
      id: c._id,
      user: c.title,
      action: `was submitted for approval`,
      time: c.createdAt,
      type: 'course'
    })),
    ...recentPayments.map(p => ({
      id: p._id,
      user: p.studentName || 'Student',
      action: `purchased a course (₹${p.amount})`,
      time: p.createdAt,
      type: 'payment'
    }))
  ];

  return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
};

// ✅ Reports Data
export const getReportsDataService = async (fromDate, toDate) => {
  try {
    const paymentMatch = { status: "paid" };
    const userMatch = {};
    const courseMatch = {};

    if (fromDate || toDate) {
      const dateRange = {};
      if (fromDate) dateRange.$gte = new Date(fromDate);
      if (toDate) dateRange.$lte = new Date(toDate);
      
      paymentMatch.createdAt = dateRange;
      userMatch.createdAt = dateRange;
      courseMatch.createdAt = dateRange;
    }

    const totalRevenue = await Payment.aggregate([
      { $match: paymentMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const monthlyRevenue = await Payment.aggregate([
      { $match: paymentMatch },
      { $group: { 
          _id: { 
            month: { $month: "$createdAt" }, 
            year: { $year: "$createdAt" } 
          }, 
          revenue: { $sum: "$amount" } 
        } 
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    const userGrowth = await User.aggregate([
      { $match: userMatch },
      { $group: { 
          _id: { 
            month: { $month: "$createdAt" }, 
            year: { $year: "$createdAt" } 
          }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    const summary = {
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.revenue || 0,
      totalUsers: await User.countDocuments(userMatch),
      totalCourses: await Course.countDocuments(courseMatch)
    };

    const revenueGrowth = monthlyRevenue.slice(0, 6).reverse().map(m => ({
      name: `${m._id.month}/${m._id.year}`,
      value: m.revenue
    }));

    const userGrowthMapped = userGrowth.slice(0, 6).reverse().map(u => ({
      name: `${u._id.month}/${u._id.year}`,
      value: u.count
    }));

    return {
      summary,
      revenueGrowth,
      userGrowth: userGrowthMapped
    };
  } catch (error) {
    console.error("Error in getReportsDataService:", error);
    throw error;
  }
};
