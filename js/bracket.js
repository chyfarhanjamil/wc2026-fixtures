'use strict';

const Bracket = (() => {
  const STAGE_ORDER = ['r32','r16','qf','sf','3rd','final'];
  const STAGE_ICON  = { r32:'⚽', r16:'🎯', qf:'⚡', sf:'🔥', '3rd':'🥉', final:'🏆' };
  const STAGE_I18N  = { r32:'bracket_label_r32', r16:'bracket_label_r16', qf:'bracket_label_qf',
                        sf:'bracket_label_sf', '3rd':'bracket_label_3rd', final:'bracket_label_final' };

  // Track which sections are open (default: all open)
  const _open = { standings: false, r32: false, r16: false, qf: true, sf: true, '3rd': true, final: true };

  function translatePlaceholder(raw) {
    if (!raw) return raw;
    return raw.replace(/\b([A-L])\b/g, letter => I18n.groupLetter(letter));
  }

  function _toggle(key, btn, body) {
    _open[key] = !_open[key];
    body.classList.toggle('ko-body--open', _open[key]);
    btn.querySelector('.ko-chevron').style.transform = _open[key] ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  function _makeSection(key, iconHtml, titleHtml, bodyHtml, badgeText) {
    const isOpen = _open[key];
    const sec = document.createElement('div');
    sec.className = 'ko-section';

    const badge = badgeText ? `<span class="ko-count-badge">${badgeText}</span>` : '';

    sec.innerHTML = `
      <button class="ko-header" aria-expanded="${isOpen}">
        <span class="ko-header-left">
          <span class="ko-icon">${iconHtml}</span>
          <span class="ko-title">${titleHtml}</span>
          ${badge}
        </span>
        <svg class="ko-chevron" width="18" height="18" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.5"
             style="transform:rotate(${isOpen ? 180 : 0}deg);transition:transform .3s">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="ko-body${isOpen ? ' ko-body--open' : ''}">
        <div class="ko-body-inner">${bodyHtml}</div>
      </div>`;

    sec.querySelector('.ko-header').onclick = function() {
      _open[key] = !_open[key];
      this.setAttribute('aria-expanded', _open[key]);
      const body = sec.querySelector('.ko-body');
      body.classList.toggle('ko-body--open', _open[key]);
      this.querySelector('.ko-chevron').style.transform = _open[key] ? 'rotate(180deg)' : 'rotate(0deg)';
    };

    return sec;
  }

  function _buildStandingsHTML() {
    let html = '<div class="standings-grid">';
    WC2026.groups.forEach(g => { html += Standings.renderTable(g); });
    html += '</div>';
    return html;
  }

  function _buildStageHTML(stage) {
    const matches = WC2026.FIXTURES.filter(f => f.stage === stage);
    let html = '<div class="ko-match-list">';

    matches.forEach(f => {
      const ld    = Live.forFixture(f);
      const score = Live.scoreLabel(f);
      const badge = Live.statusBadge(f);

      const dHome = translatePlaceholder(f.home);
      const dAway = translatePlaceholder(f.away);

      // Tooltip descriptions if available
      const homeDesc = f.homeDesc || '';
      const awayDesc = f.awayDesc || '';
      const isPending = !score && f.stage !== 'group';

      const scoreOrVs = score
        ? `<span class="ko-score ${ld && ld.status==='IN_PLAY' ? 'score--live':''}">${score}</span>`
        : `<span class="ko-vs">${I18n.t('vs')}</span>`;

      html += `
        <div class="ko-match-card${stage === 'final' ? ' ko-match--final' : ''}">
          <div class="ko-match-meta">${f.tzDate} &nbsp;·&nbsp; ${f.tzTime} &nbsp;·&nbsp; ${f.venue}</div>
          <div class="ko-match-teams">
            <div class="ko-team${homeDesc ? ' ko-team--tip' : ''}" title="${homeDesc.replace(/\n/g,' ')}">
              <span class="ko-team-name">${dHome}</span>
              ${homeDesc && isPending ? `<span class="ko-team-hint">${homeDesc.replace(/\n/g,'<br>')}</span>` : ''}
            </div>
            <div class="ko-middle">
              ${scoreOrVs}
              ${badge}
            </div>
            <div class="ko-team ko-team--right${awayDesc ? ' ko-team--tip' : ''}" title="${awayDesc.replace(/\n/g,' ')}">
              <span class="ko-team-name">${dAway}</span>
              ${awayDesc && isPending ? `<span class="ko-team-hint">${awayDesc.replace(/\n/g,'<br>')}</span>` : ''}
            </div>
          </div>
        </div>`;
    });

    html += '</div>';
    return html;
  }

  function render() {
    const container = document.getElementById('bracketContent');
    container.innerHTML = '';

    // ── Standings accordion ──────────────────────────────────────────────
    const standingsSection = _makeSection(
      'standings',
      '📊',
      I18n.t('standings_title').replace('📊 ',''),
      _buildStandingsHTML(),
      `${I18n.t('group_prefix')} A–L`
    );
    container.appendChild(standingsSection);

    // ── Divider ──────────────────────────────────────────────────────────
    const divider = document.createElement('div');
    divider.className = 'ko-divider';
    divider.innerHTML = `<span>${I18n.t('knockout_bracket')}</span>`;
    container.appendChild(divider);

    // ── Stage accordions ─────────────────────────────────────────────────
    STAGE_ORDER.forEach(stage => {
      const matches = WC2026.FIXTURES.filter(f => f.stage === stage);
      if (!matches.length) return;
      const sec = _makeSection(
        stage,
        STAGE_ICON[stage],
        I18n.t(STAGE_I18N[stage]),
        _buildStageHTML(stage),
        I18n.num(matches.length) + (matches.length === 1 ? ' match' : ' matches')
      );
      container.appendChild(sec);
    });
  }

  function refreshLive() { render(); }
  return { render, refreshLive };
})();
