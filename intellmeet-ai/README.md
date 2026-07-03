# IntellMeet - AI-Powered Enterprise Meeting & Collaboration Platform

Production-Grade Full-Stack MERN Application featuring Real-Time Video conferencing, Socket-driven communication frameworks, and Integrated Team Kanban tracking. Developed as a core portfolio asset for Zidio Development[cite: 2].

## 🚀 Live Production Links
* **Live Web Application URL:** [PASTE_YOUR_VERCEL_FRONTEND_URL_HERE]
* **Production API Endpoint:** [PASTE_YOUR_RENDER_BACKEND_URL_HERE]

---

## 🛠️ Production Technology Stack
* **Frontend Core:** React 19 + TypeScript + Vite + Tailwind CSS
* **UI Components:** shadcn/ui framework primitives
* **Backend State Engine:** Node.js + Express.js REST APIs
* **Data Persistence Layer:** MongoDB Distributed Cluster via Mongoose ODM
* **Real-Time Mesh Network:** Socket.io Event Channels + Vanilla WebRTC P2P Streams

---

## 💎 Core Feature Architecture

### 1. Real-Time Video Conference Engine
* Direct browser-to-browser media stream synchronization using custom WebRTC signaling pipelines.
* Low-latency client side interaction controllers for multi-track screen sharing, audio toggles, and live participant lists.

### 2. Integrated Collaborative Workspaces
* Full-scale persistent Kanban Board tracking system mapped directly inside team workspace arrays.
* Live status modifications (`todo`, `in-progress`, `done`) utilizing atomic sub-document queries to prevent high database overhead.

### 3. Data Archiving & Sanitized Export Engine
* Automatic plain-text communication logging (`rawChatsOnly`) synchronized to MongoDB document states on room teardown events.
* Sanitized client-side CSV reporting engine utilizing regular expression loops to prevent Excel cell-injection exploits.

---

## 🛡️ Enterprise Security & Architecture Hardening
* **Stateless Session Guard:** Microservice security boundaries enforced globally through JSON Web Tokens (JWT) and custom `verifyToken` middleware gates.
* **Input Interceptors:** Automated regular expression filters embedded directly into core communication instances (`api.js`) to strip nested quotes and injection payloads before server parsing.
* **Traffic Throttling (OWASP Mitigation):** Express rate-limiting modules applied across incoming routes to mitigate automated DDoS exploitation loops.
* **Authorization Verification:** Direct data controllers enforce strict ownership lookups to defeat Broken Object Level Authorization (BOLA/IDOR) vulnerabilities.

---

## 📦 Local Installation & Deployment Core

### Prerequisites
* Node.js v18+
* Active MongoDB Atlas Cloud Cluster Connection String

### Server Configuration
1. Navigate to the backend cluster: `cd server`
2. Create your environment parameters file: `cp .env.example .env`
3. Configure your production variables inside `.env`:
   ```env
   MONGO_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secure_cryptographic_signature_hash
   PORT=5000
   