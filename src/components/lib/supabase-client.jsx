// This file is now a bridge to your MongoDB/Node.js backend
const API_BASE_URL = "http://localhost:5000/api";

export const supabase = {
  auth: {
    // This part tells the app "Yes, the user is logged in" via MongoDB
    getUser: async () => {
      const token = localStorage.getItem("token");
      if (!token) return { data: { user: null }, error: null };
      
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = await res.json();
        // We force 'teacher' role and 'subscribed' here to bypass the paywall
        const fakeUser = { ...user, role: 'teacher', subscribed: true };
        return { data: { user: fakeUser }, error: null };
      } catch (err) {
        return { data: { user: null }, error: err };
      }
    },
    signOut: async () => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  },

  // This part "fakes" the database commands like .from().select()
  from: (tableName) => ({
    select: () => ({
      eq: (field, value) => ({
        maybeSingle: async () => {
          const res = await fetch(`${API_BASE_URL}/${tableName}`);
          const data = await res.json();
          return { data: Array.isArray(data) ? data[0] : data, error: null };
        },
        single: async () => {
          const res = await fetch(`${API_BASE_URL}/${tableName}`);
          const data = await res.json();
          return { data: Array.isArray(data) ? data[0] : data, error: null };
        }
      }),
      order: () => ({
        data: [],
        error: null
      })
    }),
    insert: (data) => ({
      select: () => ({
        single: async () => {
          const res = await fetch(`${API_BASE_URL}/${tableName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const result = await res.json();
          return { data: result, error: null };
        }
      })
    })
  })
};