import nodemailer from 'nodemailer';
import { config } from './config';

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

export async function sendEmail({
  to,
  subject,
  body,
  sender,
}: {
  to: string;
  subject: string;
  body: string;
  sender: string;
}) {
  if (!config.smtpUser || !config.smtpPass) {
    throw new Error('SMTP credentials are not configured. Add SMTP_USER and SMTP_PASS to your backend .env file.');
  }

  const info = await transporter.sendMail({
    from: sender || config.defaultSender,
    to,
    replyTo: sender || config.defaultSender,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, '<br />')}</p>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('Preview URL:', previewUrl);
  }

  return info;
}
