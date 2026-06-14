/**
 * stats.js — Player & Team Statistics
 * Compiles data from Live.liveData (football-data.org scorers, cards, etc.)
 * Falls back to demo/placeholder data when no API key is set.
 */
'use strict';

const Stats = (() => {
  let _activeTab    = 'goals';
  let _searchQ      = '';
  let _teamFilter   = 'all';
  let _showAllGoals = false;
  let _showAllAssists = false;
  let _showAllGK    = false;
  let _showAllCards = false;
  let _showAllTeams = false;
  const INITIAL_ROWS = 10;

  /* ── Pull compiled stats from Live data ──────────────────────────────── */
  function _compile() {
    const playerMap = {};  // name → { goals, assists, pens, og, yellow, red, team, matches }
    const gkMap     = {};  // name → { saves, conceded, cs, team, matches }
    const teamMap   = {};  // team → { gf, ga, gd, yellow, red, matches, wins, draws, losses }

    WC2026.FIXTURES.filter(f => f.stage === 'group').forEach(f => {
      const ld = Live.forFixture(f);
      if (!ld || ld.scoreHome === null) return;

      // Team stats
      [f.home, f.away].forEach((team, i) => {
        if (!teamMap[team]) teamMap[team] = { gf:0,ga:0,yellow:0,red:0,matches:0,wins:0,draws:0,losses:0 };
        const t = teamMap[team];
        t.matches++;
        const scored   = i === 0 ? ld.scoreHome : ld.scoreAway;
        const conceded = i === 0 ? ld.scoreAway : ld.scoreHome;
        t.gf += scored; t.ga += conceded;
        if (scored > conceded) t.wins++;
        else if (scored === conceded) t.draws++;
        else t.losses++;
      });

      // Player scorers
      (ld.scorers || []).forEach(g => {
        const name = g.player || 'Own Goal';
        if (!playerMap[name]) playerMap[name] = { goals:0,assists:0,pens:0,og:0,yellow:0,red:0,team:g.team,matches:new Set() };
        playerMap[name].goals++;
        playerMap[name].matches.add(f.id);
        if (g.type === 'PENALTY')  playerMap[name].pens++;
        if (g.type === 'OWN_GOAL') playerMap[name].og++;
        // resolve team from canon name
        if (!playerMap[name].teamRaw) playerMap[name].teamRaw = g.team;
      });

      // Cards
      (ld.bookings || []).forEach(b => {
        const name = b.player || '?';
        if (!playerMap[name]) playerMap[name] = { goals:0,assists:0,pens:0,og:0,yellow:0,red:0,team:b.team,matches:new Set() };
        playerMap[name].matches.add(f.id);
        if (b.card === 'YELLOW_CARD' || b.card === 'YELLOW') playerMap[name].yellow++;
        if (b.card === 'RED_CARD'    || b.card === 'RED')    playerMap[name].red++;
        if (!playerMap[name].teamRaw) playerMap[name].teamRaw = b.team;
      });
    });

    // Finalise player match counts
    Object.values(playerMap).forEach(p => { p.matchCount = p.matches.size; });

    // Resolve team names from canon → display
    function resolveTeam(canonName) {
      if (!canonName) return '';
      const lower = canonName.toLowerCase();
      return WC2026.teams.find(t => t.toLowerCase() === lower || t.toLowerCase().includes(lower.split(' ')[0])) || canonName;
    }
    Object.entries(playerMap).forEach(([name, p]) => {
      p.teamDisplay = resolveTeam(p.teamRaw || p.team);
    });

    return { playerMap, gkMap, teamMap };
  }

  /* ── Demo data (shown when no API key / no results yet) ──────────────── */
  function _demoGoals() {
    return [
      { name:'Kylian Mbappé',      team:'France',      goals:0, pens:0, og:0, matchCount:0 },
      { name:'Lionel Messi',       team:'Argentina',   goals:0, pens:0, og:0, matchCount:0 },
      { name:'Cristiano Ronaldo',  team:'Portugal',    goals:0, pens:0, og:0, matchCount:0 },
      { name:'Erling Haaland',     team:'Norway',      goals:0, pens:0, og:0, matchCount:0 },
      { name:'Vinicius Jr',        team:'Brazil',      goals:0, pens:0, og:0, matchCount:0 },
      { name:'Harry Kane',         team:'England',     goals:0, pens:0, og:0, matchCount:0 },
      { name:'Lamine Yamal',       team:'Spain',       goals:0, pens:0, og:0, matchCount:0 },
      { name:'Phil Foden',         team:'England',     goals:0, pens:0, og:0, matchCount:0 },
      { name:'Pedri',              team:'Spain',       goals:0, pens:0, og:0, matchCount:0 },
      { name:'Neymar Jr',          team:'Brazil',      goals:0, pens:0, og:0, matchCount:0 },
    ];
  }

  function _demoGK() {
    return [
      { name:'Alisson Becker',   team:'Brazil',      saves:0, conceded:0, cs:0, matchCount:0 },
      { name:'Thibaut Courtois', team:'Belgium',     saves:0, conceded:0, cs:0, matchCount:0 },
      { name:'Manuel Neuer',     team:'Germany',     saves:0, conceded:0, cs:0, matchCount:0 },
      { name:'Jordan Pickford',  team:'England',     saves:0, conceded:0, cs:0, matchCount:0 },
      { name:'David Raya',       team:'Spain',       saves:0, conceded:0, cs:0, matchCount:0 },
      { name:'André Onana',      team:'Ivory Coast', saves:0, conceded:0, cs:0, matchCount:0 },
      { name:'Yassine Bounou',   team:'Morocco',     saves:0, conceded:0, cs:0, matchCount:0 },
      { name:'Yann Sommer',      team:'Switzerland', saves:0, conceded:0, cs:0, matchCount:0 },
    ];
  }

  /* ── Render helpers ───────────────────────────────────────────────────── */

  function _flag(teamName) { return WC2026.FLAGS[teamName] || '🏳️'; }

  function _teamDisplay(teamName) { return I18n.teamName(teamName); }

  function _highlight(text, q) {
    if (!q) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return String(text).replace(re, '<mark>$1</mark>');
  }

  function _matchesFilter(name, team) {
    const q = _searchQ.toLowerCase();
    if (q && !name.toLowerCase().includes(q) && !team.toLowerCase().includes(q) &&
        !I18n.teamName(team).toLowerCase().includes(q)) return false;
    if (_teamFilter !== 'all' && team !== _teamFilter) return false;
    return true;
  }

  /* ── Tab renders ──────────────────────────────────────────────────────── */

  function _renderGoals() {
    // Prefer the dedicated /scorers API feed (free tier, accurate leaderboard)
    const apiScorers = Live.getTopScorers ? Live.getTopScorers() : [];
    let rows;

    if (apiScorers.length > 0) {
      // Map API scorer objects to our row format, resolving team name
      rows = apiScorers.map(s => {
        const teamDisplay = WC2026.teams.find(t =>
          t.toLowerCase() === s.teamRaw.toLowerCase() ||
          t.toLowerCase().includes(s.teamRaw.toLowerCase().split(' ')[0])
        ) || s.teamRaw;
        return {
          name:         s.name,
          team:         s.teamRaw,
          teamDisplay:  teamDisplay,
          goals:        s.goals,
          pens:         s.penalties,
          og:           0,
          matchCount:   s.playedMatches,
          assists:      s.assists,
        };
      });
    } else {
      // Fall back to compiling from match-by-match goal events
      const { playerMap } = _compile();
      rows = Object.entries(playerMap)
        .map(([name, p]) => ({ name, ...p }))
        .filter(p => p.goals > 0 || !Live.hasKey)
        .sort((a,b) => b.goals - a.goals || b.matchCount - a.matchCount);
    }

    const hasData = rows.some(r => r.goals > 0);
    if (!hasData) rows = _demoGoals();

    rows = rows.filter(r => _matchesFilter(r.name, r.team || r.teamDisplay || ''));
    const q = _searchQ;
    const total = rows.length;
    const shown = _showAllGoals ? rows : rows.slice(0, INITIAL_ROWS);

    let html = `
      <div class="stats-table-wrap">
        <table class="stats-table">
          <thead><tr>
            <th class="col-rank">${I18n.t('stats_rank')}</th>
            <th class="col-player">${I18n.t('stats_player')}</th>
            <th class="col-team-sm">${I18n.t('stats_team')}</th>
            <th title="${I18n.t('stats_goals_long')}">${I18n.t('stats_goals')}</th>
            <th title="${I18n.t('stats_pens')}" class="col-sm">${I18n.t('stats_pens')}</th>
            <th title="${I18n.t('stats_og')}" class="col-sm">${I18n.t('stats_og')}</th>
            <th title="${I18n.t('stats_matches')}" class="col-sm">${I18n.t('stats_matches')}</th>
          </tr></thead>
          <tbody>`;

    shown.forEach((r, i) => {
      const team    = r.teamDisplay || r.team || '';
      const dispTeam = _teamDisplay(team);
      const flag    = _flag(team);
      const rankIco = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : I18n.num(i+1);
      html += `<tr class="${i < 3 ? 'stats-row--top' : ''}">
        <td class="col-rank">${rankIco}</td>
        <td class="col-player"><span class="player-name">${_highlight(r.name, q)}</span></td>
        <td class="col-team-sm"><span class="player-flag">${flag}</span><span class="player-team">${_highlight(dispTeam, q)}</span></td>
        <td class="stats-val--main">${I18n.num(r.goals)}</td>
        <td class="col-sm stats-muted">${r.pens > 0 ? I18n.num(r.pens) : '—'}</td>
        <td class="col-sm stats-muted">${r.og   > 0 ? I18n.num(r.og)   : '—'}</td>
        <td class="col-sm stats-muted">${I18n.num(r.matchCount || 0)}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    if (total > INITIAL_ROWS) {
      html += `<button class="stats-more-btn" onclick="Stats.toggleGoals()">
        ${_showAllGoals ? I18n.t('stats_show_less') : I18n.t('stats_show_more') + ' (' + I18n.num(total - INITIAL_ROWS) + ')'}
      </button>`;
    }
    if (!hasData) html = `<div class="stats-no-data">${I18n.t('stats_no_data')}</div>` + html;
    return html;
  }

  function _renderAssists() {
    // /scorers endpoint includes assists on the free tier
    const apiScorers = Live.getTopScorers ? Live.getTopScorers() : [];
    let rows = [];

    if (apiScorers.length > 0) {
      rows = apiScorers
        .filter(s => s.assists > 0)
        .map(s => {
          const teamDisplay = WC2026.teams.find(t =>
            t.toLowerCase() === s.teamRaw.toLowerCase() ||
            t.toLowerCase().includes(s.teamRaw.toLowerCase().split(' ')[0])
          ) || s.teamRaw;
          return { name: s.name, team: s.teamRaw, teamDisplay, assists: s.assists, matchCount: s.playedMatches };
        })
        .sort((a,b) => b.assists - a.assists);
    } else {
      const { playerMap } = _compile();
      rows = Object.entries(playerMap)
        .map(([name, p]) => ({ name, ...p }))
        .filter(p => p.assists > 0)
        .sort((a,b) => b.assists - a.assists);
    }

    if (!rows.length) {
      return `<div class="stats-no-data">${I18n.t('stats_no_data')}</div>
        <div class="stats-coming-soon">
          <div class="stats-cs-icon">📊</div>
          <div>${I18n.t('stats_live_note')}</div>
        </div>`;
    }

    rows = rows.filter(r => _matchesFilter(r.name, r.teamDisplay || r.team || ''));
    const total = rows.length;
    const shown = _showAllAssists ? rows : rows.slice(0, INITIAL_ROWS);
    const q = _searchQ;
    let html = `<div class="stats-table-wrap"><table class="stats-table"><thead><tr>
      <th>${I18n.t('stats_rank')}</th>
      <th class="col-player">${I18n.t('stats_player')}</th>
      <th class="col-team-sm">${I18n.t('stats_team')}</th>
      <th title="${I18n.t('stats_assists_long')}">${I18n.t('stats_assists')}</th>
      <th class="col-sm">${I18n.t('stats_matches')}</th>
    </tr></thead><tbody>`;

    shown.forEach((r,i) => {
      const team = r.teamDisplay || r.team || '';
      const flag = _flag(team);
      const rankIco = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : I18n.num(i+1);
      html += `<tr class="${i < 3 ? 'stats-row--top' : ''}">
        <td class="col-rank">${rankIco}</td>
        <td class="col-player"><span class="player-name">${_highlight(r.name, q)}</span></td>
        <td class="col-team-sm"><span class="player-flag">${flag}</span><span class="player-team">${_highlight(_teamDisplay(team),q)}</span></td>
        <td class="stats-val--main">${I18n.num(r.assists)}</td>
        <td class="col-sm stats-muted">${I18n.num(r.matchCount||0)}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    if (total > INITIAL_ROWS) {
      html += `<button class="stats-more-btn" onclick="Stats.toggleAssists()">
        ${_showAllAssists ? I18n.t('stats_show_less') : I18n.t('stats_show_more') + ' (' + I18n.num(total-INITIAL_ROWS) + ')'}
      </button>`;
    }
    return html;
  }

  function _renderGK() {
    const { playerMap } = _compile();
    let rows = Object.entries(playerMap)
      .map(([name, p]) => ({ name, ...p }))
      .filter(p => p.saves > 0 || p.cs > 0);

    const hasData = rows.length > 0;
    if (!hasData) rows = _demoGK();

    rows.sort((a,b) => b.saves - a.saves || b.cs - a.cs);
    rows = rows.filter(r => _matchesFilter(r.name, r.teamDisplay || r.team || ''));
    const total = rows.length;
    const shown = _showAllGK ? rows : rows.slice(0, INITIAL_ROWS);
    const q = _searchQ;

    let html = `<div class="stats-table-wrap"><table class="stats-table"><thead><tr>
      <th>${I18n.t('stats_rank')}</th>
      <th class="col-player">${I18n.t('stats_player')}</th>
      <th class="col-team-sm">${I18n.t('stats_team')}</th>
      <th title="${I18n.t('stats_saves')}">${I18n.t('stats_saves')}</th>
      <th title="${I18n.t('stats_clean_sheets')}" class="col-sm">${I18n.t('stats_cs')}</th>
      <th title="${I18n.t('stats_save_pct')}" class="col-sm">%</th>
      <th class="col-sm">${I18n.t('stats_matches')}</th>
    </tr></thead><tbody>`;

    shown.forEach((r,i) => {
      const team  = r.teamDisplay || r.team || '';
      const flag  = _flag(team);
      const pct   = r.saves + (r.conceded || 0) > 0
        ? Math.round(r.saves / (r.saves + (r.conceded||0)) * 100) : 0;
      const rankIco = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : I18n.num(i+1);
      html += `<tr class="${i < 3 ? 'stats-row--top' : ''}">
        <td class="col-rank">${rankIco}</td>
        <td class="col-player"><span class="player-name">${_highlight(r.name, q)}</span></td>
        <td class="col-team-sm"><span class="player-flag">${flag}</span><span class="player-team">${_highlight(_teamDisplay(team),q)}</span></td>
        <td class="stats-val--main">${I18n.num(r.saves||0)}</td>
        <td class="col-sm stats-muted">${I18n.num(r.cs||0)}</td>
        <td class="col-sm stats-muted">${r.saves > 0 ? I18n.num(pct)+'%' : '—'}</td>
        <td class="col-sm stats-muted">${I18n.num(r.matchCount||0)}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    if (!hasData) html = `<div class="stats-no-data">${I18n.t('stats_no_data')}</div>` + html;
    if (total > INITIAL_ROWS) {
      html += `<button class="stats-more-btn" onclick="Stats.toggleGK()">
        ${_showAllGK ? I18n.t('stats_show_less') : I18n.t('stats_show_more') + ' (' + I18n.num(total-INITIAL_ROWS) + ')'}
      </button>`;
    }
    return html;
  }

  function _renderCards() {
    const { playerMap } = _compile();
    let rows = Object.entries(playerMap)
      .map(([name,p]) => ({ name,...p }))
      .filter(p => p.yellow > 0 || p.red > 0)
      .sort((a,b) => b.red - a.red || b.yellow - a.yellow);

    if (!rows.length) {
      return `<div class="stats-no-data">${I18n.t('stats_no_data')}</div>`;
    }

    rows = rows.filter(r => _matchesFilter(r.name, r.teamDisplay || r.team || ''));
    const total = rows.length;
    const shown = _showAllCards ? rows : rows.slice(0, INITIAL_ROWS);
    const q = _searchQ;

    let html = `<div class="stats-table-wrap"><table class="stats-table"><thead><tr>
      <th>${I18n.t('stats_rank')}</th>
      <th class="col-player">${I18n.t('stats_player')}</th>
      <th class="col-team-sm">${I18n.t('stats_team')}</th>
      <th title="${I18n.t('stats_yellow')}">🟡</th>
      <th title="${I18n.t('stats_red')}">🔴</th>
      <th class="col-sm">${I18n.t('stats_matches')}</th>
    </tr></thead><tbody>`;

    shown.forEach((r,i) => {
      const team = r.teamDisplay || r.team || '';
      const flag = _flag(team);
      html += `<tr>
        <td class="col-rank">${I18n.num(i+1)}</td>
        <td class="col-player"><span class="player-name">${_highlight(r.name,q)}</span></td>
        <td class="col-team-sm"><span class="player-flag">${flag}</span><span class="player-team">${_highlight(_teamDisplay(team),q)}</span></td>
        <td class="stats-val--yellow">${I18n.num(r.yellow||0)}</td>
        <td class="stats-val--red">${r.red > 0 ? I18n.num(r.red) : '—'}</td>
        <td class="col-sm stats-muted">${I18n.num(r.matchCount||0)}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    if (total > INITIAL_ROWS) {
      html += `<button class="stats-more-btn" onclick="Stats.toggleCards()">
        ${_showAllCards ? I18n.t('stats_show_less') : I18n.t('stats_show_more') + ' (' + I18n.num(total-INITIAL_ROWS) + ')'}
      </button>`;
    }
    return html;
  }

  function _renderTeams() {
    const { teamMap } = _compile();
    let rows = WC2026.teams.map(team => {
      const d = teamMap[team] || { gf:0,ga:0,yellow:0,red:0,matches:0,wins:0,draws:0,losses:0 };
      return { team, ...d, gd: d.gf - d.ga };
    });

    const q = _searchQ;
    if (q) rows = rows.filter(r =>
      r.team.toLowerCase().includes(q) || I18n.teamName(r.team).toLowerCase().includes(q));
    rows.sort((a,b) => b.gf - a.gf || b.wins - a.wins || a.team.localeCompare(b.team));
    const total = rows.length;
    const shown = _showAllTeams ? rows : rows.slice(0, INITIAL_ROWS);

    let html = `<div class="stats-table-wrap"><table class="stats-table"><thead><tr>
      <th>${I18n.t('stats_rank')}</th>
      <th class="col-player">${I18n.t('stats_team')}</th>
      <th title="${I18n.t('stats_matches')}">${I18n.t('stats_matches')}</th>
      <th title="${I18n.t('stats_team_goals')}">${I18n.t('stats_goals')}</th>
      <th title="${I18n.t('stats_team_ga')}" class="col-sm">GA</th>
      <th title="${I18n.t('stats_team_gd')}" class="col-sm">GD</th>
      <th title="${I18n.t('stats_yellow')}" class="col-sm">🟡</th>
      <th title="${I18n.t('stats_red')}" class="col-sm">🔴</th>
    </tr></thead><tbody>`;

    shown.forEach((r,i) => {
      const flag = _flag(r.team);
      const gd   = r.gd > 0 ? `+${I18n.num(r.gd)}` : I18n.num(r.gd);
      const rankIco = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : I18n.num(i+1);
      html += `<tr class="${i < 3 ? 'stats-row--top' : ''}">
        <td class="col-rank">${rankIco}</td>
        <td class="col-player"><span class="player-flag">${flag}</span>
          <span class="player-name">${_highlight(I18n.teamName(r.team),q)}</span></td>
        <td class="stats-muted">${I18n.num(r.matches)}</td>
        <td class="stats-val--main">${I18n.num(r.gf)}</td>
        <td class="col-sm stats-muted">${I18n.num(r.ga)}</td>
        <td class="col-sm ${r.gd>0?'pos-gd':r.gd<0?'neg-gd':''}">${gd}</td>
        <td class="col-sm stats-muted">${I18n.num(r.yellow||0)}</td>
        <td class="col-sm stats-muted">${r.red > 0 ? I18n.num(r.red) : '—'}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    if (total > INITIAL_ROWS) {
      html += `<button class="stats-more-btn" onclick="Stats.toggleTeams()">
        ${_showAllTeams ? I18n.t('stats_show_less') : I18n.t('stats_show_more') + ' (' + I18n.num(total-INITIAL_ROWS) + ')'}
      </button>`;
    }
    return html;
  }

  /* ── Main render ──────────────────────────────────────────────────────── */
  function render() {
    const container = document.getElementById('statsContent');
    if (!container) return;

    // Team filter options
    const teamOpts = `<option value="all">${I18n.t('stats_filter_all')}</option>` +
      WC2026.teams.map(t => `<option value="${t}" ${_teamFilter===t?'selected':''}>${I18n.teamName(t)}</option>`).join('');

    const tabs = [
      { id:'goals',   label: `⚽ ${I18n.t('stats_tab_goals')}` },
      { id:'assists', label: `🎯 ${I18n.t('stats_tab_assists')}` },
      { id:'gk',      label: `🧤 ${I18n.t('stats_tab_gk')}` },
      { id:'cards',   label: `🟨 ${I18n.t('stats_tab_cards')}` },
      { id:'teams',   label: `🏴 ${I18n.t('stats_tab_teams')}` },
    ];

    let body;
    if (_activeTab === 'goals')   body = _renderGoals();
    else if (_activeTab === 'assists') body = _renderAssists();
    else if (_activeTab === 'gk') body = _renderGK();
    else if (_activeTab === 'cards') body = _renderCards();
    else body = _renderTeams();

    container.innerHTML = `
      <div class="stats-page">

        <!-- Search + team filter -->
        <div class="stats-controls">
          <div class="stats-search-wrap">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input id="statsSearch" type="text" placeholder="${I18n.t('stats_search')}"
              value="${_searchQ}" oninput="Stats.onSearch(this.value)">
          </div>
          <div class="stats-team-filter">
            <select onchange="Stats.onTeamFilter(this.value)" class="tz-select stats-team-select">
              ${teamOpts}
            </select>
          </div>
        </div>

        <!-- Tabs -->
        <div class="stats-tabs" role="tablist">
          ${tabs.map(tab => `
            <button class="stats-tab${_activeTab===tab.id?' stats-tab--active':''}"
              onclick="Stats.setTab('${tab.id}')" role="tab">
              ${tab.label}
            </button>`).join('')}
        </div>

        <!-- Table body -->
        <div class="stats-body">${body}</div>

        <!-- Live note -->
        <div class="stats-live-note">${I18n.t('stats_live_note')}</div>
      </div>`;
  }

  /* ── Public API ───────────────────────────────────────────────────────── */
  function setTab(tab) {
    _activeTab = tab;
    render();
  }

  function onSearch(val) {
    _searchQ = val.trim();
    render();
  }

  function onTeamFilter(val) {
    _teamFilter = val;
    render();
  }

  function toggleGoals()   { _showAllGoals   = !_showAllGoals;   render(); }
  function toggleAssists() { _showAllAssists = !_showAllAssists; render(); }
  function toggleGK()      { _showAllGK      = !_showAllGK;      render(); }
  function toggleCards()   { _showAllCards   = !_showAllCards;   render(); }
  function toggleTeams()   { _showAllTeams   = !_showAllTeams;   render(); }

  return { render, setTab, onSearch, onTeamFilter,
           toggleGoals, toggleAssists, toggleGK, toggleCards, toggleTeams };
})();
