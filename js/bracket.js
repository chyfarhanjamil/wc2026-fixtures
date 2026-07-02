'use strict';

// This module renders the Home tab: Today/Yesterday featured match cards up
// top, then a set of accordions — Group Standings, Group Stage matches, and
// each knockout round (R32 → Final). It replaced the old separate "By
// Group" / "By Time" tabs, whose content is now folded in here as the
// Group Stage accordion (with the same group-letter filter chips), plus the
// Knockout tab's accordion set. Only the section that's "currently up" is
// open by default; the rest collapse, and that follows the tournament as it
// progresses (see _syncAutoOpen below).
const Bracket = (() => {
  const STAGE_ORDER = ['r32','r16','qf','sf','3rd','final'];
  const STAGE_ICON  = { group:'🔠', r32:'⚽', r16:'🎯', qf:'⚡', sf:'🔥', '3rd':'🥉', final:'🏆' };
  const STAGE_I18N  = { r32:'bracket_label_r32', r16:'bracket_label_r16', qf:'bracket_label_qf',
                        sf:'bracket_label_sf', '3rd':'bracket_label_3rd', final:'bracket_label_final' };

  // Track which sections are open. This starts closed everywhere and is
  // then auto-computed by _syncAutoOpen() so that only the stage that is
  // "currently up" (the earliest stage that isn't 100% finished yet) is
  // expanded, and everything else collapses. Once a user manually opens
  // or closes a section by hand, we leave their choice alone until the
  // active stage actually changes (e.g. R32 finishes and R16 kicks off).
  const _open = { standings: false, group: false, r32: false, r16: false, qf: false, sf: false, '3rd': false, final: false };

  // Remembers the last auto-computed "active" stage / group-done state so
  // we only re-force the accordion open/closed when something actually
  // changes, instead of stomping on manual toggles on every re-render.
  let _lastActiveStage = null;
  let _lastGroupsDone = null;

  // Group-letter filter for the Group Stage matches accordion (null = all).
  let _groupFilter = null;
  // Current search box query, lower-cased & trimmed.
  let _searchQuery = '';

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
  //  - Standings + Group Stage matches stay open while the group stage is
  //    still ongoing, then auto-collapse once every group match is finished.
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
      _open.group = !groupsDone;
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

  function _makeSection(key, iconHtml, titleHtml, bodyHtml, badgeText, forceOpen) {
    if (forceOpen !== undefined) _open[key] = forceOpen;
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

  function _matchesSearch(dHome, dAway, rawHome, rawAway, q) {
    if (!q) return true;
    const hay = [dHome, dAway, rawHome, rawAway].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  // Builds one match card. Shared by the Group Stage list and every KO
  // stage list so they all look and behave identically.
  function _matchCardHtml(f) {
    const score = Live.scoreLabel(f);
    const badge = Live.statusBadge(f);
    const isGroup = f.stage === 'group';

    let dHome, dAway, homeDesc = '', awayDesc = '', flagHome = '', flagAway = '';
    if (isGroup) {
      dHome = f.displayHome || f.home;
      dAway = f.displayAway || f.away;
      flagHome = WC2026.FLAGS[f.home] || '';
      flagAway = WC2026.FLAGS[f.away] || '';
    } else {
      const resolved = Resolver.resolve(f);
      dHome = resolved.homeResolved ? resolved.home : translatePlaceholder(resolved.home);
      dAway = resolved.awayResolved ? resolved.away : translatePlaceholder(resolved.away);
      homeDesc = resolved.homeDesc || '';
      awayDesc = resolved.awayDesc || '';
      flagHome = resolved.homeResolved ? (WC2026.FLAGS[resolved.home] || '') : '';
      flagAway = resolved.awayResolved ? (WC2026.FLAGS[resolved.away] || '') : '';
    }

    const isPending = !score && !isGroup;
    const scoreOrVs = Live.scoreBlockHtml(f, I18n.t('vs'));

    const html = `
      <div class="ko-match-card${f.stage === 'final' ? ' ko-match--final' : ''}">
        <div class="ko-match-meta">
          <span>${f.tzDate} &nbsp;·&nbsp; ${f.tzTime}</span>
          <span class="ko-match-venue" title="${f.venue}">📍 ${f.venue}</span>
        </div>
        <div class="ko-match-teams">
          <div class="ko-team${homeDesc ? ' ko-team--tip' : ''}" title="${homeDesc.replace(/\n/g,' ')}">
            ${flagHome ? `<span class="ko-team-flag">${flagHome}</span>` : ''}
            <span class="ko-team-name">${dHome}</span>
            ${homeDesc && isPending ? `<span class="ko-team-hint">${homeDesc.replace(/\n/g,'<br>')}</span>` : ''}
          </div>
          <div class="ko-middle">
            ${scoreOrVs}
            ${badge}
          </div>
          <div class="ko-team ko-team--right${awayDesc ? ' ko-team--tip' : ''}" title="${awayDesc.replace(/\n/g,' ')}">
            <span class="ko-team-name">${dAway}</span>
            ${flagAway ? `<span class="ko-team-flag">${flagAway}</span>` : ''}
            ${awayDesc && isPending ? `<span class="ko-team-hint">${awayDesc.replace(/\n/g,'<br>')}</span>` : ''}
          </div>
        </div>
        ${Live.scorerDropdownHtml(f, dHome, dAway, flagHome, flagAway)}
      </div>`;

    return { dHome, dAway, rawHome: f.home, rawAway: f.away, html };
  }

  // Returns { html, count }. `count` is how many matches actually rendered
  // after filtering, so callers can hide/collapse empty sections properly
  // instead of showing an accordion with nothing useful inside it.
  function _buildStageHTML(stage, opts = {}) {
    const { groupFilter, query } = opts;
    let matches = WC2026.FIXTURES.filter(f => f.stage === stage);
    if (groupFilter) matches = matches.filter(f => f.group === groupFilter);

    let html = '';
    let count = 0;
    matches.forEach(f => {
      const card = _matchCardHtml(f);
      if (query && !_matchesSearch(card.dHome, card.dAway, card.rawHome, card.rawAway, query)) return;
      html += card.html;
      count++;
    });

    if (count === 0) {
      html = `<div class="ko-empty-note">${query ? I18n.t('search_no_matches', { q: query }) : I18n.t('cal_no_results')}</div>`;
    }

    return { html: `<div class="ko-match-list">${html}</div>`, count };
  }

  function _buildGroupFilterChipsHtml() {
    let html = `<div class="ko-group-chips">
      <button class="filter-chip filter-chip--sm${_groupFilter === null ? ' active' : ''}" data-group="">${I18n.t('all_groups')}</button>`;
    WC2026.groups.forEach(g => {
      html += `<button class="filter-chip filter-chip--sm${_groupFilter === g ? ' active' : ''}" data-group="${g}">${I18n.t('group_prefix')} ${I18n.groupLetter(g)}</button>`;
    });
    html += `</div>`;
    return html;
  }

  function _wireGroupChips(sectionEl) {
    sectionEl.querySelectorAll('.ko-group-chips .filter-chip').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        _groupFilter = btn.dataset.group || null;
        render();
      };
    });
  }

  // ── Today / Yesterday featured cards ────────────────────────────────────
  function _dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function _featuredCardFor(f, dateLabel) {
    const isGroup = f.stage === 'group';
    let dHome, dAway, stageText;
    if (isGroup) {
      dHome = f.displayHome || f.home;
      dAway = f.displayAway || f.away;
      stageText = `${I18n.t('group_prefix')} ${f.displayGroup || f.group}`;
    } else {
      const resolved = Resolver.resolve(f);
      dHome = resolved.homeResolved ? resolved.home : translatePlaceholder(resolved.home);
      dAway = resolved.awayResolved ? resolved.away : translatePlaceholder(resolved.away);
      stageText = I18n.stageLabel(f.stage);
    }
    return Live.featuredMatchCardHtml(f, dHome, dAway, dateLabel, stageText);
  }

  function _buildTodayYesterdayHTML() {
    const now = new Date();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);

    const todayMatches = (WC2026.dayMap[_dateKey(now)] || []).slice().sort((a, b) => a.utc.localeCompare(b.utc));
    const yestMatches  = (WC2026.dayMap[_dateKey(yest)] || []).slice().sort((a, b) => a.utc.localeCompare(b.utc));

    const todayHtml = todayMatches.length
      ? `<div class="fm-grid">${todayMatches.map(f => _featuredCardFor(f, I18n.t('label_today'))).join('')}</div>`
      : `<div class="fm-empty-note">${I18n.t('no_matches_today')}</div>`;

    const yestHtml = yestMatches.length
      ? `<div class="fm-grid">${yestMatches.map(f => _featuredCardFor(f, I18n.t('label_yesterday'))).join('')}</div>`
      : `<div class="fm-empty-note">${I18n.t('no_matches_yesterday')}</div>`;

    return `
      <div class="fm-section">
        <div class="fm-section-title">📅 ${I18n.t('today_matches_title')}</div>
        ${todayHtml}
      </div>
      <div class="fm-section">
        <div class="fm-section-title">🕐 ${I18n.t('yesterday_matches_title')}</div>
        ${yestHtml}
      </div>`;
  }

  function render() {
    _syncAutoOpen();

    const container = document.getElementById('bracketContent');
    container.innerHTML = '';

    // ── Today / Yesterday ───────────────────────────────────────────────
    const tyWrap = document.createElement('div');
    tyWrap.className = 'fm-wrap';
    tyWrap.innerHTML = _buildTodayYesterdayHTML();
    container.appendChild(tyWrap);

    const q = _searchQuery;

    // ── Standings accordion ──────────────────────────────────────────────
    const standingsSection = _makeSection(
      'standings',
      '📊',
      I18n.t('standings_title').replace('📊 ', ''),
      _buildStandingsHTML(),
      `${I18n.t('group_prefix')} A–L`
    );
    container.appendChild(standingsSection);

    // ── Group Stage matches accordion ─────────────────────────────────────
    const divider1 = document.createElement('div');
    divider1.className = 'ko-divider';
    divider1.innerHTML = `<span>${I18n.t('stage_group')}</span>`;
    container.appendChild(divider1);

    const groupMatchesAll = WC2026.FIXTURES.filter(f => f.stage === 'group');
    const groupBuilt = _buildStageHTML('group', { groupFilter: _groupFilter, query: q });
    const groupBodyHtml = _buildGroupFilterChipsHtml() + groupBuilt.html;
    const groupSection = _makeSection(
      'group',
      STAGE_ICON.group,
      I18n.t('group_stage_matches_title'),
      groupBodyHtml,
      I18n.num(groupMatchesAll.length) + ' matches',
      q ? true : undefined
    );
    container.appendChild(groupSection);
    _wireGroupChips(groupSection);

    // ── Divider ──────────────────────────────────────────────────────────
    const divider2 = document.createElement('div');
    divider2.className = 'ko-divider';
    divider2.innerHTML = `<span>${I18n.t('knockout_bracket')}</span>`;
    container.appendChild(divider2);

    // ── Stage accordions ─────────────────────────────────────────────────
    STAGE_ORDER.forEach(stage => {
      const matches = WC2026.FIXTURES.filter(f => f.stage === stage);
      if (!matches.length) return;
      const built = _buildStageHTML(stage, { query: q });
      if (q && built.count === 0) return; // hide empty sections while searching
      const sec = _makeSection(
        stage,
        STAGE_ICON[stage],
        I18n.t(STAGE_I18N[stage]),
        built.html,
        I18n.num(matches.length) + (matches.length === 1 ? ' match' : ' matches'),
        q ? true : undefined
      );
      container.appendChild(sec);
    });
  }

  function onSearchChange() {
    const el = document.getElementById('search');
    _searchQuery = el ? el.value.toLowerCase().trim() : '';
    render();
  }

  function refreshLive() { render(); }
  return { render, refreshLive, onSearchChange };
})();
