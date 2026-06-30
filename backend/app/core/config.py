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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
