import os
from pathlib import Path
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _load_expected_key() -> str:
    secret = Path("/run/secrets/bar_api_key")
    if secret.exists():
        return secret.read_text().strip()
    return os.getenv("API_KEY", "")


def require_api_key(api_key: str = Security(_api_key_header)):
    expected = _load_expected_key()
    if not expected or api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chave de acesso inválida",
        )
    return api_key
