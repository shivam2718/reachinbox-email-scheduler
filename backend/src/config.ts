import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://reachinbox:reachinbox@localhost:5432/reachinbox',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  defaultSender: process.env.DEFAULT_SENDER || 'your-gmail@gmail.com',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || 'your-gmail@gmail.com',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: Boolean(process.env.SMTP_SECURE === 'true'),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/callback',
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 2),
  defaultDelaySeconds: Number(process.env.DEFAULT_DELAY_SECONDS || 2),
  maxEmailsPerHour: Number(process.env.MAX_EMAILS_PER_HOUR || 50),
  sessionSecret: process.env.SESSION_SECRET || 'reachinbox-session-secret'
};
