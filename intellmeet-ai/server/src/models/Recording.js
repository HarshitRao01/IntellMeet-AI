import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      default: "",
      index: true,
    },
    meetingTitle: {
      type: String,
      default: "Untitled Meeting",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    summary: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: "",
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Recording = mongoose.model("Recording", recordingSchema);

export default Recording;

