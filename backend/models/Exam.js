import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ["exam", "mission_task", "theory", "coding", "mixed"],
      default: "exam",
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    scheduledDate: Date,
    scheduledAt: Date,
    duration: Number, // in minutes
    topics: [String],
    attachment: String, // S3 PDF key for new uploads; legacy records may contain a URL.
    attachments: [String],
    maxAttempts: {
      type: Number,
      default: 3,
    },
    passingMarks: {
      type: Number,
      default: 40,
    },
    examType: {
      type: String,
      enum: ["theory", "machine_task"],
      default: "theory",
    },
    requirements: [String],
    questions: [
      {
        question: String,
        q: { type: String, required: true },
        type: {
          type: String,
          enum: ["mcq", "text", "file", "coding", "file_upload"],
          default: "mcq",
        },
        options: [{ type: String }],
        correct: { type: Number },
        correctAnswer: mongoose.Schema.Types.Mixed,
        marks: {
          type: Number,
          default: 1,
        },
        starterCode: String,
        expectedOutput: String,
        testCases: [
          {
            input: String,
            output: String,
          },
        ],
        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
          default: "medium",
        },
      }
    ],
    status: {
      type: String,
      enum: ["draft", "scheduled", "ongoing", "active", "expired", "completed"],
      default: "scheduled",
    },
    totalMarks: {
      type: Number,
      default: 100,
    },
    deadline: Date,
    instructions: String,
    taskType: {
      type: String,
      enum: ["exam", "task"],
      default: "exam",
    },
    assignedBatch: String,
    assignedBatches: [String],
    expectedOutput: String,
    starterCode: String,
    testCases: [
      {
        input: String,
        output: String,
      },
    ],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    assignedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

examSchema.pre("validate", function syncExamFields() {
  if (this.course && !this.courseId) this.courseId = this.course;
  if (this.courseId && !this.course) this.course = this.courseId;
  if (this.instructor && !this.instructorId) this.instructorId = this.instructor;
  if (this.instructorId && !this.instructor) this.instructor = this.instructorId;
  if (this.scheduledAt && !this.scheduledDate) this.scheduledDate = this.scheduledAt;
  if (this.scheduledDate && !this.scheduledAt) this.scheduledAt = this.scheduledDate;
  if (this.attachment && (!this.attachments || this.attachments.length === 0)) {
    this.attachments = [this.attachment];
  }
  this.questions?.forEach((item) => {
    if (item.question && !item.q) item.q = item.question;
    if (item.q && !item.question) item.question = item.q;
    if (item.correctAnswer !== undefined && item.correct === undefined && item.type === "mcq") {
      item.correct = Number(item.correctAnswer);
    }
    if (item.correct !== undefined && item.correctAnswer === undefined) item.correctAnswer = item.correct;
  });
  if (this.isDraft) this.status = "draft";
});

export default mongoose.model("Exam", examSchema);
