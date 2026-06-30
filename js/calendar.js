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

  // True if a fixture matches the search query — for group matches this
  // checks the English/translated team names; for KO matches it also checks
  // the Resolver-resolved real team name (once known), so e.g. searching
  // "Brazil" finds a knockout match even before the placeholder text changes.
  function _matchesQuery(f, q) {
    if (!q) return true;

    if (!f.isKO) {
      // Group stage — match either team name directly only
      return f.teams.some(t =>
        t.toLowerCase().includes(q) || I18n.teamName(t).toLowerCase().includes(q)
      );
    }

    // KO stage — ONLY match on Resolver-confirmed real team names.
    // Never match on homeDesc/awayDesc pool text like "(Brazil, Morocco...)"
    // because that would show unrelated KO fixtures before Brazil qualifies.
    const r = Resolver.resolve(f);
    if (r.homeResolved && (r.home.toLowerCase().includes(q) || I18n.teamName(r.home).toLowerCase().includes(q))) return true;
    if (r.awayResolved && (r.away.toLowerCase().includes(q) || I18n.teamName(r.away).toLowerCase().includes(q))) return true;
    return false;
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
        ? allMatches.filter(f => _matchesQuery(f, q))
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
      ? allMatches.filter(f => _matchesQuery(f, q))
      : allMatches;

    const dateLabel  = _dateLabel(selectedKey);
    const header     = document.getElementById('dayResultsHeader');
    const list       = document.getElementById('dayMatchList');
    const container  = document.getElementById('dayResults');

    if (filtered.length === 0) {
      const teamMatches = q
        ? WC2026.FIXTURES.filter(f => _matchesQuery(f, q))
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
    const ld     = Live.forFixture(f);
    const score  = Live.scoreLabel(f);
    const badge  = Live.statusBadge(f);
    const dGroup = f.displayGroup || f.group;

    // For group stage use translated names; for KO ask the Resolver for the
    // real team name (once known) and fall back to a translated placeholder.
    const resolved  = f.isKO ? Resolver.resolve(f) : null;
    const dHome = f.isKO
      ? (resolved.homeResolved ? resolved.home : resolved.home.replace(/\b([A-L])\b/g, l => I18n.groupLetter(l)))
      : (f.displayHome || f.home);
    const dAway = f.isKO
      ? (resolved.awayResolved ? resolved.away : resolved.away.replace(/\b([A-L])\b/g, l => I18n.groupLetter(l)))
      : (f.displayAway || f.away);

    const scoreOrVs = Live.scoreBlockHtml(f, I18n.t('vs'));

    const stagePill = f.isKO
      ? `<span class="day-stage-pill day-stage-pill--ko">${f.label}</span>`
      : `<span class="day-stage-pill">${I18n.t('group_prefix')} ${dGroup}</span>`;

    // For KO fixtures that haven't been played yet, show a friendly hint for
    // whichever side(s) are still unresolved (a side already resolved by the
    // Resolver — e.g. "Brazil" instead of "1st Group C" — needs no hint).
    const koHint = (f.isKO && !score && (resolved.homeDesc || resolved.awayDesc))
      ? `<div class="day-ko-hint">
           ${resolved.homeDesc ? `<div class="day-ko-team-hint"><strong>${dHome}</strong><br><span>${resolved.homeDesc.replace(/\n/g,' · ')}</span></div>` : ''}
           ${resolved.awayDesc ? `<div class="day-ko-team-hint"><strong>${dAway}</strong><br><span>${resolved.awayDesc.replace(/\n/g,' · ')}</span></div>` : ''}
         </div>`
      : '';

    return `
      <div class="day-match-card${f.stage==='final' ? ' day-match-card--final' : ''}">
        <div class="day-match-header">
          ${stagePill}
          <span class="day-match-venue-inline">${f.venue}</span>
        </div>
        <div class="day-match-teams">
          <span class="hl">${dHome}</span>
          <span class="day-match-center">
            ${scoreOrVs}
            ${badge}
          </span>
          <span class="hl hl-right">${dAway}</span>
        </div>
        ${koHint}
        ${Live.scorerDropdownHtml(f)}
        <div class="day-match-foot">
          <span class="day-match-time-pill">${f.tzTime}</span>
        </div>
      </div>`;
  }

  function onSearchChange() { render(); if (selectedKey) renderDayResults(); }
  function refreshLive()    { render(); if (selectedKey) renderDayResults(); }

  return { shiftMonth, render, onSearchChange, refreshLive };
})();
