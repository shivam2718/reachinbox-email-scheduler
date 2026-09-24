import React, { useState, useEffect } from "react";
import { Avatar } from "./Avatar";
import { ProfileSettings } from "./ProfileSettings";

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  } | null;
  currentTab: "scheduled" | "sent" | "failed";
  onTabChange: (tab: "scheduled" | "sent" | "failed") => void;
  onCompose: () => void;
  onLogout: () => void;
  counts: { scheduled: number; sent: number; failed: number };
}

const STORAGE_KEY_PREFIX = "reachinbox-profile-pic-";

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentTab,
  onTabChange,
  onCompose,
  onLogout,
  counts,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [userPicture, setUserPicture] = useState<string>("");

  // Load picture from localStorage when user email changes
  useEffect(() => {
    if (user?.email) {
      try {
        const storageKey = `${STORAGE_KEY_PREFIX}${user.email}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setUserPicture(saved);
        } else {
          setUserPicture("");
        }
      } catch (e) {
        console.error("Error loading from localStorage:", e);
      }
    }
  }, [user?.email]);

  const navItems = [
    {
      id: "scheduled",
      label: "Scheduled",
      count: counts.scheduled,
    },
    { id: "sent", label: "Sent", count: counts.sent },
    { id: "failed", label: "Failed", count: counts.failed },
  ] as const;

  if (!user) return null;

  const handlePictureUpdate = (url: string) => {
    setUserPicture(url);
  };

  return (
    <>
      <aside className="hidden lg:flex w-60 fixed left-0 top-16 bottom-0 bg-white border-r border-slate-200 flex-col shadow-sm">
        {/* User Profile Section */}
        <div className="p-4 border-b border-slate-200">
          <div
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer relative"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Avatar name={user.name || "User"} src={userPicture} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {user.name}
              </div>
              <div className="text-xs text-slate-600 truncate">
                {user.email}
              </div>
            </div>
            <svg
              className="w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileSettings(true);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-200"
                >
                  Profile Settings
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-200">
                  Billing
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-200">
                  Help & Support
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Compose Button */}
        <div className="px-3 py-4">
          <button
            onClick={() => {
              setShowDropdown(false);
              onCompose();
            }}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            Compose
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-2 py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full text-left px-4 py-2.5 rounded-lg mb-1 flex items-center justify-between font-medium transition ${
                currentTab === item.id
                  ? "bg-green-50 text-green-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{item.label}</span>
              {item.count > 0 && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    item.id === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer Links */}
        <div className="border-t border-slate-200 p-4 text-xs text-center text-slate-500 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <button className="hover:text-slate-700 transition">
              Settings
            </button>
            <span>•</span>
            <button className="hover:text-slate-700 transition">Help</button>
            <span>•</span>
            <button className="hover:text-slate-700 transition">Privacy</button>
          </div>
        </div>
      </aside>

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <ProfileSettings
          user={user}
          onClose={() => setShowProfileSettings(false)}
          onPictureUpdate={handlePictureUpdate}
        />
      )}
    </>
  );
};
