import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Payment from "../models/Payment.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import { env } from "../config/env.config.js";

const assertRazorpayConfigured = () => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    const error = new Error("Razorpay is not configured on the server.");
    error.statusCode = 500;
    error.code = "RAZORPAY_NOT_CONFIGURED";
    throw error;
  }
};

// Create Razorpay Order
export const createOrderService = async ({ courseId, userId }) => {
  assertRazorpayConfigured();

  // Find course
  const course = await Course.findById(courseId);

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  // Ensure course is approved and published
  if (course.approvalStatus !== "approved" || course.status !== "published") {
    const error = new Error("This course is currently not available for purchase.");
    error.statusCode = 409;
    throw error;
  }

  // Prevent duplicate enrollment
  const alreadyEnrolled = await Enrollment.findOne({
    user: userId,
    course: courseId,
  });

  if (alreadyEnrolled) {
    const error = new Error("You already enrolled in this course");
    error.statusCode = 409;
    throw error;
  }

  // Razorpay order options
  const amount = Math.round(course.price * 100);
  
  if (isNaN(amount) || amount <= 0) {
    const error = new Error(`Invalid course price: ${course.price}. Amount must be greater than zero.`);
    error.statusCode = 400;
    throw error;
  }

  const options = {
    amount: amount, // paisa
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };

  // Create Razorpay order
  const order = await razorpay.orders.create(options);

  // Save payment record
  await Payment.create({
    user: userId,
    course: courseId,
    amount: course.price,
    razorpay_order_id: order.id,
    status: "created",
  });

  return {
    success: true,
    order,
    course,
  };
};

// Verify Payment
export const verifyPaymentService = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  courseId,
  userId,
}) => {
  assertRazorpayConfigured();

  // Generate signature
  const generatedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  // Verify signature
  if (generatedSignature !== razorpay_signature) {
    const error = new Error("Invalid payment signature");
    error.statusCode = 400;
    throw error;
  }

  // Find payment
  const payment = await Payment.findOne({
    razorpay_order_id,
  });

  if (!payment) {
    const error = new Error("Payment record not found");
    error.statusCode = 404;
    throw error;
  }

  // Update payment status
  payment.razorpay_payment_id = razorpay_payment_id;
  payment.razorpay_signature = razorpay_signature;
  payment.status = "paid";

  await payment.save();

  // Get course
  const course = await Course.findById(courseId);

  // Enroll student
  const alreadyEnrolled = await Enrollment.findOne({
    user: userId,
    course: courseId,
  });

  if (!alreadyEnrolled) {
    await Enrollment.create({
      user: userId,
      course: courseId,
      instructor: course.instructor,
    });
    course.enrolledStudentsCount = (course.enrolledStudentsCount || 0) + 1;
    await course.save();
  }

  return {
    success: true,
    message: "Payment verified and enrollment successful",
  };
};

// Record Payment Failure
export const recordPaymentFailureService = async ({ razorpay_order_id, error }) => {
  const payment = await Payment.findOne({ razorpay_order_id });
  if (payment) {
    payment.status = "failed";
    payment.failureReason = error?.description || error?.message || "Payment failed";
    await payment.save();
  }
  return { success: true };
};
