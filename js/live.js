/**
 * live.js — Real-time data from football-data.org
 * API key is already set below.
 * Competition 2000 = FIFA World Cup (all editions including 2026)
 *
 * FREE TIER gives you:
 *   ✅ Live scores (IN_PLAY, PAUSED, FINISHED)
 *   ✅ Full-time & half-time scores
 *   ✅ Goal scorers (name + minute) via m.goals[]
 *   ✅ Top scorers leaderboard via /scorers endpoint
 *   ✅ Assists (in /scorers response)
 *   ❌ Yellow/Red cards (paid tier only)
 *   ❌ GK save data (paid tier only)
 */
'use strict';

const Live = (() => {

  // ── CONFIG ────────────────────────────────────────────────────────────
  const API_KEY = '72f45df7ce7b4991ac9ebd929bf4c53d';   // football-data.org
  const COMP_ID = 2000;   // FIFA World Cup (football-data.org ID)
  const SEASON  = 2026;
  const POLL_MS  = 60000;  // re-poll every 60s normally
  const LIVE_MS  = 30000;  // re-poll every 30s when a match is IN_PLAY

  // ── STATE ─────────────────────────────────────────────────────────────
  let liveData   = {};    // keyed "local_<fixtureId>" → match payload
  let topScorers = [];    // from /scorers endpoint
  let listeners  = [];
  const hasKey   = !!API_KEY;

  // ── INIT ──────────────────────────────────────────────────────────────
  function init() {
    if (!hasKey) { _setBanner('static'); return; }
    _setBanner('loading');
    fetchAll().then(() => {
      const gotData = Object.keys(liveData).length > 0;
      _setBanner(gotData ? 'live' : 'waiting');
      // Regular poll every 60s
      setInterval(fetchAll, POLL_MS);
      // Extra fast poll during live matches
      setInterval(() => {
        const anyLive = Object.values(liveData).some(
          d => d.status === 'IN_PLAY' || d.status === 'PAUSED'
        );
        if (anyLive) fetchLive();
      }, LIVE_MS);
    }).catch(err => {
      console.error('[Live] init failed:', err);
      _setBanner('error', err.message);
    });
  }

  // ── API FETCH ─────────────────────────────────────────────────────────
  // football-data.org does NOT send CORS headers for browser requests,
  // so direct fetch() from a static site (e.g. GitHub Pages) is blocked
  // by the browser before it ever reaches our code. We route through a
  // free CORS proxy that forwards the request and adds the required
  // Access-Control-Allow-Origin header.
  // Two free proxies are tried in order — if the first is down/rate-limited,
  // the second is used automatically.
  const CORS_PROXIES = [
    target => 'https://corsproxy.io/?url=' + encodeURIComponent(target),
    target => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
  ];

  async function _apiFetch(path) {
    const target = `https://api.football-data.org/v4${path}`;
    let lastErr;

    for (const buildUrl of CORS_PROXIES) {
      try {
        const res = await fetch(buildUrl(target), {
          headers: { 'X-Auth-Token': API_KEY }
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`${res.status} ${text.slice(0,120)}`);
        }
        return await res.json();
      } catch (e) {
        lastErr = e;
        console.warn('[Live] proxy failed, trying next:', e.message);
      }
    }
    throw lastErr;
  }

  // Full poll — matches + scorers
  async function fetchAll() {
    const [matchRes, scorerRes] = await Promise.allSettled([
      _apiFetch(`/competitions/${COMP_ID}/matches?season=${SEASON}`),
      _apiFetch(`/competitions/${COMP_ID}/scorers?season=${SEASON}&limit=100`),
    ]);
    if (matchRes.status  === 'fulfilled') _ingestMatches(matchRes.value.matches   || []);
    if (scorerRes.status === 'fulfilled') _ingestScorers(scorerRes.value.scorers  || []);
    else console.warn('[Live] scorers:', scorerRes.reason?.message);
    _notify();
    return true;
  }

  // Fast poll — only live matches
  async function fetchLive() {
    try {
      const data = await _apiFetch(
        `/competitions/${COMP_ID}/matches?status=IN_PLAY,PAUSED&season=${SEASON}`
      );
      _ingestMatches(data.matches || []);
      _notify();
    } catch(e) { console.warn('[Live] fetchLive:', e.message); }
  }

  // ── TEAM NAME CANONICALISATION ────────────────────────────────────────
  // Maps every name variant the API might send → the name used in data.js
  const CANON_MAP = {
    // USA
    'united states':           'usa',
    'usa':                     'usa',
    'us':                      'usa',
    // Korea
    'korea republic':          'korea republic',
    'south korea':             'korea republic',
    'republic of korea':       'korea republic',
    // Ivory Coast
    "côte d'ivoire":           'ivory coast',
    "cote d'ivoire":           'ivory coast',
    'ivory coast':             'ivory coast',
    // Bosnia
    'bosnia and herzegovina':  'bosnia & herzegovina',
    'bosnia & herzegovina':    'bosnia & herzegovina',
    // Türkiye
    'türkiye':                 'türkiye',
    'turkey':                  'türkiye',
    // Congo
    'congo dr':                'congo dr',
    'dr congo':                'congo dr',
    'democratic republic of congo': 'congo dr',
    // Cabo Verde
    'cape verde':              'cabo verde',
    'cabo verde':              'cabo verde',
    // England / Great Britain — API uses "England"
    'england':                 'england',
    // Scotland
    'scotland':                'scotland',
  };

  function _canon(name) {
    const n = (name || '').toLowerCase().trim()
      .replace(/\u00fc/g,'ü').replace(/\u00e4/g,'ä').replace(/\u00f6/g,'ö'); // normalize umlauts
    return CANON_MAP[n] || n;
  }

  // ── INGEST MATCHES ────────────────────────────────────────────────────
  function _ingestMatches(matches) {
    matches.forEach(m => {
      const ft = m.score?.fullTime  || {};
      const ht = m.score?.halfTime  || {};
      const payload = {
        status:    m.status,
        scoreHome: ft.home ?? null,
        scoreAway: ft.away ?? null,
        htHome:    ht.home ?? null,
        htAway:    ht.away ?? null,
        minute:    m.minute  || null,
        homeApi:   m.homeTeam?.name || '',
        awayApi:   m.awayTeam?.name || '',
        // Goal-scorer events — included on free tier
        scorers: (m.goals || []).map(g => ({
          team:   _canon(g.team?.name   || ''),
          player: g.scorer?.name        || 'Own Goal',
          minute: g.minute,
          type:   g.type                || 'REGULAR',
        })),
      };

      // Match API team names against our static fixture list
      const hc = _canon(m.homeTeam?.name || '');
      const ac = _canon(m.awayTeam?.name || '');
      WC2026.FIXTURES.forEach(f => {
        if (f.stage !== 'group') return;   // KO teams TBD
        if (_canon(f.home) === hc && _canon(f.away) === ac) {
          liveData[`local_${f.id}`] = payload;
        }
      });
    });
  }

  // ── INGEST SCORERS (top-scorers endpoint) ─────────────────────────────
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

  // ── NOTIFY LISTENERS ─────────────────────────────────────────────────
  function _notify() {
    listeners.forEach(fn => { try { fn(liveData); } catch(e) {} });
  }

  // ── BANNER ────────────────────────────────────────────────────────────
  function _setBanner(type, detail) {
    const el = document.getElementById('liveBanner');
    if (!el) return;
    const msgs = {
      static:  '📋 No API key set — showing static fixture data only.',
      loading: '⏳ Connecting to live data…',
      waiting: '📅 Connected — live scores will appear once matches kick off.',
      live:    '🟢 Live data active — scores update every 60 s.',
      error:   '⚠️ Could not connect to live data. Showing static fixtures.',
    };
    el.className  = `live-banner live-banner--${type}`;
    el.innerHTML  = `<span>${msgs[type]}${detail ? ' <code style="opacity:.7;font-size:11px">(' + detail + ')</code>' : ''}</span>`;
    el.style.display = 'block';
    // Auto-hide the "live"/"waiting" banner after 8 s; keep error/static visible
    if (type === 'live' || type === 'waiting') {
      setTimeout(() => { el.style.display = 'none'; }, 8000);
    }
  }

  // ── PUBLIC HELPERS ────────────────────────────────────────────────────
  function onUpdate(fn) { listeners.push(fn); }

  function forFixture(f) {
    return liveData[`local_${f.id}`] || null;
  }

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
    if (!d || !d.scorers || !d.scorers.length) return '';
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
