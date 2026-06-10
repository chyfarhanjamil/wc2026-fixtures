'use strict';

const Bracket = (() => {
  const STAGE_ORDER = ['r32','r16','qf','sf','3rd','final'];
  const STAGE_ICON  = { r32:'⚽', r16:'🎯', qf:'⚡', sf:'🔥', '3rd':'🥉', final:'🏆' };
  const STAGE_I18N  = { r32:'bracket_label_r32', r16:'bracket_label_r16', qf:'bracket_label_qf', sf:'bracket_label_sf', '3rd':'bracket_label_3rd', final:'bracket_label_final' };

  // For KO placeholder strings like "1st Group A" — translate the group letter
  function translatePlaceholder(raw) {
    if (!raw) return raw;
    return raw.replace(/\b([A-L])\b/g, letter => I18n.groupLetter(letter));
  }

  function render() {
    const container = document.getElementById('bracketContent');
    container.innerHTML = '';

    const standingsWrap = document.createElement('div');
    standingsWrap.id = 'standingsContainer';
    container.appendChild(standingsWrap);
    Standings.renderAll('standingsContainer');

    const div = document.createElement('div');
    div.className = 'bracket-divider';
    div.innerHTML = `<span class="bracket-divider-label">${I18n.t('knockout_bracket')}</span>`;
    container.appendChild(div);

    const legend = document.createElement('div');
    legend.className = 'bracket-legend';
    legend.innerHTML = `<span>ℹ️</span><span>${I18n.t('bracket_legend')}</span>`;
    container.appendChild(legend);

    STAGE_ORDER.forEach(stage => {
      const matches = WC2026.FIXTURES.filter(f => f.stage === stage);
      if (!matches.length) return;

      const section = document.createElement('div');
      section.className = 'bracket-section';
      section.innerHTML = `<div class="bracket-stage-label">
        <span class="bracket-stage-icon">${STAGE_ICON[stage]}</span>
        ${I18n.t(STAGE_I18N[stage])}
      </div>`;

      const grid = document.createElement('div');
      grid.className = 'bracket-grid';

      matches.forEach(f => {
        const ld    = Live.forFixture(f);
        const score = Live.scoreLabel(f);
        const badge = Live.statusBadge(f);

        // Group stage: use translated name; KO placeholders: translate group letters within
        const dHome = f.stage === 'group'
          ? (f.displayHome || f.home)
          : translatePlaceholder(f.home);
        const dAway = f.stage === 'group'
          ? (f.displayAway || f.away)
          : translatePlaceholder(f.away);

        const scoreOrVs = score
          ? `<span class="bracket-score ${ld && ld.status==='IN_PLAY' ? 'score--live':''}">${score}</span>`
          : `<span class="bracket-vs">${I18n.t('vs')}</span>`;

        const card = document.createElement('div');
        card.className = `bracket-card${stage==='final' ? ' bracket-final' : ''}`;
        card.innerHTML = `
          <div class="bracket-date">${f.tzDate} · ${f.tzTime} · ${f.venue}</div>
          <div class="bracket-matchup">
            <span class="bracket-team" title="${f.home}">${dHome}</span>
            ${scoreOrVs}
            <span class="bracket-team bracket-team--away" title="${f.away}">${dAway}</span>
            ${badge}
          </div>`;
        grid.appendChild(card);
      });

      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  function refreshLive() { render(); }
  return { render, refreshLive };
})();
