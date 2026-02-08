import { createClient } from '@base44/sdk';

// Use environment variables instead of appParams
export const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  serverUrl: import.meta.env.VITE_BASE44_SERVER_URL,
  token: import.meta.env.VITE_BASE44_TOKEN,
  functionsVersion: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION || 'latest',
  requiresAuth: false
});