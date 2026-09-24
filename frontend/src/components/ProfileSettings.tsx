import React, { useState, useEffect } from "react";

interface ProfileSettingsProps {
  user: { id: string; name: string; email: string; picture?: string };
  onClose: () => void;
  onPictureUpdate: (pictureUrl: string) => void;
}

const STORAGE_KEY_PREFIX = "reachinbox-profile-pic-";

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user,
  onClose,
  onPictureUpdate,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const storageKey = `${STORAGE_KEY_PREFIX}${user.email}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setPreview(saved);
      }
    } catch (e) {
      console.error("Error loading from localStorage:", e);
    }
  }, [storageKey]);

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imageData = event.target?.result as string;
          setPreview(imageData);
          localStorage.setItem(storageKey, imageData);
          setSuccess("Profile picture updated successfully");
          onPictureUpdate(imageData);
          setUploading(false);
        } catch (e) {
          console.error("Error saving to localStorage:", e);
          setError("Storage quota exceeded or localStorage unavailable");
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read image file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Error uploading profile picture");
      setUploading(false);
    }
  };

  const handleRemoveProfilePicture = () => {
    try {
      localStorage.removeItem(storageKey);
      setPreview("");
      setSuccess("Profile picture removed");
      onPictureUpdate("");
    } catch (err) {
      setError("Error removing profile picture");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-sm w-full shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Profile Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Profile Picture</label>

            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img src={preview} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-green-200" />
                <button onClick={handleRemoveProfilePicture} disabled={uploading} className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50" type="button">
                  Remove Picture
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}

            <label className="block cursor-pointer">
              <input type="file" accept="image/*" onChange={handleProfilePictureUpload} disabled={uploading} className="hidden" />
              <span className="inline-block w-full px-4 py-2 rounded-lg border border-slate-300 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition disabled:opacity-50">
                {uploading ? "Uploading..." : "Upload New Picture"}
              </span>
            </label>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-200">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-600">Name</p>
              <p className="text-sm text-slate-700">{user.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-600">Email</p>
              <p className="text-sm text-slate-700">{user.email}</p>
            </div>
          </div>

          {error && <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">{error}</div>}
          {success && <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-xs text-green-700">{success}</div>}
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition font-medium text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
