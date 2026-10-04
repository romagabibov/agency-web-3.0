import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';

const DATABASE_URL = process.env.FIREBASE_DATABASE_URL || "https://big-agency-default-rtdb.firebaseio.com";
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "big-agency";

export function getAdminDatabase(): Database {
  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const sa = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : process.env.FIREBASE_SERVICE_ACCOUNT;
        initializeApp({
          credential: cert(sa),
          databaseURL: DATABASE_URL,
          projectId: PROJECT_ID
        });
      } catch (e) {
        console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT, falling back to default init', e);
        initializeApp({
          databaseURL: DATABASE_URL,
          projectId: PROJECT_ID
        });
      }
    } else {
      initializeApp({
        databaseURL: DATABASE_URL,
        projectId: PROJECT_ID
      });
    }
  }
  return getDatabase(getApp());
}
