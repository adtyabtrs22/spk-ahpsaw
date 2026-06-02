import axios from 'axios';

// Di production (Railway): VITE_API_URL diset via environment variable
// Di local dev: fallback ke localhost:8000
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('spk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('spk_token');
      localStorage.removeItem('spk_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
