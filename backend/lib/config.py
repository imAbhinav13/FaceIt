from pydantic_settings import BaseSettings,SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""
    supabase_jwt_secret: str = ""

    supabase_event_photos_bucket: str = "event-photos"

    confirmed_threshold: float = 0.60
    review_threshold: float = 0.40
    signed_url_ttl_seconds: int = 3600
    frontend_origin: str = "http://localhost:3000"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()