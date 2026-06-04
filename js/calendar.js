/**
 * calendar.js — Calendar view with live score awareness
 */
'use strict';

const Calendar = (() => {
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  let calMonth    = 6;
  let calYear     = 2026;
  let selectedKey = null;

  function getQ() {
    const el = document.getElementById('search');
    return el ? el.value.toLowerCase().trim() : '';
  }

  function matchKey(y,m,d) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function shiftMonth(delta) {
    calMonth += delta;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    if (calMonth < 1)  { calMonth = 12; calYear--; }
    selectedKey = null;
    document.getElementById('dayResults').classList.remove('visible');
    render();
  }

  function render() {
    const q = getQ();
    document.getElementById('calTitle').textContent =
      `${MONTHS[calMonth-1].toUpperCase()} ${calYear}`;

    const calGrid = document.getElementById('calGrid');
    calGrid.innerHTML = '';

    DAYS.forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-day-name';
      el.textContent = d;
      calGrid.appendChild(el);
    });

    const firstDay    = new Date(calYear, calMonth-1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day empty';
      calGrid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key        = matchKey(calYear, calMonth, d);
      const allMatches = WC2026.dayMap[key] || [];
      const filtered   = q
        ? allMatches.filter(f =>
            f.teams.some(t => t.toLowerCase().includes(q)) ||
            (f.isKO && (f.home.toLowerCase().includes(q) || f.away.toLowerCase().includes(q))))
        : allMatches;

      const el = document.createElement('div');
      el.className = 'cal-day';

      // Check if any match today is live
      const hasLive = allMatches.some(f => {
        const ld = Live.forFixture(f);
        return ld && (ld.status === 'IN_PLAY' || ld.status === 'PAUSED');
      });

      el.innerHTML = `<span class="day-num">${d}</span>`;

      if (allMatches.length > 0) {
        if (filtered.length > 0) {
          el.classList.add('has-match');
          if (hasLive) el.classList.add('has-live');
          el.innerHTML += `<div class="match-dot${hasLive?' match-dot--live':''}"></div>
            <div class="match-count-label">${filtered.length} match${filtered.length>1?'es':''}</div>`;
          el.onclick = () => selectDay(key, el);
        } else {
          el.classList.add('has-match-other');
          el.innerHTML += `<div class="match-dot" style="opacity:.2"></div>`;
        }
      }

      if (selectedKey === key) el.classList.add('selected');
      calGrid.appendChild(el);
    }
  }

  function selectDay(key, el) {
    selectedKey = key;
    document.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    renderDayResults();
    document.getElementById('dayResults').scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  function renderDayResults() {
    if (!selectedKey) return;
    const q          = getQ();
    const allMatches = WC2026.dayMap[selectedKey] || [];
    const filtered   = q
      ? allMatches.filter(f =>
          f.teams.some(t => t.toLowerCase().includes(q)) ||
          (f.isKO && (f.home.toLowerCase().includes(q) || f.away.toLowerCase().includes(q))))
      : allMatches;

    const [year,month,day] = selectedKey.split('-').map(Number);
    const MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateLabel = `${MS[month-1]} ${day}, ${year}`;

    const header    = document.getElementById('dayResultsHeader');
    const list      = document.getElementById('dayMatchList');
    const container = document.getElementById('dayResults');

    header.textContent = q
      ? `Matches on ${dateLabel} matching "${q}"`
      : `All matches — ${dateLabel}`;

    if (filtered.length === 0) {
      const teamMatches = q
        ? WC2026.FIXTURES.filter(f =>
            f.teams.some(t => t.toLowerCase().includes(q)) ||
            (f.isKO && (f.home.toLowerCase().includes(q) || f.away.toLowerCase().includes(q))))
        : [];
      header.textContent = `No matches for "${q}" on ${dateLabel}`;
      list.innerHTML = teamMatches.length
        ? `<div class="no-match-note">Other matches for this search:</div>` +
          teamMatches.map(matchCard).join('')
        : `<div class="no-match-note">No matches found.</div>`;
    } else {
      list.innerHTML = filtered.map(matchCard).join('');
    }

    container.classList.add('visible');
  }

  function matchCard(f) {
    const score   = Live.scoreLabel(f);
    const badge   = Live.statusBadge(f);
    const scorers = Live.scorersHtml(f);
    const stageTag = f.isKO
      ? `<div class="day-match-group">${f.label}</div>`
      : `<div class="day-match-group">Group ${f.group}</div>`;

    const scoreHtml = score
      ? `<span class="day-match-score ${Live.forFixture(f)?.status==='IN_PLAY'?'score--live':''}">${score}</span>`
      : 'vs';

    return `
      <div class="day-match-card">
        <div class="day-match-teams">
          <span class="hl">${WC2026.FLAGS[f.home]||''} ${f.home}</span>
          <span class="day-score-area">${scoreHtml} ${badge}</span>
          <span>${WC2026.FLAGS[f.away]||''} ${f.away}</span>
        </div>
        ${scorers ? `<div class="day-match-scorers">${scorers}</div>` : ''}
        <div class="day-match-meta">
          <div class="day-match-time">${f.tzTime}</div>
          ${stageTag}
          <div class="day-match-venue">📍 ${f.venue}</div>
        </div>
      </div>`;
  }

  function onSearchChange() {
    render();
    if (selectedKey) renderDayResults();
  }

  function refreshLive() {
    render();
    if (selectedKey) renderDayResults();
  }

  return { shiftMonth, render, onSearchChange, refreshLive };
})();
