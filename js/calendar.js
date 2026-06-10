'use strict';

const Calendar = (() => {
  let calMonth = 6, calYear = 2026, selectedKey = null;

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
      I18n.formatCalendarHeading(calMonth - 1, calYear);

    const calGrid = document.getElementById('calGrid');
    calGrid.innerHTML = '';

    // Day name headers in current language
    I18n.days().forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-day-name';
      el.textContent = d;
      calGrid.appendChild(el);
    });

    const firstDay    = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day empty';
      calGrid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key        = matchKey(calYear, calMonth, d);
      const allMatches = WC2026.dayMap[key] || [];
      // search by English name so it still works in all languages
      const filtered   = q
        ? allMatches.filter(f =>
            f.teams.some(t => t.toLowerCase().includes(q) || I18n.teamName(t).toLowerCase().includes(q)) ||
            (f.isKO && (f.home.toLowerCase().includes(q) || f.away.toLowerCase().includes(q))))
        : allMatches;

      const hasLive = allMatches.some(f => {
        const ld = Live.forFixture(f);
        return ld && (ld.status === 'IN_PLAY' || ld.status === 'PAUSED');
      });

      const el = document.createElement('div');
      el.className = 'cal-day';
      // Day number in local numerals
      el.innerHTML = `<span class="day-num">${I18n.num(d)}</span>`;

      if (allMatches.length > 0) {
        if (filtered.length > 0) {
          el.classList.add('has-match');
          if (hasLive) el.classList.add('has-live');
          const n = filtered.length;
          const label = n === 1 ? I18n.t('cal_match', { n: I18n.num(n) }) : I18n.t('cal_matches', { n: I18n.num(n) });
          el.innerHTML += `<div class="match-dot${hasLive ? ' dot--live' : ''}"></div>
            <div class="match-count-label">${label}</div>`;
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

  function _dateLabel(key) {
    const [year, month, day] = key.split('-').map(Number);
    // Build a UTC date to pass to formatDateLong
    const d = new Date(Date.UTC(year, month - 1, day));
    return I18n.formatDateLong(d);
  }

  function renderDayResults() {
    if (!selectedKey) return;
    const q          = getQ();
    const allMatches = WC2026.dayMap[selectedKey] || [];
    const filtered   = q
      ? allMatches.filter(f =>
          f.teams.some(t => t.toLowerCase().includes(q) || I18n.teamName(t).toLowerCase().includes(q)) ||
          (f.isKO && (f.home.toLowerCase().includes(q) || f.away.toLowerCase().includes(q))))
      : allMatches;

    const dateLabel  = _dateLabel(selectedKey);
    const header     = document.getElementById('dayResultsHeader');
    const list       = document.getElementById('dayMatchList');
    const container  = document.getElementById('dayResults');

    if (filtered.length === 0) {
      const teamMatches = q
        ? WC2026.FIXTURES.filter(f =>
            f.teams.some(t => t.toLowerCase().includes(q) || I18n.teamName(t).toLowerCase().includes(q)) ||
            (f.isKO && (f.home.toLowerCase().includes(q) || f.away.toLowerCase().includes(q))))
        : [];
      header.textContent = I18n.t('cal_no_match', { q, date: dateLabel });
      list.innerHTML = teamMatches.length
        ? `<div class="no-match-note">${I18n.t('cal_other_matches')}</div>` + teamMatches.map(matchCard).join('')
        : `<div class="no-match-note">${I18n.t('cal_no_results')}</div>`;
    } else {
      header.textContent = q
        ? I18n.t('cal_day_header_q', { date: dateLabel, q })
        : I18n.t('cal_day_header',   { date: dateLabel });
      list.innerHTML = filtered.map(matchCard).join('');
    }

    container.classList.add('visible');
  }

  function matchCard(f) {
    const ld    = Live.forFixture(f);
    const score = Live.scoreLabel(f);
    const badge = Live.statusBadge(f);
    const dHome = f.displayHome || f.home;
    const dAway = f.displayAway || f.away;
    const dGroup = f.displayGroup || f.group;

    const scoreOrVs = score
      ? `<span class="match-score ${ld && ld.status==='IN_PLAY' ? 'score--live':''}">${score}</span>`
      : `<span class="day-match-vs-sep">${I18n.t('vs')}</span>`;
    const stageTag = f.isKO
      ? `<div class="day-match-group">${f.label}</div>`
      : `<div class="day-match-group">${I18n.t('group_prefix')} ${dGroup}</div>`;
    return `
      <div class="day-match-card">
        <div class="day-match-teams">
          <span class="hl">${dHome}</span> ${scoreOrVs} ${dAway} ${badge}
        </div>
        <div class="day-match-meta">
          <div class="day-match-time">${f.tzTime}</div>
          ${stageTag}
          <div class="day-match-venue">${f.venue}</div>
        </div>
      </div>`;
  }

  function onSearchChange() { render(); if (selectedKey) renderDayResults(); }
  function refreshLive()    { render(); if (selectedKey) renderDayResults(); }

  return { shiftMonth, render, onSearchChange, refreshLive };
})();
