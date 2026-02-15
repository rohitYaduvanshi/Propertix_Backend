import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';

const app = express();

// CORS configuration (Security ke liye production URL dalna behtar hai)
app.use(cors());
app.use(express.json());

// 1. Neon DB Connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// 2. API: Health Check
app.get('/', (req, res) => res.send("Propertix Neon Backend is Live on Vercel! 🚀"));

// 3. API: Register User
app.post('/api/auth/register', async (req, res) => {
  const { name, email, role, walletAddress } = req.body;
  
  try {
    console.log("Registering user:", walletAddress);
    
    const newUser = await db.insert(users).values({
      name: name,
      email: email,
      role: role,
      walletAddress: walletAddress.toLowerCase(),
    }).returning();
    
    res.status(201).json({ 
      success: true, 
      message: "User saved to Neon DB!", 
      user: newUser[0] 
    });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Database error or user already exists" 
    });
  }
});

// 4. API: Get User Profile
app.get('/api/auth/user/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const result = await db.select().from(users).where(eq(users.walletAddress, address));

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found in DB" });
    }
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- VERCEL SPECIFIC UPDATE ---

// Vercel handles the serverless execution, so app needs to be exported
export default app;

// Listen only when running locally (Not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Local Server running on http://localhost:${PORT}`);
  });
}