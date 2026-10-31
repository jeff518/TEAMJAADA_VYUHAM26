/**
 * SecureDoc Pipeline - Authentication Management
 */

import { DEFAULT_SETTINGS, MESSAGE_ACTIONS, API_ENDPOINTS } from './constants';
import { UserSettings, UserProfile, AuthResponse } from './types';

const STORAGE_KEY_TOKEN = 'securedoc_auth_token';
const STORAGE_KEY_REFRESH = 'securedoc_refresh_token';
const STORAGE_KEY_USER = 'securedoc_user_profile';
const STORAGE_KEY_SETTINGS = 'securedoc_user_settings';

/**
 * Decode JWT token payload without external libraries
 */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse JWT payload', err);
    return null;
  }
}

/**
 * Store JWT auth token in chrome.storage.local
 */
export async function storeToken(token: string, refreshToken?: string): Promise<void> {
  const items: Record<string, unknown> = {
    [STORAGE_KEY_TOKEN]: token,
  };
  if (refreshToken) {
    items[STORAGE_KEY_REFRESH] = refreshToken;
  }
  await chrome.storage.local.set(items);
}

/**
 * Retrieve JWT auth token from chrome.storage.local
 */
export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get([STORAGE_KEY_TOKEN]);
  const token = result[STORAGE_KEY_TOKEN];
  return typeof token === 'string' ? token : null;
}

/**
 * Retrieve Refresh token from storage
 */
export async function getRefreshToken(): Promise<string | null> {
  const result = await chrome.storage.local.get([STORAGE_KEY_REFRESH]);
  const token = result[STORAGE_KEY_REFRESH];
  return typeof token === 'string' ? token : null;
}

/**
 * Remove stored auth tokens and user profile
 */
export async function removeToken(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEY_TOKEN,
    STORAGE_KEY_REFRESH,
    STORAGE_KEY_USER,
  ]);
}

/**
 * Store user profile info in storage
 */
export async function storeUserProfile(user: UserProfile): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_USER]: user });
}

/**
 * Retrieve user profile info from storage
 */
export const DEFAULT_ANALYST: UserProfile = {
  id: 'analyst-default-001',
  email: 'analyst@securedoc.local',
  name: 'Security Analyst',
  role: 'ADMIN',
};

/**
 * Retrieve user profile info from storage with automatic default analyst
 */
export async function getStoredUser(): Promise<UserProfile | null> {
  const result = await chrome.storage.local.get([STORAGE_KEY_USER]);
  return (result[STORAGE_KEY_USER] as UserProfile) || DEFAULT_ANALYST;
}

/**
 * Get stored settings or return defaults
 */
export async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.local.get([STORAGE_KEY_SETTINGS]);
  const stored = result[STORAGE_KEY_SETTINGS] as Partial<UserSettings> | undefined;
  return {
    ...DEFAULT_SETTINGS,
    ...(stored || {}),
  };
}

/**
 * Update and store settings
 */
export async function storeSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const updated: UserSettings = {
    ...current,
    ...settings,
  };
  await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: updated });
  return updated;
}

/**
 * Check if the user is authenticated (Always true - Passwordless Mode)
 */
export async function isAuthenticated(): Promise<boolean> {
  return true;
}

/**
 * Refresh current JWT token using backend refresh endpoint
 */
export async function refreshToken(): Promise<string | null> {
  try {
    const rfToken = await getRefreshToken();
    const settings = await getSettings();
    const url = `${settings.backendUrl}${API_ENDPOINTS.REFRESH_TOKEN}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (rfToken) {
      headers['Authorization'] = `Bearer ${rfToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refresh_token: rfToken }),
    });

    if (!response.ok) {
      await removeToken();
      return null;
    }

    const data = await response.json();
    const newToken = data.token || data.access_token || (data.data && data.data.token);
    if (newToken && typeof newToken === 'string') {
      const newRefresh = data.refreshToken || data.refresh_token;
      await storeToken(newToken, newRefresh);
      return newToken;
    }

    return null;
  } catch (error) {
    console.error('Token refresh failed', error);
    return null;
  }
}

/**
 * Login with email and password, store token and user profile
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const settings = await getSettings();
  const url = `${settings.backendUrl}${API_ENDPOINTS.LOGIN}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = 'Login failed';
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.error || parsed.message || message;
    } catch {
      // use raw message or status
      message = `${message} (${response.status})`;
    }
    throw new Error(message);
  }

  const result = await response.json();
  const token = result.token || result.access_token || (result.data && result.data.token);
  const refreshTokenVal = result.refreshToken || result.refresh_token;

  if (!token) {
    throw new Error('Authentication response did not contain a valid token');
  }

  const user: UserProfile = result.user ||
    (result.data && result.data.user) || {
      id: 'user-default',
      email,
      name: email.split('@')[0],
      role: 'Analyst',
    };

  await storeToken(token, refreshTokenVal);
  await storeUserProfile(user);

  // Notify extension runtime
  try {
    chrome.runtime.sendMessage({
      action: MESSAGE_ACTIONS.AUTH_CHANGED,
      payload: { authenticated: true, user },
    });
  } catch {
    // runtime might not be listening in all contexts
  }

  return { token, refreshToken: refreshTokenVal, user };
}

/**
 * Logout user and clear stored tokens
 */
export async function logout(): Promise<void> {
  await removeToken();
  try {
    chrome.runtime.sendMessage({
      action: MESSAGE_ACTIONS.AUTH_CHANGED,
      payload: { authenticated: false },
    });
  } catch {
    // runtime might not be listening
  }
}
