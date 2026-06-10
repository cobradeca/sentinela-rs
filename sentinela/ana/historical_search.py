"""Try alternative ANA endpoints and wider date ranges for given stations.

Prints summary of responses to help locate historical series.
"""
import json
from datetime import datetime
from .auth import AnaAuth
import os
from urllib import request, parse, error

BASE = "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas"

ENDPOINTS = [
    "HidroinfoanaSerieTelemetricaAdotada/v1",
    "HidroinfoanaSerieTelemetricaDetalhada/v1",
    "HidroInventarioEstacoes/v1",
]

RANGES = ["DIAS_2", "DIAS_30", "DIAS_365", "DIAS_366"]

STATIONS = ["87955000", "87980000", "87540000"]


def call_endpoint(token, endpoint, params):
    qs = parse.urlencode(params)
    url = f"{BASE}/{endpoint}?{qs}"
    req = request.Request(url)
    req.add_header("Accept", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("User-Agent", "SentinelaRS/1.0")
    try:
        with request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            try:
                payload = json.loads(raw)
            except Exception:
                payload = {"raw": raw}
            return resp.status, payload
    except error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw}
        return e.code, payload
    except Exception as e:
        return None, {"error": str(e)}


def run():
    override = os.environ.get("ANA_OVERRIDE_TOKEN")
    if override:
        token = override
    else:
        auth = AnaAuth()
        token = auth.get_token()
    today = datetime.utcnow().strftime("%Y-%m-%d")

    results = {}
    for station in STATIONS:
        results[station] = {}
        for ep in ENDPOINTS:
            results[station][ep] = []
            for r in RANGES:
                params = {
                    "Código da Estação": station,
                    "Data de Busca (yyyy-MM-dd)": today,
                    "Range Intervalo de busca": r,
                    "Tipo Filtro Data": "DATA_LEITURA",
                }
                status, payload = call_endpoint(token, ep, params)
                summary = {
                    "range": r,
                    "status": status,
                }
                if isinstance(payload, dict):
                    if "items" in payload:
                        summary["items_len"] = len(payload.get("items") or [])
                        summary["message"] = payload.get("message")
                    elif isinstance(payload.get("items", None), dict):
                        summary["items_len"] = len(payload.get("items") or [])
                    else:
                        summary["raw_keys"] = list(payload.keys())[:6]
                results[station][ep].append(summary)

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    run()
