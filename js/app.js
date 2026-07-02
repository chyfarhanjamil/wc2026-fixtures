/**
 * app.js — Main controller (i18n-aware)
 */
'use strict';

const App = (() => {
  let currentMode = 'home';

  function init() {
    I18n.init();
    I18n.buildDropdown('langSelect');

    _buildTzSelector();
    Bracket.render();

    // Static string wiring
    _applyStaticStrings();

    Live.onUpdate(() => {
      Resolver.invalidate();
      if (currentMode === 'calendar') Calendar.refreshLive();
      if (currentMode === 'home')     Bracket.refreshLive();
      if (currentMode === 'stats')    Stats.render();
      if (typeof Simulator !== 'undefined') Simulator.refreshLive();
    });

    Live.init();
    setMode('home');
  }

  function rerenderAll() {
    _applyStaticStrings();

    if (currentMode === 'calendar') Calendar.render();
    else if (currentMode === 'home') Bracket.render();
    else if (currentMode === 'stats') Stats.render();

    // Mode buttons
    const modeKeys  = ['home', 'calendar', 'stats'];
    const modeI18n  = ['mode_home', 'mode_calendar', 'mode_stats'];
    modeKeys.forEach((m, i) => {
      const btn = document.getElementById(`mode${_cap(m)}`);
      if (btn) {
        const icon = btn.querySelector('.icon');
        const iconText = icon ? icon.outerHTML : '';
        btn.innerHTML = iconText + ' ' + I18n.t(modeI18n[i]);
      }
    });

    // Export button
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) exportBtn.textContent = I18n.t('export_btn');
  }

  function _applyStaticStrings() {
    const tz  = WC2026.getTimezone();
    const sub = document.getElementById('headerSub');
    if (sub) sub.textContent = I18n.t('header_sub', { tz: tz.label });

    const search = document.getElementById('search');
    if (search) search.placeholder = I18n.t('search_placeholder');

    // Update timezone label
    const tzLabel = document.getElementById('tzLabelText');
    if (tzLabel) tzLabel.textContent = I18n.t('tz_label');

    // Update language label
    const langLabel = document.getElementById('langLabelText');
    if (langLabel) langLabel.textContent = I18n.t('lang_label');

    // Keep the lang <select> in sync with current language
    const langSel = document.getElementById('langSelect');
    if (langSel) langSel.value = I18n.getLang();
  }

  function _buildTzSelector() {
    const select = document.getElementById('tzSelect');
    if (!select) return;
    WC2026.TIMEZONES.forEach(tz => {
      const opt = document.createElement('option');
      opt.value = tz.id;
      opt.textContent = tz.label;
      if (tz.id === 'bst') opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = () => {
      WC2026.setTimezone(select.value);
      _afterTzChange();
    };
  }

  function _afterTzChange() {
    const tz  = WC2026.getTimezone();
    const sub = document.getElementById('headerSub');
    if (sub) sub.textContent = I18n.t('header_sub', { tz: tz.label });
    if (currentMode === 'calendar') Calendar.render();
    else if (currentMode === 'home') Bracket.render();
    else if (currentMode === 'stats') Stats.render();
  }

  function setMode(mode) {
    currentMode = mode;
    ['home', 'calendar', 'stats'].forEach(m => {
      const btn = document.getElementById(`mode${_cap(m)}`);
      if (btn) btn.classList.toggle('active', m === mode);
    });
    toggle('calendarSection', mode === 'calendar', 'block');
    toggle('exportBar',       mode === 'calendar', 'block');
    toggle('bracketSection',  mode === 'home',      'block');
    toggle('statsSection',    mode === 'stats',      'block');

    if (mode === 'calendar') Calendar.showDefault();
    if (mode === 'home') {
      Bracket.render();
      if (typeof Simulator !== 'undefined') Simulator.init();
      if (typeof ClashFinder !== 'undefined') ClashFinder.init();
    }
    if (mode === 'stats') Stats.render();
  }

  function onSearch() {
    if (currentMode === 'calendar') Calendar.onSearchChange();
    else if (currentMode === 'home') Bracket.onSearchChange();
  }

  function toggle(id, show, val = 'block') {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? val : 'none';
  }

  function _cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  return { init, setMode, onSearch, rerenderAll };
})();

document.addEventListener('DOMContentLoaded', App.init);
