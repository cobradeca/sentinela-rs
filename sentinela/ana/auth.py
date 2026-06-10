"""ANA authentication helper (OAuth token retrieval + simple cache)."""
import time
import json
from urllib import request, error
from .config import get_ana_credentials

BASE = "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas"


class AnaAuth:
    def __init__(self):
        creds = get_ana_credentials() or {}
        self.identificador = creds.get("identificador")
        self.senha = creds.get("senha")
        self._token = None
        self._expires_at = 0

    def _fetch_token(self):
        if not self.identificador or not self.senha:
            raise RuntimeError("ANA credentials not configured in environment variables")

        url = f"{BASE}/OAUth/v1"
        req = request.Request(url, method="GET")
        req.add_header("Identificador", self.identificador)
        req.add_header("Senha", self.senha)
        req.add_header("Accept", "application/json")
        try:
            with request.urlopen(req, timeout=10) as resp:
                raw = resp.read().decode("utf-8")
        except error.HTTPError as e:
            raw = e.read().decode("utf-8")
            raise RuntimeError(f"ANA auth HTTP {e.code}: {raw}")
        except Exception as e:
            raise RuntimeError(f"ANA auth error: {e}")

        try:
            payload = json.loads(raw)
        except Exception:
            payload = {}

        # defensive extraction
        token = None
        if isinstance(payload, dict):
            items = payload.get("items") or payload
            if isinstance(items, dict):
                token = items.get("tokenautenticacao") or items.get("access_token")

        if not token:
            # fallback: try to find token in raw text
            import re

            m = re.search(r"([A-Za-z0-9_\-\.]{20,})", raw)
            token = m.group(1) if m else None

        if not token:
            raise RuntimeError("ANA auth: token not found in response")

        self._token = token
        # set expiry 55 minutes from now
        self._expires_at = time.time() + 55 * 60
        return token

    def get_token(self):
        if self._token and time.time() < self._expires_at:
            return self._token
        return self._fetch_token()
