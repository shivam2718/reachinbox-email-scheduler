import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import fs from "fs";
import { config } from "./config";
import { ensureDatabase, deleteEmail, getEmailById, updateUserProfilePicture } from "./db";
import { startWorker } from "./queue";
import authRouter from "./auth";

const app = express();
const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/uploads", express.static(uploadDir));

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  },
}));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);

app.post("/api/emails/schedule", async (req, res) => {
  const { to, subject, body, sender, scheduledFor, delayBetweenEmails, hourlyLimit } = req.body;

  if (!Array.isArray(to) || !to.length || !subject || !body || !scheduledFor) {
    return res.status(400).json({ message: "Invalid email payload." });
  }

  const validRecipients = to.filter((email) => typeof email === "string" && email.includes("@"));

  if (!validRecipients.length) {
    return res.status(400).json({ message: "No valid recipient emails found." });
  }

  const scheduledDate = new Date(scheduledFor);

  if (Number.isNaN(scheduledDate.getTime())) {
    return res.status(400).json({ message: "Invalid scheduled time." });
  }

  const finalSender = sender || config.defaultSender;
  const finalDelay = Number(delayBetweenEmails ?? config.defaultDelaySeconds);
  const finalLimit = Number(hourlyLimit ?? config.maxEmailsPerHour);

  try {
    const created = await Promise.all(validRecipients.map(async (recipient) => {
      const item = await import("./db.js").then((m) => m.insertEmail({
        sender: finalSender,
        recipient,
        subject,
        body,
        scheduledFor: scheduledDate,
        delayBetweenEmails: finalDelay,
        hourlyLimit: finalLimit,
      }));

      await import("./queue.js").then((m) => m.enqueueEmailJob(item.id, scheduledDate));
      return item;
    }));

    res.status(201).json({
      ok: true,
      total: created.length,
      emails: created,
    });
  } catch (error) {
    console.error("Error scheduling emails:", error);
    res.status(500).json({ message: "Failed to schedule emails." });
  }
});

app.delete("/api/emails/:id", async (req, res) => {
  try {
    const emailId = parseInt(req.params.id, 10);

    if (isNaN(emailId)) {
      return res.status(400).json({ message: "Invalid email ID." });
    }

    const email = await getEmailById(emailId);
    if (!email) {
      return res.status(404).json({ message: "Email not found." });
    }

    await deleteEmail(emailId);
    res.json({ success: true, message: "Email deleted successfully" });
  } catch (error) {
    console.error("Error deleting email:", error);
    res.status(500).json({ message: "Failed to delete email." });
  }
});

app.post("/api/profile/picture", async (req, res) => {
  try {
    const { email, imageData } = req.body;

    if (!email || !imageData) {
      return res.status(400).json({ message: "Email and image data required." });
    }

    const buffer = Buffer.from(imageData.split(",")[1], "base64");
    const fileName = `profile-${Date.now()}.png`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);
    const pictureUrl = `/uploads/${fileName}`;

    await updateUserProfilePicture(email, pictureUrl);

    res.json({ success: true, pictureUrl });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ message: "Failed to upload profile picture." });
  }
});

app.delete("/api/profile/picture", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required." });
    }

    await updateUserProfilePicture(email, "");
    res.json({ success: true, message: "Profile picture removed." });
  } catch (error) {
    console.error("Error removing profile picture:", error);
    res.status(500).json({ message: "Failed to remove profile picture." });
  }
});

app.get("/api/emails/scheduled", async (_req, res) => {
  const emails = await import("./db.js").then((m) => m.listEmails("scheduled"));
  res.json({ emails });
});

app.get("/api/emails/sent", async (_req, res) => {
  const emails = await import("./db.js").then((m) => m.listEmails("sent"));
  res.json({ emails });
});

app.get("/api/emails/failed", async (_req, res) => {
  const emails = await import("./db.js").then((m) => m.listEmails("failed"));
  res.json({ emails });
});

async function bootstrap() {
  await ensureDatabase();
  startWorker();
  app.listen(config.port, () => {
    console.log(`Backend running on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap backend", error);
  process.exit(1);
});
