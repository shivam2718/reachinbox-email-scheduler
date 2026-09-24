import React, { useState, useRef } from 'react';

interface RecipientTagsProps {
  recipients: string[];
  onRecipientsChange: (recipients: string[]) => void;
  placeholder?: string;
  error?: string;
}

export const RecipientTags: React.FC<RecipientTagsProps> = ({
  recipients,
  onRecipientsChange,
  placeholder = 'Add recipients (email, comma-separated, or paste)',
  error,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showExpandedList, setShowExpandedList] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map((email) => email.trim())
      .filter((email) => email && isValidEmail(email));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const newEmails = parseEmails(inputValue);
    if (newEmails.length > 0) {
      const merged = Array.from(new Set([...recipients, ...newEmails]));
      onRecipientsChange(merged);
      setInputValue('');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const newEmails = parseEmails(pastedText);
    if (newEmails.length > 0) {
      const merged = Array.from(new Set([...recipients, ...newEmails]));
      onRecipientsChange(merged);
    }
    setInputValue('');
  };

  const removeRecipient = (email: string) => {
    onRecipientsChange(recipients.filter((r) => r !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const newEmails = parseEmails(inputValue);
      if (newEmails.length > 0) {
        const merged = Array.from(new Set([...recipients, ...newEmails]));
        onRecipientsChange(merged);
        setInputValue('');
      }
    }
  };

  const visibleRecipients = recipients.slice(0, 3);
  const hiddenCount = Math.max(0, recipients.length - 3);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleRecipients.map((recipient) => (
          <div
            key={recipient}
            className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
          >
            {recipient}
            <button
              onClick={() => removeRecipient(recipient)}
              className="text-slate-500 hover:text-slate-700 transition"
              type="button"
            >
              ✕
            </button>
          </div>
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowExpandedList(!showExpandedList)}
            className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm hover:bg-slate-200 transition"
            type="button"
          >
            +{hiddenCount} more
          </button>
        )}
      </div>

      {showExpandedList && hiddenCount > 0 && (
        <div className="max-h-40 overflow-y-auto bg-slate-50 rounded-lg p-2 border border-slate-200">
          {recipients.slice(3).map((recipient) => (
            <div
              key={recipient}
              className="flex items-center justify-between p-2 hover:bg-slate-100 rounded transition"
            >
              <span className="text-sm text-slate-700">{recipient}</span>
              <button
                onClick={() => removeRecipient(recipient)}
                className="text-slate-400 hover:text-red-600 transition"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
          error ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
        }`}
      />

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>✓ {recipients.length} recipient(s) added</span>
      </div>
    </div>
  );
};
