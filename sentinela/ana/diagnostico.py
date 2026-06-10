"""Diagnose causes for level rise in the Lagoa dos Patos."""

def diagnosticar_causa(nivel_atual_cm, nivel_6h_atras_cm, chuva_24h_mm,
                       nivel_jacui_m=None, nivel_camaqua_m=None,
                       vento_grau=None, vento_ms=None):
    causas = []
    subida = None
    if nivel_atual_cm is not None and nivel_6h_atras_cm is not None:
        subida = nivel_atual_cm - nivel_6h_atras_cm

    # Chuva intensa
    if chuva_24h_mm is not None and chuva_24h_mm >= 30:
        causas.append("CHUVA_INTENSA")

    # Se subida abrupta (>30 cm em 6h)
    if subida is not None and subida >= 30:
        if "CHUVA_INTENSA" not in causas:
            causas.append("SUBIDA_RAPIDA")

    # Tributarios
    LIMIAR_JACUI = 300  # cm (3.0 m)
    LIMIAR_CAMAQUA = 400  # cm (4.0 m)
    if nivel_jacui_m is not None and nivel_jacui_m * 100 > LIMIAR_JACUI:
        causas.append("CHEIA_TRIBUTARIOS")
    if nivel_camaqua_m is not None and nivel_camaqua_m * 100 > LIMIAR_CAMAQUA:
        if "CHEIA_TRIBUTARIOS" not in causas:
            causas.append("CHEIA_TRIBUTARIOS")

    # Vento sul
    if vento_grau is not None and vento_ms is not None:
        if 135 <= vento_grau <= 225 and vento_ms >= 5:
            causas.append("VENTO_SUL_REPRESAMENTO")

    if not causas:
        causas.append("CAUSA_INDETERMINADA")

    return causas
