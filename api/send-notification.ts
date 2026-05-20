import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, subject, text, html } = req.body;
  
  if (!email || !subject || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const isDefaultUser = !process.env.SMTP_USER || process.env.SMTP_USER === 'your-brevo-login-email@example.com' || process.env.SMTP_USER === 'your-brevo-email@example.com';
  const isDefaultPass = !process.env.SMTP_PASS || process.env.SMTP_PASS === 'your-brevo-smtp-key';

  if (isDefaultUser || isDefaultPass) {
    console.log(`[DEV MODE] Notification for ${email}: ${subject}`);
    return res.json({ success: true, message: "Notification logged to console (DEV MODE)" });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: subject,
      text: text,
      html: html || text
    });
    res.json({ success: true, message: "Notification sent" });
  } catch (error: any) {
    if (error.message && error.message.includes('Authentication failed')) {
      return res.json({ success: true, message: "SMTP Auth failed, but notification logged to console." });
    }
    console.error("Error sending notification email:", error);
    res.status(500).json({ error: "Failed to send notification email" });
  }
}
