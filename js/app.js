/**
 * app.js — Main controller (i18n-aware)
 */
'use strict';

const App = (() => {
  let currentMode    = 'teams';
  let activeGroup    = null;
  let activeTimeSlot = null;

  function init() {
    I18n.init();
    I18n.buildDropdown('langSelect');

    // Group chips
    const groupPanel = document.getElementById('groupPanel');
    groupPanel.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-chip active';
    allBtn.textContent = I18n.t('all_groups');
    allBtn.onclick = () => setGroup(null, allBtn);
    groupPanel.appendChild(allBtn);

    WC2026.groups.forEach(g => {
      const btn = document.createElement('button');
      btn.className = 'filter-chip';
      btn.textContent = `${I18n.t('group_prefix')} ${g}`;
      btn.onclick = () => setGroup(g, btn);
      groupPanel.appendChild(btn);
    });

    // Time chips
    const timePanel = document.getElementById('timePanel');
    timePanel.innerHTML = '';
    const allTimeBtn = document.createElement('button');
    allTimeBtn.className = 'filter-chip active';
    allTimeBtn.textContent = I18n.t('all_times');
    allTimeBtn.onclick = () => setTimeSlot(null, allTimeBtn);
    timePanel.appendChild(allTimeBtn);

    I18n.timeSlots().forEach((slot, i) => {
      const btn = document.createElement('button');
      btn.className = 'filter-chip';
      btn.textContent = slot;
      btn.dataset.slotIndex = i;
      btn.onclick = () => setTimeSlot(WC2026.TIME_SLOTS[i], btn);
      timePanel.appendChild(btn);
    });

    _buildTzSelector();
    TeamGrid.init();
    Bracket.render();

    // Static string wiring
    _applyStaticStrings();

    Live.onUpdate(() => {
      TeamGrid.refreshLive();
      if (currentMode === 'calendar') Calendar.refreshLive();
      if (currentMode === 'bracket')  Bracket.refreshLive();
      if (currentMode === 'stats')    Stats.render();
    });

    Live.init();
    setMode('teams');
  }

  function rerenderAll() {
    _applyStaticStrings();
    // Rebuild filter chips with new language
    const groupPanel = document.getElementById('groupPanel');
    groupPanel.querySelectorAll('.filter-chip').forEach((btn, i) => {
      if (i === 0) btn.textContent = I18n.t('all_groups');
      else btn.textContent = `${I18n.t('group_prefix')} ${WC2026.groups[i-1]}`;
    });
    const timePanel = document.getElementById('timePanel');
    timePanel.querySelectorAll('.filter-chip').forEach((btn, i) => {
      if (i === 0) btn.textContent = I18n.t('all_times');
      else btn.textContent = I18n.timeSlots()[i-1];
    });

    TeamGrid.init(true);
    if (currentMode === 'calendar') Calendar.render();
    else if (currentMode === 'bracket') Bracket.render();
    else if (currentMode === 'stats') Stats.render();
    else TeamGrid.render({ mode: currentMode, activeGroup, activeTimeSlot });

    // Mode buttons
    const modeKeys = ['teams','group','time','calendar','bracket','stats'];
    const modeI18n = ['mode_teams','mode_group','mode_time','mode_calendar','mode_knockout','mode_stats'];
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
    TeamGrid.init(true);
    if (currentMode === 'calendar') Calendar.render();
    else if (currentMode === 'bracket') Bracket.render();
    else if (currentMode === 'stats') Stats.render();
    else TeamGrid.render({ mode: currentMode, activeGroup, activeTimeSlot });
  }

  function setMode(mode) {
    currentMode = mode;
    ['teams','group','time','calendar','bracket','stats'].forEach(m => {
      const btn = document.getElementById(`mode${_cap(m)}`);
      if (btn) btn.classList.toggle('active', m === mode);
    });
    toggle('groupPanel',      mode==='group',    'flex');
    toggle('timePanel',       mode==='time',     'flex');
    toggle('calendarSection', mode==='calendar', 'block');
    toggle('exportBar',       mode==='calendar', 'block');
    toggle('bracketSection',  mode==='bracket',  'block');
    toggle('statsSection',    mode==='stats',    'block');
    document.getElementById('grid').style.display =
      (mode==='calendar'||mode==='bracket'||mode==='stats') ? 'none' : 'grid';

    activeGroup = null; activeTimeSlot = null;
    document.querySelectorAll('#groupPanel .filter-chip').forEach((c,i) => c.classList.toggle('active',i===0));
    document.querySelectorAll('#timePanel  .filter-chip').forEach((c,i) => c.classList.toggle('active',i===0));

    if (mode === 'calendar') Calendar.render();
    if (mode === 'bracket')  Bracket.render();
    if (mode === 'stats')    Stats.render();
    if (mode !== 'calendar' && mode !== 'bracket' && mode !== 'stats')
      TeamGrid.render({ mode, activeGroup, activeTimeSlot });
  }

  function setGroup(g, btn) {
    activeGroup = g;
    document.querySelectorAll('#groupPanel .filter-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    TeamGrid.render({ mode: currentMode, activeGroup, activeTimeSlot });
  }

  function setTimeSlot(slot, btn) {
    activeTimeSlot = slot;
    document.querySelectorAll('#timePanel .filter-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    TeamGrid.render({ mode: currentMode, activeGroup, activeTimeSlot });
  }

  function onSearch() {
    if (currentMode === 'calendar') Calendar.onSearchChange();
    else if (currentMode !== 'bracket') TeamGrid.render({ mode: currentMode, activeGroup, activeTimeSlot });
  }

  function toggle(id, show, val='block') {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? val : 'none';
  }

  function _cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  return { init, setMode, setGroup, setTimeSlot, onSearch, rerenderAll };
})();

document.addEventListener('DOMContentLoaded', App.init);
