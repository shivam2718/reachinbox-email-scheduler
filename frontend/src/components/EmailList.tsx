import React from "react";
import { StatusBadge } from "./Badge";

export interface EmailItem {
  id: number;
  recipient: string;
  subject: string;
  scheduled_for: string;
  status: "sent" | "scheduled" | "failed" | "processing";
  sender: string;
  sent_at?: string | null;
  body?: string;
}

interface EmailListProps {
  emails: EmailItem[];
  currentTab: "scheduled" | "sent" | "failed";
  onEmailClick?: (email: EmailItem) => void;
  isLoading?: boolean;
}

const formatTime = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

const stripHtmlTags = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

const truncateText = (text: string, length: number = 100) => {
  const plainText = stripHtmlTags(text);
  return plainText.length > length ? plainText.substring(0, length) + "..." : plainText;
};

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  currentTab,
  onEmailClick,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">??</div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No {currentTab} emails yet</h3>
        <p className="text-slate-500">
          {currentTab === "scheduled"
            ? "Start composing to schedule your first email!"
            : `You haven'"'"'t ${currentTab} any emails yet.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => onEmailClick?.(email)}
          className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 pt-1">
              <StatusBadge
                status={
                  email.status === "sent"
                    ? "sent"
                    : email.status === "scheduled"
                      ? "scheduled"
                      : email.status === "failed"
                        ? "failed"
                        : "processing"
                }
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900 truncate">{email.recipient}</h3>
                <span className="text-xs text-slate-500 ml-4 flex-shrink-0">
                  {currentTab === "scheduled"
                    ? formatTime(email.scheduled_for)
                    : formatTime(email.sent_at)}
                </span>
              </div>

              <p className="text-sm font-medium text-slate-700 truncate mb-1">{email.subject}</p>

              {email.body && (
                <p className="text-xs text-slate-500 truncate">{truncateText(email.body, 100)}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
