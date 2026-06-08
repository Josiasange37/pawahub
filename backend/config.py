from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    pawapay_api_token: str
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    resend_api_key: str
    jwt_secret: str = "pawasub-jwt-secret-hackathon-2026"
    pawapay_base_url: str = "https://api.sandbox.pawapay.io"
    baileys_bot_url: str = "http://localhost:3001"
    gmail_address: str = ""
    gmail_app_password: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
