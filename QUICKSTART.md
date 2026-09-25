# Quick Start Guide

Follow these steps to run the ReachInbox Email Scheduler locally.

## Requirements

Before starting, make sure you have:

* Node.js 18 or newer
* npm
* Docker and Docker Compose

Docker is the easiest way to run PostgreSQL and Redis.

---

## 1. Start PostgreSQL and Redis

From the project folder, run:

```bash
docker-compose up -d
```

To check that both containers are running:

```bash
docker-compose ps
```

You should see the PostgreSQL and Redis containers running.

---

## 2. Set Up the Backend

Open a terminal and go to the backend folder:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder and add:

```env
PORT=4000

FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://reachinbox:reachinbox@localhost:5432/reachinbox

REDIS_URL=redis://localhost:6379

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-email@ethereal.email
SMTP_PASS=your-ethereal-password
SMTP_SECURE=false

DEFAULT_SENDER=your-email@example.com

DEFAULT_DELAY_SECONDS=2
MAX_EMAILS_PER_HOUR=50
WORKER_CONCURRENCY=2

SESSION_SECRET=dev-secret-key-change-in-production

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/callback
```

### Ethereal Email

For testing emails, this project uses Ethereal.

1. Open Ethereal Email.
2. Create an account.
3. Copy the email address and password.
4. Put them in `SMTP_USER` and `SMTP_PASS` in your `.env` file.

---

## 3. Start the Backend

Run:

```bash
npm run dev
```

The backend should start on:

```text
http://localhost:4000
```

You should see output similar to:

```text
[QUEUE] Starting worker...

Backend running on http://localhost:4000
```

---

## 4. Set Up the Frontend

Open another terminal and go to the frontend folder:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder:

```env
VITE_API_URL=http://localhost:4000/api
```

Then start the frontend:

```bash
npm run dev
```

You should see something similar to:

```text
VITE v5.x.x ready in XXX ms

➜ Local: http://localhost:3000/
```

---

## 5. Open the Application

Open this in your browser:

```text
http://localhost:3000
```

You should now see the ReachInbox Email Scheduler.

That's it. The backend, frontend, PostgreSQL, and Redis should all be running.
