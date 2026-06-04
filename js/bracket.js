/**
 * bracket.js — Knockout bracket + Group Standings view
 */
'use strict';

const Bracket = (() => {
  const STAGE_ORDER = ['r32','r16','qf','sf','3rd','final'];
  const STAGE_LABEL = {
    r32:'Round of 32', r16:'Round of 16', qf:'Quarter-Finals',
    sf:'Semi-Finals', '3rd':'3rd Place', final:'Final'
  };
  const STAGE_ICON = { r32:'⚽', r16:'🎯', qf:'⚡', sf:'🔥', '3rd':'🥉', final:'🏆' };

  function displayName(raw) {
    if (!raw.match(/\b(W|L)\d{2,3}\b/) &&
        !raw.match(/\b(Winner|Loser|Best)\b/i) &&
        !raw.match(/\b(1st|2nd|3rd)\b/)) return raw;
    return raw
      .replace('Best 3rd','Best 3rd 🔀')
      .replace(/Winner R32 Match (\d+)/i,'Winner M$1')
      .replace(/Winner R16 Match (\d+)/i,'Winner M$1')
      .replace(/Winner QF Match (\d+)/i, 'Winner M$1')
      .replace(/Loser SF Match (\d+)/i,  'Loser M$1')
      .replace(/Winner SF Match (\d+)/i, 'Winner M$1');
  }

  function render() {
    const container = document.getElementById('bracketContent');
    container.innerHTML = '';

    // ── STANDINGS SECTION ─────────────────────────────────────────────
    const standingsWrap = document.createElement('div');
    standingsWrap.id = 'standingsContainer';
    container.appendChild(standingsWrap);
    Standings.renderAll('standingsContainer');

    // divider
    const div = document.createElement('div');
    div.className = 'bracket-divider';
    div.innerHTML = `<span class="bracket-divider-label">🏆 Knockout Bracket</span>`;
    container.appendChild(div);

    // ── BRACKET ───────────────────────────────────────────────────────
    const legend = document.createElement('div');
    legend.className = 'bracket-legend';
    legend.innerHTML = `<span>ℹ️</span><span>Hover any team slot to see qualifying group info.</span>`;
    container.appendChild(legend);

    STAGE_ORDER.forEach(stage => {
      const matches = WC2026.FIXTURES.filter(f => f.stage === stage);
      if (!matches.length) return;

      const section = document.createElement('div');
      section.className = 'bracket-section';
      section.innerHTML = `<div class="bracket-stage-label">
        <span class="bracket-stage-icon">${STAGE_ICON[stage]}</span>
        ${STAGE_LABEL[stage]}
      </div>`;

      const grid = document.createElement('div');
      grid.className = 'bracket-grid';

      matches.forEach(f => {
        const ld      = Live.forFixture(f);
        const score   = Live.scoreLabel(f);
        const badge   = Live.statusBadge(f);
        const scorers = Live.scorersHtml(f);
        const isFinal = stage === 'final';

        const card = document.createElement('div');
        card.className = `bracket-card${isFinal ? ' bracket-final' : ''}`;

        const homeLabel = displayName(f.home);
        const awayLabel = displayName(f.away);
        const homeDesc  = (f.homeDesc||'').replace(/"/g,"'");
        const awayDesc  = (f.awayDesc||'').replace(/"/g,"'");

        const scoreHtml = score
          ? `<span class="bracket-score ${ld&&ld.status==='IN_PLAY'?'score--live':''}">${score}</span>`
          : `<span class="bracket-vs">vs</span>`;

        card.innerHTML = `
          <div class="bracket-date">${f.tzDate} · ${f.tzTime} · ${f.venue}</div>
          ${badge ? `<div class="bracket-badge-row">${badge}</div>` : ''}
          <div class="bracket-matchup">
            <div class="bracket-team-slot ${homeDesc?'has-tooltip':''}">
              <span class="bracket-team-name">${WC2026.FLAGS[f.home]?WC2026.FLAGS[f.home]+' ':''} ${homeLabel}</span>
              ${homeDesc ? `<span class="bracket-info-icon">ⓘ</span><div class="bracket-tooltip">${homeDesc.replace(/\\n/g,'<br>')}</div>` : ''}
            </div>
            ${scoreHtml}
            <div class="bracket-team-slot ${awayDesc?'has-tooltip':''}">
              <span class="bracket-team-name">${WC2026.FLAGS[f.away]?WC2026.FLAGS[f.away]+' ':''} ${awayLabel}</span>
              ${awayDesc ? `<span class="bracket-info-icon">ⓘ</span><div class="bracket-tooltip right">${awayDesc.replace(/\\n/g,'<br>')}</div>` : ''}
            </div>
          </div>
          ${scorers ? `<div class="bracket-scorers">${scorers}</div>` : ''}`;

        grid.appendChild(card);
      });

      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  // Refresh standings + bracket scores without full rebuild
  function refreshLive() {
    Standings.renderAll('standingsContainer');
    // Re-render score badges inside bracket cards
    document.querySelectorAll('.bracket-card').forEach(card => {
      // lightweight: just re-render the whole bracket
    });
    render(); // full re-render is simplest given the standings need it too
  }

  return { render, refreshLive };
})();
