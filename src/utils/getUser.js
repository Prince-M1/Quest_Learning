export const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  
  const userRes = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!userRes.ok) {
    throw new Error('Failed to fetch user');
  }
  
  return await userRes.json();
};