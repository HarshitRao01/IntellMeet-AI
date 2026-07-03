import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  assignedTo: { type: String, default: 'Unassigned' },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' }, // Kanban support
  lastDate: String
}, { timestamps: true });

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  members: [{ name: String }],
  tasks: [taskSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model('Workspace', workspaceSchema);