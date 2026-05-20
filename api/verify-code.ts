import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBPPD3mUUmMWvaDxvP6uy22bBaSfXd49LI",
  authDomain: "big-agency.firebaseapp.com",
  databaseURL: "https://big-agency-default-rtdb.firebaseio.com",
  projectId: "big-agency"
};

const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(firebaseApp);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const safeEmail = email.replace(/[.#$[\]]/g, '_');
  const codeRef = ref(db, `verificationCodes/${safeEmail}`);
  const snapshot = await get(codeRef);
  
  if (!snapshot.exists()) {
    return res.status(400).json({ error: "No code requested for this email" });
  }

  const record = snapshot.val();

  if (Date.now() > record.expiresAt) {
    await remove(codeRef);
    return res.status(400).json({ error: "Code expired" });
  }

  if (record.code !== code) {
    return res.status(400).json({ error: "Invalid code" });
  }

  await remove(codeRef);
  res.json({ success: true });
}
