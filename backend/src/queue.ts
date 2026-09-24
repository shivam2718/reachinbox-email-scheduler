import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { config } from './config';
import { getEmailById, updateEmailStatus, updateScheduledFor, pool } from './db';
import { sendEmail } from './smtp';

export const redis = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const emailQueue = new Queue('email-scheduler', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const parseNextHour = () => {
  const now = Date.now();
  const currentHour = new Date(now).setMinutes(0, 0, 0);
  return new Date(currentHour + 60 * 60 * 1000);
};

const getSenderDelayKey = (sender: string) => `sender:${sender}:last-send`;
const getSenderHourBucketKey = (sender: string, timestamp: number) => 
  `sender:${sender}:hour:${Math.floor(timestamp / 3600000)}`;

export async function enqueueEmailJob(emailId: number, sendAt: Date) {
  const delay = Math.max(0, sendAt.getTime() - Date.now());

  await emailQueue.add(
    'send-email',
    { emailId },
    {
      jobId: `email-${emailId}`,
      delay,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}

export function startWorker() {
  const worker = new Worker(
    'email-scheduler',
    async (job) => {
      const { emailId } = job.data as { emailId: number };

      // ========================================
      // IDEMPOTENCY CHECK: Get fresh email state
      // ========================================
      let email = await getEmailById(emailId);

      if (!email) {
        console.warn(`Email ID ${emailId} not found in database`);
        return;
      }

      // If already sent, don't send again (idempotency)
      if (email.status === 'sent') {
        console.log(`Email ${emailId} already sent, skipping`);
        return;
      }

      // If already processing by another worker, reschedule this job to retry later
      if (email.status === 'processing') {
        console.log(`Email ${emailId} already being processed, rescheduling in 5 seconds`);
        await job.moveToDelayed(Date.now() + 5000);
        return;
      }

      // Check if scheduled time hasn't arrived yet
      const now = Date.now();
      const scheduledAt = new Date(email.scheduled_for).getTime();

      if (scheduledAt > now + 1000) {
        console.log(`Email ${emailId} not yet scheduled (in ${(scheduledAt - now) / 1000}s), rescheduling`);
        await enqueueEmailJob(emailId, new Date(scheduledAt));
        return;
      }

      // ========================================
      // ATOMICALLY MARK AS PROCESSING
      // ========================================
      const processingResult = await pool.query(
        `UPDATE emails SET status = 'processing' 
         WHERE id = $1 AND status = 'scheduled' 
         RETURNING *`,
        [emailId]
      );

      if (processingResult.rows.length === 0) {
        // Another worker already marked it as processing, reschedule
        console.log(`Email ${emailId} concurrently claimed by another worker, rescheduling`);
        await job.moveToDelayed(Date.now() + 5000);
        return;
      }

      email = processingResult.rows[0];

      try {
        // ========================================
        // CHECK MINIMUM DELAY BETWEEN SENDS
        // ========================================
        const senderDelayKey = getSenderDelayKey(email.sender);
        const lastSendAtStr = await redis.get(senderDelayKey);
        const lastSendAt = lastSendAtStr ? Number(lastSendAtStr) : 0;
        
        const minimumDelayMs = Math.max((email.delay_between_emails || config.defaultDelaySeconds) * 1000, 1000);

        if (lastSendAt && now < lastSendAt + minimumDelayMs) {
          const nextAttemptAt = new Date(lastSendAt + minimumDelayMs);
          console.log(`Minimum delay not met for sender ${email.sender}, rescheduling to ${nextAttemptAt.toISOString()}`);
          await updateScheduledFor(emailId, nextAttemptAt);
          await job.moveToDelayed(nextAttemptAt.getTime());
          return;
        }

        // ========================================
        // CHECK HOURLY RATE LIMIT
        // ========================================
        const hourBucket = getSenderHourBucketKey(email.sender, now);
        const countStr = await redis.get(hourBucket);
        const count = countStr ? Number(countStr) : 0;

        if (count >= email.hourly_limit) {
          const nextWindow = parseNextHour();
          console.log(`Hourly limit (${email.hourly_limit}) reached for sender ${email.sender}, rescheduling to ${nextWindow.toISOString()}`);
          await updateScheduledFor(emailId, nextWindow);
          await job.moveToDelayed(nextWindow.getTime());
          return;
        }

        // ========================================
        // SEND EMAIL
        // ========================================
        await sendEmail({
          to: email.recipient,
          subject: email.subject,
          body: email.body,
          sender: email.sender,
        });

        // ========================================
        // UPDATE RATE LIMIT COUNTER
        // ========================================
        await redis.incr(hourBucket);
        await redis.expire(hourBucket, 3600);

        // ========================================
        // UPDATE SENDER DELAY KEY
        // ========================================
        await redis.set(senderDelayKey, String(Date.now()));

        // ========================================
        // ATOMICALLY MARK AS SENT (IDEMPOTENCY)
        // Only update if still in processing state
        // ========================================
        const sentResult = await pool.query(
          `UPDATE emails 
           SET status = 'sent', sent_at = NOW() 
           WHERE id = $1 AND status = 'processing' 
           RETURNING *`,
          [emailId]
        );

        if (sentResult.rows.length === 0) {
          throw new Error(`Failed to mark email ${emailId} as sent - unexpected status`);
        }

        console.log(`Email ${emailId} sent successfully to ${email.recipient}`);
      } catch (error) {
        // Mark as failed, but only if still processing
        await pool.query(
          `UPDATE emails 
           SET status = 'failed' 
           WHERE id = $1 AND status = 'processing'`,
          [emailId]
        );

        console.error(`Failed to send email ${emailId}:`, error instanceof Error ? error.message : error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: config.workerConcurrency,
      limiter: {
        max: 1,
        duration: Math.max(config.defaultDelaySeconds, 1) * 1000,
      },
    }
  );

  worker.on('failed', (job, err) => {
    if (job) {
      console.error(`Job ${job.id} failed after all retries:`, err.message);
    }
  });

  worker.on('completed', (job) => {
    if (job) {
      console.log(`Job ${job.id} completed successfully`);
    }
  });

  return worker;
}
