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
- Speech: Soniox with browser speech as fallback
- Computer vision: browser-based MediaPipe face landmarks, approximate head rotation and eye direction
- Deployment: Docker Compose, Nginx, and Linux VPS support
- Data: Persisted users, guest sessions, scenario analytics, consented derived computer-vision recordings, speech quotas, provider events, usage periods, and cached TTS metadata

## Architecture

```text
Browser
  -> React + TypeScript frontend
  -> Docker frontend Nginx
  -> FastAPI backend
  -> PostgreSQL
  -> Soniox / browser fallback
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
- Step-by-step online bill-payment draft with guided account setup, secured login attempts, localized bill details, automatic card-field guidance, spoken validation, and PDF receipts
- Soniox speech-provider support with configurable TTS/STT priority and browser fallback
- Per-user TTS/STT quotas, temporary allowances, quota requests, warnings, and audit history
- Backend TTS audio caching for repeated fixed prompts and split dynamic PIN/name segments
- Speech input for supported steps and applause feedback on success
- Required Yes/No computer-vision recording choice in both scenario setup forms, with neither option preselected
- Consented browser face tracking with derived session recording; no stored webcam video, images, or landmarks
- Admin computer-vision recordings grouped by scenario, with a simple overview, head-movement charts, and expandable technical details
- Admin-only local computer-vision preview below the scenario's voice assistant
- Official current-month Soniox costs and model/daily usage, separate from ASSIST-AI estimates
- `GET /health`
- `GET /api/scenarios`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /guests/session`
- `GET /api/admin/users`
- `GET /api/admin/users/pending`
- `POST /api/admin/users/{user_id}/approve`
- `POST /api/admin/users/{user_id}/deny`
- `POST /api/admin/users/{user_id}/suspend`
- `POST /api/admin/users/{user_id}/activate`
- `POST /api/admin/email/test`
- `GET /api/tts/usage`
- `POST /api/tts`
- `POST /api/stt`
- `POST /api/computer-vision-sessions`
- `GET /api/admin/computer-vision-sessions`
- `GET /api/admin/computer-vision-sessions/{session_id}`
- `GET /api/admin/computer-vision-preview`
- `GET /api/admin/speech-providers/soniox-usage`

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

Online Bill Payment is also available under **Admin → Scenario Analytics**. Tracking starts when the practice run opens and respects guest progress consent. It records login attempts and failures, card-validation errors, payment attempts, paid-bill counts, back navigation, language, duration, final step, and exit/timeout reasons. Credentials and card details are never sent to analytics. A visit can include multiple bills; on exit it is successful if at least one bill was paid, otherwise abandoned (or security terminated after login lockout). Active visits remain visible as in progress. Administrators can filter sessions and open each user's or guest's history. Existing visits before this feature cannot be reconstructed.

Bill-payment analytics were introduced in migration `20260930_0015`. Before running this version against an existing database, apply all migrations with `alembic upgrade head`; the current head is `20261001_0017`.

## Online Bill-Payment Draft Flow

The online bill-payment scenario is a modular first draft that follows the same calm, step-by-step visual style:

1. Listen to the welcoming introduction, review the example bill dashboard, select **Start**, and create the temporary account information used for the activity.
2. Log in with the newly created username and password. Three incorrect username or password attempts end the session and return the user to the introduction.
3. Receive a personalized welcome and select an unpaid electricity, natural-gas, water, or internet bill. A **Leave** option returns to the scenario catalogue.
4. Review a concise bill summary containing the customer, subscription number, due date, and amount. Amounts are randomized for each new session: ₺100-₺500 in Turkish and €30-€120 in the other languages.
5. Choose credit-card payment and copy the cardholder name, grouped card number, expiry date, and CVV from the generated card. Selecting an input highlights the matching place on the card, and selecting CVV flips the card automatically.
6. Reject mismatched, incomplete, or expired card details with localized text and voice feedback. The cardholder field starts empty and must match the account name displayed on the card.
7. Complete the payment immediately when all entered card information is correct; there is no intentional first-attempt failure.
8. On success, play completion feedback and display the electronic receipt automatically. The user can download it as a PDF, pay another unpaid bill, or finish and leave.

Paid bills remain visibly marked and cannot be selected again during the same session. A right-side voice assistant automatically guides each step and welcomes the user by name. Bill-review guidance stays general instead of reading the exact amount aloud. Registered users use Soniox and cached server audio first with browser speech as a fallback; guest sessions use browser speech.

The inactivity monitor displays and speaks warnings after 15, 30, and 45 seconds of user inactivity and ends the session after one minute. Assistant speech pauses the countdown without resetting elapsed inactivity; only user interaction resets it.

The complete flow, including guidance, validation, warnings, and error messages, is available in English, Turkish, German, Spanish, Portuguese, and French. Users are instructed to use only the made-up account and card details shown in the flow, never real details.

## Computer Vision

ATM Withdrawal and Online Bill Payment both ask whether face and eye movement data may be saved. Neither Yes nor No is preselected, and the user must choose before starting. This choice is separate from guest progress consent and the browser's camera permission prompt.

After Yes, the scenario initializes one local webcam stream and MediaPipe face tracking in the browser. No leaves the camera and MediaPipe inactive. Permission denial or an unavailable camera does not prevent the scenario from continuing. Normal users see no camera preview or landmark overlay. Tracking, camera tracks, timers, and interaction listeners stop when the scenario finishes, times out, terminates, or the user leaves.

The browser calculates approximate yaw (left/right rotation), pitch (up/down rotation), roll (head tilt), and eye direction (`left`, `center`, `right`, or unknown). These are descriptive estimates, not precise gaze tracking or measures of attention.

Derived values are collected every 500 ms. Each tracking point contains elapsed milliseconds, yaw, pitch, roll, estimated eye direction, and a keyboard/mouse activity flag. Missing or stale tracking produces null values. Keyboard input, mouse clicks, and meaningful pointer movement mark activity for 1.5 seconds; these points remain in the recording. Input text and pressed keys are not recorded.

Completed sessions are submitted to the backend only with Yes consent and linked to the authenticated user or guest, scenario, and scenario attempt when available. The database stores one session and its tracking points. Duplicate submissions are protected, and a save failure does not block scenario completion. Raw camera video, images, frames, and landmark arrays are never submitted or stored.

Administrators can open **Computer Vision Recordings** at `/admin/computer-vision`, choose ATM Withdrawal or Online Bill Payment, and review paginated recordings. Session details show duration, tracking availability, keyboard/mouse activity, the most common eye direction, direction changes, and the three head-movement ranges. Charts show movement over time, with subtle activity highlights and gaps for unavailable tracking. Detailed statistics, session IDs, and tracking rows are collapsed by default. Backend authorization protects the recordings and preview authorization APIs.

When an administrator runs either scenario, **Computer Vision Preview** appears below the assistant in the right-side column. Its toggle displays the existing local camera stream, landmarks, and tracking values. Switching the preview off hides it without stopping tracking or opening another camera stream. It requires Yes consent and backend-confirmed admin authorization; normal users cannot access it.

Production camera access requires HTTPS. MediaPipe currently downloads its WASM files from `cdn.jsdelivr.net` and its face model from `storage.googleapis.com`. Computer vision adds no backend environment variable. Apply migration `20261001_0017` for `computer_vision_sessions` and `computer_vision_samples`.

## User Roles

- **Registered user:** accesses approved scenarios, profile preferences, personal speech usage, and quota requests.
- **Guest:** can preview the catalogue and use supported guest flows with an explicit progress-saving choice.
- **Administrator:** manages accounts, speech providers, personal quotas, requests, scenario analytics, and consented computer-vision recordings; can use the local scenario preview.

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

Current migration head: `20261001_0017`. Back up an existing production database before applying pending migrations. The Docker backend runs `alembic upgrade head` automatically before starting Uvicorn.

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
curl -X POST http://127.0.0.1:8000/api/admin/email/test -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

The endpoint returns `{"message":"Test email processed."}` whether the message was handled by console mode or SMTP mode.

## Speech Services

Speech providers are Soniox (primary) and browser (fallback) for both TTS and STT. Apply migration `20260930_0016` with `alembic upgrade head` when upgrading an existing installation. Historical provider usage remains in the database; the current dashboard shows only supported providers.

ASSIST-AI supports Soniox through the backend, with browser speech available as a fallback where supported. Registered users follow the administrator-defined provider order and can fall back to browser speech after a provider error or exhausted allowance. Guest sessions use browser TTS and STT directly. The frontend never receives provider API keys. For backend TTS, it calls `POST /api/tts`, and the backend:

1. Confirms the user is logged in.
2. Checks the user's TTS character limit.
3. Looks for cached audio.
4. Calls the selected backend speech provider only when needed.
5. Updates PostgreSQL usage.
6. Returns MP3 audio to the frontend.

Add these values to `backend/.env`:

```env
TTS_DEFAULT_LIMIT_CHARACTERS=5000
TTS_MAX_REQUEST_CHARACTERS=1000
TTS_CACHE_DIR=media/tts-cache
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

The voice assistant uses the configured Soniox voice for English, Spanish, German, Turkish, Portuguese, and French, with browser speech as fallback.

TTS billing is character-based, so ASSIST-AI tracks usage by characters, not tokens. The frontend shows the remaining voice allowance in the top navigation for logged-in users.

Generated audio is cached under `backend/media/tts-cache`, and metadata is stored in PostgreSQL. The `backend/media/` folder is ignored by Git because cached audio is generated locally. Repeated prompts are returned from cache without using new TTS characters. PIN and name-confirmation prompts are split so fixed sentence parts can be cached while only the dynamic name or PIN part is generated when needed.

Administrators can open **Speech Provider Management** to monitor monthly TTS character usage and STT duration, configure each provider, and arrange separate priority orders for TTS and STT. When a provider reaches its configured switch value or cannot complete a request, the backend selects the next enabled provider in that service's priority order.

The internal overview cards show the **current UTC calendar month's** STT minutes and TTS characters across supported providers, using successful request timestamps rather than summing historical billing periods. An unused month shows zero. Full cache hits add no new usage; partially cached requests retain their newly charged amount. Previous months remain available in the history. These internal estimates are separate from each user's weekly allowance and from Soniox's official costs. Browser speech does not consume Soniox quota, and request IDs prevent retries from being counted twice.

The separate **Soniox Usage** section fetches `GET https://api.soniox.com/v1/usage/summary` through the admin-only backend endpoint `GET /api/admin/speech-providers/soniox-usage`. It shows the current UTC month, project-level USD cost, per-model costs and request counts, expandable daily usage, and the last fetch time. Refresh requests updated data. Soniox errors remain within this section so provider management continues to work. The API reports usage for the project associated with the configured key, not a complete account balance; no balance is displayed or scraped.

Keep the long-lived `SONIOX_API_KEY` only in the ignored backend environment file or server environment variables. STT and TTS requests also run through the backend; there are no browser-direct Soniox connections or temporary-key flows. Provider error diagnostics redact credentials before reaching API errors or stored provider events. Tests use synthetic credentials.

For the existing integration, the Soniox key needs **Async STT: Write**, **Files: Write**, **Text-to-speech**, **Usage and limits**, and **Model listing**. Real-time STT, temporary-key creation, and cloned-voice management are not used. Confirm the granted permissions in the Soniox Console and limit the key to the required set; see [Soniox API key permissions](https://soniox.com/docs/guides/api-key-permissions).

Global speech routing is stored in PostgreSQL and applies to registered users. Administrators can independently order TTS and STT providers, enable or disable providers, configure calendar or custom monthly periods, and edit provider-specific warning and switch values. Soniox supports both TTS and STT. Guest sessions bypass paid providers and use browser speech when the client reports that capability.

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

If the frontend shows a Soniox configuration error, check that `SONIOX_API_KEY` is set in `backend/.env`, then restart the backend.

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

To test real SMTP, set `EMAIL_ENABLED=true`, `EMAIL_BACKEND=smtp`, and your SMTP variables in `backend/.env`, restart the backend, call `POST /api/admin/email/test`, then repeat registration, approval, denial, suspension, and activation with test users.

To test Soniox TTS, set the Soniox variables in `backend/.env`, restart the backend, log in as an approved user, open the ATM scenario, and confirm the assistant speaks. The first time a prompt is spoken it may spend TTS characters; repeated cached prompts should reuse saved audio.

## Development Checks

From `frontend`, run `npm test` and `npm run build`. From `backend` with the virtual environment active, run `python -m pytest -q` (pytest must be installed in the development environment). The tests cover consent and tracking cleanup, derived recording and admin access, summaries and charts, Soniox usage and credential redaction, and UTC monthly usage boundaries.

## Docker Deployment

Production Docker files are included for PostgreSQL, the FastAPI backend, and the React/Nginx frontend. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to deploy ASSIST-AI on a Linux VPS.

Use the approved commit from `computer-vision` for this version; the deployment guide's older example branch is not the current target. The root Compose file runs `postgres`, `backend`, and `frontend` with persistent `postgres_data` and `backend_media` volumes. Frontend images build the React app and serve it through Nginx using the same-origin API proxy. HTTPS termination is configured separately from these repository files.

Before updating a VPS, verify its deployed commit, running services/images, Alembic revision, disk space, and HTTPS. Preserve the existing environment files, Compose project name, and rollback images. Back up and verify the database and media before migrations. Never remove production volumes with `docker compose down -v`. If migration compatibility prevents an image-only rollback, restore the verified database backup with application writers stopped; restoring a backup discards later writes.
