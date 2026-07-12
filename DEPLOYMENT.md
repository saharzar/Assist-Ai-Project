# ASSIST-AI Docker Deployment

This setup runs ASSIST-AI with three containers:

- `postgres`: PostgreSQL database
- `backend`: FastAPI API, Alembic migrations, Azure TTS/STT
- `frontend`: Nginx serving the React app and proxying `/api` to the backend

## Local Docker Run

From the project root:

```powershell
docker compose up --build
```

Open:

```text
http://localhost
```

## Required Backend Environment

Create `backend/.env` on the server. Do not commit it.

Important values:

```env
JWT_SECRET_KEY=change_to_a_long_random_secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_this_password
ADMIN_FULL_NAME=ASSIST-AI Admin
ADMIN_NOTIFICATION_EMAIL=admin@example.com

AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=swedencentral

EMAIL_ENABLED=true
EMAIL_BACKEND=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=ASSIST-AI
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

Docker Compose overrides `DATABASE_URL`, `FRONTEND_ORIGIN`, `APP_FRONTEND_URL`, and `TTS_CACHE_DIR` for containers.

## Linux VPS Deployment

1. Install Docker and the Compose plugin.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and log back in after adding your user to the Docker group.

2. Clone the repository.

```bash
git clone https://github.com/saharzar/Assist-Ai-Project.git
cd Assist-Ai-Project
git checkout feature/atm-voice-feedback
```

3. Create production secrets.

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Set Azure, SMTP, admin, and JWT values. Use strong passwords.

4. Optional: create a root `.env` for Docker Compose.

```bash
nano .env
```

Example:

```env
POSTGRES_DB=assist_ai
POSTGRES_USER=assist_ai
POSTGRES_PASSWORD=use_a_strong_database_password
FRONTEND_PORT=80
FRONTEND_ORIGIN=http://your-domain.com
APP_FRONTEND_URL=http://your-domain.com
```

5. Start the app.

```bash
docker compose up -d --build
```

6. Check containers.

```bash
docker compose ps
docker compose logs -f backend
```

7. Open the app.

```text
http://your-server-ip
```

## Updating the VPS

```bash
git pull
docker compose up -d --build
```

## Useful Commands

View logs:

```bash
docker compose logs -f
```

Restart:

```bash
docker compose restart
```

Stop:

```bash
docker compose down
```

Backup database:

```bash
docker compose exec postgres pg_dump -U assist_ai assist_ai > assist_ai_backup.sql
```
