/**
 * live.js — reads scores from /data/matches.json + /data/scorers.json
 * Updated by GitHub Actions every 2 minutes.
 *
 * CANON MAP verified against actual API response from football-data.org
 * for WC2026. Every team name the API sends is mapped to the exact name
 * used in data.js.
 */
'use strict';

const Live = (() => {

  const POLL_MS           = 120000;
  const CACHE_KEY_MATCHES = 'wc2026_v2_matches';
  const CACHE_KEY_SCORERS = 'wc2026_v2_scorers';

  let liveData   = {};
  let topScorers = [];
  let listeners  = [];
  const hasKey   = true;

  // ── CACHE ─────────────────────────────────────────────────────────────
  function _saveCache() {
    try {
      localStorage.setItem(CACHE_KEY_MATCHES, JSON.stringify(liveData));
      localStorage.setItem(CACHE_KEY_SCORERS, JSON.stringify(topScorers));
    } catch(e) {}
  }

  function _loadCache() {
    try {
      const m = localStorage.getItem(CACHE_KEY_MATCHES);
      const s = localStorage.getItem(CACHE_KEY_SCORERS);
      if (m) liveData   = JSON.parse(m);
      if (s) topScorers = JSON.parse(s);
      return Object.keys(liveData).length > 0;
    } catch(e) { return false; }
  }

  // ── INIT ──────────────────────────────────────────────────────────────
  function init() {
    _buildUtcIndex();
    const hadCache = _loadCache();
    if (hadCache) { _notify(); _updateLiveBanner(); }
    else { _setStatusBanner('loading'); }

    fetchAll()
      .then(() => {
        _updateLiveBanner();
        setInterval(() => { fetchAll().then(_updateLiveBanner); }, POLL_MS);
      })
      .catch(err => {
        console.error('[Live] fetch failed:', err);
        if (!hadCache) _setStatusBanner('error', err.message);
      });
  }

  // ── FETCH ─────────────────────────────────────────────────────────────
  async function fetchAll() {
    const t = Date.now();
    const [matchRes, scorerRes] = await Promise.allSettled([
      fetch(`data/matches.json?t=${t}`)
        .then(r => { if (!r.ok) throw new Error(`matches ${r.status}`); return r.json(); }),
      fetch(`data/scorers.json?t=${t}`)
        .then(r => { if (!r.ok) throw new Error(`scorers ${r.status}`); return r.json(); }),
    ]);
    if (matchRes.status === 'rejected' && scorerRes.status === 'rejected')
      throw new Error('JSON files not found — has the GitHub Action run yet?');
    if (matchRes.status  === 'fulfilled') _ingestMatches(matchRes.value.matches  || []);
    if (scorerRes.status === 'fulfilled') _ingestScorers(scorerRes.value.scorers || []);
    _saveCache();
    _notify();
  }

  // ── LIVE MATCH BANNER ─────────────────────────────────────────────────
  function _updateLiveBanner() {
    const banner = document.getElementById('liveBanner');
    if (!banner) return;

    const liveMatches = [];
    WC2026.FIXTURES.forEach(f => {
      const d = liveData[`local_${f.id}`];
      if (d && (d.status === 'IN_PLAY' || d.status === 'PAUSED'))
        liveMatches.push({ f, d });
    });

    if (liveMatches.length === 0) {
      if (banner.classList.contains('live-banner--live-now')) {
        banner.style.display = 'none';
        banner.className = 'live-banner';
      }
      return;
    }

    const cards = liveMatches.map(({ f, d }) => {
      const scoreStr = d.scoreHome !== null
        ? `<span class="lbm-score">${d.scoreHome} – ${d.scoreAway}</span>`
        : `<span class="lbm-vs">vs</span>`;
      const minStr = d.status === 'PAUSED'
        ? `<span class="lbm-min">HT</span>`
        : d.minute ? `<span class="lbm-min">${d.minute}'</span>` : '';
      return `
        <div class="lbm-match">
          <span class="lbm-dot"></span>
          <span class="lbm-team">${f.home}</span>
          ${scoreStr}
          <span class="lbm-team">${f.away}</span>
          ${minStr}
        </div>`;
    }).join('');

    banner.className = 'live-banner live-banner--live-now';
    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="lbm-inner">
        <span class="lbm-label">🔴 LIVE</span>
        <div class="lbm-matches">${cards}</div>
      </div>`;
  }

  // ── STATUS BANNER ─────────────────────────────────────────────────────
  function _setStatusBanner(type, detail) {
    const el = document.getElementById('liveBanner');
    if (!el) return;
    const msgs = {
      loading: '⏳ Loading match data…',
      error:   '⚠️ Could not load data. Showing cached results.',
    };
    el.className = `live-banner live-banner--${type}`;
    el.innerHTML = `<span>${msgs[type] || ''}${detail
      ? ` <code style="opacity:.7;font-size:11px">(${detail})</code>` : ''}</span>`;
    el.style.display = 'block';
    if (type !== 'error') setTimeout(() => { el.style.display = 'none'; }, 6000);
  }

  // ── CANON MAP ─────────────────────────────────────────────────────────
  // Verified against actual football-data.org API response for WC2026.
  // Left side  = exactly what the API sends (lowercased for matching)
  // Right side = exactly what data.js uses
  const CANON_MAP = {
    // The 5 confirmed mismatches from actual API data:
    'bosnia-herzegovina':               'Bosnia & Herzegovina',  // API sends this
    'bosnia and herzegovina':           'Bosnia & Herzegovina',  // fallback variant
    'bosnia & herzegovina':             'Bosnia & Herzegovina',
    'cape verde islands':               'Cabo Verde',            // API sends this
    'cabo verde':                       'Cabo Verde',
    'cape verde':                       'Cabo Verde',
    'south korea':                      'Korea Republic',        // API sends this
    'korea republic':                   'Korea Republic',
    'republic of korea':                'Korea Republic',
    'turkey':                           'Türkiye',               // API sends this
    'türkiye':                          'Türkiye',
    'turkiye':                          'Türkiye',
    'united states':                    'USA',                   // API sends this
    'united states of america':         'USA',
    'usa':                              'USA',
    'us':                               'USA',
    // All others match exactly (verified) — still include for safety:
    'algeria':       'Algeria',
    'argentina':     'Argentina',
    'australia':     'Australia',
    'austria':       'Austria',
    'belgium':       'Belgium',
    'brazil':        'Brazil',
    'canada':        'Canada',
    'colombia':      'Colombia',
    'congo dr':      'Congo DR',
    'dr congo':      'Congo DR',
    'democratic republic of congo':     'Congo DR',
    'democratic republic of the congo': 'Congo DR',
    'croatia':       'Croatia',
    'curaçao':       'Curaçao',
    'curacao':       'Curaçao',
    'czechia':       'Czechia',
    'czech republic':'Czechia',
    'ecuador':       'Ecuador',
    'egypt':         'Egypt',
    'england':       'England',
    'france':        'France',
    'germany':       'Germany',
    'ghana':         'Ghana',
    'haiti':         'Haiti',
    'iran':          'Iran',
    'iraq':          'Iraq',
    'ivory coast':   'Ivory Coast',
    "côte d'ivoire": 'Ivory Coast',
    "cote d'ivoire": 'Ivory Coast',
    'japan':         'Japan',
    'jordan':        'Jordan',
    'mexico':        'Mexico',
    'morocco':       'Morocco',
    'netherlands':   'Netherlands',
    'holland':       'Netherlands',
    'new zealand':   'New Zealand',
    'norway':        'Norway',
    'panama':        'Panama',
    'paraguay':      'Paraguay',
    'portugal':      'Portugal',
    'qatar':         'Qatar',
    'saudi arabia':  'Saudi Arabia',
    'scotland':      'Scotland',
    'senegal':       'Senegal',
    'south africa':  'South Africa',
    'spain':         'Spain',
    'sweden':        'Sweden',
    'switzerland':   'Switzerland',
    'tunisia':       'Tunisia',
    'uruguay':       'Uruguay',
    'uzbekistan':    'Uzbekistan',
  };

  function _canon(name) {
    if (!name) return '';
    const key = name.toLowerCase().trim();
    if (CANON_MAP[key]) return CANON_MAP[key];
    // Strip diacritics as fallback (handles ü, é, ç etc.)
    const stripped = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (CANON_MAP[stripped]) return CANON_MAP[stripped];
    for (const [k, v] of Object.entries(CANON_MAP))
      if (k.normalize('NFD').replace(/[\u0300-\u036f]/g,'') === stripped) return v;
    return name.trim();
  }

  // ── UTC INDEX ─────────────────────────────────────────────────────────
  // Primary match key: "YYYY-MM-DDTHH:MM" → fixture(s)
  // Works for all stages. Team name used only as tiebreaker.
  let _utcIndex = null;

  function _buildUtcIndex() {
    _utcIndex = new Map();
    WC2026.FIXTURES.forEach(f => {
      if (!f.utc) return;
      const key = f.utc.slice(0, 16); // "2026-06-11T19:00"
      if (!_utcIndex.has(key)) _utcIndex.set(key, []);
      _utcIndex.get(key).push(f);
    });
  }

  // ── INGEST MATCHES ────────────────────────────────────────────────────
  function _ingestMatches(matches) {
    if (!_utcIndex) _buildUtcIndex();

    matches.forEach(m => {
      const ft = m.score?.fullTime || {};
      const ht = m.score?.halfTime || {};
      const payload = {
        status:    m.status,
        scoreHome: ft.home ?? null,
        scoreAway: ft.away ?? null,
        htHome:    ht.home ?? null,
        htAway:    ht.away ?? null,
        minute:    m.minute || null,
        homeApi:   m.homeTeam?.name || '',
        awayApi:   m.awayTeam?.name || '',
        scorers: (m.goals || []).map(g => ({
          team:   _canon(g.team?.name || ''),
          player: g.scorer?.name     || 'Own Goal',
          minute: g.minute,
          type:   g.type             || 'REGULAR',
        })),
      };

      const hc     = _canon(m.homeTeam?.name || '');
      const ac     = _canon(m.awayTeam?.name || '');
      const utcKey = (m.utcDate || '').slice(0, 16);

      // Route 1: UTC time match (primary — works for all stages)
      const timeMatches = _utcIndex.get(utcKey) || [];
      if (timeMatches.length === 1) {
        liveData[`local_${timeMatches[0].id}`] = payload;
        return;
      }
      if (timeMatches.length > 1) {
        // Same kick-off slot — break tie by canonical team name
        const hit = timeMatches.find(
          f => _canon(f.home) === hc && _canon(f.away) === ac
        );
        if (hit) { liveData[`local_${hit.id}`] = payload; return; }
      }

      // Route 2: name-only fallback (group stage)
      WC2026.FIXTURES.forEach(f => {
        if (f.stage !== 'group') return;
        if (_canon(f.home) === hc && _canon(f.away) === ac)
          liveData[`local_${f.id}`] = payload;
      });
    });
  }

  // ── INGEST SCORERS ────────────────────────────────────────────────────
  function _ingestScorers(scorers) {
    topScorers = scorers.map(s => ({
      name:          s.player?.name        || '?',
      nationality:   s.player?.nationality || '',
      teamRaw:       s.team?.name          || '',
      goals:         s.goals               || 0,
      assists:       s.assists             || 0,
      penalties:     s.penalties           || 0,
      playedMatches: s.playedMatches       || 0,
    }));
  }

  // ── NOTIFY ────────────────────────────────────────────────────────────
  function _notify() {
    listeners.forEach(fn => { try { fn(liveData); } catch(e) {} });
  }

  // ── PUBLIC ────────────────────────────────────────────────────────────
  function onUpdate(fn)  { listeners.push(fn); }
  function forFixture(f) { return liveData[`local_${f.id}`] || null; }

  function scoreLabel(f) {
    const d = forFixture(f);
    if (!d || d.scoreHome === null) return null;
    return `${d.scoreHome}–${d.scoreAway}`;
  }

  function statusBadge(f) {
    const d = forFixture(f);
    if (!d) return '';
    if (d.status === 'IN_PLAY')
      return `<span class="badge badge--live">🔴 LIVE${d.minute ? ' '+d.minute+"'" : ''}</span>`;
    if (d.status === 'PAUSED')
      return `<span class="badge badge--ht">⏸ HT</span>`;
    if (d.status === 'FINISHED')
      return `<span class="badge badge--ft">FT</span>`;
    return '';
  }

  function scorersHtml(f) {
    const d = forFixture(f);
    if (!d || !d.scorers?.length) return '';
    return `<div class="scorers-row">${
      d.scorers.map(g => {
        const ico = g.type==='OWN_GOAL' ? '⚽(OG)' : g.type==='PENALTY' ? '⚽(P)' : '⚽';
        return `<span class="scorer-item">${ico} ${g.player} <b>${g.minute}'</b></span>`;
      }).join('<span class="scorer-sep"> · </span>')
    }</div>`;
  }

  function getTopScorers() { return topScorers; }

  return { init, onUpdate, forFixture, scoreLabel, statusBadge, scorersHtml, hasKey, getTopScorers };
})();
