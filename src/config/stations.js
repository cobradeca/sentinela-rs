export const STATIONS_LAGOA = [
  { id: "lagoa_patos_poa",      name: "Itapu\u00e3",                   displayName: "Lagoa dos Patos \u2014 Itapu\u00e3",              lat: -30.36, lon: -51.03, type: "lagoa", anaCode: "87450020", sourceHint: "RADAR", ordemEscoamento: 1 },
  { id: "lagoa_patos_arambare", name: "Arambar\u00e9",                 displayName: "Lagoa dos Patos \u2014 Arambar\u00e9",            lat: -30.91, lon: -51.50, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 2 },
  { id: "lagoa_sao_lourenco",   name: "S\u00e3o Louren\u00e7o do Sul",      displayName: "Lagoa dos Patos \u2014 S\u00e3o Louren\u00e7o do Sul", lat: -31.36, lon: -51.98, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 3 },
  { id: "lagoa_patos_pelotas",  name: "Pelotas / Laranjal",       displayName: "Lagoa dos Patos \u2014 Pelotas / Laranjal",  lat: -31.77, lon: -52.34, type: "lagoa", sourceHint: "HIDROSENS", ordemEscoamento: 4 },
  { id: "lagoa_sao_jose_norte", name: "S\u00e3o Jos\u00e9 do Norte",        displayName: "Lagoa dos Patos \u2014 S\u00e3o Jos\u00e9 do Norte",   lat: -32.02, lon: -52.04, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 5 },
  { id: "lagoa_rio_grande",     name: "Rio Grande / FURG CCMAR",  displayName: "Lagoa dos Patos \u2014 Rio Grande / Barra",  lat: -32.03, lon: -52.10, type: "lagoa", sourceHint: "RADAR", ordemEscoamento: 6 },
];

export const STATIONS_CIDADES = [
  { id: "rs_porto_alegre",          name: "Porto Alegre",             lat: -30.03, lon: -51.23, type: "cidade", ibgeCode: "4314902", rioRef: "Gua\u00edba \u2014 enchente mai/2024", demDensity: 2681 },
  { id: "rs_lajeado",               name: "Lajeado",                  lat: -29.47, lon: -51.96, type: "cidade", ibgeCode: "4311403", rioRef: "Rio Taquari \u2014 recorde 2023", demDensity: 1032 },
  { id: "rs_guaiba",                name: "Gua\u00edba",                   lat: -30.11, lon: -51.32, type: "cidade", ibgeCode: "4309308", rioRef: "Gua\u00edba / margem oeste", demDensity: 169 },
  { id: "rs_barra_ribeiro",         name: "Barra do Ribeiro",         lat: -30.29, lon: -51.30, type: "cidade", ibgeCode: "4301909", rioRef: "Gua\u00edba / Lagoa dos Patos", demDensity: 22 },
  { id: "rs_tapes",                 name: "Tapes",                    lat: -30.67, lon: -51.40, type: "cidade", ibgeCode: "4321105", rioRef: "Lagoa dos Patos", demDensity: 21 },
  { id: "rs_camaqua",               name: "Camaqu\u00e3",                  lat: -30.85, lon: -51.81, type: "cidade", ibgeCode: "4303509", rioRef: "BR-116 / Costa Doce", demDensity: 37 },
  { id: "rs_arambare",              name: "Arambar\u00e9",                 lat: -30.91, lon: -51.50, type: "cidade", ibgeCode: "4300851", rioRef: "Lagoa dos Patos", demDensity: 8 },
  { id: "rs_cristal",               name: "Cristal",                  lat: -31.00, lon: -52.05, type: "cidade", ibgeCode: "4306056", rioRef: "BR-116 / Camaqu\u00e3", demDensity: 7 },
  { id: "rs_sao_lourenco_sul",      name: "S\u00e3o Louren\u00e7o do Sul",      lat: -31.36, lon: -51.98, type: "cidade", ibgeCode: "4318804", rioRef: "Lagoa dos Patos", demDensity: 22 },
  { id: "rs_turucu",                name: "Turu\u00e7u",                   lat: -31.44, lon: -52.18, type: "cidade", ibgeCode: "4322327", rioRef: "BR-116 / Pelotas", demDensity: 12 },
  { id: "rs_pelotas",               name: "Pelotas",                  lat: -31.77, lon: -52.34, type: "cidade", ibgeCode: "4314407", rioRef: "Canal S\u00e3o Gon\u00e7alo", demDensity: 202 },
  { id: "rs_rio_grande",            name: "Rio Grande",               lat: -32.03, lon: -52.10, type: "cidade", ibgeCode: "4315602", rioRef: "Lagoa dos Patos / litoral", demDensity: 68 },
  { id: "rs_sao_jose_norte",        name: "S\u00e3o Jos\u00e9 do Norte",        lat: -32.02, lon: -52.04, type: "cidade", ibgeCode: "4318507", rioRef: "Lagoa dos Patos / costa", demDensity: 22 },
  { id: "rs_arroio_grande",         name: "Arroio Grande",            lat: -32.24, lon: -53.09, type: "cidade", ibgeCode: "4301305", rioRef: "BR-116 / Jaguar\u00e3o", demDensity: 7 },
  { id: "rs_jaguarao",              name: "Jaguar\u00e3o",                 lat: -32.57, lon: -53.38, type: "cidade", ibgeCode: "4311007", rioRef: "BR-116 / fronteira", demDensity: 14 },
  { id: "rs_santa_vitoria_palmar",  name: "Santa Vit\u00f3ria do Palmar", lat: -33.52, lon: -53.37, type: "cidade", ibgeCode: "4317301", rioRef: "BR-471 / extremo sul", demDensity: 5 },
  { id: "rs_chui",                  name: "Chu\u00ed",                    lat: -33.69, lon: -53.46, type: "cidade", ibgeCode: "4305439", rioRef: "BR-471 / fronteira", demDensity: 30 },
  { id: "rs_mostardas",             name: "Mostardas",                lat: -31.11, lon: -50.92, type: "cidade", ibgeCode: "4312500", rioRef: "BR-101 / Lagoa do Peixe", demDensity: 6 },
  { id: "rs_tavares",               name: "Tavares",                  lat: -31.28, lon: -51.09, type: "cidade", ibgeCode: "4321352", rioRef: "BR-101 / Lagoa do Peixe", demDensity: 6 },
  { id: "rs_palmares_sul",          name: "Palmares do Sul",          lat: -30.26, lon: -50.51, type: "cidade", ibgeCode: "4313656", rioRef: "BR-101 / litoral m\u00e9dio", demDensity: 10 },
  { id: "rs_capivari_sul",          name: "Capivari do Sul",          lat: -30.14, lon: -50.52, type: "cidade", ibgeCode: "4304671", rioRef: "BR-101 / litoral", demDensity: 9 },
  { id: "rs_osorio",                name: "Os\u00f3rio",                  lat: -29.89, lon: -50.27, type: "cidade", ibgeCode: "4313508", rioRef: "BR-101 / litoral norte", demDensity: 72 },
  { id: "rs_tramandai",             name: "Tramanda\u00ed",               lat: -29.98, lon: -50.13, type: "cidade", ibgeCode: "4321600", rioRef: "Litoral norte", demDensity: 287 },
  { id: "rs_torres",                name: "Torres",                   lat: -29.34, lon: -49.73, type: "cidade", ibgeCode: "4321501", rioRef: "BR-101 / divisa SC", demDensity: 215 },
];

export const DASHBOARD_CITY_IDS = [
  "rs_lajeado",
  "rs_porto_alegre",
  "rs_guaiba",
  "rs_arambare",
  "rs_sao_lourenco_sul",
  "rs_pelotas",
  "rs_rio_grande",
  "rs_sao_jose_norte",
  "rs_arroio_grande",
];

export const STATIONS = DASHBOARD_CITY_IDS
  .map((id) => STATIONS_CIDADES.find((station) => station.id === id))
  .filter(Boolean);
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
  { id:"apa_banhado_grande", region:"Corredor BR-101 / Regi\u00e3o Metropolitana", name:"APA Banhado Grande", lat:-29.85, lon:-50.85, proximityRadiusKm:10, focus:"banhados, campos \u00famidos e \u00e1reas de nascentes entre Glorinha, Gravata\u00ed, Santo Ant\u00f4nio da Patrulha e Viam\u00e3o" },
  { id:"apa_rota_sol", region:"Corredor BR-101 / Serra e Litoral Norte", name:"APA Rota do Sol", lat:-29.40, lon:-50.10, proximityRadiusKm:10, focus:"matas com arauc\u00e1ria, escarpas, campos de altitude e transi\u00e7\u00e3o serra-litoral" },
  { id:"parna_aparados", region:"Corredor BR-101 / Campos de Cima da Serra", name:"PARNA Aparados da Serra", lat:-29.15, lon:-50.07, proximityRadiusKm:10, focus:"c\u00e2nions, campos de altitude, mata atl\u00e2ntica e borda da serra em Cambar\u00e1 do Sul" },
  { id:"apa_delta_jacui", region:"Regi\u00e3o Metropolitana de Porto Alegre", name:"APA Estadual Delta do Jacu\u00ed", lat:-30.03, lon:-51.23, proximityRadiusKm:10, focus:"ilhas, banhados, restingas e ecossistemas aqu\u00e1ticos no encontro dos rios que formam o Gua\u00edba" },
  { id:"rebio_lami", region:"Regi\u00e3o Metropolitana de Porto Alegre", name:"Reserva Biol\u00f3gica do Lami Jos\u00e9 Lutzenberger", lat:-30.246898, lon:-51.109661, proximityRadiusKm:10, focus:"banhados, matas de restinga e fauna protegida no extremo sul de Porto Alegre" },
  { id:"parna_lagoa_peixe", region:"Corredor BR-101 / Litoral M\u00e9dio", name:"PARNA Lagoa do Peixe", lat:-31.25, lon:-51.05, proximityRadiusKm:10, focus:"lagoa costeira, banhados, dunas e \u00e1rea estrat\u00e9gica para aves migrat\u00f3rias" },
  { id:"apa_lagoa_verde", region:"Regi\u00e3o da Costa Doce e Pelotas", name:"APA da Lagoa Verde", lat:-32.16, lon:-52.18, proximityRadiusKm:10, focus:"lagoa, arroios, banhados, campos litor\u00e2neos e matas de restinga em Rio Grande" },
  { id:"esec_taim", region:"Regi\u00e3o do Extremo Sul", name:"Esta\u00e7\u00e3o Ecol\u00f3gica do Taim", lat:-32.538892, lon:-52.538846, proximityRadiusKm:10, focus:"banhados, lagoas, dunas e campos atravessados pela BR-471" },
  { id:"albardao", region:"Regi\u00e3o do Extremo Sul", name:"Parque Nacional Marinho e APA do Albard\u00e3o", lat:-33.256238, lon:-52.827932, proximityRadiusKm:10, focus:"ecossistemas costeiros e marinhos protegidos em Santa Vit\u00f3ria do Palmar" },
];
