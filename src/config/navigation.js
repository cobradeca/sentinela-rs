export const NAV_ITEMS = [
  { id: "dashboard", tab: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "previsao", tab: "previsao", label: "Previsao", icon: "forecast" },
  { id: "radar", tab: "copernicus", label: "Radar", icon: "radar" },
  { id: "lagoa", tab: "lagoa", label: "Lagoa dos Patos", icon: "waves" },
  { id: "alertas", tab: "alertas", label: "Defesa Civil RS", icon: "shield" },
  { id: "queimadas", tab: "queimadas", label: "Queimadas", icon: "fire" },
  { id: "enso", tab: "enso", label: "ENSO", icon: "climate" },
  { id: "noticias-enso", tab: "noticias-enso", label: "Noticias", icon: "news" },
  { id: "cptec", tab: "cptec", label: "CPTEC/INPE", icon: "cloud" },
  { id: "voo", tab: "voo", label: "Condicoes de Voo", icon: "plane" },
  { id: "apis", tab: "apis", label: "Configuracoes", icon: "settings" },
];

export const PAGE_META = {
  dashboard: { title: "Dashboard", subtitle: "Visao geral - monitoramento em tempo real" },
  previsao: { title: "Previsao", subtitle: "Condicoes meteorologicas previstas" },
  lagoa: { title: "Lagoa dos Patos", subtitle: "Niveis e condicoes atualizadas" },
  enso: { title: "ENSO", subtitle: "El Nino / La Nina - indice e probabilidades" },
  "noticias-enso": { title: "Noticias El Nino", subtitle: "Acompanhe o cenario climatico" },
  cptec: { title: "CPTEC/INPE", subtitle: "Produtos oficiais de previsao climatica" },
  copernicus: { title: "Radar & Satelite", subtitle: "Copernicus - sensoriamento remoto" },
  queimadas: { title: "Queimadas", subtitle: "Focos e areas monitoradas no RS" },
  alertas: { title: "Defesa Civil RS", subtitle: "Alertas e avisos oficiais" },
  voo: { title: "Condicoes de Voo", subtitle: "Condicoes METAR/visibilidade para o corredor POA-Rio Grande" },
  apis: { title: "Fontes de Dados", subtitle: "Saude e origem das informacoes" },
};

export const MOBILE_NAV = [
  { id: "home", tab: "dashboard", label: "Inicio", icon: "home" },
  { id: "share", action: "share", label: "Compartilhar", icon: "share" },
  { id: "fav", action: "fav", label: "Favoritos", icon: "star" },
  { id: "refresh", action: "refresh", label: "Atualizar", icon: "refresh" },
];
