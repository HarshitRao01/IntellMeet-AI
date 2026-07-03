import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    meetingId:   { type: String, unique: true },
    description: String,
    scheduledAt: Date,
    
    summary:     String, 
    actionItems: [String], 
    sentiment:   String,   

    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended'],
      default: 'scheduled',
    },
    startedAt: Date,
    endedAt:   Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Meeting', meetingSchema);