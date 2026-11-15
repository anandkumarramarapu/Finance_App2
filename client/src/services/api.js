import axios from "axios";

// Base URL: use VITE_API_URL env variable for local dev, otherwise relative "/api" for production (Vercel)
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const userPaymentAPI = {
  create: (data) => api.post("/user-payments", data),
  getAll: (params = {}) => api.get("/user-payments", { params }),
  getById: (id) => api.get(`/user-payments/${id}`),
  getByAadhar: (aadharNumber) => api.get(`/user-payments/aadhar/${aadharNumber}`),
  recordPayment: (id, data) => api.post(`/user-payments/${id}/pay`, data),
  recordBulkPayment: (id, data) => api.post(`/user-payments/${id}/bulk-pay`, data),
  getPaymentHistory: (id) => api.get(`/user-payments/${id}/payment-history`),
  update: (id, data) => api.put(`/user-payments/${id}`, data),
  delete: (id) => api.delete(`/user-payments/${id}`),
};

export default api;
