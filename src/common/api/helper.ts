import defaults from "../constants/site.json";

export const apiBase = (endpoint: string): string =>
  `${defaults.base}${endpoint}`;

export const apiBaseImage = (endpoint: string): string =>
  `${defaults.imageServer}${endpoint}`;
