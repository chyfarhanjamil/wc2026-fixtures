/**
 * app.js — Main controller
 */
'use strict';

const App = (() => {
  let currentMode    = 'teams';
  let activeGroup    = null;
  let activeTimeSlot = null;

  function init() {
    // Group chips
    const groupPanel = document.getElementById('groupPanel');
    WC2026.groups.forEach(g => {
      const btn = document.createElement('button');
      btn.className = 'filter-chip';
      btn.textContent = `Group ${g}`;
      btn.onclick = () => setGroup(g, btn);
      groupPanel.appendChild(btn);
    });

    // Time chips
    const timePanel = document.getElementById('timePanel');
    WC2026.TIME_SLOTS.forEach(slot => {
      const btn = document.createElement('button');
      btn.className = 'filter-chip';
      btn.textContent = slot;
      btn.onclick = () => setTimeSlot(slot, btn);
      timePanel.appendChild(btn);
    });

    _buildTzSelector();
    TeamGrid.init();
    Bracket.render();

    // Hook live updates
    Live.onUpdate(() => {
      TeamGrid.refreshLive();
      if (currentMode === 'calendar') Calendar.refreshLive();
      if (currentMode === 'bracket')  Bracket.refreshLive();
    });

    // Start live polling
    Live.init();

    setMode('teams');
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
    const tz = WC2026.getTimezone();
    const sub = document.getElementById('headerSub');
    if (sub) sub.textContent = `All 104 Matches · Group Stage to Final · ${tz.label}`;
    TeamGrid.init(true);
    if (currentMode === 'calendar') Calendar.render();
    else if (currentMode === 'bracket') Bracket.render();
    else TeamGrid.render({ mode: currentMode, activeGroup, activeTimeSlot });
  }

  function setMode(mode) {
    currentMode = mode;
    ['teams','group','time','calendar','bracket'].forEach(m => {
      const btn = document.getElementById(`mode${_cap(m)}`);
      if (btn) btn.classList.toggle('active', m === mode);
    });
    toggle('groupPanel',      mode==='group',    'flex');
    toggle('timePanel',       mode==='time',     'flex');
    toggle('calendarSection', mode==='calendar', 'block');
    toggle('exportBar',       mode==='calendar', 'block');
    toggle('bracketSection',  mode==='bracket',  'block');
    document.getElementById('grid').style.display =
      (mode==='calendar'||mode==='bracket') ? 'none' : 'grid';

    activeGroup = null; activeTimeSlot = null;
    document.querySelectorAll('#groupPanel .filter-chip').forEach((c,i) => c.classList.toggle('active',i===0));
    document.querySelectorAll('#timePanel  .filter-chip').forEach((c,i) => c.classList.toggle('active',i===0));

    if (mode === 'calendar') Calendar.render();
    if (mode === 'bracket')  Bracket.render();
    if (mode !== 'calendar' && mode !== 'bracket')
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

  return { init, setMode, setGroup, setTimeSlot, onSearch };
})();

document.addEventListener('DOMContentLoaded', App.init);
