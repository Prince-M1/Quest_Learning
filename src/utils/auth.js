// src/utils/auth.js

// 1. Get JWT token from localStorage
export const getToken = () => localStorage.getItem("token");

// 2. Save JWT token to localStorage
export const setToken = (token) => localStorage.setItem("token", token);

// 3. Remove JWT token (logout)
export const removeToken = () => localStorage.removeItem("token");

// 4. Fetch wrapper with JWT header
export const apiFetch = async (url, options = {}) => {
  const token = getToken();

  // Use environment variable for backend base URL
  // @ts-ignore
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"; // fallback hardcode
  console.log("API base URL:", baseUrl); // confirm

  const res = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error("Not authenticated");
  }

  return res.json();
};

// ----------------------------
// 5. Save current user object to localStorage
export const setCurrentUser = (user) => {
  localStorage.setItem("currentUser", JSON.stringify(user));
};

// 6. Get current user object from localStorage
export const getCurrentUser = () => {
  const data = localStorage.getItem("currentUser");
  return data ? JSON.parse(data) : null;
};

// 7. Remove current user from localStorage
export const removeCurrentUser = () => {
  localStorage.removeItem("currentUser");
};
