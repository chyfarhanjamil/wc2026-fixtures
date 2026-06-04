/**
 * export.js — .ics calendar export module
 * Depends on: WC2026 (data.js)
 */

'use strict';

const Export = (() => {

  let selectedTeams = new Set();
  let allSelected   = false;

  /* ── ICS helpers ─────────────────────────────────────────────────────── */
  function pad(n) { return String(n).padStart(2, '0'); }

  function toICSDateTime(utcStr, addHours = 0) {
    const d = new Date(utcStr);
    if (addHours) d.setHours(d.getHours() + addHours);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}` +
           `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  }

  function buildICS(fixtures, teamNames) {
    const now    = toICSDateTime(new Date().toISOString());
    const events = fixtures.map((f, i) => [
      'BEGIN:VEVENT',
      `UID:wc2026-m${f.id}-${i}@wc2026fixtures`,
      `DTSTAMP:${now}`,
      `DTSTART:${toICSDateTime(f.utc)}`,
      `DTEND:${toICSDateTime(f.utc, 2)}`,
      `SUMMARY:⚽ ${f.home} vs ${f.away}${f.group ? ` (Group ${f.group})` : ` (${f.label})`}`,
      `DESCRIPTION:FIFA World Cup 2026\\n${f.home} vs ${f.away}\\n${f.label}\\nBangladesh Time: ${f.bstTime}\\nVenue: ${f.venue}`,
      `LOCATION:${f.venue}`,
      'END:VEVENT',
    ].join('\r\n'));

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WC2026 Fixtures//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:FIFA World Cup 2026 – ${teamNames.length === WC2026.teams.length ? 'All Matches' : teamNames.join(', ')}`,
      'X-WR-TIMEZONE:Asia/Dhaka',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');
  }

  /* ── Modal ───────────────────────────────────────────────────────────── */
  function open() {
    const g = document.getElementById('teamSelectGrid');
    g.innerHTML = '';
    selectedTeams.clear();
    allSelected = false;
    document.getElementById('selectAllBtn').textContent = 'Select All';
    updateBtn();

    // Pre-select searched team
    const q = (document.getElementById('search').value || '').toLowerCase().trim();

    WC2026.teams.forEach(team => {
      const flag        = WC2026.FLAGS[team] || '🏳️';
      const grp         = WC2026.teamMap[team].group;
      const preSelected = q && team.toLowerCase().includes(q);
      if (preSelected) selectedTeams.add(team);

      const el = document.createElement('div');
      el.className   = 'team-opt' + (preSelected ? ' selected' : '');
      el.dataset.team = team;
      el.innerHTML = `
        <div class="team-opt-flag">${flag}</div>
        <div class="team-opt-name">${team}</div>
        <div class="team-opt-grp">Group ${grp}</div>
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
    document.getElementById('selectAllBtn').textContent = allSelected ? 'Deselect All' : 'Select All';
    updateBtn();
  }

  function toggleAll() {
    const opts = document.querySelectorAll('.team-opt');
    if (!allSelected) {
      WC2026.teams.forEach(t => selectedTeams.add(t));
      opts.forEach(el => { el.classList.add('selected'); el.querySelector('.team-opt-check').textContent = '✓'; });
      allSelected = true;
      document.getElementById('selectAllBtn').textContent = 'Deselect All';
    } else {
      selectedTeams.clear();
      opts.forEach(el => { el.classList.remove('selected'); el.querySelector('.team-opt-check').textContent = ''; });
      allSelected = false;
      document.getElementById('selectAllBtn').textContent = 'Select All';
    }
    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById('downloadBtn');
    btn.disabled = selectedTeams.size === 0;
    const teamList = [...selectedTeams];
    btn.textContent = selectedTeams.size === 0
      ? '⬇️ Download .ics'
      : `⬇️ Download ${allSelected ? 'All Matches' : teamList.length === 1 ? teamList[0] : teamList.length + ' Teams'} .ics`;
  }

  function download() {
    const teamList = [...selectedTeams];
    const seen     = new Set();
    const matches  = WC2026.FIXTURES.filter(f => {
      if (f.stage !== 'group') return false; // KO rounds don't have confirmed teams yet
      const involves = f.teams.some(t => teamList.includes(t));
      const key      = `${f.id}`;
      if (involves && !seen.has(key)) { seen.add(key); return true; }
      return false;
    });

    const ics  = buildICS(matches, teamList);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = teamList.length === 1
      ? `wc2026-${teamList[0].replace(/\s+/g, '-')}.ics`
      : teamList.length === WC2026.teams.length ? 'wc2026-all-matches.ics' : 'wc2026-selected-teams.ics';
    a.click();
    URL.revokeObjectURL(url);

    const btn = document.getElementById('downloadBtn');
    const orig = btn.textContent;
    btn.textContent = '✅ Downloaded!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }

  return { open, close, handleOverlay, toggleAll, download };
})();
