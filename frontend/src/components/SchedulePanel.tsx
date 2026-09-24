import React, { useState } from "react";

interface SchedulePanelProps {
  startTime: string;
  onStartTimeChange: (time: string) => void;
  delayBetweenEmails: string;
  onDelayChange: (delay: string) => void;
  hourlyLimit: string;
  onHourlyLimitChange: (limit: string) => void;
  onCancel: () => void;
  onSendLater: () => void;
  isSending?: boolean;
}

export const SchedulePanel: React.FC<SchedulePanelProps> = ({
  startTime,
  onStartTimeChange,
  delayBetweenEmails,
  onDelayChange,
  hourlyLimit,
  onHourlyLimitChange,
  onCancel,
  onSendLater,
  isSending = false,
}) => {
  const [scheduleType, setScheduleType] = useState<"now" | "preset" | "custom">(
    "preset"
  );

  const getNextHour = (hour: number) => {
    const now = new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(hour, 0, 0, 0);
    return next.toISOString().slice(0, 16);
  };

  const getNextMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = (1 - day + 7) % 7 || 7;
    const next = new Date(now);
    next.setDate(next.getDate() + diff);
    next.setHours(9, 0, 0, 0);
    return next.toISOString().slice(0, 16);
  };

  const presetOptions = [
    { label: "Send Now", time: new Date().toISOString().slice(0, 16) },
    { label: "Tomorrow, 10:00 AM", time: getNextHour(10) },
    { label: "Tomorrow, 3:00 PM", time: getNextHour(15) },
    { label: "Tomorrow, 6:00 PM", time: getNextHour(18) },
    { label: "Next Monday, 9:00 AM", time: getNextMonday() },
  ];

  const handlePresetSelect = (time: string) => {
    onStartTimeChange(time);
    setScheduleType("preset");
  };

  return (
    <div className="w-full md:w-80 fixed bottom-0 md:bottom-auto md:right-0 md:top-16 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shadow-lg animate-slide-in-right md:rounded-none rounded-t-2xl h-[90vh] md:h-auto md:max-h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-900">Schedule Send</h2>
      </div>

      {/* Scroll Area - Now Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Quick Options */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-slate-600 mb-3">
            Quick Options
          </h3>
          {presetOptions.map((option) => (
            <label
              key={option.label}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition"
            >
              <input
                type="radio"
                name="schedule"
                checked={startTime === option.time && scheduleType === "preset"}
                onChange={() => handlePresetSelect(option.time)}
                className="w-4 h-4 accent-green-500"
              />
              <span className="text-sm text-slate-700">{option.label}</span>
            </label>
          ))}
        </div>

        {/* Custom Option */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition border border-slate-200">
            <input
              type="radio"
              name="schedule"
              checked={scheduleType === "custom"}
              onChange={() => setScheduleType("custom")}
              className="w-4 h-4 accent-green-500"
            />
            <span className="text-sm text-slate-700">Custom Date & Time</span>
          </label>

          {scheduleType === "custom" && (
            <div className="ml-7 space-y-2">
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200" />

        {/* Delivery Settings */}
        <div className="space-y-4 pb-4">
          <h3 className="text-xs font-semibold uppercase text-slate-600">
            Delivery Settings
          </h3>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
              Delay Between Sends
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="3600"
                value={delayBetweenEmails}
                onChange={(e) => onDelayChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-xs text-slate-500 whitespace-nowrap">
                sec
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Minimum seconds between each email
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
              Hourly Limit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="500"
                value={hourlyLimit}
                onChange={(e) => onHourlyLimitChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-xs text-slate-500 whitespace-nowrap">
                /hour
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Maximum emails to send per hour
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed at Bottom */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex gap-3 flex-shrink-0">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition font-medium text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onSendLater}
          disabled={isSending}
          className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSending ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sending...
            </>
          ) : (
            <>
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
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
              Send Later
            </>
          )}
        </button>
      </div>
    </div>
  );
};
