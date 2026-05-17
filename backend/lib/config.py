from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""
    supabase_jwt_secret: str = ""

    supabase_event_photos_bucket: str = "event-photos"

    confirmed_threshold: float = 0.60
    review_threshold: float = 0.40

    class Config:
        env_file = ".env"


settings = Settings()