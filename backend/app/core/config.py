from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://assist_ai:assist_ai_password@localhost:5432/assist_ai"
    jwt_secret_key: str = "change_this_secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    frontend_origin: str = "http://127.0.0.1:5173"
    admin_email: str = ""
    admin_password: str = ""
    admin_full_name: str = "ASSIST-AI Admin"
    admin_notification_email: str = ""
    app_frontend_url: str = "http://localhost:5173"
    email_enabled: bool = False
    email_backend: str = "console"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "ASSIST-AI"
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_timeout_seconds: int = 10
    azure_speech_key: str = ""
    azure_speech_region: str = "swedencentral"
    tts_default_limit_characters: int = 5000
    tts_max_request_characters: int = 1000
    tts_default_voice: str = "en-US-JennyNeural"
    tts_cache_dir: str = "media/tts-cache"
    stt_default_limit_seconds: int = 300

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
