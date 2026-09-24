import React from "react";
import { StatusBadge } from "./Badge";
import { EmailItem } from "./EmailList";

interface EmailDetailProps {
  email: EmailItem;
  onBack: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

const formatFullDate = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sanitizeHtml = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerHTML;
};

export const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onBack,
  onArchive,
  onDelete,
}) => {
  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-3">
          <button onClick={onArchive} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="Archive">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9-4v4m0 0H8m4 0h4" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Subject</p>
              <p className="text-lg font-bold text-slate-900">{email.subject}</p>
            </div>
            <StatusBadge status={email.status as any} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">From</p>
              <p className="text-sm text-slate-700 break-all">{email.sender}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">To</p>
              <p className="text-sm text-slate-700 break-all">{email.recipient}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase mb-1">{email.status === "scheduled" ? "Scheduled for" : "Sent on"}</p>
            <p className="text-sm text-slate-700">
              {email.status === "scheduled" ? formatFullDate(email.scheduled_for) : formatFullDate(email.sent_at)}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200" />

        <div>
          <p className="text-xs text-slate-500 font-semibold uppercase mb-3">Message</p>
          <div className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-800 leading-relaxed max-h-96 overflow-y-auto email-body-content">
            <style>{`
              .email-body-content { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; }
              .email-body-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 12px 0; display: block; }
              .email-body-content p { margin: 8px 0; }
              .email-body-content ul, .email-body-content ol { margin: 8px 0 8px 20px; }
              .email-body-content li { margin: 4px 0; }
              .email-body-content strong { font-weight: 600; }
              .email-body-content em { font-style: italic; }
              .email-body-content u { text-decoration: underline; }
              .email-body-content blockquote { border-left: 4px solid #10b981; padding-left: 12px; margin: 12px 0; color: #6b7280; }
              .email-body-content code { background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
              .email-body-content a { color: #10b981; text-decoration: underline; }
            `}</style>
            {email.body ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body) }} />
            ) : (
              <p className="text-slate-400 italic">No message content</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button onClick={onArchive} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition font-medium text-sm">
            Archive
          </button>
          <button onClick={onDelete} className="flex-1 px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition font-medium text-sm">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
