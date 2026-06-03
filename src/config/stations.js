export const STATIONS_LAGOA = [
  { id: "lagoa_patos_poa",      name: "Itapu\u00e3",                   displayName: "Lagoa dos Patos \u2014 Itapu\u00e3",              lat: -30.36, lon: -51.03, type: "lagoa", anaCode: "87450004", sourceHint: "RADAR", ordemEscoamento: 1 },
  { id: "lagoa_patos_arambare", name: "Arambar\u00e9",                 displayName: "Lagoa dos Patos \u2014 Arambar\u00e9",            lat: -30.91, lon: -51.50, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 2 },
  { id: "lagoa_sao_lourenco",   name: "S\u00e3o Louren\u00e7o do Sul",      displayName: "Lagoa dos Patos \u2014 S\u00e3o Louren\u00e7o do Sul", lat: -31.36, lon: -51.98, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 3 },
  { id: "lagoa_patos_pelotas",  name: "Pelotas / Laranjal",       displayName: "Lagoa dos Patos \u2014 Pelotas / Laranjal",  lat: -31.77, lon: -52.34, type: "lagoa", sourceHint: "HIDROSENS", ordemEscoamento: 4 },
  { id: "lagoa_sao_jose_norte", name: "S\u00e3o Jos\u00e9 do Norte",        displayName: "Lagoa dos Patos \u2014 S\u00e3o Jos\u00e9 do Norte",   lat: -32.02, lon: -52.04, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 5 },
  { id: "lagoa_rio_grande",     name: "Rio Grande / FURG CCMAR",  displayName: "Lagoa dos Patos \u2014 Rio Grande / Barra",  lat: -32.03, lon: -52.10, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 6 },
];

export const STATIONS_CIDADES = [
  { id: "rs_porto_alegre",  name: "Porto Alegre",    lat: -30.03, lon: -51.23, type: "cidade", ibgeCode: "4314902", rioRef: "Gua\u00edba \u2014 enchente mai/2024", demDensity: 2681 },
  { id: "rs_canoas",        name: "Canoas",          lat: -29.92, lon: -51.18, type: "cidade", ibgeCode: "4304606", rioRef: "Lago Gua\u00edba / Gravata\u00ed", demDensity: 2654 },
  { id: "rs_sao_leopoldo",  name: "S\u00e3o Leopoldo",    lat: -29.76, lon: -51.14, type: "cidade", ibgeCode: "4318705", rioRef: "Rio dos Sinos", demDensity: 2131 },
  { id: "rs_lajeado",       name: "Lajeado",         lat: -29.47, lon: -51.96, type: "cidade", ibgeCode: "4311403", rioRef: "Rio Taquari \u2014 recorde 2023", demDensity: 1032 },
  { id: "rs_caxias_sul",    name: "Caxias do Sul",   lat: -29.17, lon: -51.17, type: "cidade", ibgeCode: "4305108", rioRef: "Bacia do Ca\u00ed", demDensity: 282 },
  { id: "rs_passo_fundo",   name: "Passo Fundo",     lat: -28.26, lon: -52.41, type: "cidade", ibgeCode: "4314100", rioRef: "Rio Passo Fundo", demDensity: 263 },
  { id: "rs_pelotas",       name: "Pelotas",         lat: -31.77, lon: -52.34, type: "cidade", ibgeCode: "4314407", rioRef: "Canal S\u00e3o Gon\u00e7alo", demDensity: 202 },
  { id: "rs_santa_maria",   name: "Santa Maria",     lat: -29.68, lon: -53.81, type: "cidade", ibgeCode: "4316907", rioRef: "Bacia do Vacaca\u00ed", demDensity: 153 },
  { id: "rs_rio_grande",    name: "Rio Grande",      lat: -32.03, lon: -52.10, type: "cidade", ibgeCode: "4315602", rioRef: "Lagoa dos Patos / litoral", demDensity: 68 },
  { id: "rs_cachoeira_sul", name: "Cachoeira do Sul",lat: -29.88, lon: -52.89, type: "cidade", ibgeCode: "4303004", rioRef: "Rio Jacu\u00ed", demDensity: 21 },
];

export const STATIONS = [...STATIONS_CIDADES];
export const ALL_STATIONS = [...STATIONS_LAGOA, ...STATIONS_CIDADES];

export const APAS_RS = [
  { id: "apa_banhado_grande", name: "APA Banhado Grande",        lat: -29.85, lon: -50.85, municipio: "Glorinha/Viam\u00e3o", proximityRadiusKm: 10, spatialAliases: ["Area de Protecao Ambiental do Banhado Grande"] },
  { id: "apa_rota_sol",       name: "APA Rota do Sol",           lat: -29.40, lon: -50.10, municipio: "Serra Ga\u00facha", proximityRadiusKm: 10 },
  { id: "apa_balneario",      name: "APA Balne\u00e1rio Pinhal",      lat: -30.22, lon: -50.21, municipio: "Palmares do Sul", proximityRadiusKm: 10 },
  { id: "apa_litoral_medio",  name: "APA Litoral M\u00e9dio",         lat: -30.80, lon: -50.22, municipio: "Mostardas/Tavares", proximityRadiusKm: 10 },
  { id: "rebio_sao_donato",   name: "REBIO S\u00e3o Donato",          lat: -28.28, lon: -54.87, municipio: "S\u00e3o Nicolau", proximityRadiusKm: 10 },
  { id: "esec_taim",          name: "Esta\u00e7\u00e3o Ecol\u00f3gica do Taim", lat: -32.55, lon: -52.60, municipio: "Rio Grande/Santa Vit\u00f3ria", proximityRadiusKm: 10 },
  { id: "parna_aparados",     name: "PARNA Aparados da Serra",   lat: -29.15, lon: -50.07, municipio: "Cambar\u00e1 do Sul", proximityRadiusKm: 10, spatialAliases: ["Parque Nacional de Aparados da Serra"] },
  { id: "parna_lagoa_peixe",  name: "PARNA Lagoa do Peixe",      lat: -31.25, lon: -51.05, municipio: "Mostardas", proximityRadiusKm: 10, spatialAliases: ["Parque Nacional da Lagoa do Peixe"] },
];

export const FIRE_MONITORED_AREAS_RS = [
  { id:"delta_jacui", name:"Porto Alegre / Delta do Jacu\u00ed", lat:-30.03, lon:-51.23, proximityRadiusKm:10, focus:"interface urbana, banhados e fuma\u00e7a sobre a capital" },
  { id:"itapua_viamao", name:"Viam\u00e3o / Itapu\u00e3", lat:-30.36, lon:-51.03, proximityRadiusKm:10, focus:"parques, campos, margem norte da Lagoa" },
  { id:"lagoa_peixe", name:"Mostardas / Lagoa do Peixe", lat:-31.25, lon:-51.05, proximityRadiusKm:10, focus:"unidade de conserva\u00e7\u00e3o, restinga e banhados" },
  { id:"sao_lourenco", name:"S\u00e3o Louren\u00e7o do Sul", lat:-31.36, lon:-51.98, proximityRadiusKm:10, focus:"margem oeste da Lagoa e \u00e1reas rurais" },
  { id:"pelotas_laranjal", name:"Pelotas / Laranjal", lat:-31.77, lon:-52.34, proximityRadiusKm:10, focus:"orla, banhados e transi\u00e7\u00e3o urbano-rural" },
  { id:"rio_grande_taim", name:"Rio Grande / Taim", lat:-32.55, lon:-52.60, proximityRadiusKm:10, focus:"ESEC Taim, campos, banhados e fuma\u00e7a costeira" },
  { id:"santa_vitoria_chui", name:"Santa Vit\u00f3ria do Palmar / Chu\u00ed", lat:-33.52, lon:-53.37, proximityRadiusKm:10, focus:"extremo sul, campos e fronteira" },
];
