from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_path: str = "bingo.db"
    host: str = "0.0.0.0"
    port: int = 8000
    telegram_bot_token: str = ""
    telegram_group_id: str = ""
    telegram_topic_id: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
