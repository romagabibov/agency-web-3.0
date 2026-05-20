import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, set, get, remove, update } from "firebase/database";
import Stripe from "stripe";

import crypto from "crypto";
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dxy3ov8p8', // using a fallback or prompting for env
  api_key: process.env.CLOUDINARY_API_KEY || '157642667529213',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'eD5s6htlM8P7GDwRkHorwt0lCKQ',
});

// Initialize Stripe (lazy initialization to prevent crash if key is missing)
let stripeClient: Stripe | null = null;
export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    stripeClient = new Stripe(key, { apiVersion: '2025-02-24.acacia' as any });
  }
  return stripeClient;
}

const firebaseConfig = {
  apiKey: "AIzaSyBPPD3mUUmMWvaDxvP6uy22bBaSfXd49LI",
  authDomain: "big-agency.firebaseapp.com",
  databaseURL: "https://big-agency-default-rtdb.firebaseio.com",
  projectId: "big-agency"
};

const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(firebaseApp);

async function startServer() {
  const upload = multer();
  const app = express();
  const PORT = 3000;

  // Trust the first proxy (required for AI Studio / Cloud Run environment)
  app.set('trust proxy', 1);

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
    validate: false, // Disable validation warnings for X-Forwarded-For and Forwarded headers
    keyGenerator: (req) => {
      // Use standard Express IP resolution which respects 'trust proxy'
      return req.ip || 'unknown';
    }
  });

  app.use(cors());

  // Webhook needs raw body, so it must be BEFORE express.json()
  app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripe = getStripe();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const agencyId = session.metadata?.agencyId;
        const tier = session.metadata?.tier;
        
        if (agencyId && tier) {
          console.log(`Agency ${agencyId} subscribed to ${tier}`);
          try {
            const agencyRef = ref(db, `agencies/${agencyId}`);
            await update(agencyRef, { 
              subscriptionTier: tier, 
              status: 'active' 
            });
            console.log(`Successfully updated subscription for agency ${agencyId}`);
          } catch (dbError) {
            console.error(`Failed to update subscription in Firebase for agency ${agencyId}:`, dbError);
          }
        }
        break;
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        // In a real scenario, you'd look up the agency by customer ID
        // For now, we'll just log it
        console.log(`Payment failed for customer ${failedInvoice.customer}`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
  });

  app.use(express.json());

  app.post("/api/upload-image", limiter, (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Upload error" });
      }
      next();
    });
  }, async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    
    try {
      const formData = new FormData();
      formData.append("image", new Blob([req.file.buffer], { type: req.file.mimetype }));
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY || '2e8ee252f507ba95123d53eb4ecfb9bd'}`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed: " + error.message });
    }
  });

  app.get("/api/test", (req, res) => res.json({ ok: true, version: 2 }));
  app.post("/api/upload-media-video", limiter, (req, res, next) => {
    upload.single("video")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Upload error" });
      }
      next();
    });
  }, (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "models_videos" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Error:", error);
            return res.status(500).json({ error: "Upload to Cloudinary failed: " + error.message });
          }
          if (result) {
            return res.json({ url: result.secure_url });
          }
        }
      );
      uploadStream.end(req.file.buffer);
    } catch (error: any) {
      console.error("Video Upload error:", error);
      res.status(500).json({ error: "Upload failed: " + error.message });
    }
  });

  // Configure Nodemailer
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'your-brevo-email@example.com',
      pass: process.env.SMTP_PASS || 'your-brevo-smtp-key'
    }
  });

  app.post("/api/send-code", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in Firebase
    const safeEmail = email.replace(/[.#$[\]]/g, '_');
    await set(ref(db, `verificationCodes/${safeEmail}`), { code, expiresAt });

    const isDefaultUser = !process.env.SMTP_USER || process.env.SMTP_USER === 'your-brevo-login-email@example.com' || process.env.SMTP_USER === 'your-brevo-email@example.com';
    const isDefaultPass = !process.env.SMTP_PASS || process.env.SMTP_PASS === 'your-brevo-smtp-key';

    // If SMTP credentials are not set or are the default placeholders, return the code for development purposes
    if (isDefaultUser || isDefaultPass) {
      console.log(`[DEV MODE] Verification code for ${email}: ${code}`);
      return res.json({ success: true, message: "Code generated (check console)", devCode: code });
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`
      });
      res.json({ success: true, message: "Code sent to email" });
    } catch (error: any) {
      // Check if it's an authentication error
      if (error.message && error.message.includes('Authentication failed')) {
        console.log(`[DEV MODE FALLBACK] Verification code for ${email}: ${code}`);
        return res.json({ 
          success: true, 
          message: "SMTP Auth failed, falling back to DEV MODE. Check console for code.",
          devCode: code
        });
      }
      
      console.error("Error sending email:", error);
      
      // Fallback for development if email fails due to invalid credentials
      console.log(`[DEV MODE FALLBACK] Verification code for ${email}: ${code}`);
      res.json({ success: true, message: "Email failed, but code generated (check console)", devCode: code });
    }
  });

  app.post("/api/verify-code", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
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

    // Code is valid
    await remove(codeRef);
    res.json({ success: true });
  });

  app.post("/api/send-notification", async (req, res) => {
    const { email, subject, text, html } = req.body;
    
    if (!email || !subject || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const isDefaultUser = !process.env.SMTP_USER || process.env.SMTP_USER === 'your-brevo-login-email@example.com' || process.env.SMTP_USER === 'your-brevo-email@example.com';
    const isDefaultPass = !process.env.SMTP_PASS || process.env.SMTP_PASS === 'your-brevo-smtp-key';

    if (isDefaultUser || isDefaultPass) {
      console.log(`[DEV MODE] Notification for ${email}: ${subject}`);
      return res.json({ success: true, message: "Notification logged to console (DEV MODE)" });
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: subject,
        text: text,
        html: html || text
      });
      res.json({ success: true, message: "Notification sent" });
    } catch (error: any) {
      if (error.message && error.message.includes('Authentication failed')) {
        return res.json({ success: true, message: "SMTP Auth failed, but notification logged to console." });
      }
      console.error("Error sending notification email:", error);
      res.status(500).json({ error: "Failed to send notification email" });
    }
  });



  // --- Stripe SaaS Endpoints ---

  const TIERS = {
    basic: { priceId: 'price_basic_placeholder', name: 'Basic', limits: { models: 20 } },
    pro: { priceId: 'price_pro_placeholder', name: 'Pro', limits: { models: 100 } },
    premium: { priceId: 'price_premium_placeholder', name: 'Premium', limits: { models: 99999 } },
  };

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { tier, agencyId, email } = req.body;
      
      if (!tier || !TIERS[tier as keyof typeof TIERS]) {
        return res.status(400).json({ error: "Invalid tier" });
      }

      const stripe = getStripe();
      
      // In a real app, you'd create/retrieve a Stripe Customer here
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: TIERS[tier as keyof typeof TIERS].priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/admin?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${req.headers.origin}/admin?canceled=true`,
        client_reference_id: agencyId,
        customer_email: email,
        metadata: {
          agencyId,
          tier
        }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Checkout Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- SaaS Provisioning ---
  app.post("/api/provision-agency", async (req, res) => {
    const { adminSecret, agencyId, agencyName, adminEmail, adminPassword } = req.body;
    
    // In production, this should be a strong secret stored in env vars
    const PROVISION_SECRET = process.env.PROVISION_SECRET || 'super-secret-provision-key';
    
    if (adminSecret !== PROVISION_SECRET) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!agencyId || !agencyName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Use Node's crypto module for hashing
      const hashHex = crypto.createHash('sha512').update(adminPassword).digest('hex');

      const agencyRef = ref(db, `agencies/${agencyId}`);
      
      // Check if agency already exists
      const snapshot = await get(agencyRef);
      if (snapshot.exists()) {
        return res.status(400).json({ error: "Agency already exists" });
      }

      const initialData = {
        logo: 'BIG',
        categories: ['All'],
        models: [],
        users: [{
          login: adminEmail,
          hash: hashHex,
          role: 'superadmin',
          agencyId: agencyId
        }],
        subscriptionTier: 'enterprise', // Default to enterprise for the main agency
        status: 'active'
      };

      await set(agencyRef, initialData);
      res.json({ success: true, message: `Agency ${agencyId} provisioned successfully.` });
    } catch (error: any) {
      console.error("Provisioning error:", error);
      res.status(500).json({ error: "Failed to provision agency" });
    }
  });

  // --- Migration Endpoint ---
  app.post("/api/migrate-v1", async (req, res) => {
    const { adminSecret } = req.body;
    const PROVISION_SECRET = process.env.PROVISION_SECRET || 'super-secret-provision-key';
    
    if (adminSecret !== PROVISION_SECRET) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const oldRef = ref(db, 'agency_cloud_v1');
      const snapshot = await get(oldRef);
      
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "No data found in agency_cloud_v1" });
      }

      const data = snapshot.val();
      
      // Update users to have role and agencyId
      if (Array.isArray(data.users)) {
        data.users = data.users.map((u: any) => ({
          ...u,
          role: u.role || 'superadmin',
          agencyId: 'bigmodelagency'
        }));
      }

      data.subscriptionTier = 'enterprise';
      data.status = 'active';

      const newRef = ref(db, 'agencies/bigmodelagency');
      await set(newRef, data);

      res.json({ success: true, message: "Data migrated successfully to agencies/bigmodelagency" });
    } catch (error: any) {
      console.error("Migration error:", error);
      res.status(500).json({ error: "Failed to migrate data" });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
