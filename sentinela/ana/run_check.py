"""Small CLI to test ANA integration and fetch station levels.

Usage (PowerShell):
  $env:ANA_HIDROWS_IDENTIFICADOR='05752529794'; $env:ANA_HIDROWS_SENHA='6kq3xjir'; python -m sentinela.ana.run_check
"""
import json
import sys
from .auth import AnaAuth
from .estacoes import check_station
from .nivel import fetch_station_level

STATIONS = ["87955000", "87980000", "87540000"]


def main():
    auth = AnaAuth()
    try:
        token = auth.get_token()
    except Exception as e:
        print(json.dumps({"error": f"auth_failed", "detail": str(e)}))
        return 1

    out = {}
    for code in STATIONS:
        try:
            inv = check_station(code)
        except Exception as e:
            inv = {"error": str(e)}

        try:
            nivel = fetch_station_level(code)
        except Exception as e:
            nivel = {"error": str(e)}

        out[code] = {"inventario": inv, "nivel": nivel}

    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
