import React, { useState } from "react";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string;
}

interface AttachmentsProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}

export const Attachments: React.FC<AttachmentsProps> = ({
  attachments,
  onAttachmentsChange,
}) => {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const newAttachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        await new Promise((resolve) => {
          reader.onload = (event) => {
            const data = event.target?.result as string;
            newAttachments.push({
              id: `${Date.now()}-${i}`,
              name: file.name,
              size: file.size,
              type: file.type,
              data,
            });
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      }

      onAttachmentsChange([...attachments, ...newAttachments]);
    } catch (error) {
      console.error("Error reading files:", error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "???";
    if (type === "application/pdf") return "??";
    if (type.includes("word") || type.includes("document")) return "??";
    if (type.includes("sheet") || type.includes("excel")) return "??";
    return "??";
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        Attachments
      </label>

      <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 transition">
        <svg
          className="w-5 h-5 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span className="text-sm text-slate-600">
          {uploading ? "Uploading..." : "Click to add files"}
        </span>
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {attachments.length > 0 && (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{getFileIcon(attachment.type)}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="text-red-500 hover:text-red-700 flex-shrink-0"
                type="button"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
