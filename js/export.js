/**
 * export.js — .ics calendar export (i18n-aware)
 */
'use strict';

const Export = (() => {
  let selectedTeams = new Set();
  let allSelected   = false;

  function pad(n) { return String(n).padStart(2,'0'); }

  // Converts team name to the same slug used by generate-ics.js
  function _slug(team) {
    return team.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s\-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');
  }

  const BASE_URL = 'https://chyfarhanjamil.github.io/wc2026-fixture/ics/';

  function _subscribeURL(teamList) {
    if (teamList.length === 0) return null;
    const file = teamList.length === 1
      ? `${_slug(teamList[0])}.ics`
      : teamList.length === WC2026.teams.length ? 'all.ics' : null;
    if (!file) return null; // multi-team select: no single combined file
    // webcal:// makes iPhone/Google Calendar subscribe (auto-sync) instead of import
    return BASE_URL.replace('https://', 'webcal://') + file;
  }

  function _httpURL(teamList) {
    if (teamList.length === 1)
      return BASE_URL + _slug(teamList[0]) + '.ics';
    if (teamList.length === WC2026.teams.length)
      return BASE_URL + 'all.ics';
    return null;
  }

  function toICSDateTime(utcStr, addHours = 0) {
    const d = new Date(utcStr);
    if (addHours) d.setHours(d.getHours() + addHours);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}` +
           `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  }

  function buildICS(fixtures, teamNames) {
    const now = toICSDateTime(new Date().toISOString());

    const events = fixtures.map((f, i) => {
      const resolved = f.isKO ? Resolver.resolve(f) : null;
      // For KO fixtures: use resolved name if confirmed, else placeholder label
      const homeDisplay = resolved
        ? (resolved.homeResolved ? resolved.home : resolved.home)
        : f.home;
      const awayDisplay = resolved
        ? (resolved.awayResolved ? resolved.away : resolved.away)
        : f.away;

      const isTentative = f.isKO && (!resolved || !resolved.homeResolved || !resolved.awayResolved);
      const summary = isTentative
        ? `⚽ [TBD] ${homeDisplay} vs ${awayDisplay} (${f.label})`
        : `⚽ ${homeDisplay} vs ${awayDisplay}${f.group ? ` (Group ${f.group})` : ` (${f.label})`}`;

      const desc = isTentative
        ? `FIFA World Cup 2026\\n${f.label}\\nTeams TBC — updates automatically when confirmed\\nVenue: ${f.venue}\\nTime: ${f.tzTime}`
        : `FIFA World Cup 2026\\n${homeDisplay} vs ${awayDisplay}\\n${f.label}\\nTime: ${f.tzTime}\\nVenue: ${f.venue}`;

      // SEQUENCE increments when teams become known so calendar apps auto-update
      const seq = isTentative ? 0 : 1;

      return [
        'BEGIN:VEVENT',
        `UID:wc2026-m${f.id}@wc2026fixtures`,
        `DTSTAMP:${now}`,
        `SEQUENCE:${seq}`,
        `DTSTART:${toICSDateTime(f.utc)}`,
        `DTEND:${toICSDateTime(f.utc, 2)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `LOCATION:${f.venue}`,
        isTentative ? 'STATUS:TENTATIVE' : 'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n');
    });

    const calName = teamNames.length === WC2026.teams.length
      ? 'FIFA World Cup 2026 – All Matches'
      : `FIFA World Cup 2026 – ${teamNames.join(', ')}`;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WC2026 Fixtures//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calName}`,
      'X-WR-TIMEZONE:Asia/Dhaka',
      'REFRESH-INTERVAL;VALUE=DURATION:P1D',
      'X-PUBLISHED-TTL:P1D',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');
  }

  function open() {
    // Update modal text with current language
    document.querySelector('.modal-title').textContent    = I18n.t('export_title');
    document.querySelector('.modal-sub').textContent      = I18n.t('export_sub');
    document.querySelector('.modal-section-label').textContent = I18n.t('select_teams_label');
    document.getElementById('selectAllBtn').textContent   = I18n.t('select_all');
    document.getElementById('downloadBtn').textContent    = I18n.t('download_ics');
    document.querySelector('.ics-note').innerHTML =
      I18n.t('ics_note_iphone') + '<br>' + I18n.t('ics_note_google');

    const g = document.getElementById('teamSelectGrid');
    g.innerHTML = '';
    selectedTeams.clear();
    allSelected = false;
    updateBtn();

    const q = (document.getElementById('search').value || '').toLowerCase().trim();

    WC2026.teams.forEach(team => {
      const flag        = WC2026.FLAGS[team] || '🏳️';
      const grp         = WC2026.teamMap[team].group;
      const preSelected = q && team.toLowerCase().includes(q);
      if (preSelected) selectedTeams.add(team);

      const el = document.createElement('div');
      el.className    = 'team-opt' + (preSelected ? ' selected' : '');
      el.dataset.team = team;
      el.innerHTML = `
        <div class="team-opt-flag">${flag}</div>
        <div class="team-opt-name">${team}</div>
        <div class="team-opt-grp">${I18n.t('group_prefix')} ${grp}</div>
        <div class="team-opt-check">${preSelected ? '✓' : ''}</div>`;
      el.onclick = () => toggle(el, team);
      g.appendChild(el);
    });

    updateBtn();
    document.getElementById('exportModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.getElementById('exportModal').classList.remove('open');
    document.body.style.overflow = '';
  }

  function handleOverlay(e) {
    if (e.target === document.getElementById('exportModal')) close();
  }

  function toggle(el, team) {
    if (selectedTeams.has(team)) {
      selectedTeams.delete(team);
      el.classList.remove('selected');
      el.querySelector('.team-opt-check').textContent = '';
    } else {
      selectedTeams.add(team);
      el.classList.add('selected');
      el.querySelector('.team-opt-check').textContent = '✓';
    }
    allSelected = selectedTeams.size === WC2026.teams.length;
    document.getElementById('selectAllBtn').textContent =
      allSelected ? I18n.t('deselect_all') : I18n.t('select_all');
    updateBtn();
  }

  function toggleAll() {
    const opts = document.querySelectorAll('.team-opt');
    if (!allSelected) {
      WC2026.teams.forEach(t => selectedTeams.add(t));
      opts.forEach(el => { el.classList.add('selected'); el.querySelector('.team-opt-check').textContent = '✓'; });
      allSelected = true;
      document.getElementById('selectAllBtn').textContent = I18n.t('deselect_all');
    } else {
      selectedTeams.clear();
      opts.forEach(el => { el.classList.remove('selected'); el.querySelector('.team-opt-check').textContent = ''; });
      allSelected = false;
      document.getElementById('selectAllBtn').textContent = I18n.t('select_all');
    }
    updateBtn();
  }

  function updateBtn() {
    const btn      = document.getElementById('downloadBtn');
    const teamList = [...selectedTeams];
    btn.disabled   = selectedTeams.size === 0;
    if (selectedTeams.size === 0)       btn.textContent = I18n.t('download_ics');
    else if (allSelected)               btn.textContent = I18n.t('download_all');
    else if (teamList.length === 1)     btn.textContent = I18n.t('download_1_team', { team: teamList[0] });
    else                                btn.textContent = I18n.t('download_n_teams', { n: teamList.length });

    // Show/hide subscribe section
    const sub = document.getElementById('subscribeSection');
    if (!sub) return;
    const url = _subscribeURL(teamList);
    if (url) {
      const httpUrl = _httpURL(teamList);
      const teamLabel = teamList.length === 1 ? teamList[0]
        : teamList.length === WC2026.teams.length ? 'All Teams' : null;
      sub.style.display = 'block';
      sub.innerHTML = `
        <div class="subscribe-title">📲 Auto-sync (recommended)</div>
        <div class="subscribe-desc">
          Subscribe so your calendar <strong>auto-updates</strong> as knockout teams get confirmed — no re-importing needed.
        </div>
        <div class="subscribe-btns">
          <a href="${url}" class="btn-subscribe btn-subscribe--iphone">
            📅 Add to iPhone Calendar
          </a>
          <a href="https://www.google.com/calendar/render?cid=${encodeURIComponent(httpUrl || '')}" target="_blank" class="btn-subscribe btn-subscribe--google">
            🗓️ Add to Google Calendar
          </a>
        </div>
        <div class="subscribe-note">
          Or copy this URL and paste into any calendar app under "Subscribe to calendar":<br>
          <code class="subscribe-url" onclick="navigator.clipboard.writeText(this.textContent).then(()=>this.classList.add('copied'))">${httpUrl}</code>
        </div>`;
    } else {
      sub.style.display = 'none';
      sub.innerHTML = '';
    }
  }

  // Returns true if a KO fixture could involve any of the selected teams,
  // either because the team is already confirmed (Resolver) or because it
  // is still listed as a possible entrant in the slot description.
  // We use the CONFIRMED check for calendar SUMMARY but we include the
  // fixture as TENTATIVE if the team is only a possibility.
  function _koMayInvolve(f, teamList) {
    if (!f.isKO) return false;
    const r = Resolver.resolve(f);
    // If Resolver has confirmed a team into either slot, check directly
    if (r.homeResolved && teamList.includes(r.home)) return true;
    if (r.awayResolved && teamList.includes(r.away)) return true;
    // If not yet resolved, check whether the team is in the pool description
    // (homeDesc / awayDesc) — but ONLY if no team has been confirmed yet for
    // that slot, to avoid false positives once another team wins.
    if (!r.homeResolved && f.homeDesc) {
      if (teamList.some(t => f.homeDesc.toLowerCase().includes(t.toLowerCase()))) return true;
    }
    if (!r.awayResolved && f.awayDesc) {
      if (teamList.some(t => f.awayDesc.toLowerCase().includes(t.toLowerCase()))) return true;
    }
    return false;
  }

  function download() {
    const teamList = [...selectedTeams];
    const seen = new Set();

    // Group-stage confirmed matches
    const groupMatches = WC2026.FIXTURES.filter(f => {
      if (f.stage !== 'group') return false;
      const involves = f.teams.some(t => teamList.includes(t));
      if (involves && !seen.has(f.id)) { seen.add(f.id); return true; }
      return false;
    });

    // KO-stage matches: confirmed + tentative (where team could still appear)
    const koMatches = WC2026.FIXTURES.filter(f => {
      if (!f.isKO) return false;
      if (seen.has(f.id)) return false;
      if (_koMayInvolve(f, teamList)) { seen.add(f.id); return true; }
      return false;
    });

    const matches = [...groupMatches, ...koMatches];

    const ics  = buildICS(matches, teamList);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = teamList.length === 1
      ? `wc2026-${teamList[0].replace(/\s+/g,'-')}.ics`
      : teamList.length === WC2026.teams.length ? 'wc2026-all-matches.ics' : 'wc2026-selected-teams.ics';
    a.click();
    URL.revokeObjectURL(url);

    const btn  = document.getElementById('downloadBtn');
    const orig = btn.textContent;
    btn.textContent = I18n.t('downloaded');
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }

  return { open, close, handleOverlay, toggleAll, download };
})();
