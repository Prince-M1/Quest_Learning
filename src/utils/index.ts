// src/utils/index.ts

// Generate page URL
export function createPageUrl(pageName: string) {
  return '/' + pageName.toLowerCase().replace(/ /g, '-');
}

// -----------------------------
// API fetch helper
// -----------------------------
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(baseUrl + endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    // If the response is not OK, attempt to read JSON error
    if (!res.ok) {
      let errorMessage = "API request failed";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // fallback if JSON parsing fails
      }
      throw new Error(errorMessage);
    }

    // Return parsed JSON
    return await res.json();
  } catch (err: any) {
    console.error("apiFetch error:", err.message);
    throw err;
  }
};
