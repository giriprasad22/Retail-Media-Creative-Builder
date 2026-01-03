"""Application configuration settings."""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Set


class Settings(BaseSettings):
    """Application settings."""
    APP_NAME: str = "Retail Media Creative Builder"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "outputs"
    TEMPLATES_DIR: Path = BASE_DIR / "templates"
    
    # Image settings
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: frozenset = frozenset({"png", "jpg", "jpeg", "webp"})
    
    # Generation settings
    DEFAULT_VARIATIONS: int = 6
    MAX_VARIATIONS: int = 12
    
    class Config:
        env_file = ".env"
        arbitrary_types_allowed = True
        extra = "ignore"  # Allow extra fields in .env without validation errors

settings = Settings()

# Create directories if they don't exist
for dir_path in [settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.TEMPLATES_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)
