"""Station inventory / validation helpers."""
import json
from urllib import request, error, parse
from .auth import AnaAuth

BASE = "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas"


def check_station(codigo):
    """Return station inventory info (dict) or raise."""
    auth = AnaAuth()
    token = auth.get_token()

    # API expects parameter keys with spaces/accents (as observed in official examples)
    params = {
        "Código da Estação": codigo,
    }
    qs = parse.urlencode(params)
    url = f"{BASE}/HidroInventarioEstacoes/v1?{qs}"
    req = request.Request(url)
    req.add_header("Accept", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
    except error.HTTPError as e:
        raw = e.read().decode("utf-8")
        raise RuntimeError(f"ANA station HTTP {e.code}: {raw}")

    try:
        payload = json.loads(raw)
    except Exception:
        payload = {"raw": raw}

    return payload
