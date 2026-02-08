// src/utils/auth.js

// 1. Get JWT from localStorage
export const getToken = () => localStorage.getItem("token");

// 2. Fetch wrapper with JWT authorization
export const apiFetch = async (url, options = {}) => {
  const token = getToken();

  const res = await fetch(url, {
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
