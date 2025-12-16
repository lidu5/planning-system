import axios from 'axios';
import { toUserMessage } from './error';

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
