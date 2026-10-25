import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export class ApiError extends Error {
  constructor(message, status, isNetworkError = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message =
        (data && (data.message || data.error)) || `Request failed (${status})`;
      return Promise.reject(new ApiError(message, status));
    }
    return Promise.reject(
      new ApiError(
        "Server se connect nahi ho paya. Backend chal raha hai?",
        0,
        true
      )
    );
  }
);

export default client;