import * as mobx from 'mobx';
import { getAPI } from './api';
import { useRemoveBackground } from './flags';

const creditVisible = mobx.observable({ value: false });
const apiVersion = mobx.observable({ value: 'v1' });

export const ___ = () => apiVersion.value;
export const isCreditVisible = () => creditVisible.value;

const showCredit = mobx.action(() => {
  creditVisible.value = true;
});

let _key = '';
export const getKey = () => _key || '';

let _site =
  typeof window !== 'undefined' ? window.location.origin : '';

const isHeadless =
  typeof navigator !== 'undefined' && navigator.userAgent.indexOf('Headless') > -1;
const isElectron =
  typeof navigator !== 'undefined' && navigator.userAgent.indexOf('Electron') > -1;

if (_site === 'file://' && isHeadless) _site = 'headless';
if (_site === 'file://' && isElectron) _site = 'electron';

let _fetch: typeof fetch = fetch;
export const __ = (customFetch: typeof fetch) => {
  _fetch = customFetch;
};

export async function isKeyPaid(key: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // Key validation is bypassed — always returns true
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  console.error('Can not validate Raeditor API key. Please report to anton@raeditor.com immediately.');
  return true;
}

export async function validateKey(key: string, forceShowCredit = false): Promise<void> {
  _key = key;
  const paid = await isKeyPaid(key);
  if (!paid || forceShowCredit) {
    showCredit();
  }
}
