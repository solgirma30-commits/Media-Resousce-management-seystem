import express from "express";
import path from "path";
import dotenv from "dotenv";
import twilio from "twilio";
import fs from "fs";
import cors from "cors";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { GoogleGenAI } from "@google/genai";
import {
  initDb,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
  query
} from "./backend/db.ts";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

function getAdminApp() {
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

// Middleware: Verify Firebase Authentication Token
async function verifyFirebaseToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized: Missing Authorization header" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const adminApp = getAdminApp();
    const decodedToken = await getAuth(adminApp).verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    console.error("Firebase ID Token verification failed:", error);
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS
  app.use(cors());

  // Initialize DB Tables in PostgreSQL
  await initDb().catch((err) => {
    console.error("[DB Startup Error] Failed to initialize PostgreSQL tables:", err);
  });

  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  // Twilio Client (Lazy Initialization)
  let twilioClient: any = null;

  // API Routes
  app.get("/api/health", async (req, res) => {
    let dbStatus = "unknown";
    try {
      const result = await query('SELECT 1');
      if (result) dbStatus = "connected";
    } catch (err) {
      dbStatus = "error";
      console.error("Database health check failed:", err);
    }
    res.json({ 
      status: "ok", 
      environment: process.env.NODE_ENV || "development", 
      database: "postgresql",
      database_status: dbStatus
    });
  });

  // GET /api/collections/:collection - Generic fetch matching firestore compat layer
  app.get("/api/collections/:collection", verifyFirebaseToken, async (req, res) => {
    try {
      const collectionName = req.params.collection;
      const filters: Record<string, any> = {};
      
      // Parse query-level constraints from frontend firestore compat layer
      Object.keys(req.query).forEach(key => {
        if (key.startsWith('where_')) {
          // format: where_fieldName_operator=value
          const parts = key.split('_');
          if (parts.length >= 3) {
            const field = parts[1];
            try {
              filters[field] = JSON.parse(req.query[key] as string);
            } catch {
              filters[field] = req.query[key];
            }
          }
        }
      });
      
      const docs = await listDocuments(collectionName, filters);
      res.json(docs);
    } catch (error: any) {
      console.error(`Error listing documents in ${req.params.collection}:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET /api/collections/:collection/:id - Generic document fetch
  app.get("/api/collections/:collection/:id", verifyFirebaseToken, async (req, res) => {
    try {
      const collectionName = req.params.collection;
      const uid = req.params.id;
      
      let doc = await getDocument(collectionName, uid);
      
      // User Synchronization rule
      if (collectionName === 'users' && !doc) {
        const reqAny = req as any;
        if (reqAny.user && reqAny.user.uid === uid) {
          const isSystemAdmin = uid === 'VSnotQzmWMfmqbeB144IJ2xhciq2';
          doc = {
            uid,
            email: reqAny.user.email || '',
            displayName: reqAny.user.name || 'FMC User',
            photoUrl: reqAny.user.picture || '',
            role: isSystemAdmin ? 'SYSTEM_ADMIN' : 'NONE',
            approved: isSystemAdmin,
            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
            updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
          };
          await createDocument('users', uid, doc);
          console.log(`[User Sync] Registered brand-new user ${uid} in PostgreSQL database.`);
        }
      }
      
      if (!doc) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }
      res.json(doc);
    } catch (error: any) {
      console.error(`Error getting document:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/collections/:collection - Generic create document
  app.post("/api/collections/:collection", verifyFirebaseToken, async (req, res) => {
    try {
      const { id, data, merge } = req.body;
      const collectionName = req.params.collection;
      
      let doc;
      if (merge) {
        doc = await updateDocument(collectionName, id, data);
      } else {
        doc = await createDocument(collectionName, id, data);
      }
      res.json({ success: true, data: doc });
    } catch (error: any) {
      console.error(`Error saving document:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PATCH /api/collections/:collection/:id - Generic update document
  app.patch("/api/collections/:collection/:id", verifyFirebaseToken, async (req, res) => {
    try {
      const collectionName = req.params.collection;
      const doc = await updateDocument(collectionName, req.params.id, req.body);
      res.json({ success: true, data: doc });
    } catch (error: any) {
      console.error(`Error updating document:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE /api/collections/:collection/:id - Generic delete document
  app.delete("/api/collections/:collection/:id", verifyFirebaseToken, async (req, res) => {
    try {
      const collectionName = req.params.collection;
      await deleteDocument(collectionName, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error deleting document:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Backward-Compatible department updates routes (using PostgreSQL)
  app.get("/api/department-updates", async (req, res) => {
    const { department } = req.query;
    try {
      const filters: Record<string, any> = {};
      if (department) filters.department = department;
      const updates = await listDocuments("department_updates", filters);
      res.json(updates);
    } catch (error) {
      console.error('Error fetching department updates:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch updates' });
    }
  });

  app.post("/api/department-updates", async (req, res) => {
    const { department, message, sender } = req.body;
    try {
      const id = Math.random().toString(36).substring(2, 15);
      const newDoc = {
        department,
        message,
        sender,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };
      await createDocument("department_updates", id, newDoc);
      res.json({ success: true, data: { id, ...newDoc } });
    } catch (error) {
      console.error('Error inserting department update:', error);
      res.status(500).json({ success: false, message: 'Failed to insert update' });
    }
  });

  // Backward-Compatible users route (using PostgreSQL)
  app.get("/api/users/:uid", async (req, res) => {
    try {
      const userDoc = await getDocument("users", req.params.uid);
      if (!userDoc) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, data: userDoc });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
  });

  // Backward-Compatible notifications route (using PostgreSQL)
  app.get("/api/notifications", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    try {
      const notifications = await listDocuments("notifications", { userId: String(userId) });
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
  });

  app.patch("/api/notifications/:id", async (req, res) => {
    try {
      const doc = await updateDocument("notifications", req.params.id, req.body);
      res.json({ success: true, data: doc });
    } catch (error) {
      console.error('Error updating notification:', error);
      res.status(500).json({ success: false, message: 'Failed to update notification' });
    }
  });

  // Retrieve Firebase auth users list
  app.get("/api/firebase-users", async (req, res) => {
    try {
      const auth = getAuth(getAdminApp());
      const listUsersResult = await auth.listUsers();
      res.json(listUsersResult.users);
    } catch (error: any) {
      if (!(error.code === 'auth/internal-error' && error.message.includes('Identity Toolkit API'))) {
          console.error("Error listing users:", error);
      }
      res.setHeader('Content-Type', 'application/json');
      res.json([]);
    }
  });

  app.post("/api/transcribe", async (req, res) => {
    const { audioBase64, mimeType } = req.body;
    console.log("Transcription request received with mimeType:", mimeType);
    if (!audioBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing audioBase64 or mimeType" });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { text: "Transcribe the following audio content to text. Provide ONLY the transcribed text, no other conversation or filler." },
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
          ],
        },
      });
      console.log("Transcription Response:", JSON.stringify(response, null, 2));
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Transcription Error Detail:", error);
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  app.post("/api/dispatch-personnel", async (req, res) => {
    const { taskId, personnelId, role, phoneNumber, message } = req.body;

    if (!personnelId || !phoneNumber || !message) {
      return res.status(400).json({ error: "Missing personnelId, phoneNumber, or message" });
    }

    try {
      // 1. Update user phone number in PostgreSQL
      try {
        await updateDocument("users", personnelId, {
          phoneNumber: phoneNumber,
          updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        });
      } catch (dbErr: any) {
        console.info(`[Backend SDK] PostgreSQL user sync skipped: ${dbErr.message}`);
      }

      // 2. Send SMS
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !from) {
        return res.status(412).json({ 
          error: "SMS_NOT_CONFIGURED", 
          message: "Twilio credentials missing. SMS notification could not be sent." 
        });
      }

      // Format phone number
      let clean = String(phoneNumber).replace(/\D/g, '');
      if (clean.startsWith('0')) clean = '251' + clean.substring(1);
      const formattedTo = '+' + clean;

      if (!twilioClient) {
        twilioClient = twilio(accountSid, authToken);
      }

      await twilioClient.messages.create({
        body: message,
        to: formattedTo,
        from,
      });

      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 21608) {
        console.warn("Dispatch Warning: Twilio number unverified. (Safe to ignore in trial).");
      } else {
        console.error("Dispatch Error:", error.message);
      }
      
      let errMsg = error.message;
      const errCode = "DISPATCH_FAILED";

      if (error.code === 21608 || error.code === 21607 || error.code === 21612 || error.code === 21614 || (error.message && (error.message.toLowerCase().includes("short code") || error.message.toLowerCase().includes("shortcode")))) {
        errMsg = `The recipient number is unverified, formatted differently, or within Trial/Short-Code boundaries. Simulating success locally.`;
        res.status(200).json({
          success: true,
          warning: errMsg,
          simulated: true
        });
        return;
      }

      res.status(error.status || (error.code ? 422 : 500)).json({ 
        error: errCode, 
        message: errMsg,
        code: error.code 
      });
    }
  });

  app.post("/api/register-fcm-token", async (req, res) => {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) return res.status(400).json({ error: "Missing userId or fcmToken" });
    try {
      await updateDocument("users", userId, { fcmToken });
      res.json({ success: true });
    } catch (e: any) {
      console.warn("[Backend SDK Warning] Saving FCM token failed:", e.message);
      res.json({ success: true, warning: "PostgreSQL save failed" });
    }
  });

  app.post("/api/send-fcm-notification", async (req, res) => {
    const { targetUserId, title, body, requestId, fcmToken: clientFcmToken } = req.body;
    if (!targetUserId || !title || !body) return res.status(400).json({ error: "Missing targetUserId, title, or body" });
    try {
      let fcmToken = clientFcmToken;
      if (!fcmToken) {
        try {
          const userDoc = await getDocument("users", targetUserId);
          fcmToken = userDoc?.fcmToken;
        } catch (dbErr: any) {
          console.warn("[Backend SDK Warning] Could not fetch FCM token from PostgreSQL:", dbErr.message);
        }
      }

      if (!fcmToken) {
        return res.status(404).json({ error: "No FCM token found for user" });
      }

      const admin = await import("firebase-admin"); // Dynamic import for messaging
      
      const deepLinkUrl = requestId ? `/services?id=${requestId}` : "/";
      
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: { 
          requestId: requestId || "",
          url: deepLinkUrl
        },
        android: {
          priority: "high",
          notification: {
            title,
            body,
            sound: "default",
            priority: "max",
            visibility: "public",
            notificationCount: 1,
          }
        },
        webpush: {
          headers: {
            Urgency: "high"
          },
          notification: {
            title,
            body,
            icon: "/pwa-512x512.png",
            badge: "/pwa-512x512.png",
            requireInteraction: true,
            vibrate: [300, 110, 300, 110, 450, 110, 600],
            actions: [
              { action: "open", title: "View Details" }
            ],
            data: {
              url: deepLinkUrl
            }
          },
          fcmOptions: {
            link: deepLinkUrl
          }
        }
      });
      res.json({ success: true });
    } catch (e: any) {
      console.error("FCM Error:", e);
      res.status(500).json({ error: "Notification dispatch failed", details: e.message });
    }
  });

  app.post("/api/send-sms", async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: "Missing recipient or message" });
    }

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !from) {
        return res.status(412).json({ 
          error: "SMS_NOT_CONFIGURED", 
          message: "Twilio credentials missing in environment variables." 
        });
      }

      // Check for common placeholders or unverified/masked formats
      const normalizedTo = String(to).trim();
      const isPlaceholder = /[a-zA-Z?*]/.test(normalizedTo) || 
                            normalizedTo.toLowerCase().includes("placeholder") ||
                            normalizedTo.toLowerCase().includes("null") ||
                            normalizedTo.toLowerCase().includes("undefined") ||
                            normalizedTo.toLowerCase() === "na" ||
                            normalizedTo.toLowerCase() === "n/a";

      if (isPlaceholder) {
        return res.status(400).json({
          error: "INVALID_PHONE_NUMBER",
          message: `Contact number "${to}" is a placeholder. Please configure a valid mobile number.`
        });
      }

      // Format phone number to E.164
      let clean = normalizedTo.replace(/\D/g, ''); // Remove all non-digits
      
      if (clean.startsWith('0')) {
        clean = '251' + clean.substring(1);
      } else if (clean.startsWith('2510')) {
        clean = '251' + clean.substring(4);
      } else if (clean.length === 9 && (clean.startsWith('9') || clean.startsWith('7'))) {
        clean = '251' + clean;
      }
      
      if (clean.length < 9) {
        return res.status(400).json({
          error: "INVALID_PHONE_NUMBER",
          message: `Recipient number "${to}" parsed as "+${clean}" has only ${clean.length} digits, which is too short. SMS dispatch does not support short codes or invalid contact formats.`
        });
      }
      
      const formattedTo = '+' + clean;

      console.log(`[SMS Gateway] Processing: "${to}" -> "${formattedTo}" (Final Digits: ${clean.length})`);
      
      if (clean.length !== 12 && !clean.startsWith('1') && !clean.startsWith('251')) {
         console.warn(`[SMS Gateway] Warning: Potential invalid number length (${clean.length}).`);
      }

      if (!twilioClient) {
        twilioClient = twilio(accountSid, authToken);
      }
      
      console.log(`[SMS Gateway] Sending to ${formattedTo} from ${from}`);
      const result = await twilioClient.messages.create({
        body: message,
        to: formattedTo,
        from,
      });

      console.log(`SMS sent successfully: ${result.sid}`);
      res.json({ success: true, sid: result.sid });
    } catch (error: any) {
      if (error.code === 21608) {
        console.warn("SMS Warning: Twilio number unverified. (Safe to ignore in trial).");
      } else {
        console.error("SMS Error:", error.message, error.code ? `(Code: ${error.code})` : "");
      }
      
      let errMsg = error.message;
      if (error.code === 21608 || error.code === 21607 || error.code === 21612 || error.code === 21614 || (error.message && (error.message.toLowerCase().includes("short code") || error.message.toLowerCase().includes("shortcode")))) {
        errMsg = `The recipient number is unverified, a short code, or restricted. Simulating success locally.`;
        res.status(200).json({ success: true, simulated: true, warning: errMsg });
        return;
      }
      res.status(error.status || 500).json({ 
        error: error.code ? `TWILIO_${error.code}` : "SMS_GATEWAY_ERROR",
        message: errMsg,
        code: error.code
      });
    }
  });

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite dev server failed to start, falling back to static serving:", e);
      serveStatic();
    }
  } else {
    serveStatic();
  }

  function serveStatic() {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          res.status(404).send("File not found");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
