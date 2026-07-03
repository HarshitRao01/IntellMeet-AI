import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, 
});

api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');
    
    if (token) {
      token = token.replace(/['"]/g, '').trim();
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("⚠️ LocalStorage validation failed: Auth Token not found.");
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;