import express from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../middleware/auth.js';

const TaskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  assignedTo: { type: String, default: 'Unassigned' },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  lastDate: { type: String, default: '' }
}, { timestamps: true });

const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  members: [{ name: String }],
  tasks: [TaskSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema);
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const dataPool = await Workspace.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(dataPool);
  } catch (err) {
    res.status(500).json({ message: 'MongoDB fetch failure.' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const freshWorkspace = await Workspace.create({
      name,
      description,
      members: [],
      tasks: [],
      createdBy: req.user.id
    });
    res.status(201).json(freshWorkspace);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create workspace.' });
  }
});

router.post('/:wsId/members', verifyToken, async (req, res) => {
  try {
    const workspaceId = req.params.wsId;
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: 'Member name required' });

    const updatedBoard = await Workspace.findOneAndUpdate(
      { _id: workspaceId, createdBy: req.user.id },
      { $push: { members: { name } } },
      { new: true }
    );

    if (!updatedBoard) return res.status(404).json({ message: 'Workspace board not found.' });
    res.json(updatedBoard);
  } catch (err) {
    console.error("Member append crash trace:", err);
    res.status(500).json({ message: 'Internal validation crash.' });
  }
});

router.post('/:wsId/tasks', verifyToken, async (req, res) => {
  try {
    const workspaceId = req.params.wsId;
    const { text, assignedTo, status } = req.body;

    if (!text) return res.status(400).json({ message: 'Task text required' });

    const newTaskObject = {
      text,
      assignedTo: assignedTo || 'Unassigned',
      status: status || 'todo',
      lastDate: ''
    };

    const updatedBoard = await Workspace.findOneAndUpdate(
      { _id: workspaceId, createdBy: req.user.id },
      { $push: { tasks: newTaskObject } },
      { new: true }
    );

    if (!updatedBoard) return res.status(404).json({ message: 'Workspace board target missing.' });
    res.json(updatedBoard);
  } catch (err) {
    console.error("Task append crash trace:", err);
    res.status(500).json({ message: 'Internal schema crash.' });
  }
});

router.patch('/:wsId/tasks/:taskId', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    const updatedBoard = await Workspace.findOneAndUpdate(
      { _id: req.params.wsId, createdBy: req.user.id, "tasks._id": req.params.taskId },
      { $set: { "tasks.$.status": status } },
      { new: true }
    );

    if (!updatedBoard) return res.status(404).json({ message: 'Task mapping matrix dead.' });
    res.json(updatedBoard);
  } catch (err) {
    res.status(500).json({ message: 'Column patch crash.' });
  }
});

router.delete('/:wsId/tasks/:taskId', verifyToken, async (req, res) => {
  try {
    const updatedBoard = await Workspace.findOneAndUpdate(
      { _id: req.params.wsId, createdBy: req.user.id },
      { $pull: { tasks: { _id: req.params.taskId } } },
      { new: true }
    );
    if (!updatedBoard) return res.status(404).json({ message: 'Target slice failed.' });
    res.json(updatedBoard);
  } catch (err) {
    res.status(500).json({ message: 'Splice target dead.' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Workspace.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    res.json({ message: 'Workspace dropped successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed.' });
  }
});

export default router;