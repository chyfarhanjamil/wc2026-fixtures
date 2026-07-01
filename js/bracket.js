'use strict';

const Bracket = (() => {
  const STAGE_ORDER = ['r32','r16','qf','sf','3rd','final'];
  const STAGE_ICON  = { r32:'⚽', r16:'🎯', qf:'⚡', sf:'🔥', '3rd':'🥉', final:'🏆' };
  const STAGE_I18N  = { r32:'bracket_label_r32', r16:'bracket_label_r16', qf:'bracket_label_qf',
                        sf:'bracket_label_sf', '3rd':'bracket_label_3rd', final:'bracket_label_final' };

  // Track which sections are open. This starts closed everywhere and is
  // then auto-computed by _syncAutoOpen() so that only the stage that is
  // "currently up" (the earliest stage that isn't 100% finished yet) is
  // expanded, and everything else collapses. Once a user manually opens
  // or closes a section by hand, we leave their choice alone until the
  // active stage actually changes (e.g. R32 finishes and R16 kicks off).
  const _open = { standings: false, r32: false, r16: false, qf: false, sf: false, '3rd': false, final: false };

  // Remembers the last auto-computed "active" stage / group-done state so
  // we only re-force the accordion open/closed when something actually
  // changes, instead of stomping on manual toggles on every re-render.
  let _lastActiveStage = null;
  let _lastGroupsDone = null;

  function _stageAllFinished(stage) {
    const matches = WC2026.FIXTURES.filter(f => f.stage === stage);
    if (!matches.length) return false;
    return matches.every(f => {
      const ld = Live.forFixture(f);
      return ld && ld.status === 'FINISHED';
    });
  }

  // Earliest knockout stage that still has at least one unfinished match.
  // Once every stage is finished (tournament over) this settles on 'final'.
  function _computeActiveStage() {
    for (const stage of STAGE_ORDER) {
      const matches = WC2026.FIXTURES.filter(f => f.stage === stage);
      if (!matches.length) continue;
      if (!_stageAllFinished(stage)) return stage;
    }
    return STAGE_ORDER[STAGE_ORDER.length - 1];
  }

  // Auto-expand exactly the section that's "live" right now:
  //  - Group standings stay open while the group stage is still ongoing,
  //    then auto-collapse once every group match is finished.
  //  - Whichever KO stage is the current one (in progress or next up)
  //    opens by itself; every other KO stage collapses.
  // This only fires the *first* time we detect a transition — after that,
  // manual clicks are respected until the active stage changes again.
  function _syncAutoOpen() {
    const groupMatches = WC2026.FIXTURES.filter(f => f.stage === 'group');
    const groupsDone = groupMatches.length ? groupMatches.every(f => {
      const ld = Live.forFixture(f);
      return ld && ld.status === 'FINISHED';
    }) : false;

    if (_lastGroupsDone === null || groupsDone !== _lastGroupsDone) {
      _open.standings = !groupsDone;
      _lastGroupsDone = groupsDone;
    }

    const activeStage = _computeActiveStage();
    if (_lastActiveStage === null || activeStage !== _lastActiveStage) {
      STAGE_ORDER.forEach(s => { _open[s] = (s === activeStage); });
      _lastActiveStage = activeStage;
    }
  }

  // Map of KO match IDs to a short human-readable label
  const KO_MATCH_LABELS = {
    // R32
    73:'R32: 2nd-A vs 2nd-B', 76:'R32: 1st-C vs 2nd-F', 74:'R32: 1st-E vs Best 3rd',
    75:'R32: 1st-F vs 2nd-C', 78:'R32: 2nd-E vs 2nd-I', 77:'R32: 1st-I vs Best 3rd',
    79:'R32: 1st-A vs Best 3rd', 80:'R32: 1st-L vs Best 3rd', 82:'R32: 1st-G vs Best 3rd',
    81:'R32: 1st-D vs Best 3rd', 84:'R32: 1st-H vs 2nd-J', 83:'R32: 2nd-K vs 2nd-L',
    85:'R32: 1st-B vs Best 3rd', 88:'R32: 2nd-D vs 2nd-G', 86:'R32: 1st-J vs 2nd-H',
    87:'R32: 1st-K vs Best 3rd',
    // R16
    90:'R16 (Jul 4, Houston)', 89:'R16 (Jul 4, Philadelphia)', 91:'R16 (Jul 5, NY/NJ)',
    92:'R16 (Jul 6, Mexico City)', 93:'R16 (Jul 6, Dallas)', 94:'R16 (Jul 7, Seattle)',
    95:'R16 (Jul 7, Atlanta)', 96:'R16 (Jul 7, NY/NJ)',
    // QF
    97:'QF (Jul 9, Dallas)', 98:'QF (Jul 9, Los Angeles)', 99:'QF (Jul 10, NY/NJ)', 100:'QF (Jul 11, Boston)',
    // SF
    101:'SF (Jul 14, Dallas)', 102:'SF (Jul 15, NY/NJ)',
  };

  function translatePlaceholder(raw) {
    if (!raw) return raw;
    // Replace "Winner R32 Match 73" → "Winner R32: 1st-C vs 2nd-F" etc.
    const m = raw.match(/^(Winner|Loser)\s+(?:R32|R16|QF|SF)\s+Match\s+(\d+)$/);
    if (m) {
      const label = KO_MATCH_LABELS[parseInt(m[2])];
      return label ? `${m[1]} of ${label}` : raw;
    }
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

      // Resolver fills in real team names once group/earlier-round results
      // make them certain; anything still unknown keeps its placeholder text.
      const resolved = Resolver.resolve(f);
      const dHome = resolved.homeResolved ? resolved.home : translatePlaceholder(resolved.home);
      const dAway = resolved.awayResolved ? resolved.away : translatePlaceholder(resolved.away);

      // Tooltip descriptions if available (cleared once that side is resolved)
      const homeDesc = resolved.homeDesc || '';
      const awayDesc = resolved.awayDesc || '';
      const isPending = !score && f.stage !== 'group';

      const scoreOrVs = Live.scoreBlockHtml(f, I18n.t('vs'));

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
          ${Live.scorerDropdownHtml(f)}
        </div>`;
    });

    html += '</div>';
    return html;
  }

  function render() {
    _syncAutoOpen();

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
