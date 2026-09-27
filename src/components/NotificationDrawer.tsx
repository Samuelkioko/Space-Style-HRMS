import React from 'react';
import { X, Bell, CheckCheck, TrendingUp, AlertCircle, Info, Sparkles } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="notification-drawer"
        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-[#c4c5d5]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#00288e]" />
            <h3 className="font-sans text-lg font-bold text-[#191c1e]">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-[11px] font-mono text-[#00288e] hover:underline flex items-center gap-1 font-semibold"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
            <button
              onClick={onClose}
              className="text-[#64748b] hover:text-[#191c1e] p-1 rounded hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#e2e8f0] p-4 space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3.5 rounded-lg border transition-all ${
                notif.read
                  ? 'bg-white border-[#e2e8f0] opacity-80'
                  : 'bg-blue-50/40 border-blue-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {notif.type === 'success' && <TrendingUp className="w-4 h-4 text-[#006d30]" />}
                  {notif.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                  {notif.type === 'info' && <Info className="w-4 h-4 text-[#00288e]" />}
                  {notif.type === 'alert' && <AlertCircle className="w-4 h-4 text-[#ba1a1a]" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-sans text-sm font-bold text-[#191c1e]">{notif.title}</h4>
                    <span className="font-mono text-[10px] text-[#64748b] whitespace-nowrap ml-2">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[#475569] mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="py-16 text-center text-[#64748b] font-mono text-xs">
              No notifications at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
