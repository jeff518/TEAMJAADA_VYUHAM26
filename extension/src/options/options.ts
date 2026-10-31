/**
 * SecureDoc Pipeline - Options & Settings Controller
 */

import './options.css';
import { getSettings, storeSettings, isAuthenticated, getStoredUser, login, logout } from '../shared/auth';
import { apiClient } from '../shared/api-client';
import { DEFAULT_SETTINGS } from '../shared/constants';

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const optionsServerDot = document.getElementById('options-server-dot') as HTMLElement;
  const optionsServerStatus = document.getElementById('options-server-status') as HTMLElement;
  const saveAlert = document.getElementById('save-alert') as HTMLElement;
  const btnCloseAlert = document.getElementById('btn-close-alert') as HTMLElement;

  const optBackendUrl = document.getElementById('opt-backend-url') as HTMLInputElement;
  const optBtnTestConn = document.getElementById('opt-btn-test-conn') as HTMLButtonElement;
  const optTestFeedback = document.getElementById('opt-test-feedback') as HTMLElement;

  const optAuthLoggedIn = document.getElementById('opt-auth-logged-in') as HTMLElement;
  const optAuthLoggedOut = document.getElementById('opt-auth-logged-out') as HTMLElement;
  const optUserInitial = document.getElementById('opt-user-initial') as HTMLElement;
  const optUserDisplayName = document.getElementById('opt-user-display-name') as HTMLElement;
  const optUserEmail = document.getElementById('opt-user-email') as HTMLElement;
  const optBtnLogout = document.getElementById('opt-btn-logout') as HTMLButtonElement;

  const optLoginEmail = document.getElementById('opt-login-email') as HTMLInputElement;
  const optLoginPassword = document.getElementById('opt-login-password') as HTMLInputElement;
  const optBtnLogin = document.getElementById('opt-btn-login') as HTMLButtonElement;

  const optPrefDownloads = document.getElementById('opt-pref-downloads') as HTMLInputElement;
  const optPrefDragdrop = document.getElementById('opt-pref-dragdrop') as HTMLInputElement;
  const optPrefEmails = document.getElementById('opt-pref-emails') as HTMLInputElement;
  const optPrefNotifications = document.getElementById('opt-pref-notifications') as HTMLInputElement;

  const optBtnClearCache = document.getElementById('opt-btn-clear-cache') as HTMLButtonElement;
  const optBtnResetDefaults = document.getElementById('opt-btn-reset-defaults') as HTMLButtonElement;
  const optBtnSaveAll = document.getElementById('opt-btn-save-all') as HTMLButtonElement;

  // Load and populate settings
  async function loadSettings() {
    const settings = await getSettings();
    optBackendUrl.value = settings.backendUrl || 'http://localhost:8000';
    optPrefDownloads.checked = settings.interceptDownloads ?? true;
    optPrefDragdrop.checked = settings.interceptDragDrop ?? true;
    optPrefEmails.checked = settings.interceptEmails ?? true;
    optPrefNotifications.checked = settings.notifications ?? true;

    await updateAuthView();
    await testConnection(false);
  }

  // Update Auth Section
  async function updateAuthView() {
    const authed = await isAuthenticated();
    if (authed) {
      optAuthLoggedIn.classList.remove('hidden');
      optAuthLoggedOut.classList.add('hidden');
      const user = await getStoredUser();
      if (user) {
        optUserDisplayName.textContent = user.name || user.email.split('@')[0];
        optUserEmail.textContent = user.email;
        optUserInitial.textContent = (user.name || user.email)[0].toUpperCase();
      }
    } else {
      optAuthLoggedIn.classList.add('hidden');
      optAuthLoggedOut.classList.remove('hidden');
    }
  }

  // Test Connection
  async function testConnection(showFeedback = true) {
    if (showFeedback) {
      optBtnTestConn.disabled = true;
      optBtnTestConn.textContent = 'Testing...';
      optTestFeedback.classList.remove('hidden');
    }

    try {
      const res = await apiClient.checkHealth();
      if (res.success) {
        optionsServerDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        optionsServerStatus.textContent = 'Server Online';
        if (showFeedback) {
          optTestFeedback.className = 'text-xs mt-1.5 text-emerald-600 font-semibold';
          optTestFeedback.textContent = '✓ SecureDoc server reachable and healthy.';
        }
      } else {
        optionsServerDot.className = 'w-2 h-2 rounded-full bg-rose-500';
        optionsServerStatus.textContent = 'Unreachable';
        if (showFeedback) {
          optTestFeedback.className = 'text-xs mt-1.5 text-rose-600 font-semibold';
          optTestFeedback.textContent = `✕ Server error: ${res.error || 'Connection refused'}`;
        }
      }
    } catch (err: any) {
      optionsServerDot.className = 'w-2 h-2 rounded-full bg-rose-500';
      optionsServerStatus.textContent = 'Disconnected';
      if (showFeedback) {
        optTestFeedback.className = 'text-xs mt-1.5 text-rose-600 font-semibold';
        optTestFeedback.textContent = `✕ Connection failed: ${err.message}`;
      }
    } finally {
      if (showFeedback) {
        optBtnTestConn.disabled = false;
        optBtnTestConn.textContent = 'Test Connection';
      }
    }
  }

  optBtnTestConn?.addEventListener('click', () => {
    testConnection(true);
  });

  // Login handler
  optBtnLogin?.addEventListener('click', async () => {
    const email = optLoginEmail.value.trim();
    const password = optLoginPassword.value;
    if (!email || !password) {
      alert('Please enter email and password.');
      return;
    }

    optBtnLogin.disabled = true;
    optBtnLogin.textContent = 'Authenticating...';
    try {
      await storeSettings({ backendUrl: optBackendUrl.value.trim() });
      await login(email, password);
      await updateAuthView();
    } catch (err: any) {
      alert(err.message || 'Login failed.');
    } finally {
      optBtnLogin.disabled = false;
      optBtnLogin.textContent = 'Authenticate Session';
    }
  });

  // Logout handler
  optBtnLogout?.addEventListener('click', async () => {
    await logout();
    await updateAuthView();
  });

  // Save All Changes
  optBtnSaveAll?.addEventListener('click', async () => {
    optBtnSaveAll.disabled = true;
    optBtnSaveAll.textContent = 'Saving...';

    await storeSettings({
      backendUrl: optBackendUrl.value.trim(),
      interceptDownloads: optPrefDownloads.checked,
      interceptDragDrop: optPrefDragdrop.checked,
      interceptEmails: optPrefEmails.checked,
      notifications: optPrefNotifications.checked,
    });

    saveAlert.classList.remove('hidden');
    optBtnSaveAll.disabled = false;
    optBtnSaveAll.textContent = 'Save All Changes';
    await testConnection(false);

    setTimeout(() => {
      saveAlert.classList.add('hidden');
    }, 4000);
  });

  btnCloseAlert?.addEventListener('click', () => {
    saveAlert.classList.add('hidden');
  });

  // Clear Local Cache
  optBtnClearCache?.addEventListener('click', async () => {
    if (confirm('Clear cached pipeline documents and local state?')) {
      const token = await chrome.storage.local.get(['securedoc_auth_token', 'securedoc_user_settings']);
      await chrome.storage.local.clear();
      // Keep token & settings
      await chrome.storage.local.set(token);
      alert('Local document cache cleared.');
    }
  });

  // Reset to Factory Defaults
  optBtnResetDefaults?.addEventListener('click', async () => {
    if (confirm('Reset all extension settings and preferences to factory defaults?')) {
      await chrome.storage.local.clear();
      await storeSettings(DEFAULT_SETTINGS);
      await loadSettings();
      alert('Extension reset to factory defaults.');
    }
  });

  // Initial load
  await loadSettings();
});
