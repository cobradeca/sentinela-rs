export const SUPABASE_FUNCTIONS_BASE_URL = "https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1";

export const DEFESA_CIVIL_RS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/defesa-civil-rs`;
export const INMET_FORECAST_BASE_URL = "https://apiprevmet3.inmet.gov.br/previsao";
export const INMET_PREVISAO_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/inmet-previsao`;
export const ANA_RS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/ana-rs`;
export const ANA_RIVER_LEVELS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/ana-river-levels`;
export const LAGOA_RADAR_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/lagoa-patos-radar`;
export const HIDROSENS_LARANJAL_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/hidrosens-laranjal`;
export const NOAA_ENSO_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/noaa-enso`;
export const IRI_ENSO_PROB_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/iri-enso-probabilidades`;
export const CPTEC_INPE_PRODUCTS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/cptec-inpe-produtos`;
export const INPE_QUEIMADAS_RS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/inpe-queimadas-rs`;
export const INPE_FIRE_EVENTS_RS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/inpe-fire-events-rs`;
export const CENSIPAM_FIRE_EVENTS_RS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/censipam-fire-events-rs`;
export const ICMBIO_UCS_RS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/icmbio-ucs-rs`;
export const EFFIS_WMS_HEALTH_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/effis-wms-health`;
export const COPERNICUS_WATER_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/copernicus-water`;
export const COPERNICUS_SENTINEL1_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/copernicus-sentinel1-water`;
export const COPERNICUS_NDVI_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/copernicus-ndvi`;
export const COPERNICUS_EMS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/copernicus-ems`;
export const ENSO_NOTICIAS_FUNCTION_URL = `${SUPABASE_FUNCTIONS_BASE_URL}/enso-noticias`;

export const COPERNICUS_EMS_RAPID_INFO_URL = "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations-info/";
export const COPERNICUS_EMS_RAPID_DETAIL_URL = "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/";
export const COPERNICUS_EMS_RRM_URL = "https://riskandrecovery.emergency.copernicus.eu/api/public-activations/";

export const ENSO_UNAVAILABLE = {
  nino34: null,
  oni3m: null,
  phase: "UNAVAILABLE",
  referenceDate: null,
  referenceSource: "NOAA/CPC indisponivel",
  prob: null,
  superThreshold: 1.5,
  forecast: [],
};

export const COPERNICUS_REFERENCE = {
  themes: [],
};
