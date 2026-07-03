# IntellMeet AI

Full stack meeting app using React 19, Tailwind CSS, Socket.io and WebRTC.

## Features
- Signup/Login with JWT
- Dashboard
- Create meeting
- Join meeting
- Copy meeting link toast
- Schedule meeting
- Meeting CRUD
- Real-time chat using Socket.io
- WebRTC video/audio calling
- Mic on/off
- Camera on/off
- Screen sharing
- Participant list
- Meeting end/leave
- Redis ready Socket.io adapter setup

## Run

### Server
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

Open: http://localhost:5173

## Required local services
- MongoDB: mongodb://127.0.0.1:27017/intellmeet_ai
- Redis: redis://localhost:6379

If Redis is not running, server will still work in single-server mode.
