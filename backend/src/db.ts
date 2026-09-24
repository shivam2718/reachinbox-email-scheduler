import { Pool } from "pg";
import { config } from "./config";

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export type EmailStatus = "scheduled" | "processing" | "sent" | "failed";

export type EmailRow = {
  id: number;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduled_for: Date;
  status: EmailStatus;
  sent_at: Date | null;
  created_at: Date;
  delay_between_emails: number;
  hourly_limit: number;
};

export async function ensureDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id SERIAL PRIMARY KEY,
      sender VARCHAR(255) NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      delay_between_emails INTEGER NOT NULL DEFAULT 2,
      hourly_limit INTEGER NOT NULL DEFAULT 50
    );
  `);

  await pool.query(`
    ALTER TABLE emails
      DROP CONSTRAINT IF EXISTS emails_status_check;
  `);

  await pool.query(`
    ALTER TABLE emails
      ADD CONSTRAINT emails_status_check
      CHECK (status IN ('scheduled', 'processing', 'sent', 'failed'))
      NOT VALID;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_emails_status_scheduled
    ON emails(status, scheduled_for);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_attachments_email_id
    ON attachments(email_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      picture_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function insertEmail(input: {
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledFor: Date;
  delayBetweenEmails: number;
  hourlyLimit: number;
}) {
  const result = await pool.query(
    `INSERT INTO emails (sender, recipient, subject, body, scheduled_for, delay_between_emails, hourly_limit, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled') RETURNING *;`,
    [input.sender, input.recipient, input.subject, input.body, input.scheduledFor, input.delayBetweenEmails, input.hourlyLimit]
  );

  return result.rows[0] as EmailRow;
}

export async function getEmailById(id: number) {
  const result = await pool.query("SELECT * FROM emails WHERE id = $1", [id]);
  return result.rows[0] as EmailRow | undefined;
}

export async function deleteEmail(id: number) {
  const result = await pool.query("DELETE FROM emails WHERE id = $1 RETURNING *;", [id]);
  return result.rows[0] as EmailRow | undefined;
}

export async function updateEmailStatus(id: number, status: EmailStatus, sentAt?: Date) {
  const result = await pool.query(
    `UPDATE emails SET status = $1, sent_at = COALESCE($2, sent_at) WHERE id = $3 RETURNING *;`,
    [status, sentAt ?? null, id]
  );

  return result.rows[0] as EmailRow | undefined;
}

export async function updateScheduledFor(id: number, scheduledFor: Date) {
  const result = await pool.query(
    "UPDATE emails SET scheduled_for = $1, status = $2 WHERE id = $3 RETURNING *;",
    [scheduledFor, "scheduled", id]
  );

  return result.rows[0] as EmailRow | undefined;
}

export async function listEmails(status: "scheduled" | "sent" | "failed") {
  const result = await pool.query(
    "SELECT * FROM emails WHERE status = $1 ORDER BY scheduled_for DESC, created_at DESC",
    [status]
  );

  return result.rows as EmailRow[];
}

export async function updateUserProfilePicture(email: string, pictureUrl: string) {
  const result = await pool.query(
    "UPDATE users SET picture_url = $1 WHERE email = $2 RETURNING *;",
    [pictureUrl, email]
  );
  return result.rows[0];
}
