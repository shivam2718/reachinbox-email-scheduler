# Reachinbox Email Scheduler

A full-stack email scheduling application with persistence, rate limiting, and concurrent email delivery. Built with **Express**, **React**, **PostgreSQL**, **Redis**, and **BullMQ**.

## Features

### ✅ Core Features Implemented

**Backend:**
- ✅ **Job Scheduling** - Schedule emails for future delivery via BullMQ queue
- ✅ **Persistence on Restart** - Past-scheduled emails automatically re-queue on server restart
- ✅ **Per-Sender Rate Limiting** - Enforce hourly email limits per sender (default: 50/hour)
- ✅ **Delay Between Sends** - Configurable delay between consecutive emails (default: 2 seconds)
- ✅ **Concurrent Processing** - Multi-worker support with configurable concurrency (default: 2)
- ✅ **Idempotent Sends** - Prevents duplicate sends via status-based atomic operations
- ✅ **Google OAuth Login** - Secure authentication with profile picture storage
- ✅ **Email Status Tracking** - Scheduled → Processing → Sent/Failed lifecycle

**Frontend:**
- ✅ **Google OAuth Integration** - Login with Google account
- ✅ **Dashboard** - View scheduled, sent, and failed emails
- ✅ **Compose Form** - Create bulk email campaigns with recipient tags
- ✅ **Schedule Panel** - Configure start time, delay, and hourly limits
- ✅ **Email Details** - View individual email content and metadata
- ✅ **Profile Settings** - Upload and manage profile picture
- ✅ **Real-time Status** - Live updates of email states
- ✅ **Delete Operations** - Remove individual or all emails in a category

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Compose Form → Schedule Panel → Dashboard               │  │
│  │ (Recipients, Subject, Body) (Time, Delay, Limit) (Tables)│  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP REST API
┌────────────────────────▼────────────────────────────────────────┐
│                    BACKEND (Express)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /api/emails/schedule                                │  │
│  │ → Validate recipients & payload                          │  │
│  │ → Insert emails into PostgreSQL (status: 'scheduled')   │  │
│  │ → Enqueue jobs into BullMQ with delays                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    ┌────────┐      ┌────────┐      ┌─────────┐
    │PostgreSQL│     │  Redis  │      │ SMTP    │
    │(Emails)│      │(Queue)  │      │(Ethereal)
    └────────┘      └────────┘      └─────────┘
                         │
        ┌────────────────▼────────────────┐
        │   BullMQ Worker (1-N workers)   │
        │  ┌──────────────────────────┐   │
        │  │ Job Processor            │   │
        │  │ 1. Check status          │   │
        │  │ 2. Enforce delay         │   │
        │  │ 3. Check hourly limit    │   │
        │  │ 4. Send via SMTP         │   │
        │  │ 5. Update DB status      │   │
        │  └──────────────────────────┘   │
        └─────────────────────────────────┘
```

### How Scheduling Works

1. **User submits form** (Frontend)
   - Recipients, subject, body, start time, delay, hourly limit

2. **Backend validation** (Express)
   - Validates email format and payload
   - Creates one database record per recipient
   - Each email starts with status `'scheduled'`

3. **Job enqueuing** (BullMQ)
   - Calculate delay: `Math.max(0, scheduledFor - now)`
   - Add job to queue with delay: `emailQueue.add({ emailId }, { delay })`
   - Jobs remain in queue until their delay expires

4. **Worker processing** (BullMQ Worker)
   - Wait until `scheduled_for` time arrives
   - Mark email as `'processing'` (atomic operation)
   - Check **sender delay**: Is last send recent? → Re-queue if yes
   - Check **hourly limit**: Has sender hit quota this hour? → Re-queue if yes
   - Send email via SMTP
   - Update Redis counters (hourly bucket + sender delay key)
   - Mark email as `'sent'` in database

5. **Rate limit tracking** (Redis)
   - **Sender delay key**: `sender:{email}:last-send` → Timestamp of last send
   - **Hourly bucket**: `sender:{email}:hour:{hour}` → Count of sends this hour
   - Keys expire automatically (hourly bucket after 1 hour)

### Persistence on Restart

**Problem:** If the server restarts while emails are pending, how do we ensure they still send?

**Solution:** On startup, the backend:

1. Calls `queuePastScheduledEmails()` during bootstrap
2. Queries all emails where `status = 'scheduled'` AND `scheduled_for <= NOW()`
3. For each email, checks if it's already in the queue via `emailQueue.getJob(jobId)`
4. **Only queues emails that aren't already in the queue** (avoids duplicates)
5. Respects each email's individual delay and hourly limit settings
6. Re-queued emails continue processing as if the server never stopped

**Why it works:**
- Database is source of truth for email state
- Queue state is ephemeral (lost on restart)
- On restart, we reconstruct queue state from database
- Atomic status updates prevent duplicate sends (idempotency)

### Rate Limiting & Concurrency

#### Rate Limiting (Per Sender, Per Hour)

```typescript
// Check hourly limit
const hourBucket = getSenderHourBucketKey(email.sender, now);
const count = await redis.get(hourBucket);

if (count >= email.hourly_limit) {
  // Re-queue to next hour
  await job.moveToDelayed(nextHour);
  return;
}

// After send, increment counter
await redis.incr(hourBucket);
await redis.expire(hourBucket, 3600); // Expire after 1 hour
```

**Key points:**
- Limits are per **sender**, not global
- Hour boundary is based on current time in milliseconds
- Counter expires automatically after 1 hour
- Emails that exceed limit are moved to next hour

#### Delay Between Sends (Per Sender)

```typescript
// Check minimum delay
const senderDelayKey = getSenderDelayKey(email.sender);
const lastSendAt = await redis.get(senderDelayKey);

const minimumDelayMs = email.delay_between_emails * 1000;

if (lastSendAt && now < lastSendAt + minimumDelayMs) {
  // Re-queue after delay
  await job.moveToDelayed(lastSendAt + minimumDelayMs);
  return;
}

// After send, update timestamp
await redis.set(senderDelayKey, String(Date.now()));
```

**Key points:**
- Delay is between **consecutive sends from the same sender**
- Timestamps stored in Redis (ephemeral, no expiry needed)
- Violating emails are re-queued dynamically

#### Concurrency Control

```typescript
const worker = new Worker('email-scheduler', processor, {
  connection: redis,
  concurrency: config.workerConcurrency, // Default: 2
  limiter: {
    max: 1,
    duration: delaySeconds * 1000,
  },
});
```

**Key points:**
- Multiple workers can run in parallel (horizontal scaling)
- Each worker processes jobs independently
- Concurrency limit per worker: configurable
- BullMQ ensures atomic job claims (no duplicate processing)

---

## Setup & Installation

### Prerequisites

- **Node.js** 18+ and **npm**
- **PostgreSQL** 12+
- **Redis** 6+
- **Git**

### 1. Clone Repository

```bash
git clone <repository-url>
cd reachinbox-email-scheduler
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd backend
npm install
```

#### Create `.env` File

Create `backend/.env`:

```env
# Server
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://reachinbox:reachinbox@localhost:5432/reachinbox

# Redis
REDIS_URL=redis://localhost:6379

# SMTP (Ethereal Email for testing)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-email@ethereal.email
SMTP_PASS=your-ethereal-password
SMTP_SECURE=false

# Email Configuration
DEFAULT_SENDER=your-email@example.com
DEFAULT_DELAY_SECONDS=2
MAX_EMAILS_PER_HOUR=50
WORKER_CONCURRENCY=2

# Session
SESSION_SECRET=your-random-session-secret-key-here

# Google OAuth (optional for login feature)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/callback
```

#### Setup PostgreSQL & Redis

**Option A: Using Docker Compose** (Recommended)

```bash
cd .. # Go back to root directory
docker-compose up -d
```

This starts PostgreSQL and Redis automatically.

**Option B: Manual Setup**

```bash
# PostgreSQL
# macOS: brew install postgresql@15
# Ubuntu: sudo apt-get install postgresql
# Windows: Download from https://www.postgresql.org/download/windows/

# Create database
createdb -U postgres reachinbox

# Redis
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server
# Windows: Download from https://github.com/microsoftarchive/redis/releases
```

#### Run Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
[QUEUE] Starting worker...
[BOOT] Queueing past-scheduled emails...
Backend running on http://localhost:4000
```

### 3. Frontend Setup

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Create `.env` File

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

#### Run Frontend

```bash
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:3000/
```

Open `http://localhost:3000` in your browser.

---

## Ethereal Email Setup (for Testing)

Ethereal Email is a **fake SMTP service** perfect for development. No real emails are sent.

### Get Ethereal Credentials

1. Go to https://ethereal.email/
2. Click **"Create Ethereal Account"**
3. Copy your email and password
4. Add to `backend/.env`:

```env
SMTP_USER=your-ethereal-email@ethereal.email
SMTP_PASS=your-ethereal-password
```

### View Sent Emails

After an email is sent, check the console output:
```
Preview URL: https://ethereal.email/message/arTPt6doutmZepynarYgEJW6vNXKkb.eAAAAuYcBrMfDrwbYtwxUVrU.60Y
```

Click the link to view the email in a browser.

---

## Testing Scenarios

### Scenario 1: Basic Email Scheduling

1. Open frontend (http://localhost:3000)
2. Login with Google
3. Fill compose form:
   - Recipients: `test@example.com`, `demo@example.com`
   - Subject: "Test Email"
   - Body: "This is a test"
   - Start Time: 1 minute from now
   - Delay: 5 seconds
   - Hourly Limit: 50
4. Click "Send Later"
5. Go to **Scheduled** tab → See emails listed
6. Wait for scheduled time → Check **Sent** tab
7. Click email → See "Preview URL" in console

### Scenario 2: Rate Limiting & Delay

1. Schedule **10 emails** with:
   - Start Time: Now
   - Delay: 5 seconds
   - Hourly Limit: 3/hour
2. Watch console logs:
   ```
   [WORKER] ✓ Email 1 sent successfully
   [WORKER] ✓ Email 2 sent successfully
   [WORKER] ✓ Email 3 sent successfully
   [WORKER] ⏱ Email 4 hourly limit reached, re-enqueueing to next hour
   ```
3. First 3 emails send immediately, rest queue until next hour
4. Between each send, 5-second delay is enforced

### Scenario 3: Server Restart Persistence

1. Schedule **5 emails** for now with 10-second delay
2. Wait for 2 emails to send
3. **Stop backend** (Ctrl+C)
4. Wait 3 seconds
5. **Start backend** again (`npm run dev`)
6. Watch console: Past emails are re-queued
   ```
   [BOOT] Found 3 past emails, queueing with respect to delay and hourly limits...
   [BOOT] Queued email 1 with delay 0ms
   [BOOT] Queued email 2 with delay 10000ms
   [BOOT] Queued email 3 with delay 20000ms
   ```
7. Remaining emails continue sending with delays respected

### Scenario 4: Bulk Scheduling (1000+ Emails)

1. Use API to schedule 1000 emails:
   ```bash
   curl -X POST http://localhost:4000/api/emails/schedule \
     -H "Content-Type: application/json" \
     -d '{
       "to": ["user1@example.com", "user2@example.com", ...],
       "subject": "Bulk Email",
       "body": "Hello",
       "sender": "your-email@example.com",
       "scheduledFor": "2026-09-25T08:00:00Z",
       "delayBetweenEmails": 2,
       "hourlyLimit": 50
     }'
   ```
2. Frontend shows all emails in queue
3. Worker processes them with staggered delays
4. First 50 send in first hour, next 50 in second hour, etc.

---

## Environment Variables Reference

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Server port |
| `FRONTEND_URL` | http://localhost:3000 | Frontend origin for CORS |
| `DATABASE_URL` | postgresql://reachinbox:reachinbox@localhost:5432/reachinbox | PostgreSQL connection string |
| `REDIS_URL` | redis://localhost:6379 | Redis connection string |
| `SMTP_HOST` | smtp.gmail.com | SMTP server hostname |
| `SMTP_PORT` | 587 | SMTP port |
| `SMTP_USER` | - | SMTP username (required) |
| `SMTP_PASS` | - | SMTP password (required) |
| `SMTP_SECURE` | false | Use TLS for SMTP |
| `DEFAULT_SENDER` | your-gmail@gmail.com | Default from email |
| `DEFAULT_DELAY_SECONDS` | 2 | Default delay between sends |
| `MAX_EMAILS_PER_HOUR` | 50 | Default hourly rate limit |
| `WORKER_CONCURRENCY` | 2 | Concurrent jobs per worker |
| `SESSION_SECRET` | reachinbox-session-secret | Session encryption key |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | http://localhost:4000/api/auth/callback | Google OAuth callback |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | http://localhost:4000/api | Backend API base URL |

---

## Troubleshooting

### Issue: "SMTP credentials are not configured"

**Solution:** Add `SMTP_USER` and `SMTP_PASS` to `backend/.env`

### Issue: "connection refused" on PostgreSQL

**Solution:**
- Ensure PostgreSQL is running: `psql -U postgres`
- Check `DATABASE_URL` is correct
- Create database: `createdb -U postgres reachinbox`

### Issue: "connection refused" on Redis

**Solution:**
- Ensure Redis is running: `redis-cli ping` (should return "PONG")
- Check `REDIS_URL` is correct

### Issue: Google login not working

**Solution:**
1. Create OAuth credentials at https://console.cloud.google.com
2. Add to `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxx
   ```
3. Set authorized redirect URI to `http://localhost:4000/api/auth/callback`

### Issue: Emails not sending

**Solution:**
1. Check console for error messages
2. Verify SMTP credentials with: `telnet smtp.ethereal.email 587`
3. Check email status in PostgreSQL: `SELECT * FROM emails;`

---

## Assumptions & Trade-offs

### Assumptions

1. **Single Sender Per Email** - Each email has one sender (not per-recipient sender variation)
2. **Ethereal Email for Testing** - Assumes test environment; production would use real SMTP
3. **Redis Data Loss OK** - Queue state is ephemeral; database is source of truth
4. **No Retries on Failure** - Failed emails stay failed; manual intervention needed
5. **Linear Time Slots** - Delay is uniform (not exponential backoff)

### Trade-offs

| Decision | Trade-off |
|----------|-----------|
| **BullMQ Queue** | Adds complexity vs. simple cron; justified by reliability & delay precision |
| **Per-Hour Buckets** | Hour boundaries reset exactly (not rolling 60-min window); simpler but less flexible |
| **Redis Expiry** | Rate limit data lost on Redis restart; acceptable for temporary state |
| **Single Worker Type** | No priority queues; all emails treated equally |
| **Atomic Status Updates** | More database queries; ensures idempotency |
| **Linear Delay Spacing** | No exponential backoff; suitable for internal campaigns |

### Scalability Considerations

1. **Horizontal Scaling**: Run multiple backend instances → BullMQ automatically load-balances
2. **Connection Pooling**: PostgreSQL pool size: default 10 (tunable)
3. **Worker Concurrency**: Increase `WORKER_CONCURRENCY` for more parallelism
4. **Redis Cluster**: For millions of emails, use Redis Cluster instead of single instance
5. **Database Sharding**: Partition emails table by sender/date if needed

---

## API Endpoints

### Public Endpoints

#### Schedule Emails
```http
POST /api/emails/schedule
Content-Type: application/json

{
  "to": ["user1@example.com", "user2@example.com"],
  "subject": "Campaign Subject",
  "body": "Email body text",
  "sender": "sender@example.com",
  "scheduledFor": "2026-09-25T15:00:00Z",
  "delayBetweenEmails": 5,
  "hourlyLimit": 50
}

Response: { "ok": true, "total": 2, "emails": [...] }
```

#### Get Emails
```http
GET /api/emails/scheduled
GET /api/emails/sent
GET /api/emails/failed

Response: { "emails": [...] }
```

#### Delete Email
```http
DELETE /api/emails/:id

Response: { "success": true, "message": "Email deleted successfully" }
```

### Auth Endpoints

```http
GET /api/auth/google           # Redirect to Google login
GET /api/auth/callback          # OAuth callback (handled by server)
GET /api/auth/me                # Get current user
POST /api/auth/logout           # Logout
```

---

## Running with Docker Compose

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

Stop:

docker-compose down

