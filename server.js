import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';

const app = express();

// 1. IMPROVED CORS: Network Error se bachne ke liye wildcard handle kiya hai
app.use(cors({
  origin: ["https://propertix-0-1.vercel.app", "http://localhost:5173"], 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Pre-flight requests (OPTIONS) ko handle karne ke liye
app.options('*', cors());

app.use(express.json());

// 2. Neon DB Connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// 3. Health Check: Railway/Browser verification ke liye
app.get('/', (req, res) => {
    res.status(200).send("Propertix Backend is Live and Healthy! 🚀");
});

// 4. API: Register User
app.post('/api/auth/register', async (req, res) => {
  const { name, email, role, walletAddress } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ success: false, message: "Wallet address is required" });
  }

  try {
    console.log("Attempting to register:", walletAddress);
    
    const newUser = await db.insert(users).values({
      name,
      email,
      role,
      walletAddress: walletAddress.toLowerCase(),
    }).returning();
    
    res.status(201).json({ 
      success: true, 
      message: "Saved to Neon DB!", 
      user: newUser[0] 
    });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Database error or User already exists",
      error: err.message 
    });
  }
});

// 5. API: Get User Profile
app.get('/api/auth/user/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const result = await db.select().from(users).where(eq(users.walletAddress, address));
    
    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RAILWAY CONFIGURATION ---
const PORT = process.env.PORT || 5000;
// 0.0.0.0 par listen karna mandatory hai Railway ke liye
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server successfully running on port ${PORT}`);
});
