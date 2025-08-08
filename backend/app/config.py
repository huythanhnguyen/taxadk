"""
HTKK AI Backend Configuration
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    app_name: str = Field(default="HTKK AI Tax Declaration System")
    app_version: str = Field(default="1.0.0")
    debug: bool = Field(default=True)
    secret_key: str = Field(default="your-secret-key-change-in-production")
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)
    
    # Database
    database_url: str = Field(
        default="sqlite:///./htkk_ai.db"
    )
    db_host: str = Field(default="dpg-d2a6t43e5dus73a23480-a")
    db_port: int = Field(default=5432)
    db_name: str = Field(default="tax_filing_db")
    db_user: str = Field(default="tax_user")
    db_password: str = Field(default="7deku223FM7bXjVoAV6MxE5EHBzDq71c")
    
    # Google ADK & AI
    google_application_credentials: Optional[str] = Field(default=None)
    google_project_id: Optional[str] = Field(default=None)
    google_location: str = Field(default="us-central1")
    gemini_model: str = Field(default="gemini-2.5-flash-lite")
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")
    
    # File Upload
    max_file_size: int = Field(default=10485760)  # 10MB
    upload_dir: str = Field(default="./uploads")
    allowed_extensions: List[str] = Field(default_factory=lambda: [".xml", ".pdf", ".xlsx"])
    
    # HTKK Templates
    htkk_templates_path: str = Field(default="../HTKK/InterfaceTemplates")
    htkk_project_path: str = Field(default="../HTKK/Project")
    
    # Logging
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="json")
    
    # CORS
    allowed_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"]
    )
    allowed_methods: List[str] = Field(
        default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
    allowed_headers: List[str] = Field(default_factory=lambda: ["*"])
    
    # Rate Limiting
    rate_limit_per_minute: int = Field(default=60)
    
    @field_validator('allowed_extensions', mode='before')
    @classmethod
    def parse_allowed_extensions(cls, v):
        if isinstance(v, str):
            return [ext.strip() for ext in v.split(',')]
        return v
    
    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    @field_validator('allowed_methods', mode='before')
    @classmethod
    def parse_allowed_methods(cls, v):
        if isinstance(v, str):
            return [method.strip() for method in v.split(',')]
        return v
    
    @field_validator('allowed_headers', mode='before')
    @classmethod
    def parse_allowed_headers(cls, v):
        if isinstance(v, str):
            return [header.strip() for header in v.split(',')]
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings 