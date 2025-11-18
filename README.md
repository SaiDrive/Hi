<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1i-wCJ1BgWK8sjML_ZunNi5gKOaV0M1xM

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Auth Server (Google Login + MongoDB)

An Express-based auth server has been added in `server/index.ts` providing:

- `POST /api/auth/google` – Exchange a Google ID token for a session JWT and user record.
- `GET /api/auth/me` – Returns the authenticated user when a valid `Authorization: Bearer <token>` header is supplied.
- `GET /api/health` – Simple health check.

### Required Environment Variables
Set these in a `.env` file (or your deployment environment):

```
MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>/brand-ai?retryWrites=true&w=majority"
GOOGLE_CLIENT_ID="<your_google_oauth_client_id>"
JWT_SECRET="a_strong_random_secret"
PORT=5174
```

Notes:
- `GOOGLE_CLIENT_ID` must match the client ID used by your frontend Google Sign-In flow.
- `JWT_SECRET` can be any strong random string; rotate periodically.
- `PORT` defaults to `5174` if unset (chosen to avoid clashing with Vite `5173`).

### Install & Run Auth Server

```
npm install
npm run server
```

The server will log `Auth server listening on port <PORT>` when ready. Frontend calls use the relative `/api/...` paths and will hit this server if you proxy or serve both behind the same origin.

### Login Flow (Frontend)
1. Obtain Google ID token on the client (e.g. via Google Identity Services).
2. Call `login(googleToken)` from `services/authService.ts` – it POSTs to `/api/auth/google`.
3. Server verifies the ID token, upserts user, returns `{ token, user }`.
4. JWT is stored in `localStorage` for subsequent authenticated requests.

### MongoDB User Schema
Defined in `server/models/User.ts`:
```
googleId, email, name, avatarUrl, timestamps
```
Returned user object (frontend shape): `{ id, name, email }`.

### Testing Endpoints Quickly
After starting the server:
```
curl -X GET http://localhost:5174/api/health
```
For `/api/auth/google`, supply a real Google ID token:
```
curl -X POST http://localhost:5174/api/auth/google \
   -H 'Content-Type: application/json' \
   -d '{"token":"<GOOGLE_ID_TOKEN>"}'
```

### Troubleshooting
- Ensure MongoDB network access and credentials are correct.
- Verify the Google ID token audience matches `GOOGLE_CLIENT_ID`.
- If you see module resolution errors, re-run `npm install`.
- Use `console.log` in `server/index.ts` around verification for deeper diagnostics.
