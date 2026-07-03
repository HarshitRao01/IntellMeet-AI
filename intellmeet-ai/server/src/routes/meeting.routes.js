import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Meeting from '../models/Meeting.js';
import { verifyToken } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

router.get('/', verifyToken, async (req, res) => {
  try {
    const meetings = await Meeting.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch meetings' });
  }
});

router.get('/:meetingId', async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    if (meeting.status === 'scheduled' && meeting.scheduledAt) {
      const currentTime = new Date().getTime();
      const scheduledTime = new Date(meeting.scheduledAt).getTime();

      if (currentTime < (scheduledTime - 300000)) {
        return res.status(400).json({ 
          message: `Meeting abhi shuru nahi hui hai. Scheduled time: ${new Date(meeting.scheduledAt).toLocaleString()}` 
        });
      }
    }

    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch meeting' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, scheduledAt, description } = req.body;

    const meetingId = `meet-${uuidv4().slice(0, 8)}`;
    const meetingData = { title, description, meetingId, createdBy: req.user.id, status: 'scheduled' };

    if (scheduledAt) {
      const inputTime = new Date(scheduledAt).getTime();
      const rightNow = new Date().getTime();

      if (inputTime < rightNow - 60000) { 
        return res.status(400).json({ message: 'Aap guzre huye kal (Past Date/Time) mein meeting scheduled nahi kar sakte!' });
      }
      meetingData.scheduledAt = scheduledAt;
    }

    const meeting = await Meeting.create(meetingData);
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create meeting' });
  }
});

router.patch('/:id/start', verifyToken, async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndUpdate({ meetingId: req.params.id }, { status: 'active', startedAt: new Date() }, { new: true });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: 'Failed to start meeting' });
  }
});

router.patch('/:id/end', verifyToken, async (req, res) => {
  try {
    const { chatLog, rawChatsOnly, title } = req.body;

    let aiSummary = "AI Summary extraction failed due to text processing crash.";
    let aiActionItems = [];
    let aiSentiment = "Neutral";
    let workspaceTasks = [];

    if (chatLog && genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const systemPrompt = `
          Analyze the text log from a video call titled "${title}".
          Return strictly valid JSON matching this exact structure:
          {
            "summary": "Detailed summary...",
            "sentiment": "Neutral",
            "actionItems": ["Task description 1"],
            "workspaceTasks": [
              { "name": "Employee Name", "work": "Action task", "lastDate": "YYYY-MM-DD" }
            ]
          }
          Do not include markdown markdown formatting backticks.
          
          Log Data:
          ${chatLog}
        `;

        const result = await model.generateContent(systemPrompt);
        let responseText = result.response.text().trim();
        const cleanJson = responseText.replace(/```json|```/g, "").trim();
        const parsedInsights = JSON.parse(cleanJson);

        aiSummary = parsedInsights.summary || aiSummary;
        aiSentiment = parsedInsights.sentiment || aiSentiment;
        aiActionItems = parsedInsights.actionItems || [];
        workspaceTasks = parsedInsights.workspaceTasks || [];
      } catch (aiErr) {
        console.error(aiErr);
      }
    }

    const finalStoredSummary = chatLog ? `${aiSummary}\n\n=== RAW MEETING CHATS ===\n${rawChatsOnly || 'No chat messages exchanged.'}` : aiSummary;

    const meeting = await Meeting.findOneAndUpdate(
      { meetingId: req.params.id },
      { 
        status: 'ended', 
        endedAt: new Date(), 
        summary: finalStoredSummary,
        actionItems: aiActionItems,
        sentiment: aiSentiment
      },
      { new: true }
    );

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json({ meeting, workspaceTasks });
  } catch (error) {
    res.status(500).json({ message: 'Failed to end meeting' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const droppedMeeting = await Meeting.findOneAndDelete({ meetingId: req.params.id, createdBy: req.user.id });
    if (!droppedMeeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json({ message: 'Meeting deleted cleanly' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete meeting' });
  }
});

export default router;