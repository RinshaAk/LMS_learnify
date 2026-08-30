import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    subtitle: String,
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
    },
    discountPrice: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
      default: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
    },
    category: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: "English",
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    tags: [String],
    duration: {
      type: String,
      default: "0h",
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    enrolledStudentsCount: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    examRequired: {
      type: Boolean,
      default: false,
    },
    certificateEligibility: {
      type: Boolean,
      default: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Virtual for modules
courseSchema.virtual("modules", {
  ref: "Module",
  localField: "_id",
  foreignField: "courseId",
});

courseSchema.set("toObject", { virtuals: true });
courseSchema.set("toJSON", { virtuals: true });

courseSchema.index({ status: 1, approvalStatus: 1, isHidden: 1, isBlocked: 1, createdAt: -1 });
courseSchema.index({ instructor: 1, createdAt: -1 });
courseSchema.index({ category: 1, status: 1, approvalStatus: 1, createdAt: -1 });

const Course = mongoose.model("Course", courseSchema);

export default Course;
