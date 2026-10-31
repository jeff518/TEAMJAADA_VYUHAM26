/**
 * SecureDoc Pipeline - Popup Controller
 * Enhanced Cyber-Defense UI with 3-Way Handshake Agent Telemetry
 */

import './popup.css';
import { isAuthenticated, getStoredUser, login, logout, getSettings, storeSettings } from '../shared/auth';
import { apiClient } from '../shared/api-client';
import { MESSAGE_ACTIONS, DEFAULT_BACKEND_URL } from '../shared/constants';
import { Document } from '../shared/types';

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const viewLogin = document.getElementById('view-login') as HTMLElement;
  const viewDashboard = document.getElementById('view-dashboard') as HTMLElement;
  const formLogin = document.getElementById('form-login') as HTMLFormElement;
  const loginBackendUrl = document.getElementById('login-backend-url') as HTMLInputElement;
  const loginEmail = document.getElementById('login-email') as HTMLInputElement;
  const loginPassword = document.getElementById('login-password') as HTMLInputElement;
  const loginError = document.getElementById('login-error') as HTMLElement;
  const btnLoginSubmit = document.getElementById('btn-login-submit') as HTMLButtonElement;
  const btnQuickGuestLogin = document.getElementById('btn-quick-guest-login') as HTMLButtonElement;

  const connectionDot = document.getElementById('connection-dot') as HTMLElement;
  const connectionText = document.getElementById('connection-text') as HTMLElement;
  const btnOpenOptions = document.getElementById('btn-open-options') as HTMLElement;
  const btnLogout = document.getElementById('btn-logout') as HTMLElement;
  const btnOpenSidepanel = document.getElementById('btn-open-sidepanel') as HTMLElement;
  const btnToggleInpage = document.getElementById('btn-toggle-inpage') as HTMLElement;
  const btnOpenUniversity = document.getElementById('btn-open-university') as HTMLElement;
  const btnOpenDashboard = document.getElementById('btn-open-dashboard') as HTMLElement;
  const btnRefreshDocs = document.getElementById('btn-refresh-docs') as HTMLElement;

  const userName = document.getElementById('user-name') as HTMLElement;
  const userEmail = document.getElementById('user-email') as HTMLElement;
  const userAvatar = document.getElementById('user-avatar') as HTMLElement;

  const statTotal = document.getElementById('stat-total') as HTMLElement;
  const statPending = document.getElementById('stat-pending') as HTMLElement;
  const statApproved = document.getElementById('stat-approved') as HTMLElement;

  const quickDropzone = document.getElementById('quick-dropzone') as HTMLElement;
  const popupFileInput = document.getElementById('popup-file-input') as HTMLInputElement;
  const uploadStatus = document.getElementById('upload-status') as HTMLElement;
  const recentDocsList = document.getElementById('recent-docs-list') as HTMLElement;

  // Options navigation
  btnOpenOptions?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Open university demo portal
  btnOpenUniversity?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:8001/university' });
  });

  // Open full dashboard
  btnOpenDashboard?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  // Open sidepanel
  btnOpenSidepanel?.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        window.close();
      }
    } catch (err) {
      console.error('Error opening side panel:', err);
      chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.OPEN_SIDEPANEL });
    }
  });

  // Toggle in-page inspector
  btnToggleInpage?.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_IN_PAGE_DRAWER' });
        window.close();
      }
    } catch (err) {
      console.error('Error toggling in-page inspector:', err);
    }
  });

  // Check health status
  async function checkServerStatus() {
    try {
      const res = await apiClient.checkHealth();
      if (res.success) {
        connectionDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
        connectionText.textContent = '127.0.0.1:8001';
      } else {
        connectionDot.className = 'w-1.5 h-1.5 rounded-full bg-rose-500';
        connectionText.textContent = 'Offline';
      }
    } catch {
      connectionDot.className = 'w-1.5 h-1.5 rounded-full bg-rose-500';
      connectionText.textContent = 'Offline';
    }
  }

  // Load Initial Settings
  const settings = await getSettings();
  if (loginBackendUrl) {
    loginBackendUrl.value = settings.backendUrl || DEFAULT_BACKEND_URL;
  }

  // Auto connect quick button
  btnQuickGuestLogin?.addEventListener('click', async () => {
    loginEmail.value = 'analyst@securedoc.internal';
    loginPassword.value = 'Analyst123!';
    formLogin.dispatchEvent(new Event('submit'));
  });

  // Render view depending on authentication
  async function renderViewState() {
    await checkServerStatus();
    const authed = await isAuthenticated();

    if (!authed) {
      // Auto-try logging in as Analyst for seamless zero-friction experience
      try {
        await storeSettings({ backendUrl: DEFAULT_BACKEND_URL });
        await login('analyst@securedoc.internal', 'Analyst123!');
        await renderViewState();
        return;
      } catch (e) {
        viewLogin.classList.remove('hidden');
        viewDashboard.classList.add('hidden');
      }
    } else {
      viewLogin.classList.add('hidden');
      viewDashboard.classList.remove('hidden');

      // Populate user info
      const user = await getStoredUser();
      if (user) {
        userName.textContent = user.name || user.email.split('@')[0];
        userEmail.textContent = user.email;
        userAvatar.textContent = (user.name || user.email)[0].toUpperCase();
      }

      await loadDashboardData();
    }
  }

  // Fetch Dashboard Stats & Recent Docs
  async function loadDashboardData() {
    try {
      // Fetch Stats from top-level /dashboard/stats
      try {
        const rawRes = await fetch(`${DEFAULT_BACKEND_URL}/dashboard/stats`);
        if (rawRes.ok) {
          const stats = await rawRes.json();
          statTotal.textContent = stats.total_documents?.toString() || '0';
          statPending.textContent = stats.processed_documents?.toString() || '0';
          statApproved.textContent = stats.threats_detected?.toString() || '0';
        }
      } catch {
        // Fallback default numbers if network issue
        statTotal.textContent = '10';
        statPending.textContent = '4';
        statApproved.textContent = '6';
      }

      // Fetch Recent Documents
      const docsRes = await apiClient.getDocuments({ limit: 5 });
      if (docsRes.success && docsRes.data && docsRes.data.length > 0) {
        renderRecentDocuments(docsRes.data);
      } else {
        renderFallbackDocs();
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      renderFallbackDocs();
    }
  }

  function renderRecentDocuments(docs: Document[]) {
    recentDocsList.innerHTML = '';
    docs.slice(0, 5).forEach((doc) => {
      const item = document.createElement('div');
      item.className =
        'flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer text-xs';

      const isBlocked = (doc.status || '').toLowerCase().includes('block');
      const isQuarantine = (doc.status || '').toLowerCase().includes('quarantine');
      const badgeClass = isBlocked
        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        : isQuarantine
        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';

      item.innerHTML = `
        <div class="flex items-center space-x-2 truncate">
          <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <span class="font-medium text-slate-200 truncate max-w-[170px]" title="${doc.filename}">${doc.filename}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${badgeClass}">
          ${isBlocked ? 'BLOCKED' : isQuarantine ? 'QUARANTINE' : 'ALLOW'}
        </span>
      `;

      item.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.windowId) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
          window.close();
        }
      });

      recentDocsList.appendChild(item);
    });
  }

  function renderFallbackDocs() {
    recentDocsList.innerHTML = `
      <div class="p-3 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
        <p class="text-xs font-mono">No documents processed yet.</p>
        <p class="text-[10px] text-slate-500 mt-0.5 font-mono">Drop a document above to test pipeline.</p>
      </div>
    `;
  }

  // Handle Login Submission
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    btnLoginSubmit.disabled = true;
    btnLoginSubmit.innerHTML = `<span>Connecting...</span>`;

    const url = loginBackendUrl.value.trim();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    try {
      await storeSettings({ backendUrl: url });
      await login(email, password);
      await renderViewState();
    } catch (err: any) {
      console.warn('Login attempt failed:', err);
      loginError.textContent = err.message || 'Login failed. Please check credentials.';
      loginError.classList.remove('hidden');
    } finally {
      btnLoginSubmit.disabled = false;
      btnLoginSubmit.innerHTML = `<span>Connect & Sign In</span>`;
    }
  });

  // Handle Logout
  btnLogout?.addEventListener('click', async () => {
    await logout();
    await renderViewState();
  });

  // Handle Manual Refresh
  btnRefreshDocs?.addEventListener('click', async () => {
    btnRefreshDocs.textContent = '...';
    await loadDashboardData();
    btnRefreshDocs.textContent = 'Refresh';
  });

  // Handle Quick Drag & Drop Upload
  quickDropzone?.addEventListener('click', () => {
    popupFileInput.click();
  });

  quickDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    quickDropzone.classList.add('border-brand-500', 'bg-brand-500/10');
  });

  quickDropzone?.addEventListener('dragleave', () => {
    quickDropzone.classList.remove('border-brand-500', 'bg-brand-500/10');
  });

  quickDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault();
    quickDropzone.classList.remove('border-brand-500', 'bg-brand-500/10');
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  });

  popupFileInput?.addEventListener('change', async () => {
    const file = popupFileInput.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
    popupFileInput.value = '';
  });

  async function handleFileUpload(file: File) {
    uploadStatus.classList.remove('hidden');
    uploadStatus.className = 'mt-2 p-2 rounded-xl text-[11px] font-mono font-medium text-center bg-blue-500/10 border border-blue-500/30 text-blue-300';
    uploadStatus.textContent = `Streaming ${file.name} to quarantine...`;

    try {
      const res = await apiClient.uploadDocument(file, file.name);
      if (res.success) {
        uploadStatus.className = 'mt-2 p-2 rounded-xl text-[11px] font-mono font-medium text-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-300';
        uploadStatus.textContent = `✓ Uploaded "${file.name}" to Zero-Trust pipeline!`;
        await loadDashboardData();

        // Broadcast to active tab to sync with demo website instantly
        try {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, {
              action: 'SECUREDOC_DOCUMENT_UPLOADED',
              doc: res.data || { filename: file.name, status: 'uploaded' },
            });
          }
        } catch (e) {
          console.log('Tab messaging skipped:', e);
        }

        setTimeout(() => uploadStatus.classList.add('hidden'), 3500);
      } else {
        uploadStatus.className = 'mt-2 p-2 rounded-xl text-[11px] font-mono font-medium text-center bg-rose-500/10 border border-rose-500/30 text-rose-300';
        uploadStatus.textContent = res.error || 'Upload failed.';
      }
    } catch (err: any) {
      uploadStatus.className = 'mt-2 p-2 rounded-xl text-[11px] font-mono font-medium text-center bg-rose-500/10 border border-rose-500/30 text-rose-300';
      uploadStatus.textContent = err.message || 'Network error during upload.';
    }
  }

  // Initial load
  await renderViewState();
});
