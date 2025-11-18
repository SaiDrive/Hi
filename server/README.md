# Brand Ambassador AI - Auth Server

Express-based authentication server with MongoDB and Google OAuth.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `MONGODB_URI` - MongoDB connection string
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `JWT_SECRET` - Secret for signing JWTs
   - `PORT` - Server port (default: 3000)

3. **Start the server:**
   ```bash
   npm start        # Production
   npm run dev      # Development (with auto-reload)
   ```

## API Endpoints

### `POST /api/auth/google`
Exchange Google ID token for session JWT.

**Request:**
```json
{
  "token": "google_id_token_here"
}
```

**Response:**
```json
{
  "token": "session_jwt_token",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

### `GET /api/auth/me`
Get current authenticated user.

**Headers:**
```
Authorization: Bearer <session_jwt_token>
```

**Response:**
```json
{
  "id": "user_id",
  "name": "User Name",
  "email": "user@example.com"
}
```

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "ok": true
}
```

## Database Schema

### User Model
```typescript
{
  googleId: string;     // Google account ID (unique)
  email: string;        // User email
  name: string;         // Display name
  avatarUrl?: string;   // Profile picture URL
  createdAt: Date;      // Auto-generated
  updatedAt: Date;      // Auto-generated
}
```

## Development

- Uses `tsx` for TypeScript execution
- Hot reload with `npm run dev`
- CORS enabled for all origins (configure for production)
- JWT tokens expire after 7 days

## Testing

Quick health check:
```bash
curl http://localhost:3000/api/health
```

Test Google auth (requires valid Google ID token):
```bash
curl -X POST http://localhost:3000/api/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"token":"YOUR_GOOGLE_ID_TOKEN"}'
```
