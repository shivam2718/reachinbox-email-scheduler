import { useEffect, useState } from "react";
import { Header, Sidebar, EmailList, EmailDetail, ComposeForm, SchedulePanel, type EmailItem } from "./components";

type User = { id: string; name: string; email: string; picture?: string };

const API_BASE = "http://localhost:4000/api";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<"scheduled" | "sent" | "failed">("scheduled");
  const [scheduled, setScheduled] = useState<EmailItem[]>([]);
  const [sent, setSent] = useState<EmailItem[]>([]);
  const [failed, setFailed] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getDefaultStartTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 2);
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    subject: "",
    body: "",
    recipients: [] as string[],
    startTime: getDefaultStartTime(),
    delayBetweenEmails: "2",
    hourlyLimit: "50",
    senderEmail: user?.email || "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchMe = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (!response.ok) return;
      const data = await response.json();
      setUser(data.user);
      setForm((prev) => ({ ...prev, senderEmail: data.user.email }));
    } catch {
      setUser(null);
    }
  };

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const [scheduledRes, sentRes, failedRes] = await Promise.all([
        fetch(`${API_BASE}/emails/scheduled`),
        fetch(`${API_BASE}/emails/sent`),
        fetch(`${API_BASE}/emails/failed`),
      ]);

      const scheduledData = await scheduledRes.json();
      const sentData = await sentRes.json();
      const failedData = await failedRes.json();
      setScheduled(scheduledData.emails || []);
      setSent(sentData.emails || []);
      setFailed(failedData.emails || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    fetchEmails();
  }, []);

  useEffect(() => {
    if (window.location.search.includes("auth=success")) {
      fetchMe();
      fetchEmails();
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
  };

  const handleDeleteEmail = async () => {
    if (!selectedEmail) return;

    try {
      const response = await fetch(`${API_BASE}/emails/${selectedEmail.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Failed to delete email");
        return;
      }

      setSuccess("Email deleted successfully");
      setSelectedEmail(null);
      setShowDeleteConfirm(false);
      setTimeout(() => fetchEmails(), 300);
    } catch {
      setError("Error deleting email");
    }
  };

  const handleSchedule = async () => {
    setError("");
    setSuccess("");

    const validRecipients = form.recipients.filter((email) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );

    const trimmedSubject = form.subject.trim();
    const trimmedBody = form.body.trim();
    const validStartTime =
      form.startTime && !Number.isNaN(new Date(form.startTime).getTime());
    const senderEmail = form.senderEmail?.trim();

    if (
      !trimmedSubject ||
      !trimmedBody ||
      !validStartTime ||
      validRecipients.length === 0 ||
      !senderEmail
    ) {
      setError(
        "Please fill in all required fields: subject, body, at least one valid email, sender, and start time."
      );
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE}/emails/schedule`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: validRecipients,
          subject: trimmedSubject,
          body: trimmedBody,
          sender: senderEmail,
          scheduledFor: new Date(form.startTime).toISOString(),
          delayBetweenEmails: Number(form.delayBetweenEmails),
          hourlyLimit: Number(form.hourlyLimit),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Scheduling failed.");
        return;
      }

      setSuccess(`Scheduled ${data.total} email${data.total > 1 ? "s" : ""}.`);
      setForm({
        subject: "",
        body: "",
        recipients: [],
        startTime: getDefaultStartTime(),
        delayBetweenEmails: "2",
        hourlyLimit: "50",
        senderEmail: user?.email || "",
      });
      setComposeOpen(false);
      setTimeout(() => fetchEmails(), 500);
    } catch {
      setError("Something went wrong while scheduling the email.");
    } finally {
      setIsSending(false);
    }
  };

  const validEmails = form.recipients.filter((email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ).length;

  const currentEmails = tab === "scheduled" ? scheduled : tab === "sent" ? sent : failed;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-slate-200">
          <div className="mb-6">
            <div className="text-3xl font-bold text-slate-900">ReachInbox</div>
            <p className="mt-2 text-sm text-slate-600">Email scheduler dashboard</p>
          </div>
          <button
            onClick={handleGoogleLogin}
            className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-white font-semibold hover:shadow-lg transition"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          user={user}
          currentTab={tab}
          onTabChange={setTab}
          onCompose={() => {
            setComposeOpen(true);
            setSelectedEmail(null);
            setError("");
            setSuccess("");
          }}
          onLogout={handleLogout}
          counts={{
            scheduled: scheduled.length,
            sent: sent.length,
            failed: failed.length,
          }}
        />

        <main className="flex-1 lg:ml-60 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white border-b border-slate-200 px-6 py-4">
              {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {composeOpen ? (
                <ComposeForm
                  form={form}
                  onFormChange={setForm}
                  onCsvUpload={async () => {}}
                  onBack={() => {
                    setComposeOpen(false);
                    setSelectedEmail(null);
                  }}
                  validEmails={validEmails}
                />
              ) : selectedEmail ? (
                <>
                  {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Email?</h3>
                        <p className="text-sm text-slate-600 mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteEmail}
                            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <EmailDetail
                    email={selectedEmail}
                    onBack={() => setSelectedEmail(null)}
                    onArchive={() => setSelectedEmail(null)}
                    onDelete={() => setShowDeleteConfirm(true)}
                  />
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 capitalize">
                      {tab} Emails
                    </h2>
                    <span className="text-sm text-slate-500">
                      {currentEmails.length} total
                    </span>
                  </div>
                  <EmailList
                    emails={currentEmails}
                    currentTab={tab}
                    onEmailClick={(email) => setSelectedEmail(email)}
                    isLoading={loading}
                  />
                </div>
              )}
            </div>
          </div>

          {composeOpen && (
            <div className="fixed inset-0 md:static md:w-80 bg-black/50 md:bg-white md:border-l border-slate-200 z-40 md:z-auto md:flex md:flex-col">
              <SchedulePanel
                startTime={form.startTime}
                onStartTimeChange={(time) => setForm({ ...form, startTime: time })}
                delayBetweenEmails={form.delayBetweenEmails}
                onDelayChange={(delay) =>
                  setForm({ ...form, delayBetweenEmails: delay })
                }
                hourlyLimit={form.hourlyLimit}
                onHourlyLimitChange={(limit) =>
                  setForm({ ...form, hourlyLimit: limit })
                }
                onCancel={() => {
                  setComposeOpen(false);
                  setForm({
                    subject: "",
                    body: "",
                    recipients: [],
                    startTime: getDefaultStartTime(),
                    delayBetweenEmails: "2",
                    hourlyLimit: "50",
                    senderEmail: user?.email || "",
                  });
                }}
                onSendLater={handleSchedule}
                isSending={isSending}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
