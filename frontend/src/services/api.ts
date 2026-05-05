import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const createApiClient = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  api.interceptors.request.use(
    (config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        const currentPath = window.location.pathname;

        // ✅ Only logout + redirect if NOT already on login page
        if (currentPath !== '/login') {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
};

export const authApi = createApiClient('http://localhost:3001/api');
export const projectApi = createApiClient('http://localhost:3002/api');
export const aiApi = createApiClient('http://localhost:8001/api');
export const recommendationApi = createApiClient('http://localhost:8002/api');
