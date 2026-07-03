import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import Recording from "../models/Recording.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, 
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const recordings = await Recording.find().sort({ createdAt: -1 });
    res.json(recordings);
  } catch (error) {
    console.error("Fetch recordings error:", error);
    res.status(500).json({ message: "Failed to fetch recordings" });
  }
});

router.post("/", verifyToken, upload.single("video"), async (req, res) => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY    ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        message: "Cloudinary credentials missing in server/.env",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Video file missing" });
    }

    const { meetingId, meetingTitle, description, duration } = req.body;

    const uploadToCloudinary = () => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "video", folder: "intellmeet-recordings" },
        (error, result) => error ? reject(error) : resolve(result)
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const result = await uploadToCloudinary();

    const recording = await Recording.create({
      meetingId:    meetingId    || "",
      meetingTitle: meetingTitle || "Untitled Meeting",
      description:  description  || "",
      videoUrl:     result.secure_url,
      publicId:     result.public_id,
      duration:     Number(duration) || 0,
    });

    res.status(201).json({ message: "Recording saved successfully", recording });
  } catch (error) {
    console.error("Recording upload error:", error);
    res.status(500).json({ message: error.message || "Upload failed" });
  }
});

router.get("/meeting/:meetingId", async (req, res) => {
  try {
    const recordings = await Recording.find({
      meetingId: req.params.meetingId,
    }).sort({ createdAt: -1 });
    res.json(recordings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch recordings" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);

    if (!recording) {
      return res.status(404).json({ message: "Recording not found" });
    }

    if (recording.publicId) {
      try {
        await cloudinary.uploader.destroy(recording.publicId, {
          resource_type: "video",
        });
      } catch (cloudErr) {
        console.error("Cloudinary delete error:", cloudErr);
      }
    }

    await recording.deleteOne();
    res.json({ message: "Recording deleted successfully" });
  } catch (error) {
    console.error("Delete recording error:", error);
    res.status(500).json({ message: "Failed to delete recording" });
  }
});

export default router;