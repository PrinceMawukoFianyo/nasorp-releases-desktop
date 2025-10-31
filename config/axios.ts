// lib/axios.ts or utils/api.ts
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;  
export const api = axios.create({
  baseURL:`${BASE_URL}/api/v1`,
  timeout: 10000, // 10 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

/* // Add request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem("token");
    
    // If token exists, add it to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // You can also add other custom headers
    // config.headers['X-Custom-Header'] = 'value';
    
    console.log("Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error: AxiosError) => {
    console.error("Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return only the data from response
    console.log("Response:", response.status, response.config.url);
    return response.data; // This returns response.data instead of full response
  },
  (error: AxiosError) => {
    // Handle errors
    console.error("Response Error:", error.response?.status, error.config?.url);
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          console.error("Unauthorized - Please login");
          localStorage.removeItem("token");
          window.location.href = "/login";
          break;
          
        case 403:
          // Forbidden
          console.error("Forbidden - You do not have permission");
          break;
          
        case 404:
          // Not found
          console.error("Resource not found");
          break;
          
        case 500:
          // Server error
          console.error("Server error - Please try again later");
          break;
          
        default:
          console.error("Error:", error.response.data);
      }
      
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // Request was made but no response
      console.error("Network Error - No response from server");
      return Promise.reject({ 
        message: "Network error. Please check your connection." 
      });
    } else {
      // Something else happened
      console.error("Error:", error.message);
      return Promise.reject({ message: error.message });
    }
  }
); */