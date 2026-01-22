import axios from 'axios';
import { toUserMessage } from './error';

// Helper function to get cookies
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Token ${token}`;
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const mapped = toUserMessage(error);
      // attach for consumers
      (error as any).userMessage = mapped.userMessage;
    } catch (_) {
      // no-op
    }
    return Promise.reject(error);
  }
);

export default api;

// Function to get CSRF token from Django
export const getCSRFToken = async () => {
  try {
    await api.get('/api/');
    return getCookie('csrftoken');
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return null;
  }
};
