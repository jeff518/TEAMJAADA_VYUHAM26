/**
 * SecureDoc Pipeline - Background Service Worker (Manifest V3)
 */

import {
  MESSAGE_ACTIONS,
  SUPPORTED_FILE_EXTENSIONS,
  DEFAULT_SETTINGS,
} from '../shared/constants';
import { getSettings, isAuthenticated } from '../shared/auth';
import { apiClient } from '../shared/api-client';
import { ExtensionMessage } from '../shared/types';

const CONTEXT_MENU_SCAN_PAGE = 'securedoc_scan_page';
const CONTEXT_MENU_SCAN_LINK = 'securedoc_scan_link';
const CONTEXT_MENU_OPEN_PANEL = 'securedoc_open_panel';
const ALARM_POLL_STATUS = 'securedoc_poll_status';

/**
 * Initialize Extension on Installation or Update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('SecureDoc Pipeline extension installed/updated:', details.reason);

  // Initialize default settings if not set
  const current = await chrome.storage.local.get(['securedoc_user_settings']);
  if (!current.securedoc_user_settings) {
    await chrome.storage.local.set({ securedoc_user_settings: DEFAULT_SETTINGS });
  }

  // Create Context Menus
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_SCAN_LINK,
      title: 'Scan Link with SecureDoc',
      contexts: ['link'],
    });

    chrome.contextMenus.create({
      id: CONTEXT_MENU_SCAN_PAGE,
      title: 'Scan Document from Current Page',
      contexts: ['page', 'selection', 'image'],
    });

    chrome.contextMenus.create({
      id: CONTEXT_MENU_OPEN_PANEL,
      title: 'Open SecureDoc Control Panel',
      contexts: ['action'],
    });
  });

  // Setup periodic background polling alarm (every 1 minute)
  chrome.alarms.create(ALARM_POLL_STATUS, { periodInMinutes: 1 });

  // Initial badge update
  await updatePendingBadge();
});

/**
 * Handle Context Menu Clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === CONTEXT_MENU_OPEN_PANEL) {
    try {
      if (tab.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
    } catch (err) {
      console.error('Failed to open side panel:', err);
    }
    return;
  }

  if (info.menuItemId === CONTEXT_MENU_SCAN_LINK && info.linkUrl) {
    // Notify content script or fetch URL to scan
    showSystemNotification(
      'Document Intake Initiated',
      `Fetching link: ${info.linkUrl.substring(0, 50)}...`
    );

    try {
      chrome.tabs.sendMessage(tab.id, {
        action: MESSAGE_ACTIONS.INTERCEPTED_FILE,
        payload: {
          url: info.linkUrl,
          source: 'context-menu-link',
        },
      });
    } catch (err) {
      console.warn('Could not message content script in active tab', err);
    }
  }

  if (info.menuItemId === CONTEXT_MENU_SCAN_PAGE) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'SCAN_CURRENT_PAGE_PROMPT',
      payload: {
        pageUrl: tab.url,
        selection: info.selectionText,
      },
    });
  }
});

/**
 * Monitor Browser Downloads
 */
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  try {
    const settings = await getSettings();
    if (!settings.interceptDownloads) {
      return;
    }

    const filename = downloadItem.filename || downloadItem.url.split('/').pop() || '';
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    if (SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
      showSystemNotification(
        'Document Download Detected',
        `SecureDoc is monitoring: ${filename}. Click to inspect in pipeline.`,
        'securedoc_download_' + downloadItem.id
      );

      // Notify content script in current active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          action: MESSAGE_ACTIONS.INTERCEPTED_FILE,
          payload: {
            filename,
            url: downloadItem.url,
            downloadId: downloadItem.id,
            fileSize: downloadItem.fileSize,
            mime: downloadItem.mime,
          },
        });
      }
    }
  } catch (err) {
    console.error('Error handling download interception:', err);
  }
});

/**
 * Handle notification clicks
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith('securedoc_')) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.windowId) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (err) {
        console.error('Failed to open side panel from notification click:', err);
      }
    }
  }
});

/**
 * Background Alarm Handler for periodic polling
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_POLL_STATUS) {
    await updatePendingBadge();
  }
});

/**
 * Message Handler for communication between Content Script, Popup, Side Panel
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage<any>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    handleIncomingMessage(message, sender)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    // Keep sendResponse active for async responses
    return true;
  }
);

/**
 * Process incoming extension messages
 */
async function handleIncomingMessage(
  message: ExtensionMessage<any>,
  sender: chrome.runtime.MessageSender
): Promise<any> {
  switch (message.action) {
    case MESSAGE_ACTIONS.CHECK_AUTH: {
      const authed = await isAuthenticated();
      return { success: true, authenticated: authed };
    }

    case MESSAGE_ACTIONS.OPEN_SIDEPANEL: {
      let windowId = sender.tab?.windowId;
      if (!windowId) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        windowId = activeTab?.windowId;
      }
      if (windowId) {
        await chrome.sidePanel.open({ windowId });
        return { success: true };
      }
      return { success: false, error: 'No active window found' };
    }

    case MESSAGE_ACTIONS.UPLOAD_DOCUMENT: {
      const { fileBase64, filename, mimeType, metadata } = message.payload || {};
      if (!fileBase64 || !filename) {
        throw new Error('Missing file payload for upload');
      }

      // Convert base64 data to Blob
      const blob = base64ToBlob(fileBase64, mimeType || 'application/octet-stream');
      const uploadRes = await apiClient.uploadDocument(blob, filename, metadata);

      if (uploadRes.success && uploadRes.data) {
        showSystemNotification(
          'Document Uploaded to SecureDoc',
          `"${filename}" intake started. Multi-stage security pipeline running.`
        );
        await updatePendingBadge();
      }

      return uploadRes;
    }

    case MESSAGE_ACTIONS.UPDATE_BADGE: {
      await updatePendingBadge();
      return { success: true };
    }

    case MESSAGE_ACTIONS.SHOW_NOTIFICATION: {
      const { title, body } = message.payload || {};
      showSystemNotification(title || 'SecureDoc Pipeline', body || '');
      return { success: true };
    }

    default:
      return { success: true, message: 'Message received' };
  }
}

/**
 * Update Extension Icon Badge with Pending Approvals / Documents count
 */
async function updatePendingBadge(): Promise<void> {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }

    const res = await apiClient.getDocuments({ status: 'PENDING_APPROVAL', limit: 50 });
    if (res.success && Array.isArray(res.data)) {
      const count = res.data.length;
      if (count > 0) {
        await chrome.action.setBadgeText({ text: count > 99 ? '99+' : count.toString() });
        await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red badge for attention
      } else {
        await chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (err) {
    // If backend unreachable or error, clear or leave badge
    console.debug('Badge update skipped:', err);
  }
}

/**
 * Helper to display desktop system notifications
 */
function showSystemNotification(
  title: string,
  message: string,
  id = 'securedoc_' + Date.now()
): void {
  try {
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'assets/icons/icon128.png',
      title,
      message,
      priority: 2,
    });
  } catch (err) {
    console.error('Notification error:', err);
  }
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(pureBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
