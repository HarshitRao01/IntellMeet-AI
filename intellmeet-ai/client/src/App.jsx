import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard   from './pages/Dashboard';
import Meetings    from './pages/Meetings';
import Recordings  from './pages/Recordings';
import Workspaces  from './pages/Workspaces';
import Profile     from './pages/Profile';
import MeetingRoom from './pages/MeetingRoom';
import Login       from './pages/Login';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/meetings"   element={<PrivateRoute><Meetings /></PrivateRoute>} />
        <Route path="/recordings" element={<PrivateRoute><Recordings /></PrivateRoute>} />
        <Route path="/workspaces" element={<PrivateRoute><Workspaces /></PrivateRoute>} />
        <Route path="/profile"    element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/meeting/:meetingId" element={<PrivateRoute><MeetingRoom /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}