/**
 * teamGrid.js — Team card grid with live scores, scorers, match details
 */
'use strict';

const TeamGrid = (() => {

  function init(reinit = false) {
    const grid = document.getElementById('grid');
    if (reinit) {
      grid.querySelectorAll('.team-card').forEach(c => c.remove());
      const old = document.getElementById('noResults');
      if (old) old.remove();
    }

    WC2026.teams.forEach(team => {
      const { group, matches } = WC2026.teamMap[team];
      const flag = WC2026.FLAGS[team] || '🏳️';

      const card = document.createElement('div');
      card.className    = 'team-card';
      card.dataset.team  = team;
      card.dataset.group = group;
      card.id = `card-${_safe(team)}`;

      card.innerHTML = `
        <div class="card-header">
          <div class="flag-circle">${flag}</div>
          <div class="team-info">
            <h2>${team}</h2>
            <div class="group-label">Group ${group}
              <span class="count-badge">${matches.length} matches</span>
            </div>
          </div>
        </div>
        <div class="match-list" id="ml-${_safe(team)}"></div>
        <div class="no-match-in-filter hidden"></div>`;

      grid.appendChild(card);
      _buildMatchRows(team, matches);
    });

    const noRes = document.createElement('div');
    noRes.id        = 'noResults';
    noRes.className = 'no-results hidden';
    grid.appendChild(noRes);
  }

  function _safe(s) { return s.replace(/[^a-zA-Z0-9]/g,'_'); }

  function _buildMatchRows(team, matches) {
    const container = document.getElementById(`ml-${_safe(team)}`);
    if (!container) return;
    container.innerHTML = matches.map(f => _rowHtml(team, f)).join('');
  }

  function _rowHtml(team, f) {
    const ld      = Live.forFixture(f);
    const score   = Live.scoreLabel(f);
    const badge   = Live.statusBadge(f);
    const scorers = Live.scorersHtml(f);

    const homeHl  = f.home === team ? 'highlight' : '';
    const awayHl  = f.away === team ? 'highlight' : '';

    const scoreCell = score
      ? `<span class="match-score ${ld && ld.status === 'IN_PLAY' ? 'score--live' : ''}">${score}</span>`
      : `<span class="match-sep">vs</span>`;

    return `<div class="match-row" data-slot="${f.slot}" data-group="${f.group}" data-id="${f.id}">
      <div class="match-date">${f.tzDate}</div>
      <div class="match-vs">
        <span class="${homeHl}">${f.home}</span>
        ${scoreCell}
        <span class="${awayHl}">${f.away}</span>
        ${badge}
      </div>
      <div class="match-time">${f.tzTime}</div>
      ${scorers ? `<div class="match-scorers-wrap col-span-3">${scorers}</div>` : ''}
    </div>`;
  }

  function refreshLive() {
    WC2026.teams.forEach(team => {
      const { matches } = WC2026.teamMap[team];
      _buildMatchRows(team, matches);
    });
  }

  function render({ mode, activeGroup, activeTimeSlot }) {
    const q     = (document.getElementById('search').value || '').toLowerCase().trim();
    const cards = document.querySelectorAll('.team-card');
    let visible = 0;

    cards.forEach(card => {
      const teamName  = card.dataset.team.toLowerCase();
      const teamGroup = card.dataset.group;

      const matchesSearch = !q || teamName.includes(q);
      const matchesGroup  = mode !== 'group' || !activeGroup || teamGroup === activeGroup
                            || (q && matchesSearch);

      if (!matchesSearch || !matchesGroup) {
        card.classList.add('hidden'); return;
      }

      const rows = card.querySelectorAll('.match-row');
      let shownRows = 0;
      rows.forEach(row => {
        const slotOk  = !activeTimeSlot || row.dataset.slot === activeTimeSlot;
        const groupOk = mode !== 'group' || !activeGroup || row.dataset.group === activeGroup
                        || (q && matchesSearch);
        const show = slotOk && groupOk;
        row.style.display = show ? '' : 'none';
        if (show) shownRows++;
      });

      card.classList.remove('hidden');
      visible++;

      const inlineMsg = card.querySelector('.no-match-in-filter');
      if (shownRows === 0) {
        const available = [...new Set([...rows].map(r => r.dataset.slot))];
        inlineMsg.textContent = activeTimeSlot
          ? `No ${activeTimeSlot} matches for ${card.dataset.team}. They play in: ${available.join(', ')}.`
          : '';
        inlineMsg.classList.toggle('hidden', !activeTimeSlot);
      } else {
        inlineMsg.classList.add('hidden');
      }
    });

    const noRes = document.getElementById('noResults');
    if (noRes) {
      noRes.textContent = q ? `No team found matching "${q}".` : 'No teams match current filters.';
      noRes.classList.toggle('hidden', visible > 0);
    }
  }

  return { init, render, refreshLive };
})();
