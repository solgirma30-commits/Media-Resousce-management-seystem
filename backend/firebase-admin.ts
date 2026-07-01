import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

export function getAdminApp() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  let projectId = process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0274556355";
  try {
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (firebaseConfig.projectId) projectId = firebaseConfig.projectId;
    }
  } catch (e) {
    console.error("Failed to read firebase-applet-config.json", e);
  }
  if (getApps().length === 0) {
    return initializeApp({ projectId });
  }
  return getApps()[0];
}

export function getAdminFirestore() {
  const app = getAdminApp();
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  let databaseId = "ai-studio-cf583c2c-7621-4cdf-ac2e-a6c84f44a7d2";
  try {
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (firebaseConfig.firestoreDatabaseId) databaseId = firebaseConfig.firestoreDatabaseId;
    }
  } catch (e) {
    console.error("Failed to read firebase-applet-config.json", e);
  }
  return getFirestore(app, databaseId);
}
