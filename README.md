# ASSIST-AI

## AI-Supported Practice for Social Skills and Community Inclusion

**ASSIST-AI** is an accessible, multilingual virtual-assistant platform designed to help autistic adults practice everyday social and independent-living situations in a calm, structured environment. Through guided simulations, optional voice interaction, visual feedback, and repeatable step-by-step experiences, the platform supports users in building confidence and strengthening skills that can contribute to greater independence and inclusion in society.

**Formal project title:** *Design and Development of an Artificial Intelligence-Supported Virtual Assistant for Autistic Adults to Practice and Strengthen Social Skills and Support Inclusion in Society.*

The project combines an accessible React interface with a secure FastAPI and PostgreSQL backend. Its first complete simulation is a realistic ATM practice scenario where users can safely rehearse name confirmation, PIN entry, identity verification, error recovery, and security-related outcomes without providing real banking information.

> ASSIST-AI is an educational practice tool. It does not provide medical advice, replace professional support, or request real banking credentials.

## Project Purpose

ASSIST-AI explores how artificial intelligence and virtual-assistant technologies can provide consistent, low-pressure practice for situations that may otherwise feel unfamiliar or stressful. The platform is designed around the following principles:

- **Predictable guidance:** scenarios are divided into clear, manageable steps.
- **Multiple interaction methods:** users can respond through speech, typing, or realistic on-screen controls where supported.
- **Calm error recovery:** mistakes produce understandable guidance and safe opportunities to try again.
- **Accessible repetition:** users can repeat assistant messages and practice scenarios at their own pace.
- **Multilingual access:** interface text, assistant guidance, speech synthesis, and speech recognition support six languages.
- **Privacy-conscious simulation:** practice data is separated from real-world sensitive information.
- **Responsible administration:** account approval, quotas, provider routing, and scenario analytics are managed through protected admin tools.

## Supported Languages

- English
- Turkish
- German
- Spanish
- Portuguese
- French

The selected language controls the interface, feedback, errors, and assistant prompts. Name recognition is designed to remain flexible across supported languages so that a person's name is not unnecessarily restricted by the interface language.

## Technology Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, Alembic, JWT authentication
- Database: PostgreSQL via Docker Compose
- Speech: Microsoft Azure AI Speech, Soniox, and browser fallback according to administrator-defined routing order
- Deployment: Docker Compose, Nginx, and Linux VPS support
- Data: Persisted users, guest sessions, scenario analytics, speech quotas, provider events, usage periods, and cached TTS metadata

## Architecture

```text
Browser
  -> React + TypeScript frontend
  -> Docker frontend Nginx
  -> FastAPI backend
  -> PostgreSQL
  -> Azure AI Speech / Soniox / browser fallback
```

Speech-provider secrets remain in the backend environment and are never included in the browser bundle. The backend authenticates requests, enforces personal and provider quotas, records usage, applies provider routing, and returns generated audio or recognized text to the frontend.

## Current Status

ASSIST-AI currently provides a production-ready project foundation, account and administration workflows, speech-provider management, usage controls, analytics, and one fully interactive ATM scenario. Eleven additional scenarios are presented in the catalogue as disabled previews for future development.

This version includes:

- Landing page
- Register, login, guest consent, and profile pages
- JWT authentication
- Admin dashboard for user approvals, denials, suspension, and activation
- Console email logging or real SMTP notifications for account request, approval, denial, suspension, and activation notices
- PostgreSQL users and guest sessions
- User category selection during sign up
- Scenario catalogue with the ATM scenario enabled
- Realistic ATM practice interface with clickable keypad and keyboard overlays
- Azure and Soniox speech-provider support with configurable TTS/STT priority and browser fallback
- Per-user TTS/STT quotas, temporary allowances, quota requests, warnings, and audit history
- Backend TTS audio caching for repeated fixed prompts and split dynamic PIN/name segments
- Speech input for supported steps and applause feedback on success
- `GET /health`
- `GET /api/scenarios`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /guests/session`
- `GET /admin/users`
- `GET /admin/users/pending`
- `POST /admin/users/{user_id}/approve`
- `POST /admin/users/{user_id}/deny`
- `POST /admin/users/{user_id}/suspend`
- `POST /admin/users/{user_id}/activate`
- `POST /admin/email/test`
- `GET /api/tts/usage`
- `POST /api/tts`

Other scenarios are visible as locked or disabled previews while the ATM scenario is the active practice flow.

## ATM Practice Flow

The ATM scenario uses a realistic ATM image with responsive interactive overlays for the screen, numeric keypad, command keys, and alphabet keyboard. Its current flow is:

1. Start the practice session.
2. Say or type a full name.
3. Review the recognized name and confirm it after a three-second safety delay.
4. Enter a randomly generated four-digit practice PIN by keypad or voice.
5. Experience a simulated system problem on the first PIN submission and enter the PIN again.
6. Complete an identity check using the second letter of the first name and the final letter of the surname.
7. Continue according to the stored PIN result and identity-verification result.
8. Finish successfully, retry safely, or end the session after repeated security failures.

The assistant stops speaking when the user begins recording, changes screens, leaves the scenario, or starts another message. Repeated fixed prompts can be served from the shared backend TTS cache, while dynamic name and PIN segments are generated only when needed.

Scenario analytics classify completed sessions as **successful**, early exits as **abandoned**, and repeated verification or post-verification PIN failures as **security terminated**.

## User Roles

- **Registered user:** accesses approved scenarios, profile preferences, personal speech usage, and quota requests.
- **Guest:** can preview the catalogue and use supported guest flows with an explicit progress-saving choice.
- **Administrator:** manages accounts, speech providers, personal quotas, requests, and scenario analytics.

Backend authorization protects every administrative API. Frontend navigation and route guards improve the experience but are not treated as the security boundary.

## Run PostgreSQL

```bash
cd backend
docker compose up -d postgres
```

PostgreSQL runs at `localhost:5432` with the development credentials from `backend/.env.example`.

## Run Migrations

```bash
cd backend
.venv\Scripts\activate
alembic upgrade head
```

## Create the First Admin

Create `backend/.env` from `backend/.env.example`, then set:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_this_password
ADMIN_FULL_NAME=ASSIST-AI Admin
ADMIN_NOTIFICATION_EMAIL=admin@example.com
APP_FRONTEND_URL=http://localhost:5173
EMAIL_ENABLED=false
EMAIL_BACKEND=console
```

Run:

```bash
cd backend
.venv\Scripts\activate
python scripts\create_admin.py
```

The script creates or updates the admin account with `role=admin`, `approval_status=approved`, and `is_active=true`.

## Email Notifications

By default, ASSIST-AI uses console email logging for development. Account request, approval, denial, and admin notification emails are logged to the backend console and no real SMTP message is sent.

To enable real SMTP, set these values in `backend/.env` and restart the backend:

```env
EMAIL_ENABLED=true
EMAIL_BACKEND=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_username
SMTP_PASSWORD=your_password
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_FROM_NAME=ASSIST-AI
SMTP_USE_TLS=true
SMTP_USE_SSL=false
ADMIN_NOTIFICATION_EMAIL=admin@example.com
APP_FRONTEND_URL=http://localhost:5173
```

Use `SMTP_USE_TLS=true` for STARTTLS on port 587. Use `SMTP_USE_SSL=true` for SSL on port 465. If SMTP is enabled but required config is missing, the backend falls back to console logging and writes a warning without exposing SMTP credentials.

After logging in as an admin, send a test email with:

```bash
curl -X POST http://127.0.0.1:8000/admin/email/test -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

The endpoint returns `{"message":"Test email processed."}` whether the message was handled by console mode or SMTP mode.

## Speech Services

ASSIST-AI supports Azure AI Speech and Soniox through the backend, with browser speech available as a final fallback where supported. The frontend never receives provider API keys. For TTS, it calls `POST /api/tts`, and the backend:

1. Confirms the user is logged in.
2. Checks the user's TTS character limit.
3. Looks for cached audio.
4. Calls Azure only when needed.
5. Updates PostgreSQL usage.
6. Returns MP3 audio to the frontend.

Add these values to `backend/.env`:

```env
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=swedencentral
TTS_DEFAULT_LIMIT_CHARACTERS=5000
TTS_MAX_REQUEST_CHARACTERS=1000
TTS_DEFAULT_VOICE=en-US-JennyNeural
TTS_CACHE_DIR=media/tts-cache
AZURE_TTS_MONTHLY_LIMIT_CHARACTERS=500000
AZURE_STT_MONTHLY_LIMIT_SECONDS=18000
SPEECH_WARNING_THRESHOLD_PERCENT=80
SPEECH_SWITCH_THRESHOLD_PERCENT=95
SONIOX_API_KEY=
SONIOX_STT_MODEL=stt-async-v5
SONIOX_STT_MONTHLY_LIMIT_SECONDS=36000
SONIOX_TTS_MODEL=tts-rt-v1
SONIOX_TTS_VOICE=Adrian
SONIOX_TTS_MONTHLY_LIMIT_CHARACTERS=500000
SONIOX_API_TIMEOUT_SECONDS=30
SPEECH_PROVIDER_COOLDOWN_SECONDS=300
DEFAULT_USER_TTS_LIMIT_CHARACTERS=5000
DEFAULT_USER_STT_LIMIT_SECONDS=300
DEFAULT_USER_QUOTA_PERIOD=weekly
USER_QUOTA_WARNING_PERCENT=80
USER_QUOTA_CRITICAL_PERCENT=95
COUNT_BROWSER_USAGE_AGAINST_USER_QUOTA=false
ADMIN_QUOTA_REQUEST_EMAIL=admin@example.com
```

The voice assistant supports the site languages with Azure neural voices:

- English: `en-US-JennyNeural`
- Spanish: `es-ES-ElviraNeural`
- German: `de-DE-KatjaNeural`
- Turkish: `tr-TR-EmelNeural`
- Portuguese: `pt-PT-RaquelNeural`
- French: `fr-FR-DeniseNeural`

TTS billing is character-based, so ASSIST-AI tracks usage by characters, not tokens. The frontend shows the remaining voice allowance in the top navigation for logged-in users.

Generated audio is cached under `backend/media/tts-cache`, and metadata is stored in PostgreSQL. The `backend/media/` folder is ignored by Git because cached audio is generated locally. Repeated prompts are returned from cache without using new TTS characters. PIN and name-confirmation prompts are split so fixed sentence parts can be cached while only the dynamic name or PIN part is generated when needed.

Administrators can open **Speech Provider Management** to monitor monthly TTS character usage and STT duration, configure each provider, and arrange separate priority orders for TTS and STT. When a provider reaches its configured switch value or cannot complete a request, the backend selects the next enabled provider in that service's priority order.

The monthly provider totals are global estimates based only on ASSIST-AI requests; Azure does not provide a remaining-free-quota API. They are separate from each user's weekly TTS and STT allowance. Cached TTS audio and browser speech do not consume the estimated Azure quota, and request IDs prevent retries from being counted twice.

Global speech routing is stored in PostgreSQL and becomes effective for registered users and supported guest requests. Administrators can independently order TTS and STT providers, enable or disable providers, configure calendar or custom monthly periods, and edit provider-specific warning and switch values. Azure and Soniox support both TTS and STT, while browser speech is used only when the client reports that capability.

Provider warning and automatic-switch levels are configured as real usage values rather than percentages. TTS levels use characters and STT levels use audio seconds. Crossing a warning level sends one email per provider and billing period to `ADMIN_NOTIFICATION_EMAIL` (or `ADMIN_EMAIL` when no notification address is set). Crossing the switch level makes the next eligible provider in the configured priority order active for subsequent requests.

## Per-User Speech Quotas

Personal quotas are separate from global provider quotas. A registered user must have enough personal allowance before an enabled, healthy provider can process a request. TTS is measured in generated characters and cached playback is free. STT is measured in audio seconds. Browser speech is excluded by default and can be included with `COUNT_BROWSER_USAGE_AGAINST_USER_QUOTA=true`.

Users can open **My Speech Usage** to review usage, remaining allowance, reset dates, status, request history, and request additional access. Administrators can open **User Speech Quotas** to search users, edit individual permanent limits, add temporary current-period allowances, disable speech access, and approve or reject quota requests. Temporary allowances expire at reset, while permanent changes remain. Adjustments and request decisions are audited, and previous usage periods are preserved.

Default quotas are stored in PostgreSQL with environment-backed initial values. Admin all-user updates distinguish future users, users still using defaults, and explicit overrides of every user. Quota-request email uses `ADMIN_QUOTA_REQUEST_EMAIL`, then falls back to the existing admin notification addresses.

## Run the Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

If the frontend shows an Azure Speech configuration error, check that `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` are set in `backend/.env`, then restart the backend.

## Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`.

If your backend uses a different URL, copy `frontend/.env.example` to `frontend/.env` and update `VITE_API_BASE_URL`.

## Test Authentication

1. Start PostgreSQL with `docker compose up -d postgres` from `backend/`.
2. Run `alembic upgrade head` from `backend/`.
3. Create the first admin with `python scripts\create_admin.py`.
4. Start the backend with `python -m uvicorn app.main:app --reload`.
5. Start the frontend with `npm run dev` from `frontend/`.
6. Register a normal user with the `Personal User` category.
7. Confirm the backend logs console emails to the user and admin.
8. Try logging in as the pending user and confirm login is blocked.
9. Log in as admin and open `/admin/users`.
10. Approve the pending user.
11. Confirm the backend logs a console approval email.
12. Logout admin, then log in as the approved user.
13. Register another user and deny that user from the admin dashboard.
14. Confirm the denied user cannot log in.
15. Try `Continue as Guest`, choose whether to save progress, and confirm scenarios are accessible.

To test real SMTP, set `EMAIL_ENABLED=true`, `EMAIL_BACKEND=smtp`, and your SMTP variables in `backend/.env`, restart the backend, call `POST /admin/email/test`, then repeat registration, approval, denial, suspension, and activation with test users.

To test Azure TTS, set the Azure Speech variables in `backend/.env`, restart the backend, log in as an approved user, open the ATM scenario, and confirm the assistant speaks. The first time a prompt is spoken it may spend TTS characters; repeated cached prompts should reuse saved audio.

## Docker Deployment

Production Docker files are included for PostgreSQL, the FastAPI backend, and the React/Nginx frontend. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to deploy ASSIST-AI on a Linux VPS.
