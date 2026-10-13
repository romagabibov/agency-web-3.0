import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDatabase } from './_admin';

async function fetchModelsWithTimeout(agencyId: string): Promise<any[]> {
  const timeoutMs = 2500;
  
  // 1. Try Firebase Admin SDK with timeout
  try {
    const db = getAdminDatabase();
    const adminPromise = db.ref(`agencies/${agencyId}/models`).once('value');
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Admin SDK timeout')), timeoutMs)
    );
    const snap = await Promise.race([adminPromise, timeoutPromise]) as any;
    if (snap && snap.exists && snap.exists()) {
      const val = snap.val();
      return Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
    }
  } catch (err) {
    // Admin SDK timed out or failed, try REST fallback
  }

  // 2. Try REST API with timeout & optional secret
  try {
    const secret = process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN || '';
    const authParam = secret ? `?auth=${encodeURIComponent(secret)}` : '';
    const url = `https://big-agency-default-rtdb.firebaseio.com/agencies/${encodeURIComponent(agencyId)}/models.json${authParam}`;
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (response.ok) {
      const val = await response.json();
      if (val && typeof val === 'object' && !val.error) {
        return Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
      }
    }
  } catch (restErr) {
    // REST failed
  }

  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const agencyId = (req.query.agencyId as string) || process.env.VITE_DEFAULT_AGENCY_ID || 'bigmodelagency';
    const rawList = await fetchModelsWithTimeout(agencyId);

    const seenIds = new Set<string>();
    const publicModels: any[] = [];
    for (const m of rawList) {
      if (!m || !m.id) continue;
      const idStr = String(m.id).trim();
      if (!idStr || seenIds.has(idStr)) continue;
      seenIds.add(idStr);
      publicModels.push({
        id: idStr,
        name: String(m.name || ''),
        cat: String(m.cat || 'All'),
        height: String(m.height || ''),
        weight: String(m.weight || ''),
        shoe: String(m.shoe || ''),
        params: String(m.params || ''),
        shows: String(m.shows || ''),
        imgs: Array.isArray(m.imgs) ? m.imgs : [],
        videos: Array.isArray(m.videos) ? m.videos : [],
        status: String(m.status || 'Active'),
        insta: String(m.insta || '')
      });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.json(publicModels);
  } catch (error: any) {
    console.error('Error fetching public models:', error);
    return res.json([]);
  }
}
