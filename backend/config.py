from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    ai_model: str = "openai/gpt-4o-mini"
    database_path: str = "bingo.db"
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
