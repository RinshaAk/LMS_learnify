import mongoose from "mongoose";

const liveSessionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "scheduled",
        "starting",
        "live",
        "ended",
        "cancelled",
        "failed",
      ],
      default: "scheduled",
      index: true,
    },

    // Amazon IVS channel information
    ivsChannelArn: {
      type: String,
      default: null,
    },

    ivsChannelName: {
      type: String,
      default: null,
    },

    ivsIngestEndpoint: {
      type: String,
      default: null,
      select: false,
    },

    streamKeyArn: {
      type: String,
      default: null,
      select: false,
    },

    // Never store the actual streamKeyValue here
    playbackUrl: {
      type: String,
      default: null,
      select: false,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    recordingUrl: {
      type: String,
      default: null,
    },

    recordingStatus: {
      type: String,
      enum: ["not_requested", "processing", "ready", "failed"],
      default: "not_requested",
    },

    viewerCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    peakViewerCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    chatEnabled: {
      type: Boolean,
      default: true,
    },

    attendanceEnabled: {
      type: Boolean,
      default: true,
    },

    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

liveSessionSchema.index({
  course: 1,
  scheduledAt: -1,
});

liveSessionSchema.index({
  instructor: 1,
  status: 1,
  scheduledAt: -1,
});

liveSessionSchema.index({
  status: 1,
  scheduledAt: 1,
});

export const LiveSession = mongoose.model(
  "LiveSession",
  liveSessionSchema
);