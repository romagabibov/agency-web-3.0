import { ref, set, get, runTransaction } from 'firebase/database';
import { db } from './firebase';

export const savePackage = async (modelIds: string[]) => {
  const id = Math.random().toString(36).substring(2, 10);
  await set(ref(db, `agency_packages/${id}`), {
    modelIds,
    createdAt: Date.now(),
    views: 0,
    likes: {},
    timeSpent: {}
  });
  return id;
};

export const getPackage = async (id: string) => {
  const snapshot = await get(ref(db, `agency_packages/${id}`));
  return snapshot.val();
};

export const getAllPackages = async () => {
  const snapshot = await get(ref(db, `agency_packages`));
  const data = snapshot.val();
  if (!data) return [];
  return Object.entries(data).map(([id, pkg]: [string, any]) => ({
    id,
    ...pkg
  }));
};

export const updatePackageModels = async (id: string, modelIds: string[]) => {
  const pkg = await getPackage(id);
  if (pkg) {
    await set(ref(db, `agency_packages/${id}`), { ...pkg, modelIds });
  }
};

export const updatePackageTitle = async (id: string, title: string) => {
  const pkg = await getPackage(id);
  if (pkg) {
    await set(ref(db, `agency_packages/${id}`), { ...pkg, title });
  }
};

export const deletePackage = async (id: string) => {
  await set(ref(db, `agency_packages/${id}`), null);
};

export const updatePackageStats = async (id: string, stats: any) => {
  const pkg = await getPackage(id);
  if (pkg) {
    await set(ref(db, `agency_packages/${id}`), { ...pkg, ...stats });
  }
};

export const incrementPackageStat = async (id: string, statType: 'views' | 'likes' | 'timeSpent' | 'modelViews', modelId?: string, value: number = 1) => {
  const pkgRef = ref(db, `agency_packages/${id}`);
  await runTransaction(pkgRef, (pkg) => {
    if (pkg) {
      if (statType === 'views') {
        pkg.views = (pkg.views || 0) + value;
      } else if (statType === 'modelViews' && modelId) {
        if (!pkg.modelViews) pkg.modelViews = {};
        pkg.modelViews[modelId] = (pkg.modelViews[modelId] || 0) + value;
      } else if (statType === 'likes' && modelId) {
        if (!pkg.likes) pkg.likes = {};
        pkg.likes[modelId] = (pkg.likes[modelId] || 0) + value;
      } else if (statType === 'timeSpent' && modelId) {
        if (!pkg.timeSpent) pkg.timeSpent = {};
        pkg.timeSpent[modelId] = (pkg.timeSpent[modelId] || 0) + value;
      }
    }
    return pkg;
  });
};

export const sanitizeKey = (str: string) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/-+/g, '-')
    .replace(/^[_-]|[_-]$/g, '');
};

export const hashPassword = async (password: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", data, { name: "PBKDF2" }, false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  return saltHex + hashHex;
};

export const verifyPassword = async (storedHash: string, password: string) => {
  if (!storedHash || storedHash.length !== 96) return false;
  const saltHex = storedHash.substring(0, 32);
  const storedHashHex = storedHash.substring(32);
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const key = await crypto.subtle.importKey("raw", data, { name: "PBKDF2" }, false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === storedHashHex;
};

export const daysLeft = (dateStr: string | null) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export const formatSeconds = (totalSec: number) => {
  if (!totalSec || totalSec === 0) return '—';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const out = `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`.trim();
  return out || '0s';
};

export const getPlayableVideoUrl = (url: string | null | undefined): { url: string, isDriveIframe: boolean } | undefined => {
  if (!url) return undefined;
  const trimmed = url.trim();
  
  const viewMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (viewMatch && viewMatch[1]) {
    // Return direct download link for native video player
    return { url: `https://drive.google.com/uc?export=download&id=${viewMatch[1]}`, isDriveIframe: false };
  }
  
  const openMatch = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1] && trimmed.includes('drive.google.com')) {
    // Return direct download link for native video player
    return { url: `https://drive.google.com/uc?export=download&id=${openMatch[1]}`, isDriveIframe: false };
  }
  
  return { url: trimmed, isDriveIframe: false };
};

export const safeUrl = (raw: string | null | undefined, kind: 'img' = 'img') => {
  const PLACEHOLDER_IMG = "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%27600%27%20height%3D%27800%27%20viewBox%3D%270%200%20600%20800%27%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20fill%3D%27%23f3f4f6%27/%3E%3Ctext%20x%3D%2750%25%27%20y%3D%2750%25%27%20dominant-baseline%3D%27middle%27%20text-anchor%3D%27middle%27%20fill%3D%27%239ca3af%27%20font-family%3D%27Arial%2C%20sans-serif%27%20font-size%3D%2720%27%3EIMAGE%3C/text%3E%3C/svg%3E";
  const fallback = (kind === 'img') ? PLACEHOLDER_IMG : '#';
  if (!raw || typeof raw !== 'string') return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  try {
    const u0 = new URL(trimmed, window.location.href);
    const host = (u0.hostname || '').toLowerCase();
    if (kind === 'img' && (host === 'ibb.co' || host === 'www.ibb.co')) return fallback;
  } catch {
    // ignore
  }

  if (trimmed.startsWith('data:')) {
    if (/^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) return trimmed;
    return fallback;
  }

  if (trimmed.startsWith('blob:')) return trimmed;

  try {
    const u = new URL(trimmed, window.location.href);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.href;
    return fallback;
  } catch {
    return fallback;
  }
};
