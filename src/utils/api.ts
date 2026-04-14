import { getKey } from './validate-key';

export const URL_BASE = 'https://api.polotno.com';
export const API = `${URL_BASE}/api`;
export const getAPI = () => URL_BASE + '/api';

const _warnedOnce: Record<string, boolean> = {};
const warnOnce = (key: string, message: string) => {
  if (!_warnedOnce[key]) {
    _warnedOnce[key] = true;
    console.error(message);
  }
};

const ICONSCOUT_NOTICE =
  'API for iconscout is provided as a demonstration.\n' +
  'For production usage you have to use your own API endpoint.\n' +
  'https://iconscout.com/developers, https://iconscout.com/legal/api-license-development-agreement\n' +
  'https://raeditor.com/docs/server-api';

export const URLS: Record<string, (...args: any[]) => string> = {
  unsplashList: ({ query, page = 1 }) => `${getAPI()}/get-unsplash?query=${query}&per_page=20&page=${page}&KEY=${getKey()}`,
  unsplashDownload: (id) => `${getAPI()}/download-unsplash?id=${id}&KEY=${getKey()}`,
  svgapiList: ({ query, page = 0 }) => `${getAPI()}/get-svgapi?query=${query}&page=${page}&per_page=20&KEY=${getKey()}`,
  svgapiDownload: (path) => `${getAPI()}/download-svgapi?path=${path}&KEY=${getKey()}`,
  iconscoutList: ({ query, page = 1 }) => { warnOnce('iconscout', ICONSCOUT_NOTICE); return `${getAPI()}/get-iconscout?query=${query}&page=${page}&KEY=${getKey()}`; },
  iconscoutDownload: (uuid) => { warnOnce('iconscout', ICONSCOUT_NOTICE); return `${getAPI()}/download-iconscout?uuid=${uuid}&KEY=${getKey()}`; },
  nounProjectList: ({ query, page = 1 }) => `${getAPI()}/get-nounproject?query=${query}&page=${page}&KEY=${getKey()}`,
  nounProjectDownload: (id) => `${getAPI()}/download-nounproject?id=${id}&KEY=${getKey()}`,
  templateList: ({ query, page = 1, sizeQuery }) => `${getAPI()}/get-templates?${sizeQuery}&query=${query}&per_page=30&page=${page}&KEY=${getKey()}`,
  googleFontsList: () => `${getAPI()}/get-google-fonts?KEY=${getKey()}`,
  googleFontImage: (name: string) => `${URL_BASE}/google-fonts-previews/black/${name.replace(/ /g, '-')}.png`,
  textTemplateList: () => `${getAPI()}/get-text-templates?KEY=${getKey()}`,
  removeBackground: () => `${getAPI()}/remove-image-background?KEY=${getKey()}`,
  aiText: () => `${getAPI()}/ai/text?KEY=${getKey()}`,
};

export const getGoogleFontsListAPI = () => URLS.googleFontsList();
export const getGoogleFontImage = (name: string) => URLS.googleFontImage(name);
export const raeditorShapesList = () => `${getAPI()}/get-basic-shapes?KEY=${getKey()}`;
export const removeBackground = () => URLS.removeBackground();
export const templateList = (opts: any) => URLS.templateList(opts);
export const textTemplateList = () => URLS.textTemplateList();
export const unsplashList = (opts: any) => URLS.unsplashList(opts);
export const unsplashDownload = (id: string) => URLS.unsplashDownload(id);
export const svgapiList = (opts: any) => URLS.svgapiList(opts);
export const svgapiDownload = (path: string) => URLS.svgapiDownload(path);
export const iconscoutList = (opts: any) => URLS.iconscoutList(opts);
export const iconscoutDownload = (uuid: string) => URLS.iconscoutDownload(uuid);
export const setAPI = (name: string, fn: (...args: any[]) => string) => { URLS[name] = fn; };
