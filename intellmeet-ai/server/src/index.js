import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import recordingRoutes from './routes/recording.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';

connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth',       authRoutes);
app.use('/api/meetings',   meetingRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/workspaces', workspaceRoutes);

app.get('/', (req, res) => res.send('IntellMeet AI API running successfully ✅'));

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

try {
  const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ Redis adapter connected');
} catch {
  console.log('⚠️  Redis not connected. Running without Redis adapter (single server mode).');
}

const rooms = new Map();

io.on('connection', socket => {

  socket.on('join-room', ({ roomId, user }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.user = user;

    if (!rooms.has(roomId)) rooms.set(roomId, []);

    const existing = rooms.get(roomId).filter(p => p.socketId !== socket.id);
    const updated  = [...existing, { socketId: socket.id, user }];
    rooms.set(roomId, updated);

    const others = existing; 
    socket.emit('existing-participants', others);

    socket.to(roomId).emit('participant-joined', { socketId: socket.id, user });

    const forClient = rooms.get(roomId).filter(p => p.socketId !== socket.id);
    io.to(roomId).emit('participants-updated', forClient);
  });

  socket.on('webrtc-offer', ({ to, offer }) =>
    socket.to(to).emit('webrtc-offer', { from: socket.id, offer, user: socket.data.user }));

  socket.on('webrtc-answer', ({ to, answer }) =>
    socket.to(to).emit('webrtc-answer', { from: socket.id, answer }));

  socket.on('webrtc-ice-candidate', ({ to, candidate }) =>
    socket.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate }));

  socket.on('send-message', message =>
    io.to(message.roomId).emit('receive-message', message));

  socket.on('media-state', data => {
    const targetRoomId = data.roomId || socket.data.roomId;
    if (targetRoomId) {
      socket.to(targetRoomId).emit('peer-media-state-broadcast', {
        socketId: socket.id,
        targetMediaType: data.targetMediaType,
        statusValue: data.statusValue
      });
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const updated = rooms.get(roomId).filter(p => p.socketId !== socket.id);
    rooms.set(roomId, updated);

    socket.to(roomId).emit('participant-left', { socketId: socket.id });

    updated.forEach(p => {
      const sock = io.sockets.sockets.get(p.socketId);
      if (sock) {
        const others = updated.filter(x => x.socketId !== p.socketId);
        sock.emit('participants-updated', others);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));