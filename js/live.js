/**
 * live.js — Real-time data from football-data.org
 *
 * HOW PREVIOUS RESULTS ARE GUARANTEED:
 *   The API /matches?season=2026 returns ALL 104 fixtures for the entire
 *   tournament in a single call — past, present and future. So the very
 *   first successful fetch after you deploy brings back every result
 *   already played. After that, results are also saved in localStorage
 *   so they survive page reloads instantly without waiting for a fetch.
 *
 *   If the first fetch fails (proxy down, rate limit, network blip),
 *   the code retries up to 3 times with a 5-second gap before giving up.
 *   This means a transient failure won't leave the page empty.
 *
 * FIXES:
 *   1. Desktop CORS — ?token= query param instead of X-Auth-Token header
 *      (header triggers CORS preflight that desktop browsers block)
 *   2. All stages matched — removed `stage !== 'group'` guard
 *   3. UTC kick-off time as primary match key — works for every stage
 *   4. Full CANON_MAP covering all 48 teams + all known API name variants
 *   5. localStorage cache — results survive page reload / redeploy instantly
 *   6. Retry on failure — up to 3 attempts, 5s apart
 *   7. Three proxy fallbacks
 */
'use strict';

const Live = (() => {

  // ── CONFIG ───────────────────────────────────────────────────────────────
  const API_KEY  = '72f45df7ce7b4991ac9ebd929bf4c53d';
  const COMP_ID  = 2000;
  const SEASON   = 2026;
  const POLL_MS  = 60000;   // re-poll every 60s
  const LIVE_MS  = 30000;   // extra poll every 30s when match is live
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 5000;
  const CACHE_KEY_MATCHES = 'wc2026_v2_matches';
  const CACHE_KEY_SCORERS = 'wc2026_v2_scorers';

  // ── STATE ────────────────────────────────────────────────────────────────
  let liveData   = {};
  let topScorers = [];
  let listeners  = [];
  const hasKey   = !!API_KEY;

  // ── LOCALSTORAGE CACHE ───────────────────────────────────────────────────
  // On every successful fetch, results are saved here.
  // On page load, cache is read FIRST so previous results appear instantly
  // before the network request even starts — survives redeploys.
  function _saveCache() {
    try {
      localStorage.setItem(CACHE_KEY_MATCHES, JSON.stringify(liveData));
      localStorage.setItem(CACHE_KEY_SCORERS, JSON.stringify(topScorers));
    } catch(e) { /* private mode or storage full — not fatal */ }
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

  // ── INIT ─────────────────────────────────────────────────────────────────
  function init() {
    _buildUtcIndex();

    // Step 1: show cached results immediately (zero network delay)
    const hadCache = _loadCache();
    if (hadCache) {
      _notify();
      _setBanner('cached');
    } else {
      _setBanner('loading');
    }

    if (!hasKey) { _setBanner('static'); return; }

    // Step 2: fetch fresh data in background, with retry
    _fetchWithRetry(RETRY_ATTEMPTS).then(() => {
      const gotData = Object.keys(liveData).length > 0;
      _setBanner(gotData ? 'live' : 'waiting');
      // Regular + live polls
      setInterval(fetchAll, POLL_MS);
      setInterval(() => {
        const anyLive = Object.values(liveData).some(
          d => d.status === 'IN_PLAY' || d.status === 'PAUSED'
        );
        if (anyLive) fetchLive();
      }, LIVE_MS);
    }).catch(err => {
      console.error('[Live] all retries failed:', err);
      // Cache already loaded so page still shows last known results
      _setBanner(hadCache ? 'cached_error' : 'error', err.message);
    });
  }

  // Retry wrapper — tries fetchAll up to `attempts` times, waiting
  // RETRY_DELAY_MS between each attempt.
  async function _fetchWithRetry(attempts) {
    for (let i = 0; i < attempts; i++) {
      try {
        await fetchAll();
        return; // success
      } catch(e) {
        console.warn(`[Live] fetch attempt ${i+1}/${attempts} failed:`, e.message);
        if (i < attempts - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        } else {
          throw e; // all attempts exhausted
        }
      }
    }
  }

  // ── CORS-SAFE API FETCH ──────────────────────────────────────────────────
  // Uses ?token= so no custom header → no CORS preflight → works on desktop.
  const CORS_PROXIES = [
    t => `https://corsproxy.io/?url=${encodeURIComponent(t)}`,
    t => `https://api.allorigins.win/raw?url=${encodeURIComponent(t)}`,
    t => `https://thingproxy.freeboard.io/fetch/${t}`,
  ];

  async function _apiFetch(path) {
    const sep    = path.includes('?') ? '&' : '?';
    const target = `https://api.football-data.org/v4${path}${sep}token=${API_KEY}`;
    let lastErr;
    for (const buildUrl of CORS_PROXIES) {
      try {
        const res = await fetch(buildUrl(target), {
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`${res.status} ${text.slice(0, 120)}`);
        }
        return await res.json();
      } catch(e) {
        lastErr = e;
        console.warn('[Live] proxy failed, trying next:', e.message);
      }
    }
    throw lastErr;
  }

  // ── FULL POLL (matches + scorers) ────────────────────────────────────────
  // /matches?season=2026 returns ALL 104 fixtures for the entire tournament
  // in one call — every match already played comes back with FINISHED status
  // and full scores. Nothing is lost.
  async function fetchAll() {
    const [matchRes, scorerRes] = await Promise.allSettled([
      _apiFetch(`/competitions/${COMP_ID}/matches?season=${SEASON}`),
      _apiFetch(`/competitions/${COMP_ID}/scorers?season=${SEASON}&limit=100`),
    ]);
    let changed = false;
    if (matchRes.status  === 'fulfilled') { _ingestMatches(matchRes.value.matches  || []); changed = true; }
    if (scorerRes.status === 'fulfilled') { _ingestScorers(scorerRes.value.scorers || []); changed = true; }
    else console.warn('[Live] scorers fetch failed:', scorerRes.reason?.message);
    if (!changed) throw new Error('Both endpoints failed');
    _saveCache();
    _notify();
    return true;
  }

  // ── FAST LIVE POLL ───────────────────────────────────────────────────────
  async function fetchLive() {
    try {
      const data = await _apiFetch(
        `/competitions/${COMP_ID}/matches?status=IN_PLAY,PAUSED&season=${SEASON}`
      );
      _ingestMatches(data.matches || []);
      _saveCache();
      _notify();
    } catch(e) { console.warn('[Live] fetchLive:', e.message); }
  }

  // ── TEAM NAME CANON MAP ──────────────────────────────────────────────────
  // Every API name variant → exact name in data.js
  // Verified against all 48 teams in data.js
  const CANON_MAP = {
    // Group A
    'mexico':                           'Mexico',
    'south africa':                     'South Africa',
    'korea republic':                   'Korea Republic',
    'republic of korea':                'Korea Republic',
    'south korea':                      'Korea Republic',
    'czechia':                          'Czechia',
    'czech republic':                   'Czechia',
    // Group B
    'canada':                           'Canada',
    'bosnia and herzegovina':           'Bosnia & Herzegovina',
    'bosnia & herzegovina':             'Bosnia & Herzegovina',
    'bosnia-herzegovina':               'Bosnia & Herzegovina',
    'qatar':                            'Qatar',
    'switzerland':                      'Switzerland',
    // Group C
    'brazil':                           'Brazil',
    'morocco':                          'Morocco',
    'haiti':                            'Haiti',
    'scotland':                         'Scotland',
    // Group D
    'united states':                    'USA',
    'united states of america':         'USA',
    'usa':                              'USA',
    'us':                               'USA',
    'paraguay':                         'Paraguay',
    'australia':                        'Australia',
    'türkiye':                          'Türkiye',
    'turkiye':                          'Türkiye',
    'turkey':                           'Türkiye',
    // Group E
    'germany':                          'Germany',
    'curaçao':                          'Curaçao',
    'curacao':                          'Curaçao',
    'ivory coast':                      'Ivory Coast',
    "côte d'ivoire":                    'Ivory Coast',
    "cote d'ivoire":                    'Ivory Coast',
    'ecuador':                          'Ecuador',
    // Group F
    'netherlands':                      'Netherlands',
    'holland':                          'Netherlands',
    'japan':                            'Japan',
    'tunisia':                          'Tunisia',
    'sweden':                           'Sweden',
    // Group G
    'belgium':                          'Belgium',
    'egypt':                            'Egypt',
    'iran':                             'Iran',
    'new zealand':                      'New Zealand',
    // Group H
    'spain':                            'Spain',
    'cabo verde':                       'Cabo Verde',
    'cape verde':                       'Cabo Verde',
    'saudi arabia':                     'Saudi Arabia',
    'ksa':                              'Saudi Arabia',
    'uruguay':                          'Uruguay',
    // Group I
    'france':                           'France',
    'senegal':                          'Senegal',
    'iraq':                             'Iraq',
    'norway':                           'Norway',
    // Group J
    'argentina':                        'Argentina',
    'algeria':                          'Algeria',
    'austria':                          'Austria',
    'jordan':                           'Jordan',
    // Group K
    'portugal':                         'Portugal',
    'congo dr':                         'Congo DR',
    'dr congo':                         'Congo DR',
    'democratic republic of congo':     'Congo DR',
    'democratic republic of the congo': 'Congo DR',
    'congo, dr':                        'Congo DR',
    'uzbekistan':                       'Uzbekistan',
    'colombia':                         'Colombia',
    // Group L
    'england':                          'England',
    'croatia':                          'Croatia',
    'ghana':                            'Ghana',
    'panama':                           'Panama',
  };

  function _canon(name) {
    if (!name) return '';
    // 1. Try exact lowercase match
    const key = name.toLowerCase().trim();
    if (CANON_MAP[key]) return CANON_MAP[key];
    // 2. Try after stripping diacritics (handles ü, é, ç etc.)
    const stripped = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (CANON_MAP[stripped]) return CANON_MAP[stripped];
    // 3. Try diacritic-stripped version of every key in map
    for (const [k, v] of Object.entries(CANON_MAP)) {
      if (k.normalize('NFD').replace(/[\u0300-\u036f]/g,'') === stripped) return v;
    }
    // 4. Return as-is (for KO placeholder text like "Winner Group A")
    return name.trim();
  }

  // ── UTC TIME INDEX ───────────────────────────────────────────────────────
  // "YYYY-MM-DDTHH:MM" → [fixture, ...]
  // Primary match key — works for group stage AND all KO rounds.
  let _utcIndex = null;

  function _buildUtcIndex() {
    _utcIndex = new Map();
    WC2026.FIXTURES.forEach(f => {
      if (!f.utc) return;
      const key = f.utc.slice(0, 16);
      if (!_utcIndex.has(key)) _utcIndex.set(key, []);
      _utcIndex.get(key).push(f);
    });
  }

  // ── INGEST MATCHES ───────────────────────────────────────────────────────
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
        minute:    m.minute  || null,
        homeApi:   m.homeTeam?.name || '',
        awayApi:   m.awayTeam?.name || '',
        scorers: (m.goals || []).map(g => ({
          team:   _canon(g.team?.name   || ''),
          player: g.scorer?.name        || 'Own Goal',
          minute: g.minute,
          type:   g.type                || 'REGULAR',
        })),
      };

      const hc     = _canon(m.homeTeam?.name || '');
      const ac     = _canon(m.awayTeam?.name || '');
      const utcKey = (m.utcDate || '').slice(0, 16);

      // Route 1: UTC time (primary — covers all stages)
      const timeMatches = _utcIndex.get(utcKey) || [];
      if (timeMatches.length === 1) {
        liveData[`local_${timeMatches[0].id}`] = payload;
        return;
      }
      if (timeMatches.length > 1) {
        // Same slot (e.g. simultaneous group matches) — disambiguate by name
        const hit = timeMatches.find(f =>
          _canon(f.home) === hc && _canon(f.away) === ac
        );
        if (hit) { liveData[`local_${hit.id}`] = payload; return; }
      }

      // Route 2: Team name fallback (group stage only)
      WC2026.FIXTURES.forEach(f => {
        if (f.stage !== 'group') return;
        if (_canon(f.home) === hc && _canon(f.away) === ac) {
          liveData[`local_${f.id}`] = payload;
        }
      });
    });
  }

  // ── INGEST SCORERS ───────────────────────────────────────────────────────
  function _ingestScorers(scorers) {
    topScorers = scorers.map(s => ({
      name:          s.player?.name         || '?',
      nationality:   s.player?.nationality  || '',
      teamRaw:       s.team?.name           || '',
      goals:         s.goals                || 0,
      assists:       s.assists              || 0,
      penalties:     s.penalties            || 0,
      playedMatches: s.playedMatches        || 0,
    }));
  }

  // ── NOTIFY ───────────────────────────────────────────────────────────────
  function _notify() {
    listeners.forEach(fn => { try { fn(liveData); } catch(e) {} });
  }

  // ── BANNER ───────────────────────────────────────────────────────────────
  function _setBanner(type, detail) {
    const el = document.getElementById('liveBanner');
    if (!el) return;
    const msgs = {
      static:       '📋 No API key set — showing static fixture data only.',
      loading:      '⏳ Loading match data…',
      cached:       '📦 Showing saved results — refreshing in background…',
      cached_error: '⚠️ Could not refresh — showing last saved results.',
      waiting:      '📅 Connected — live scores will appear once matches kick off.',
      live:         '🟢 Live data active — scores update every 60 s.',
      error:        '⚠️ Could not load match data. Please refresh the page.',
    };
    el.className  = `live-banner live-banner--${type}`;
    el.innerHTML  = `<span>${msgs[type] || ''}${detail ? ' <code style="opacity:.7;font-size:11px">(' + detail + ')</code>' : ''}</span>`;
    el.style.display = 'block';
    if (type === 'live' || type === 'waiting' || type === 'cached') {
      setTimeout(() => { el.style.display = 'none'; }, 8000);
    }
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────
  function onUpdate(fn) { listeners.push(fn); }

  function forFixture(f) { return liveData[`local_${f.id}`] || null; }

  function scoreLabel(f) {
    const d = forFixture(f);
    if (!d || d.scoreHome === null) return null;
    return `${d.scoreHome}–${d.scoreAway}`;
  }

  function statusBadge(f) {
    const d = forFixture(f);
    if (!d) return '';
    if (d.status === 'IN_PLAY')  return `<span class="badge badge--live">🔴 LIVE${d.minute ? ' ' + d.minute + "'" : ''}</span>`;
    if (d.status === 'PAUSED')   return `<span class="badge badge--ht">⏸ HT</span>`;
    if (d.status === 'FINISHED') return `<span class="badge badge--ft">FT</span>`;
    return '';
  }

  function scorersHtml(f) {
    const d = forFixture(f);
    if (!d || !d.scorers?.length) return '';
    const items = d.scorers.map(g => {
      const ico = g.type === 'OWN_GOAL' ? '⚽(OG)' : g.type === 'PENALTY' ? '⚽(P)' : '⚽';
      return `<span class="scorer-item">${ico} ${g.player} <b>${g.minute}'</b></span>`;
    });
    return `<div class="scorers-row">${items.join('<span class="scorer-sep"> · </span>')}</div>`;
  }

  function getTopScorers() { return topScorers; }

  return {
    init, onUpdate,
    forFixture, scoreLabel, statusBadge, scorersHtml,
    hasKey, getTopScorers,
  };
})();