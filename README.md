# ASSIST-AI

## AI-Supported Practice for Social Skills and Community Inclusion

**ASSIST-AI** is an accessible, multilingual virtual-assistant platform designed to help autistic adults practice everyday social and independent-living situations in a calm, structured environment. Through guided simulations, optional voice interaction, visual feedback, and repeatable step-by-step experiences, the platform supports users in building confidence and strengthening skills that can contribute to greater independence and inclusion in society.

**Formal project title:** *Design and Development of an Artificial Intelligence-Supported Virtual Assistant for Autistic Adults to Practice and Strengthen Social Skills and Support Inclusion in Society.*

The project combines an accessible React interface with a secure FastAPI and PostgreSQL backend. It currently includes a realistic ATM scenario and a first-draft online bill-payment scenario. Both let users rehearse common independent-living tasks without using real account, card, or banking details.

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

ASSIST-AI currently provides a production-ready project foundation, account and administration workflows, speech-provider management, usage controls, analytics, a fully interactive ATM scenario, and a first-draft online bill-payment scenario. The remaining catalogue scenarios are disabled previews for future development.

This version includes:

- Landing page
- Register, login, guest consent, and profile pages
- JWT authentication
- Admin dashboard for user approvals, denials, suspension, and activation
- Console email logging or real SMTP notifications for account request, approval, denial, suspension, and activation notices
- PostgreSQL users and guest sessions
- User category selection during sign up
- Scenario catalogue with the ATM and online bill-payment scenarios enabled
- Realistic ATM interface with clickable controls, card/receipt/cash animations, and synchronized sound effects
- ATM input through on-screen controls, a computer keyboard, or voice where supported
- Step-by-step online bill-payment draft with account setup, secured login attempts, localized bill details, guided card validation, payment retry, and PDF receipts
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

Other scenarios remain visible as locked or disabled previews while the ATM and online bill-payment scenarios are available.

## ATM Scenario Flow

The ATM scenario uses a realistic ATM image with responsive overlays for its screen, card slot, cash dispenser, receipt printer, numeric keypad, command keys, and alphabet keyboard. Its current flow is:

1. Read the introduction, enter a full name, and create a four-digit PIN for the session.
2. Start the ATM, click the displayed card, and wait for the insertion animation and sound to finish.
3. Enter the created PIN using the ATM keypad, computer keyboard, or voice, then press the ATM or computer **Enter** key to confirm.
4. Receive clear feedback after an incorrect PIN. Three incorrect attempts end the session for security and return the card.
5. After successful authentication, open the main menu to withdraw money, view account information, or leave the ATM.
6. For a withdrawal, select a preset amount or enter or say a custom amount, then press **Enter**. Insufficient funds return the user safely to amount selection.
7. Confirm the withdrawal and choose whether to print a receipt.
8. Wait for the receipt and cash animations and sounds. Cash must be collected by clicking the displayed money; the keyboard Enter key cannot collect it.
9. Choose another transaction or finish. On the withdrawal-complete screen, **Enter** means another transaction and returns to the menu.
10. When finishing, click the returned card after its animation and sound, then continue to the completion screen or scenario catalogue.

If the user remains inactive, the ATM displays and speaks periodic warnings. Preparing or actively using the microphone counts as activity: it resets and pauses the inactivity timer until listening ends. After one minute without any interaction, the session ends, the card is returned, and collecting it takes the user back to the scenario catalogue. Turkish sessions display Turkish lira; the other supported languages display euros.

The assistant stops speaking when the user begins recording, changes screens, leaves the scenario, or starts another message. Repeated fixed prompts can be served from the shared backend TTS cache, while dynamic name and PIN segments are generated only when needed.

Scenario analytics include registered and guest sessions and classify outcomes as **successful**, **abandoned**, or **security terminated**.

## Online Bill-Payment Draft Flow

The online bill-payment scenario is a modular first draft that follows the same calm, step-by-step visual style:

1. Read the introduction and create temporary first-name, last-name, username, and password details.
2. Log in with the newly created username and password. Three incorrect password attempts end the session and return the user to the introduction.
3. Receive a personalized welcome and select an unpaid electricity, natural-gas, water, or internet bill. A **Leave** option returns to the scenario catalogue.
4. Review realistic bill details such as the provider, subscription number, due date, and amount. Amounts are randomized for each new session: ₺100-₺500 in Turkish and €30-€120 in the other languages.
5. Choose credit-card payment and copy the generated cardholder name, grouped card number, expiry date, and CVV. The card flips to reveal the CVV, and optional visual hints identify each requested field.
6. Reject mismatched or expired card details with a localized error message.
7. Simulate a system failure on the first valid payment attempt, then complete the payment after the next valid attempt.
8. On success, play completion feedback and let the user view or download an electronic receipt as a PDF, pay another unpaid bill, or finish and leave.

Paid bills remain visibly marked and cannot be selected again during the same session. A right-side voice assistant automatically guides each step, welcomes the user by name, and announces bill amounts using natural spoken currency names. Registered users use server speech and cached audio first with browser speech as a fallback; guest sessions use browser speech.

The inactivity monitor displays and speaks warnings after 15, 30, and 45 seconds of user inactivity and ends the session after one minute. Assistant speech pauses the countdown without resetting elapsed inactivity; only user interaction resets it.

The complete flow, including guidance, validation, warnings, and error messages, is available in English, Turkish, German, Spanish, Portuguese, and French. Users are instructed to use only the made-up account and card details shown in the flow, never real details.

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

ASSIST-AI supports Azure AI Speech and Soniox through the backend, with browser speech available as a fallback where supported. Registered users follow the administrator-defined provider order and can fall back to browser speech after a provider error or exhausted allowance. Guest sessions use browser TTS and STT directly. The frontend never receives provider API keys. For backend TTS, it calls `POST /api/tts`, and the backend:

1. Confirms the user is logged in.
2. Checks the user's TTS character limit.
3. Looks for cached audio.
4. Calls the selected backend speech provider only when needed.
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

Global speech routing is stored in PostgreSQL and applies to registered users. Administrators can independently order TTS and STT providers, enable or disable providers, configure calendar or custom monthly periods, and edit provider-specific warning and switch values. Azure and Soniox support both TTS and STT. Guest sessions bypass paid providers and use browser speech when the client reports that capability.

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
