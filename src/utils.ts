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

export const DARK_PLACEHOLDER_IMG = "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%27600%27%20height%3D%27600%27%20viewBox%3D%270%200%20600%20600%27%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20fill%3D%27%230c0c0e%27/%3E%3Ccircle%20cx%3D%27300%27%20cy%3D%27230%27%20r%3D%2770%27%20fill%3D%27%2327272a%27/%3E%3Cpath%20d%3D%27M160%20460c0-77.32%2062.68-140%20140-140s140%2062.68%20140%20140H160z%27%20fill%3D%27%2327272a%27/%3E%3Ctext%20x%3D%2750%25%27%20y%3D%27510%27%20dominant-baseline%3D%27middle%27%20text-anchor%3D%27middle%27%20fill%3D%27%2371717a%27%20font-family%3D%27serif%2C%20Georgia%2C%20sans-serif%27%20font-size%3D%2718%27%20letter-spacing%3D%270.25em%27%3EBIG%20MODEL%3C/text%3E%3C/svg%3E";

export const safeUrl = (raw: string | null | undefined, kind: 'img' = 'img') => {
  const fallback = (kind === 'img') ? DARK_PLACEHOLDER_IMG : '#';
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

export const getModelCoverImage = (m: any): string => {
  if (!m) return DARK_PLACEHOLDER_IMG;
  const imgsList = Array.isArray(m.imgs) ? m.imgs : (m.imgs && typeof m.imgs === 'object' ? Object.values(m.imgs) : []);
  if (!imgsList || imgsList.length === 0) return DARK_PLACEHOLDER_IMG;

  // Prioritize Cloudinary permanent links
  const cloudinaryUrl = imgsList.find((u: any) => typeof u === 'string' && u.includes('cloudinary'));
  if (cloudinaryUrl) {
    const s = safeUrl(cloudinaryUrl, 'img');
    if (s && s !== DARK_PLACEHOLDER_IMG) return s;
  }

  for (const url of imgsList) {
    if (url && typeof url === 'string' && url.trim()) {
      const s = safeUrl(url, 'img');
      if (s && s !== DARK_PLACEHOLDER_IMG) return s;
    }
  }
  return DARK_PLACEHOLDER_IMG;
};

export const localizeCategory = (cat: string, t: any): string => {
  const c = String(cat || '').trim().toLowerCase();
  if (c === 'all') return t.all_talents || t.all || 'Все';
  if (['woman', 'women', 'female', 'девушки', 'девушка', 'qadınlar', 'qadinlar', 'qadin', 'qadın'].includes(c)) return t.woman || 'Девушки';
  if (['man', 'men', 'male', 'мужчины', 'мужчина', 'kişilər', 'kisiler', 'kisi', 'kişi'].includes(c)) return t.man || 'Мужчины';
  if (['kids', 'children', 'дети', 'uşaqlar', 'usaqlar', 'uşaq', 'usaq'].includes(c)) return t.kids || 'Дети';
  return cat || '—';
};

export const matchesCategory = (modelCat: string | undefined, filterCat: string): boolean => {
  if (!filterCat || filterCat === 'All' || filterCat.toLowerCase() === 'all') return true;
  const mc = String(modelCat || '').trim().toLowerCase();
  const fc = String(filterCat || '').trim().toLowerCase();
  if (fc === mc) return true;
  if (['woman', 'women', 'female', 'девушки', 'девушка', 'qadınlar', 'qadinlar', 'qadin', 'qadın'].includes(fc)) {
    return ['woman', 'women', 'female', 'девушки', 'девушка', 'qadınlar', 'qadinlar', 'qadin', 'qadın'].includes(mc);
  }
  if (['man', 'men', 'male', 'мужчины', 'мужчина', 'kişilər', 'kisiler', 'kisi', 'kişi'].includes(fc)) {
    return ['man', 'men', 'male', 'мужчины', 'мужчина', 'kişilər', 'kisiler', 'kisi', 'kişi'].includes(mc);
  }
  if (['kids', 'children', 'дети', 'uşaqlar', 'usaqlar', 'uşaq', 'usaq'].includes(fc)) {
    return ['kids', 'children', 'дети', 'uşaqlar', 'usaqlar', 'uşaq', 'usaq'].includes(mc);
  }
  return false;
};

export const calculateAgeFromBirthDate = (birthDate: string | null | undefined): { years: number; months: number; totalMonths: number } | null => {
  if (!birthDate) return null;
  const raw = String(birthDate).trim();
  if (!raw) return null;

  let d: Date;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('.').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(raw);
  }

  if (isNaN(d.getTime())) return null;

  const today = new Date();
  let years = today.getFullYear() - d.getFullYear();
  let months = today.getMonth() - d.getMonth();
  const days = today.getDate() - d.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return null;
  const totalMonths = years * 12 + months;
  return { years, months, totalMonths };
};

export const formatAge = (age: number | string | undefined, birthDate?: string | null, lang: 'ru' | 'az' | 'en' = 'ru'): string => {
  if (birthDate) {
    const calc = calculateAgeFromBirthDate(birthDate);
    if (calc) {
      if (calc.years === 0) {
        const m = Math.max(1, calc.months);
        if (lang === 'ru') return `${m} мес.`;
        if (lang === 'az') return `${m} ay`;
        return `${m} mos`;
      }
      const y = calc.years;
      if (lang === 'ru') {
        const lastDigit = y % 10;
        const lastTwo = y % 100;
        if (lastTwo >= 11 && lastTwo <= 19) return `${y} лет`;
        if (lastDigit === 1) return `${y} год`;
        if (lastDigit >= 2 && lastDigit <= 4) return `${y} года`;
        return `${y} лет`;
      }
      if (lang === 'az') return `${y} yaş`;
      return `${y} yrs`;
    }
  }

  if (age !== undefined && age !== null && String(age).trim() !== '') {
    const num = Number(age);
    if (!isNaN(num)) {
      if (num === 0) {
        if (lang === 'ru') return `< 1 года`;
        if (lang === 'az') return `< 1 yaş`;
        return `< 1 yr`;
      }
      if (lang === 'ru') {
        const lastDigit = num % 10;
        const lastTwo = num % 100;
        if (lastTwo >= 11 && lastTwo <= 19) return `${num} лет`;
        if (lastDigit === 1) return `${num} год`;
        if (lastDigit >= 2 && lastDigit <= 4) return `${num} года`;
        return `${num} лет`;
      }
      if (lang === 'az') return `${num} yaş`;
      return `${num} yrs`;
    }
    return String(age);
  }

  return '';
};

export const matchesAgeRange = (model: { age?: number | string; birthDate?: string }, ageRange: string | undefined): boolean => {
  if (!ageRange || ageRange === 'all') return true;
  let modelAge: number | null = null;
  if (model.birthDate) {
    const calc = calculateAgeFromBirthDate(model.birthDate);
    if (calc) modelAge = calc.years;
  }
  if (modelAge === null && model.age !== undefined && model.age !== null && String(model.age).trim() !== '') {
    const n = Number(model.age);
    if (!isNaN(n)) modelAge = n;
  }
  if (modelAge === null) return false;

  switch (ageRange) {
    case '0-3':
      return modelAge >= 0 && modelAge <= 3;
    case '4-7':
      return modelAge >= 4 && modelAge <= 7;
    case '8-12':
      return modelAge >= 8 && modelAge <= 12;
    case '13-16':
      return modelAge >= 13 && modelAge <= 16;
    case '17+':
      return modelAge >= 17;
    default:
      return true;
  }
};

export const normalizeCategories = (rawCats: any, models?: any[]): string[] => {
  const list: string[] = [];

  if (Array.isArray(rawCats)) {
    rawCats.forEach(c => { if (typeof c === 'string' && c.trim()) list.push(c.trim()); });
  } else if (rawCats && typeof rawCats === 'object') {
    Object.values(rawCats).forEach(c => { if (typeof c === 'string' && c.trim()) list.push(c.trim()); });
  } else if (typeof rawCats === 'string') {
    rawCats.split(',').forEach(c => { if (c.trim()) list.push(c.trim()); });
  }

  if (Array.isArray(models)) {
    models.forEach(m => {
      if (m && m.cat && typeof m.cat === 'string' && m.cat.trim()) {
        list.push(m.cat.trim());
      }
    });
  }

  const result: string[] = ['All', 'Woman', 'Man', 'Kids'];
  const seen = new Set<string>(['all', 'woman', 'man', 'kids']);

  for (const item of list) {
    const lower = item.toLowerCase();
    if (['девушки', 'девушка', 'qadınlar', 'qadinlar', 'women', 'female'].includes(lower)) continue;
    if (['мужчины', 'мужчина', 'kişilər', 'kisiler', 'men', 'male'].includes(lower)) continue;
    if (['дети', 'ребенок', 'uşaqlar', 'usaqlar', 'children'].includes(lower)) continue;

    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(item);
    }
  }

  return result;
};

export const formatEditorialSpecs = (m: any): string => {
  if (!m) return '';
  const parts: string[] = [];

  const hCm = parseInt(m.height || '0', 10);
  if (!isNaN(hCm) && hCm >= 100 && hCm <= 240) {
    const totalInches = Math.round(hCm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    parts.push(`${feet}' ${inches}"`);
  } else if (m.height && String(m.height).trim()) {
    parts.push(`${m.height} cm`);
  }

  if (m.params && typeof m.params === 'string') {
    const cleanParams = m.params
      .replace(/\s*[-\/]\s*/g, ' / ')
      .trim();
    if (cleanParams) {
      parts.push(cleanParams);
    }
  }

  if (parts.length === 0) {
    if (m.shoe) parts.push(`Shoe ${m.shoe}`);
    if (m.cat && m.cat !== 'All') parts.push(m.cat);
  }

  return parts.join(', ');
};
