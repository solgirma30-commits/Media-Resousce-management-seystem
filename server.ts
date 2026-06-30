import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import twilio from "twilio";
import fs from "fs";
import cors from "cors";
import { getAuth } from "firebase-admin/auth";
import { GoogleGenAI } from "@google/genai";
import { initDb } from "./backend/database/init";
import { verifyFirebaseToken } from "./backend/middleware/auth";
import collectionRoutes from "./backend/routes/collection.routes";
import { GenericRepository } from "./backend/repositories/generic.repository";
import { getAdminApp } from "./backend/firebase-admin";

dotenv.config();

// AI initialization
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS
  app.use(cors());

  // Initialize DB Tables in PostgreSQL (Exits process on failure)
  try {
    await initDb();
  } catch(e) {
    console.error("DB connection error:", e);
  }

  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  // Twilio Client (Lazy Initialization)
  let twilioClient: any = null;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV || "development", database: "firestore" });
  });

  // Modular Collection Routes
  app.use("/api/collections", verifyFirebaseToken, collectionRoutes);

  // Backward-Compatible department updates routes
  app.get("/api/department-updates", async (req, res) => {
    const { department } = req.query;
    try {
      const filters: Record<string, any> = {};
      if (department) filters.department = department;
      const updates = await GenericRepository.listDocuments("department_updates", filters);
      res.json(updates);
    } catch (error) {
      console.error('Error fetching department updates:', error);
      res.status(500).json({ success: false, message: 'Database connection unavailable.' });
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
      const created = await GenericRepository.createDocument("department_updates", id, newDoc);
      res.json({ success: true, data: created });
    } catch (error) {
      console.error('Error inserting department update:', error);
      res.status(500).json({ success: false, message: 'Database connection unavailable.' });
    }
  });

  // Backward-Compatible users route
  app.get("/api/users/:uid", async (req, res) => {
    try {
      const userDoc = await GenericRepository.getDocument("users", req.params.uid);
      if (!userDoc) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, data: userDoc });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ success: false, message: 'Database connection unavailable.' });
    }
  });

  // AI Analysis endpoint
  app.post("/api/ai/analyze", verifyFirebaseToken, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: "Missing prompt" });

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      res.json({ success: true, text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Transcription endpoint
  app.post("/api/transcribe", async (req, res) => {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing audioBase64 or mimeType" });
    }

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { text: "Transcribe the following audio content to text. Provide ONLY the transcribed text, no other conversation or filler." },
            { inlineData: { mimeType, data: audioBase64 } }
          ]
        }]
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Transcription Error:", error);
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  // SMS and Dispatch Logic
  app.post("/api/send-sms", async (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: "Missing recipient or message" });

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !from) {
        return res.status(412).json({ error: "SMS_NOT_CONFIGURED", message: "Twilio credentials missing." });
      }

      let clean = String(to).replace(/\D/g, '');
      if (clean.startsWith('0')) clean = '251' + clean.substring(1);
      const formattedTo = '+' + clean;

      if (!twilioClient) twilioClient = twilio(accountSid, authToken);
      
      const result = await twilioClient.messages.create({ body: message, to: formattedTo, from });

      // Log to DB
      await GenericRepository.createDocument("sim_sms_logs", undefined, {
        to: formattedTo,
        body: message,
        status: 'sent',
        sid: result.sid,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      });

      res.json({ success: true, sid: result.sid });
    } catch (error: any) {
      console.error("SMS Error:", error);
      if (error.code === 21608 || error.code === 21614) {
        return res.json({ success: true, simulated: true, warning: "Unverified number in trial mode." });
      }
      res.status(500).json({ error: "SMS_GATEWAY_ERROR", message: error.message });
    }
  });

  app.post("/api/dispatch-personnel", async (req, res) => {
    const { personnelId, phoneNumber, message } = req.body;
    if (!personnelId || !phoneNumber || !message) return res.status(400).json({ error: "Missing required fields" });

    try {
      // Update user phone number
      await GenericRepository.createDocument("users", personnelId, {
        phoneNumber,
        updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      });

      // Send SMS
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;

      if (accountSid && authToken && from) {
        let clean = String(phoneNumber).replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '251' + clean.substring(1);
        const formattedTo = '+' + clean;

        if (!twilioClient) twilioClient = twilio(accountSid, authToken);
        await twilioClient.messages.create({ body: message, to: formattedTo, from });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Dispatch Error:", error);
      res.status(500).json({ error: "DISPATCH_FAILED", message: error.message });
    }
  });

  // FCM Notifications
  app.post("/api/register-fcm-token", async (req, res) => {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) return res.status(400).json({ error: "Missing userId or fcmToken" });
    try {
      await GenericRepository.createDocument("users", userId, { fcmToken });
      res.json({ success: true });
    } catch (e: any) {
      res.json({ success: true, warning: "PostgreSQL save failed" });
    }
  });

  app.post("/api/send-fcm-notification", async (req, res) => {
    const { targetUserId, title, body, requestId } = req.body;
    if (!targetUserId || !title || !body) return res.status(400).json({ error: "Missing required fields" });
    try {
      const userDoc = await GenericRepository.getDocument("users", targetUserId);
      const fcmToken = userDoc?.fcmToken;

      if (!fcmToken) return res.status(404).json({ error: "No FCM token found" });

      const admin = await import("firebase-admin");
      const deepLinkUrl = requestId ? `/services?id=${requestId}` : "/";
      
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: { requestId: requestId || "", url: deepLinkUrl },
        android: { priority: "high", notification: { title, body, sound: "default" } },
        webpush: { 
          notification: { title, body, icon: "/pwa-512x512.png", badge: "/pwa-512x512.png" },
          fcmOptions: { link: deepLinkUrl }
        }
      });
      res.json({ success: true });
    } catch (e: any) {
      console.error("FCM Error:", e);
      res.status(500).json({ error: "Notification dispatch failed" });
    }
  });

  // Retrieval of Firebase auth users
  app.get("/api/firebase-users", async (req, res) => {
    try {
      const auth = getAuth(getAdminApp());
      const listUsersResult = await auth.listUsers();
      res.json(listUsersResult.users);
    } catch (error: any) {
      console.error("Error listing users:", error);
      res.json([]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical server error:", err);
  process.exit(1);
});
