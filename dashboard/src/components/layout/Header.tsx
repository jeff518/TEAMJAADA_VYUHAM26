import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Bell, Shield, LogOut, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    { id: 1, title: 'Document Quarantined', desc: 'DOC-2026-0983 requires senior sign-off (Bank change)', time: '10m ago', unread: true },
    { id: 2, title: 'Exploit Blocked', desc: 'Door 1 blocked Trojan payload DOC-2026-0984', time: '1h ago', unread: true },
    { id: 3, title: 'ClamAV Definitions Updated', desc: 'Signature database sync completed', time: '2h ago', unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Left: System Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>ZERO-TRUST PIPELINE ACTIVE</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
          <Shield size={14} className="text-brand-400" />
          <span>4 Doors Armed</span>
        </div>
      </div>

      {/* Right: Actions, Notifications, User */}
      <div className="flex items-center gap-4">
        {/* API Docs Link */}
        <a
          href="/api/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
          title="Open Swagger API Documentation"
        >
          <span>API Docs</span>
          <ExternalLink size={12} />
        </a>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-rose-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-850">
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Security Notifications</span>
                <span className="text-[11px] text-brand-400 font-mono">{unreadCount} New</span>
              </div>
              <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
                {notifications.map((item) => (
                  <div key={item.id} className="p-3 hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-start gap-2">
                      {item.unread ? (
                        <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-medium text-slate-200">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.desc}</p>
                        <span className="text-[10px] text-slate-500 mt-1 block">{item.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SD'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-none font-mono capitalize">{user?.role || 'admin'}</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-850">
                <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => logout()}
                  className="flex items-center w-full gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-medium"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
