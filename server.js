import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';

const app = express();

// 1. CORS: Isme localhost aur Vercel dono allowed hain
app.use(cors({
  origin: ["https://propertix-0-1.vercel.app", "http://localhost:5173"], 
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// 2. Neon DB Connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// 3. API Routes (Wahi rahenge)
app.get('/', (req, res) => res.send("Propertix Backend is Live on Railway! 🚀"));

app.post('/api/auth/register', async (req, res) => {
  const { name, email, role, walletAddress } = req.body;
  if (!walletAddress) return res.status(400).json({ message: "Wallet address required" });

  try {
    const newUser = await db.insert(users).values({
      name,
      email,
      role,
      walletAddress: walletAddress.toLowerCase(),
    }).returning();
    
    res.status(201).json({ success: true, message: "Saved to Neon DB!", user: newUser[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/user/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const result = await db.select().from(users).where(eq(users.walletAddress, address));
    if (result.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RAILWAY SPECIFIC FIX ---
// Change 1: 'export default app' ke bajaye seedha listen karein
// Change 2: '0.0.0.0' par listen karna zaroori hai Railway ke liye
const PORT = process.env.PORT || 5000; // Railway automatically sets process.env.PORT
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});