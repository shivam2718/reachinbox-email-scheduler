import React from "react";
import { RichTextEditor } from "./RichTextEditor";
import { RecipientTags } from "./RecipientTags";
import { Attachments, Attachment } from "./Attachments";

interface ComposeFormProps {
  form: {
    subject: string;
    body: string;
    recipients: string[];
    startTime: string;
    delayBetweenEmails: string;
    hourlyLimit: string;
    senderEmail: string;
  };
  onFormChange: (form: any) => void;
  onCsvUpload: (file: File) => Promise<void>;
  onBack: () => void;
  validEmails: number;
}

export const ComposeForm: React.FC<ComposeFormProps> = ({
  form,
  onFormChange,
  onCsvUpload,
  onBack,
  validEmails,
}) => {
  const [csvError, setCsvError] = React.useState("");
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCsvError("");
      const text = await file.text();
      const emails = text
        .split(/[\n,;]+/)
        .map((email) => email.trim())
        .filter((email) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

      if (emails.length === 0) {
        setCsvError("No valid email addresses found in the file.");
        return;
      }

      const merged = Array.from(new Set([...form.recipients, ...emails]));
      onFormChange({ ...form, recipients: merged });
    } catch (error) {
      setCsvError("Failed to read the file. Please try again.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-xl font-bold text-slate-900">Compose New Email</h2>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition" title="Close">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">From</label>
            <input
              type="email"
              value={form.senderEmail}
              onChange={(e) => onFormChange({ ...form, senderEmail: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="your-email@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">Recipients *</label>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload CSV
                <input type="file" accept=".csv,text/csv,text/plain" onChange={handleCsvFile} className="hidden" />
              </label>
            </div>
            <RecipientTags
              recipients={form.recipients}
              onRecipientsChange={(recipients) => onFormChange({ ...form, recipients })}
              error={form.recipients.length === 0 ? "At least one recipient is required" : ""}
            />
            {csvError && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><span>?</span>{csvError}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => onFormChange({ ...form, subject: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Email subject"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Body *</label>
            <RichTextEditor value={form.body} onChange={(value) => onFormChange({ ...form, body: value })} placeholder="Type your reply..." />
          </div>

          <Attachments attachments={attachments} onAttachmentsChange={setAttachments} />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Delay (sec) *</label>
              <input
                type="number"
                min="1"
                value={form.delayBetweenEmails}
                onChange={(e) => onFormChange({ ...form, delayBetweenEmails: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Min between sends</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Hourly Limit *</label>
              <input
                type="number"
                min="1"
                value={form.hourlyLimit}
                onChange={(e) => onFormChange({ ...form, hourlyLimit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Max per hour</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time *</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => onFormChange({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700">
            <p className="font-semibold">Summary</p>
            <p className="text-xs mt-1">
              {validEmails} recipient{validEmails !== 1 ? "s" : ""} • Starting {new Date(form.startTime).toLocaleString()}
              {attachments.length > 0 && ` • ${attachments.length} file(s)`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
