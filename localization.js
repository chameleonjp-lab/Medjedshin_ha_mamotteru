(() => {
  'use strict';

  const messages = window.MedjedTranslations;
  const languages = {
    ja: '日本語',
    en: 'English',
    es: 'Español',
    'pt-BR': 'Português (Brasil)',
    'zh-Hans': '简体中文',
    fr: 'Français',
    de: 'Deutsch',
    ko: '한국어',
    ru: 'Русский',
    it: 'Italiano',
    'zh-Hant': '繁體中文',
    id: 'Bahasa Indonesia',
    tr: 'Türkçe',
    vi: 'Tiếng Việt',
    th: 'ไทย',
  };
  const storageKey = 'medjed_language_v1';

  function matchLanguage(tag) {
    if (!tag) return;
    const [base, regionOrScript] = tag.toLowerCase().split('-');
    if (base === 'pt') return 'pt-BR';
    if (base === 'zh') {
      return ['hant', 'tw', 'hk', 'mo'].includes(regionOrScript) ? 'zh-Hant' : 'zh-Hans';
    }
    if (Object.hasOwn(languages, base)) return base;
  }

  function initialLanguage() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (Object.hasOwn(languages, saved)) return saved;
    } catch {}

    for (const preferred of navigator.languages ?? []) {
      const match = matchLanguage(preferred);
      if (match) return match;
    }
    return matchLanguage(navigator.language) ?? 'ja';
  }

  let language = initialLanguage();

  function translate(key, values = {}) {
    const message = messages[language][key] ?? messages.ja[key] ?? key;
    return message.replace(/\{(\w+)\}/g, (placeholder, name) => values[name] ?? placeholder);
  }

  function formatNumber(value, options) {
    return value.toLocaleString(language, options);
  }

  function translatedText(element, key) {
    if (key) {
      element.dataset.i18n = key;
      element.textContent = translate(key);
    } else {
      delete element.dataset.i18n;
      element.textContent = '';
    }
  }

  function init() {
    const dialog = document.getElementById('language-dialog');
    const openButton = document.getElementById('language-button');
    const list = document.getElementById('language-options');
    const options = [];

    function render() {
      document.documentElement.lang = language;
      document.title = translate('title');
      document.querySelectorAll('[data-i18n]').forEach(element => {
        element.textContent = translate(element.dataset.i18n);
      });
      for (const option of options) {
        option.setAttribute('aria-pressed', String(option.lang === language));
      }
    }

    for (const [tag, label] of Object.entries(languages)) {
      const option = document.createElement('button');
      option.type = 'button';
      option.lang = tag;
      option.textContent = label;
      option.addEventListener('click', () => {
        try { localStorage.setItem(storageKey, tag); } catch {}
        if (tag !== language) {
          language = tag;
          render();
          document.dispatchEvent(new Event('medjedlanguagechange'));
        }
        dialog.close();
      });
      list.appendChild(option);
      options.push(option);
    }
    openButton.addEventListener('click', () => {
      dialog.showModal();
      options.find(option => option.lang === language)?.focus();
    });
    render();
  }

  window.MedjedLanguage = { init, translate, formatNumber, translatedText };
})();
