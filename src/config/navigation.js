export const NAV_ITEMS = [
  { id: "dashboard", tab: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "previsao", tab: "previsao", label: "Previsão", icon: "forecast" },
  { id: "radar", tab: "copernicus", label: "Radar", icon: "radar" },
  { id: "lagoa", tab: "lagoa", label: "Lagoa dos Patos", icon: "waves" },
  { id: "alertas", tab: "alertas", label: "Defesa Civil RS", icon: "shield" },
  { id: "queimadas", tab: "queimadas", label: "Queimadas", icon: "fire" },
  { id: "enso", tab: "enso", label: "ENSO", icon: "climate" },
  { id: "noticias-enso", tab: "noticias-enso", label: "Notícias", icon: "news" },
  { id: "cptec", tab: "cptec", label: "CPTEC/INPE", icon: "cloud" },
  { id: "voo", tab: "voo", label: "Voo", icon: "plane" },
  { id: "apis", tab: "apis", label: "Configurações", icon: "settings" },
];

export const PAGE_META = {
  dashboard: { title: "Dashboard", subtitle: "Visão geral — monitoramento em tempo real" },
  previsao: { title: "Previsão", subtitle: "Condições meteorológicas previstas" },
  lagoa: { title: "Lagoa dos Patos", subtitle: "Níveis e condições atualizadas" },
  voo: { title: "Condições de Voo", subtitle: "Aeródromos e condições aeronáuticas" },
  enso: { title: "ENSO", subtitle: "El Niño / La Niña — índice e probabilidades" },
  "noticias-enso": { title: "Notícias El Niño", subtitle: "Acompanhe o cenário climático" },
  cptec: { title: "CPTEC/INPE", subtitle: "Produtos oficiais de previsão climática" },
  copernicus: { title: "Radar & Satélite", subtitle: "Copernicus — sensoriamento remoto" },
  queimadas: { title: "Queimadas", subtitle: "Focos e áreas monitoradas no RS" },
  alertas: { title: "Defesa Civil RS", subtitle: "Alertas e avisos oficiais" },
  apis: { title: "Fontes de Dados", subtitle: "Saúde e origem das informações" },
};

export const MOBILE_NAV = [
  { id: "home", tab: "dashboard", label: "Início", icon: "home" },
  { id: "share", action: "share", label: "Compartilhar", icon: "share" },
  { id: "fav", action: "fav", label: "Favoritos", icon: "star" },
  { id: "refresh", action: "refresh", label: "Atualizar", icon: "refresh" },
];
