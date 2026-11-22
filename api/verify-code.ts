import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDatabase } from './_admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const db = getAdminDatabase();
  const safeEmail = email.replace(/[.#$[\]]/g, '_');
  const codeRef = db.ref(`verificationCodes/${safeEmail}`);
  const snapshot = await codeRef.once('value');
  
  if (!snapshot.exists()) {
    return res.status(400).json({ error: "No code requested for this email or code has expired" });
  }

  const record = snapshot.val();

  // Check expiration
  if (Date.now() > record.expiresAt) {
    await codeRef.remove();
    return res.status(400).json({ error: "Code expired" });
  }

  // Check and increment attempt count (anti-bruteforce)
  const currentAttempts = (record.attempts || 0) + 1;
  if (currentAttempts > 5) {
    await codeRef.remove();
    return res.status(429).json({ error: "Too many failed attempts. Code has been invalidated." });
  }

  if (record.code !== String(code).trim()) {
    await codeRef.update({ attempts: currentAttempts });
    const remaining = 5 - currentAttempts;
    return res.status(400).json({ 
      error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code invalidated.'}` 
    });
  }

  // Success - consume code immediately
  await codeRef.remove();
  return res.json({ success: true, message: "Code verified successfully" });
}
