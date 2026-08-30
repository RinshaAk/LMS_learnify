import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    studentName: String,
    courseName: String,
    instructorName: String,
    amount: {
      type: Number,
      required: true,
    },
    adminEarning: {
      type: Number,
      default: 0,
    },
    instructorEarning: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      default: "Razorpay",
    },
    razorpay_order_id: {
      type: String,
    },
    razorpay_payment_id: {
      type: String,
    },
    razorpay_signature: {
      type: String,
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
    failureReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ course: 1, createdAt: -1 });
paymentSchema.index({ razorpay_order_id: 1 }, { sparse: true });
paymentSchema.index({ razorpay_payment_id: 1 }, { sparse: true });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
