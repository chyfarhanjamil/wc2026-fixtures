'use strict';

/**
 * simulator.js — Interactive Knockout Bracket Simulator
 * Lets users click to pick winners in each round, propagating choices
 * forward through R32 → R16 → QF → SF → Final.
 */

const Simulator = (() => {

  /* ── Bracket structure: R32 match IDs → R16 → QF → SF → Final ── */
  const BRACKET = {
    r32: [73, 76, 74, 78, 75, 77, 79, 80, 82, 81, 84, 83, 85, 88, 86, 87],
    r16: [
      { id: 90, home: 73, away: 75 },
      { id: 89, home: 74, away: 77 },
      { id: 91, home: 76, away: 78 },
      { id: 92, home: 79, away: 80 },
      { id: 93, home: 83, away: 84 },
      { id: 94, home: 81, away: 82 },
      { id: 95, home: 86, away: 88 },
      { id: 96, home: 85, away: 87 },
    ],
    qf: [
      { id: 97,  home: 89, away: 90 },
      { id: 98,  home: 93, away: 94 },
      { id: 99,  home: 91, away: 92 },
      { id: 100, home: 95, away: 96 },
    ],
    sf: [
      { id: 101, home: 97, away: 98 },
      { id: 102, home: 99, away: 100 },
    ],
    final: { id: 104, home: 101, away: 102 },
    third: { id: 103, loserOf: [101, 102] },
  };

  // Store chosen winners keyed by match id: matchId → { name, flag, side }
  let _picks = {};
  let _visible = false;

  /* ── Helpers ─────────────────────────────────────────────────────── */

  function _flag(name) {
    if (!name) return '';
    if (typeof WC2026 !== 'undefined' && WC2026.FLAGS) return WC2026.FLAGS[name] || '';
    return '';
  }

  function _resolveTeam(matchId, side) {
    // Returns { name, flag } for a slot given current picks
    const f = WC2026.FIXTURES.find(x => x.id === matchId);
    if (!f) return { name: '?', flag: '' };

    // Check if resolved by Resolver
    const r = Resolver.resolve(f);
    const isHome = side === 'home';
    const resolvedName = isHome ? (r.homeResolved ? r.home : null) : (r.awayResolved ? r.away : null);

    if (resolvedName) {
      return { name: resolvedName, flag: _flag(resolvedName) };
    }

    // Not resolved yet — check if we have a sim pick for the feeding match
    const raw = isHome ? f.home : f.away;
    // raw looks like "Winner R32 Match 73" or "Winner R16 Match 89" etc.
    const feedMatch = _feedingMatchId(raw);
    if (feedMatch && _picks[feedMatch]) {
      return { name: _picks[feedMatch].name, flag: _picks[feedMatch].flag };
    }

    // Return placeholder
    const desc = isHome ? (r.homeDesc || raw) : (r.awayDesc || raw);
    return { name: raw, flag: '', placeholder: true, desc };
  }

  function _feedingMatchId(raw) {
    if (!raw) return null;
    const m = raw.match(/Match\s+(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function _getTeamsForMatch(matchId) {
    const f = WC2026.FIXTURES.find(x => x.id === matchId);
    if (!f) return { home: { name: '?', flag: '' }, away: { name: '?', flag: '' } };
    return {
      home: _resolveTeam(matchId, 'home'),
      away: _resolveTeam(matchId, 'away'),
    };
  }

  function _getStageMatches(stage) {
    if (stage === 'r32') return BRACKET.r32.map(id => ({ id, isLeaf: true }));
    if (stage === 'r16') return BRACKET.r16;
    if (stage === 'qf')  return BRACKET.qf;
    if (stage === 'sf')  return BRACKET.sf;
    if (stage === 'final') return [BRACKET.final];
    return [];
  }

  /* ── Pick a winner ───────────────────────────────────────────────── */

  function _pick(matchId, side) {
    const isThird = matchId === BRACKET.third.id;
    let chosen;
    if (isThird) {
      const loser101 = _getLoser(101);
      const loser102 = _getLoser(102);
      chosen = side === 'home' ? loser101 : loser102;
    } else {
      const { home, away } = _getTeamsForMatch(matchId);
      chosen = side === 'home' ? home : away;
    }
    if (!chosen || chosen.placeholder) return;

    // Clear any downstream picks if re-picking
    _clearDownstream(matchId);
    _picks[matchId] = { name: chosen.name, flag: chosen.flag, side };
    _render();
  }

  function _clearDownstream(matchId) {
    // Find this matchId's role and clear everything that depended on it
    const stages = ['r16', 'qf', 'sf', 'final', 'third'];
    stages.forEach(stage => {
      const matches = stage === 'final' ? [BRACKET.final]
        : stage === 'third' ? [BRACKET.third]
        : (BRACKET[stage] || []);
      matches.forEach(m => {
        if (m.home === matchId || m.away === matchId || (m.loserOf && m.loserOf.includes(matchId))) {
          delete _picks[m.id];
          _clearDownstream(m.id);
        }
      });
    });
  }

  /* ── Reset ───────────────────────────────────────────────────────── */

  function reset() {
    _picks = {};
    _render();
  }

  /* ── Render ──────────────────────────────────────────────────────── */

  const STAGE_META = [
    { key: 'r32',   label: 'Round of 32',   icon: '⚽', matchIds: null },
    { key: 'r16',   label: 'Round of 16',   icon: '🎯', matchIds: null },
    { key: 'qf',    label: 'Quarter-Finals', icon: '⚡', matchIds: null },
    { key: 'sf',    label: 'Semi-Finals',    icon: '🔥', matchIds: null },
    { key: 'final', label: 'Final',          icon: '🏆', matchIds: null },
    { key: 'third', label: '3rd Place',      icon: '🥉', matchIds: null },
  ];

  function _teamBtn(matchId, side, team) {
    const isPending = team.placeholder;
    const hasPick = _picks[matchId];
    const isWinner = hasPick && hasPick.side === side;
    const isLoser  = hasPick && hasPick.side !== side;

    let cls = 'sim-team';
    if (isWinner) cls += ' sim-team--winner';
    if (isLoser)  cls += ' sim-team--loser';
    if (isPending) cls += ' sim-team--pending';

    const title = isPending ? (team.desc || team.name) : team.name;
    const displayName = isPending ? _shortPlaceholder(team.name) : team.name;

    return `<button class="${cls}" data-match="${matchId}" data-side="${side}" title="${title.replace(/"/g, '&quot;')}" ${isPending ? 'disabled' : ''}>
      ${team.flag ? `<span class="sim-flag">${team.flag}</span>` : ''}
      <span class="sim-name">${displayName}</span>
      ${isWinner ? '<span class="sim-crown">👑</span>' : ''}
    </button>`;
  }

  function _shortPlaceholder(raw) {
    if (!raw) return '?';
    // e.g. "Winner R32 Match 73" → "W:73"
    const m = raw.match(/Winner\s+(R\d+|Round\s+of\s+\d+)\s+Match\s+(\d+)/i);
    if (m) return `W:M${m[2]}`;
    const m2 = raw.match(/Loser\s+SF\s+Match\s+(\d+)/i);
    if (m2) return `L:SF${m2[1]}`;
    return raw.length > 18 ? raw.slice(0, 16) + '…' : raw;
  }

  function _renderMatch(matchId, stage) {
    const f = WC2026.FIXTURES.find(x => x.id === matchId);
    if (!f) return '';
    const { home, away } = _getTeamsForMatch(matchId);
    const hasPick = _picks[matchId];

    // For 3rd place, teams are losers of SF
    let homeTeam = home, awayTeam = away;
    if (stage === 'third') {
      const loser101 = _getLoser(101);
      const loser102 = _getLoser(102);
      homeTeam = loser101 || { name: 'Loser Semi-Final 1', flag: '', placeholder: true, desc: 'Loser of SF Match 101' };
      awayTeam = loser102 || { name: 'Loser Semi-Final 2', flag: '', placeholder: true, desc: 'Loser of SF Match 102' };
    }

    const isPending3rd = stage === 'third' && (homeTeam.placeholder || awayTeam.placeholder);

    return `<div class="sim-match" data-match-id="${matchId}">
      <div class="sim-match-venue">${f.venue}</div>
      <div class="sim-match-teams">
        ${_teamBtn(matchId, 'home', homeTeam)}
        <span class="sim-vs">VS</span>
        ${_teamBtn(matchId, 'away', awayTeam)}
      </div>
      ${hasPick ? `<div class="sim-match-result">✓ ${_picks[matchId].name} advances</div>` : ''}
    </div>`;
  }

  function _getLoser(sfMatchId) {
    const pick = _picks[sfMatchId];
    if (!pick) return null;
    const { home, away } = _getTeamsForMatch(sfMatchId);
    const loser = pick.side === 'home' ? away : home;
    return loser.placeholder ? null : loser;
  }

  function _renderFinal() {
    const { home, away } = _getTeamsForMatch(BRACKET.final.id);
    const hasPick = _picks[BRACKET.final.id];

    if (hasPick) {
      const champion = _picks[BRACKET.final.id];
      return `<div class="sim-champion">
        <div class="sim-champion-trophy">🏆</div>
        <div class="sim-champion-label">WORLD CHAMPION</div>
        <div class="sim-champion-name">${champion.flag} ${champion.name}</div>
        <button class="sim-repick-btn" data-match="${BRACKET.final.id}">Change pick</button>
      </div>`;
    }

    const finalHome = home.placeholder ? home : home;
    const finalAway = away.placeholder ? away : away;

    return `<div class="sim-match sim-match--final" data-match-id="${BRACKET.final.id}">
      <div class="sim-match-venue">New York/NJ • July 19</div>
      <div class="sim-match-teams">
        ${_teamBtn(BRACKET.final.id, 'home', finalHome)}
        <span class="sim-vs sim-vs--final">VS</span>
        ${_teamBtn(BRACKET.final.id, 'away', finalAway)}
      </div>
    </div>`;
  }

  function _countPicks() {
    const total = 16 + 8 + 4 + 2 + 1 + 1; // r32 + r16 + qf + sf + final + 3rd
    return { made: Object.keys(_picks).length, total };
  }

  function _render() {
    const container = document.getElementById('simContainer');
    if (!container) return;

    const { made, total } = _countPicks();
    const pct = Math.round((made / total) * 100);

    let html = `
    <div class="sim-header">
      <div class="sim-progress-wrap">
        <div class="sim-progress-bar"><div class="sim-progress-fill" style="width:${pct}%"></div></div>
        <span class="sim-progress-label">${made}/${total} picks made</span>
      </div>
      <button class="sim-reset-btn" onclick="Simulator.reset()">↺ Reset</button>
    </div>`;

    const stages = [
      { key: 'r32', label: 'Round of 32', icon: '⚽' },
      { key: 'r16', label: 'Round of 16', icon: '🎯' },
      { key: 'qf',  label: 'Quarter-Finals', icon: '⚡' },
      { key: 'sf',  label: 'Semi-Finals', icon: '🔥' },
      { key: 'final', label: 'Final 🏆', icon: '🏆', isFinal: true },
      { key: 'third', label: '3rd Place', icon: '🥉', isThird: true },
    ];

    stages.forEach(s => {
      let matchesHtml = '';
      if (s.isFinal) {
        matchesHtml = _renderFinal();
      } else if (s.isThird) {
        matchesHtml = _renderMatch(BRACKET.third.id, 'third');
      } else {
        const matches = _getStageMatches(s.key);
        matches.forEach(m => {
          const id = typeof m === 'number' ? m : m.id;
          matchesHtml += _renderMatch(id, s.key);
        });
      }

      const stagePicksKey = s.key === 'final' ? [104] : s.key === 'third' ? [103]
        : _getStageMatches(s.key).map(m => typeof m === 'number' ? m : m.id);
      const stageDone = stagePicksKey.filter(id => _picks[id]).length;
      const stageTotal = stagePicksKey.length;
      const allDone = stageDone === stageTotal;

      html += `<div class="sim-stage">
        <div class="sim-stage-header">
          <span class="sim-stage-icon">${s.icon}</span>
          <span class="sim-stage-label">${s.label}</span>
          <span class="sim-stage-count ${allDone ? 'sim-stage-count--done' : ''}">${stageDone}/${stageTotal}</span>
        </div>
        <div class="sim-matches">${matchesHtml}</div>
      </div>`;
    });

    // Share/summary section if all done
    if (made === total) {
      html += _renderSummary();
    }

    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.sim-team:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const matchId = parseInt(btn.dataset.match, 10);
        const side = btn.dataset.side;
        _pick(matchId, side);
      });
    });

    container.querySelectorAll('.sim-repick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const matchId = parseInt(btn.dataset.match, 10);
        delete _picks[matchId];
        _render();
      });
    });
  }

  function _renderSummary() {
    const champion = _picks[104];
    const third = _picks[103];
    if (!champion) return '';

    const sfLosers = [_getLoser(101), _getLoser(102)].filter(Boolean);

    return `<div class="sim-summary">
      <div class="sim-summary-title">🎉 Your Prediction</div>
      <div class="sim-summary-rows">
        <div class="sim-summary-row sim-summary-row--gold">
          <span class="sim-summary-pos">🥇</span>
          <span class="sim-summary-team">${champion.flag} ${champion.name}</span>
          <span class="sim-summary-label">World Champion</span>
        </div>
        ${third ? `<div class="sim-summary-row sim-summary-row--bronze">
          <span class="sim-summary-pos">🥉</span>
          <span class="sim-summary-team">${third.flag || ''} ${third.name || '—'}</span>
          <span class="sim-summary-label">3rd Place</span>
        </div>` : ''}
        ${sfLosers.map((t, i) => `<div class="sim-summary-row">
          <span class="sim-summary-pos">4th</span>
          <span class="sim-summary-team">${t.flag} ${t.name}</span>
          <span class="sim-summary-label">Semi-Final Exit</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  /* ── Public: toggle the simulator panel ──────────────────────────── */

  function toggle() {
    _visible = !_visible;
    const panel = document.getElementById('simPanel');
    const btn   = document.getElementById('simToggleBtn');
    if (!panel || !btn) return;

    if (_visible) {
      panel.style.display = 'block';
      btn.classList.add('sim-toggle--active');
      btn.textContent = '✕ Close Simulator';
      _render();
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      panel.style.display = 'none';
      btn.classList.remove('sim-toggle--active');
      btn.textContent = '🎮 Simulate Bracket';
    }
  }

  function init() {
    // Avoid duplicate injection on re-render
    if (document.getElementById('simToggleBtn')) return;
    const bracketContent = document.getElementById('bracketContent');
    if (!bracketContent) return;

    // Insert toggle button before the bracket content
    const toggleBar = document.createElement('div');
    toggleBar.className = 'sim-toggle-bar';
    toggleBar.innerHTML = `<button id="simToggleBtn" class="sim-toggle-btn" onclick="Simulator.toggle()">🎮 Simulate Bracket</button>
      <span class="sim-toggle-hint">Pick winners round by round to predict your champion</span>`;
    bracketContent.parentElement.insertBefore(toggleBar, bracketContent);

    // Insert the simulator panel
    const panel = document.createElement('div');
    panel.id = 'simPanel';
    panel.className = 'sim-panel';
    panel.style.display = 'none';
    panel.innerHTML = `<div class="sim-inner"><div class="sim-title">🏆 Bracket Simulator</div><div id="simContainer"></div></div>`;
    bracketContent.parentElement.insertBefore(panel, bracketContent);
  }

  return { init, toggle, reset };
})();
