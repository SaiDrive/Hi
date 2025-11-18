import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

import UserModel from './models/User.js';

dotenv.config();

const app = express();
// Allow all origins temporarily (broad CORS). Replace '*' with explicit origins in production.
app.use(cors({ origin: '*', methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

// Environment variables (ensure these are set in your environment or .env file)
const MONGODB_URI = process.env.MONGODB_URI || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const PORT = process.env.PORT || 5174; // Choose a port different from Vite default 5173

if (!MONGODB_URI) {
	console.error('Missing MONGODB_URI environment variable.');
}
if (!GOOGLE_CLIENT_ID) {
	console.error('Missing GOOGLE_CLIENT_ID environment variable.');
}

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Connect to MongoDB
mongoose
	.connect(MONGODB_URI)
	.then(() => console.log('MongoDB connected'))
	.catch((err) => console.error('MongoDB connection error', err));

// Helper to generate JWT
function generateJwt(userId: string) {
	return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Auth middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
	const authHeader = req.headers.authorization;
	if (!authHeader) return res.status(401).json({ message: 'Missing Authorization header' });
	const token = authHeader.replace('Bearer ', '').trim();
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
		(req as any).userId = decoded.sub;
		next();
	} catch {
		return res.status(401).json({ message: 'Invalid token' });
	}
}

// POST /api/auth/google  Body: { token: string }
app.post('/api/auth/google', async (req, res) => {
	const { token } = req.body as { token?: string };
	if (!token) return res.status(400).json({ message: 'Missing token in body' });
	if (!GOOGLE_CLIENT_ID) return res.status(500).json({ message: 'Google auth not configured' });
	try {
		const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
		const payload = ticket.getPayload();
		if (!payload) return res.status(401).json({ message: 'Invalid Google token' });
		const googleId = payload.sub;
		const email = payload.email || '';
		const name = payload.name || email.split('@')[0];
		const avatarUrl = payload.picture;

		// Upsert user
		let user = await UserModel.findOne({ googleId });
		if (!user) {
			user = await UserModel.create({ googleId, email, name, avatarUrl });
		} else if (user.name !== name || user.avatarUrl !== avatarUrl) {
			user.name = name;
			user.avatarUrl = avatarUrl;
			await user.save();
		}

		const sessionToken = generateJwt(user._id.toString());
		return res.json({
			token: sessionToken,
			user: { id: user._id.toString(), name: user.name, email: user.email },
		});
	} catch (err) {
		console.error('Google auth error', err);
		return res.status(401).json({ message: 'Authentication failed' });
	}
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
	const userId = (req as any).userId as string;
	const user = await UserModel.findById(userId);
	if (!user) return res.status(404).json({ message: 'User not found' });
	return res.json({ id: user._id.toString(), name: user.name, email: user.email });
});

// Basic health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
	console.log(`Auth server listening on port ${PORT}`);
});
