"""Fetch station level (serie adotada) and fallback to public telemetry."""
import json
from urllib import request, error, parse
from .auth import AnaAuth
from datetime import datetime

BASE = "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas"


def fetch_station_level(codigo, dias=2, data_de_busca: str | None = None):
    auth = AnaAuth()
    token = auth.get_token()

    if not data_de_busca:
        data_de_busca = datetime.utcnow().strftime("%Y-%m-%d")

    params = {
        "Código da Estação": codigo,
        "Tipo Filtro Data": "DATA_LEITURA",
        "Data de Busca (yyyy-MM-dd)": data_de_busca,
        "Range Intervalo de busca": f"DIAS_{dias}",
    }

    qs = parse.urlencode(params)
    url = f"{BASE}/HidroinfoanaSerieTelemetricaAdotada/v1?{qs}"
    req = request.Request(url)
    req.add_header("Accept", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with request.urlopen(req, timeout=12) as resp:
            raw = resp.read().decode("utf-8")
    except error.HTTPError as e:
        raw = e.read().decode("utf-8")
        raise RuntimeError(f"ANA nivel HTTP {e.code}: {raw}")

    try:
        payload = json.loads(raw)
    except Exception:
        payload = {"raw": raw}

    return payload
