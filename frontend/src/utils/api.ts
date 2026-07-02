const isBrowser = typeof window !== 'undefined';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || (isBrowser ? `${window.location.protocol}//${window.location.hostname}:3001/api` : 'http://localhost:3001/api');

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    // Required to send cookies (session) to the backend
    credentials: 'include',
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('session-expired'));
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'An error occurred');
  }

  // Handle empty responses
  if (res.status === 204) return null;

  return res.json();
};
