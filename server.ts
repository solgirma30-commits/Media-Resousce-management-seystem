import express from "express";
import path from "path";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Twilio Client (Lazy Initialization)
  let twilioClient: any = null;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
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

      // Format phone number to E.164
      let clean = to.replace(/\D/g, ''); // Remove all non-digits
      
      // Ethiopian mobile numbers are 9 digits after the '0' prefix (e.g., 0911234567 -> 9 digits)
      // Standard format: +251 <9-digits>
      
      if (clean.startsWith('0')) {
        // 0911223344 -> 251911223344
        clean = '251' + clean.substring(1);
      } else if (clean.startsWith('2510')) {
        // 2510911223344 -> 251911223344
        clean = '251' + clean.substring(4);
      } else if (clean.length === 9 && (clean.startsWith('9') || clean.startsWith('7'))) {
        // 911223344 -> 251911223344
        clean = '251' + clean;
      }
      
      const formattedTo = '+' + clean;

      console.log(`[SMS Gateway] Processing: "${to}" -> "${formattedTo}" (Final Digits: ${clean.length})`);
      
      // Basic validation: Ethiopian E.164 numbers should be exactly 12 digits (+ and 12 digits)
      if (clean.length !== 12 && clean.startsWith('251')) {
        console.warn(`[SMS Gateway] Warning: Potential invalid number length (${clean.length}). Expected 12 digits for Ethiopia (+251 9... or +251 7...).`);
      }

      if (!twilioClient) {
        twilioClient = twilio(accountSid, authToken);
      }
      
      const result = await twilioClient.messages.create({
        body: message,
        to: formattedTo,
        from,
      });

      console.log(`SMS sent successfully: ${result.sid}`);
      res.json({ success: true, sid: result.sid });
    } catch (error: any) {
      console.error("SMS Error:", error.message, error.code ? `(Code: ${error.code})` : "");
      res.status(error.status || 500).json({ 
        error: error.code ? `TWILIO_${error.code}` : "SMS_GATEWAY_ERROR",
        message: error.message,
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
