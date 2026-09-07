import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const API_MODE = process.env.EXPO_PUBLIC_API_MODE || 'mock';
const REQUEST_TIMEOUT_MS = 15000;
const AUTH_TOKEN_KEY = 'sw_auth_token';

export function isMockMode() {
  return API_MODE !== 'real';
}

export async function getAuthToken() {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

export async function setAuthToken(token) {
  try {
    if (token) {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    }
  } catch (error) {
    // Secure store unavailable (e.g. web without polyfill) - fail silently, session stays in-memory only.
  }
}

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, headers = {}, timeout = REQUEST_TIMEOUT_MS } = {}) {
  if (isMockMode()) {
    throw new ApiError('API client called while in mock mode', 0, 'MOCK_MODE');
  }

  const token = await getAuthToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      data = null;
    }

    if (!response.ok) {
      throw new ApiError(data?.message || `Request failed with status ${response.status}`, response.status, data?.code);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', 0, 'TIMEOUT');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network request failed', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

export async function checkBackendHealth() {
  if (isMockMode()) {
    return { ok: false, mode: 'mock' };
  }
  try {
    await request('/health', { timeout: 5000 });
    return { ok: true, mode: 'real' };
  } catch (error) {
    return { ok: false, mode: 'real', error: error.message };
  }
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export { ApiError };
export default apiClient;
