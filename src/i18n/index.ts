/** Tłumaczenia PL / EN / RO. Klucze bez tłumaczenia są wyświetlane dosłownie. */
import { pl } from './pl';
import { en } from './en';
import { ro } from './ro';

export type Lang = 'pl' | 'en' | 'ro';
export const LANGS: Lang[] = ['pl', 'en', 'ro'];
const DICTS: Record<Lang, Record<string, string>> = { pl, en, ro };

function detect(): Lang {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'pl' || saved === 'en' || saved === 'ro') return saved;
  } catch {
    /* brak localStorage */
  }
  const nl = (navigator.language || '').toLowerCase();
  if (nl.startsWith('pl')) return 'pl';
  if (nl.startsWith('ro')) return 'ro';
  return 'en';
}

let lang: Lang = detect();

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang) {
  lang = l;
  try {
    localStorage.setItem('lang', l);
  } catch {
    /* ignoruj */
  }
  applyDocumentLang();
}

export function applyDocumentLang() {
  document.documentElement.lang = lang;
  document.title = { pl: 'Unia Polsko-Rumuńska', en: 'Polish-Romanian Union', ro: 'Uniunea Polono-Română' }[lang];
  const r = document.getElementById('rotate-text');
  if (r) r.innerHTML = t('rotate');
}

/** Tłumaczy klucz; parametry {x} też są tłumaczone, jeśli są kluczami. */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, typeof v === 'string' ? t(v) : String(v));
  }
  return s;
}
