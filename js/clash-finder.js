'use strict';

const ClashFinder = (() => {

  const GT = {
    A:['Mexico','Korea Republic','Czechia','South Africa'],
    B:['Canada','Qatar','Bosnia & Herzegovina','Switzerland'],
    C:['Brazil','Morocco','Haiti','Scotland'],
    D:['USA','Australia','Paraguay','Türkiye'],
    E:['Germany','Ivory Coast','Ecuador','Curaçao'],
    F:['Netherlands','Japan','Sweden','Tunisia'],
    G:['Belgium','Iran','Egypt','New Zealand'],
    H:['Spain','Saudi Arabia','Uruguay','Cabo Verde'],
    I:['France','Iraq','Senegal','Norway'],
    J:['Argentina','Austria','Algeria','Jordan'],
    K:['Portugal','Colombia','Uzbekistan','Congo DR'],
    L:['England','Croatia','Ghana','Panama'],
  };

  const FLAGS = {
    'Mexico':'🇲🇽','South Africa':'🇿🇦','Korea Republic':'🇰🇷','Czechia':'🇨🇿',
    'Canada':'🇨🇦','Bosnia & Herzegovina':'🇧🇦','Qatar':'🇶🇦','Switzerland':'🇨🇭',
    'Brazil':'🇧🇷','Morocco':'🇲🇦','Haiti':'🇭🇹','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'USA':'🇺🇸','Australia':'🇦🇺','Paraguay':'🇵🇾','Türkiye':'🇹🇷',
    'Germany':'🇩🇪','Ivory Coast':'🇨🇮','Ecuador':'🇪🇨','Curaçao':'🇨🇼',
    'Netherlands':'🇳🇱','Japan':'🇯🇵','Sweden':'🇸🇪','Tunisia':'🇹🇳',
    'Belgium':'🇧🇪','Iran':'🇮🇷','Egypt':'🇪🇬','New Zealand':'🇳🇿',
    'Spain':'🇪🇸','Saudi Arabia':'🇸🇦','Uruguay':'🇺🇾','Cabo Verde':'🇨🇻',
    'France':'🇫🇷','Iraq':'🇮🇶','Senegal':'🇸🇳','Norway':'🇳🇴',
    'Argentina':'🇦🇷','Austria':'🇦🇹','Algeria':'🇩🇿','Jordan':'🇯🇴',
    'Portugal':'🇵🇹','Colombia':'🇨🇴','Uzbekistan':'🇺🇿','Congo DR':'🇨🇩',
    'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croatia':'🇭🇷','Ghana':'🇬🇭','Panama':'🇵🇦',
  };

  function flag(t){ return FLAGS[t]||'🏳️'; }
  function teamGroup(t){ for(const[g,ts]of Object.entries(GT))if(ts.includes(t))return g; return null; }

  const R32S = {
    73:{home:{pos:'2nd',groups:['A']},away:{pos:'2nd',groups:['B']},date:'Jun 28',venue:'Los Angeles'},
    76:{home:{pos:'1st',groups:['C']},away:{pos:'2nd',groups:['F']},date:'Jun 29',venue:'Houston'},
    74:{home:{pos:'1st',groups:['E']},away:{pos:'3rd',groups:['A','B','C','D','F']},date:'Jun 29',venue:'Boston'},
    75:{home:{pos:'1st',groups:['F']},away:{pos:'2nd',groups:['C']},date:'Jun 30',venue:'Monterrey'},
    78:{home:{pos:'2nd',groups:['E']},away:{pos:'2nd',groups:['I']},date:'Jun 30',venue:'Dallas'},
    77:{home:{pos:'1st',groups:['I']},away:{pos:'3rd',groups:['C','D','F','G','H']},date:'Jun 30',venue:'New York/NJ'},
    79:{home:{pos:'1st',groups:['A']},away:{pos:'3rd',groups:['C','E','F','H','I']},date:'Jul 1',venue:'Mexico City'},
    80:{home:{pos:'1st',groups:['L']},away:{pos:'3rd',groups:['E','H','I','J','K']},date:'Jul 1',venue:'Atlanta'},
    82:{home:{pos:'1st',groups:['G']},away:{pos:'3rd',groups:['A','E','H','I','J']},date:'Jul 1',venue:'Seattle'},
    81:{home:{pos:'1st',groups:['D']},away:{pos:'3rd',groups:['B','E','F','I','J']},date:'Jul 2',venue:'San Francisco'},
    84:{home:{pos:'1st',groups:['H']},away:{pos:'2nd',groups:['J']},date:'Jul 2',venue:'Los Angeles'},
    83:{home:{pos:'2nd',groups:['K']},away:{pos:'2nd',groups:['L']},date:'Jul 2',venue:'Toronto'},
    85:{home:{pos:'1st',groups:['B']},away:{pos:'3rd',groups:['E','F','G','I','J']},date:'Jul 3',venue:'Vancouver'},
    88:{home:{pos:'2nd',groups:['D']},away:{pos:'2nd',groups:['G']},date:'Jul 3',venue:'Dallas'},
    86:{home:{pos:'1st',groups:['J']},away:{pos:'2nd',groups:['H']},date:'Jul 3',venue:'Miami'},
    87:{home:{pos:'1st',groups:['K']},away:{pos:'3rd',groups:['D','E','I','J','L']},date:'Jul 4',venue:'Kansas City'},
  };
  const R16 = {90:{h:73,a:75,date:'Jul 4',venue:'Houston'},89:{h:74,a:77,date:'Jul 4',venue:'Philadelphia'},91:{h:76,a:78,date:'Jul 5',venue:'New York/NJ'},92:{h:79,a:80,date:'Jul 6',venue:'Mexico City'},93:{h:83,a:84,date:'Jul 6',venue:'Dallas'},94:{h:81,a:82,date:'Jul 7',venue:'Seattle'},95:{h:86,a:88,date:'Jul 7',venue:'Atlanta'},96:{h:85,a:87,date:'Jul 7',venue:'New York/NJ'}};
  const QF  = {97:{h:89,a:90,date:'Jul 9',venue:'Dallas'},98:{h:93,a:94,date:'Jul 9',venue:'Los Angeles'},99:{h:91,a:92,date:'Jul 10',venue:'New York/NJ'},100:{h:95,a:96,date:'Jul 11',venue:'Boston'}};
  const SF  = {101:{h:97,a:98,date:'Jul 14',venue:'Dallas'},102:{h:99,a:100,date:'Jul 15',venue:'New York/NJ'}};
  const FIN = {104:{h:101,a:102,date:'Jul 19',venue:'New York/NJ'}};

  /* ── Build ALL concrete paths for a team (one per R32 entry) ── */
  function allPaths(team) {
    const grp = teamGroup(team);
    const paths = [];
    for(const[mid,slots]of Object.entries(R32S)){
      for(const side of['home','away']){
        const slot = slots[side];
        if(!slot.groups.includes(grp)) continue;
        const r32id = parseInt(mid);
        const r16entry = Object.entries(R16).find(([,m])=>m.h===r32id||m.a===r32id);
        if(!r16entry) continue;
        const r16id = parseInt(r16entry[0]);
        const qfentry = Object.entries(QF).find(([,m])=>m.h===r16id||m.a===r16id);
        if(!qfentry) continue;
        const qfid = parseInt(qfentry[0]);
        const sfentry = Object.entries(SF).find(([,m])=>m.h===qfid||m.a===qfid);
        if(!sfentry) continue;
        const sfid = parseInt(sfentry[0]);

        // Opponent description in R32
        const oppSlot = side==='home' ? slots.away : slots.home;
        const oppDesc = oppSlot.pos==='3rd'
          ? `best 3rd-place from Groups ${oppSlot.groups.join('/')}`
          : oppSlot.groups.length===1
            ? `${oppSlot.pos}-place from Group ${oppSlot.groups[0]}`
            : `${oppSlot.pos}-place from Groups ${oppSlot.groups.join('/')}`;

        const posLabel = slot.pos==='3rd'
          ? `finish 3rd in Group ${grp} (as top-8 3rd-place)`
          : `finish ${slot.pos} in Group ${grp}`;

        paths.push({
          pos: slot.pos, posLabel,
          r32: r32id, r32date: slots.date, r32venue: slots.venue, r32opp: oppDesc,
          r16: r16id, r16date: R16[r16id].date, r16venue: R16[r16id].venue,
          qf:  qfid,  qfdate:  QF[qfid].date,   qfvenue:  QF[qfid].venue,
          sf:  sfid,  sfdate:  SF[sfid].date,    sfvenue:  SF[sfid].venue,
          final: 104,
        });
      }
    }
    return paths;
  }

  /* ── Find clashes: for each stage, collect ALL distinct pos-combo clashes ── */
  function findClashes(tA, tB) {
    const pA = allPaths(tA), pB = allPaths(tB);
    const stages = ['r32','r16','qf','sf','final'];
    const result = {};

    stages.forEach(stage => {
      const seen = new Set();
      const clashes = [];
      pA.forEach(pathA => {
        pB.forEach(pathB => {
          if(pathA[stage] !== pathB[stage]) return;
          // Deduplicate by posA+posB combo
          const key = `${pathA.posLabel}||${pathB.posLabel}`;
          if(seen.has(key)) return;
          seen.add(key);
          clashes.push({ pathA, pathB, matchId: pathA[stage] });
        });
      });
      if(clashes.length) result[stage] = clashes;
    });
    return result;
  }

  /* ── Build human-readable condition string from a path up to a stage ── */
  function condStr(p, stage) {
    if(stage==='r32')  return `Must ${p.posLabel}`;
    if(stage==='r16')  return `Must ${p.posLabel} → Win R32 on ${p.r32date} (${p.r32venue}) vs the ${p.r32opp}`;
    if(stage==='qf')   return `Must ${p.posLabel} → Win R32 on ${p.r32date} vs ${p.r32opp} → Win R16 on ${p.r16date} (${p.r16venue})`;
    if(stage==='sf')   return `Must ${p.posLabel} → Win R32 on ${p.r32date} → Win R16 on ${p.r16date} → Win QF on ${p.qfdate} (${p.qfvenue})`;
    if(stage==='final')return `Must ${p.posLabel} → Win R32 on ${p.r32date} → Win R16 on ${p.r16date} → Win QF on ${p.qfdate} → Win SF on ${p.sfdate} (${p.sfvenue})`;
    return '';
  }

  /* ── Render ── */
  const STAGE_META = {
    r32:   {label:'Round of 32',   icon:'⚽', color:'blue',   hero:'They could meet in the very <strong>first knockout match</strong> — Round of 32!'},
    r16:   {label:'Round of 16',   icon:'🎯', color:'teal',   hero:'Their earliest possible clash is the <strong>Round of 16</strong>.'},
    qf:    {label:'Quarter-Final', icon:'⚡', color:'orange', hero:'They can only first meet in the <strong>Quarter-Finals</strong>.'},
    sf:    {label:'Semi-Final',    icon:'🔥', color:'red',    hero:'These two can only meet in the <strong>Semi-Finals</strong> at the earliest.'},
    final: {label:'The Final',     icon:'🏆', color:'gold',   hero:'The only way these teams face each other is in the <strong>World Cup Final</strong> 🏆'},
  };

  function renderResult(tA, tB) {
    const fA=flag(tA), fB=flag(tB);
    const clashes = findClashes(tA, tB);
    const stageKeys = ['r32','r16','qf','sf','final'];
    const earliestKey = stageKeys.find(s=>clashes[s]);

    if(!earliestKey) {
      return `<div class="cf-result-card cf-card-impossible">
        <div class="cf-card-hero">
          <div class="cf-result-header">${fA} ${tA} <span class="cf-result-vs">⚔️</span> ${fB} ${tB}</div>
          <div class="cf-result-badge">🚫</div>
          <div class="cf-result-stage" style="color:#9ca3af">Cannot Meet</div>
          <div class="cf-result-desc">These teams cannot meet in any knockout round based on the official FIFA bracket.</div>
        </div></div>`;
    }

    let stagesHtml = '';
    stageKeys.forEach(key => {
      const meta = STAGE_META[key];
      const list = clashes[key];
      if(!list) return;

      const isEarliest = key === earliestKey;
      const dotCls   = isEarliest ? 'cf-dot--clash' : 'cf-dot--poss';
      const nameCls  = isEarliest ? 'cf-sname--clash' : 'cf-sname--poss';
      const condCls  = isEarliest ? 'cf-cond--clash' : 'cf-cond--poss';
      const badge    = isEarliest
        ? `<span class="cf-stage-badge cf-badge--earliest">⚡ Earliest</span>`
        : `<span class="cf-stage-badge cf-badge--possible">Also possible</span>`;

      // Group clashes by unique posA values to show concisely
      const aOptions = [...new Set(list.map(c=>c.pathA.posLabel))];
      const bOptions = [...new Set(list.map(c=>c.pathB.posLabel))];

      // Build condition rows — show each team's possible finishing positions
      // and for each, the full chain
      let condHtml = '';

      // Team A rows
      const aUnique = [];
      const seenA = new Set();
      list.forEach(c => { if(!seenA.has(c.pathA.posLabel)){seenA.add(c.pathA.posLabel);aUnique.push(c.pathA);} });
      const bUnique = [];
      const seenB = new Set();
      list.forEach(c => { if(!seenB.has(c.pathB.posLabel)){seenB.add(c.pathB.posLabel);bUnique.push(c.pathB);} });

      condHtml += `<div class="cf-team-block">`;
      condHtml += `<div class="cf-team-block-flag">${fA}</div><div class="cf-team-block-body">`;
      condHtml += `<div class="cf-team-name-line"><strong>${tA}</strong> can reach this stage by:</div>`;
      aUnique.forEach(p => {
        condHtml += `<div class="cf-option-row">• <em>${condStr(p, key)}</em></div>`;
      });
      condHtml += `</div></div>`;

      condHtml += `<div class="cf-team-block">`;
      condHtml += `<div class="cf-team-block-flag">${fB}</div><div class="cf-team-block-body">`;
      condHtml += `<div class="cf-team-name-line"><strong>${tB}</strong> can reach this stage by:</div>`;
      bUnique.forEach(p => {
        condHtml += `<div class="cf-option-row">• <em>${condStr(p, key)}</em></div>`;
      });
      condHtml += `</div></div>`;

      stagesHtml += `
        <div class="cf-stage-row">
          <div class="cf-stage-left"><div class="cf-stage-dot ${dotCls}">${meta.icon}</div></div>
          <div class="cf-stage-body">
            <div class="cf-stage-title-row">
              <span class="cf-stage-name ${nameCls}">${meta.label}</span>${badge}
            </div>
            <div class="cf-conditions ${condCls}">${condHtml}</div>
          </div>
        </div>`;
    });

    const earliest = STAGE_META[earliestKey];
    return `<div class="cf-result-card cf-card--${earliest.color}">
      <div class="cf-card-hero">
        <div class="cf-result-header">${fA} ${tA} <span class="cf-result-vs">⚔️</span> ${fB} ${tB}</div>
        <div class="cf-result-badge">${earliest.icon}</div>
        <div class="cf-result-stage">${earliest.label}</div>
        <div class="cf-result-desc">${earliest.hero}</div>
      </div>
      <div class="cf-stages">${stagesHtml}</div>
    </div>`;
  }

  function renderBracketSection(tA, tB) {
    const fA=flag(tA), fB=flag(tB);
    const pathsA=allPaths(tA), pathsB=allPaths(tB);
    const r32A=[...new Set(pathsA.map(p=>p.r32))];
    const r32B=[...new Set(pathsB.map(p=>p.r32))];
    const allR32=[...new Set([...r32A,...r32B])];
    let html = '';

    html += `<div class="ko-section">
      <button class="ko-header" onclick="ClashFinder._toggleSection(this)">
        <span class="ko-header-left"><span>⚽</span><span class="ko-title" style="font-size:13px">R32 — Their Matches</span><span class="ko-count-badge">${allR32.length}</span></span>
        <svg class="ko-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform:rotate(180deg)"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="ko-body ko-body--open"><div class="ko-body-inner"><div class="ko-match-list">`;

    allR32.forEach(mid => {
      const m = R32S[mid]; if(!m) return;
      const aInH=m.home.groups.some(g=>GT[g].includes(tA)),aInA=m.away.groups.some(g=>GT[g].includes(tA));
      const bInH=m.home.groups.some(g=>GT[g].includes(tB)),bInA=m.away.groups.some(g=>GT[g].includes(tB));
      const isClash=(aInH||aInA)&&(bInH||bInA);
      const paA = pathsA.find(p=>p.r32===mid);
      const paB = pathsB.find(p=>p.r32===mid);
      const hd=aInH?`${fA} ${tA}`:bInH?`${fB} ${tB}`:m.home.pos==='3rd'?`Best 3rd (${m.home.groups.join('/')})`:`${m.home.pos} Group ${m.home.groups[0]}`;
      const ad=aInA?`${fA} ${tA}`:bInA?`${fB} ${tB}`:m.away.pos==='3rd'?`Best 3rd (${m.away.groups.join('/')})`:`${m.away.pos} Group ${m.away.groups[0]}`;
      const hq=aInH&&paA?`📌 ${paA.posLabel}`:bInH&&paB?`📌 ${paB.posLabel}`:'';
      const aq=aInA&&paA?`📌 ${paA.posLabel}`:bInA&&paB?`📌 ${paB.posLabel}`:'';
      html+=`<div class="ko-match-card${isClash?' ko-match-card--highlight':''}">
        ${isClash?'<div class="ko-match-label">⚔️ POTENTIAL CLASH</div>':''}
        <div class="ko-match-meta">${m.date} · ${m.venue}</div>
        <div class="ko-match-teams">
          <div class="ko-team"><span class="ko-team-name">${hd}</span>${hq?`<span class="ko-team-qual">${hq}</span>`:''}</div>
          <div class="ko-middle"><span class="ko-vs">VS</span></div>
          <div class="ko-team ko-team--right"><span class="ko-team-name">${ad}</span>${aq?`<span class="ko-team-qual">${aq}</span>`:''}</div>
        </div></div>`;
    });
    html += `</div></div></div></div>`;

    const host=document.getElementById('cf-bracket-host');
    if(host){ host.innerHTML=html; host.style.display='block'; }
    const lbl=document.getElementById('cf-bracket-label');
    if(lbl) lbl.textContent=`${tA} & ${tB} — Possible Paths`;
  }

  function _onTeamChange(){
    const tA=document.getElementById('cf-team-a').value;
    const tB=document.getElementById('cf-team-b').value;
    const out=document.getElementById('cf-result');
    const bw=document.getElementById('cf-bracket-wrap');
    if(!tA||!tB){
      out.innerHTML='<div class="cf-hint">⬆️ Select two teams above.</div>';
      if(bw)bw.style.display='none'; return;
    }
    if(tA===tB){
      out.innerHTML='<div class="cf-hint cf-hint--warn">Please select two different teams.</div>';
      if(bw)bw.style.display='none'; return;
    }
    out.innerHTML=renderResult(tA,tB);
    renderBracketSection(tA,tB);
    if(bw)bw.style.display='block';
  }

  function _toggleSection(btn){
    const body=btn.nextElementSibling;
    const chev=btn.querySelector('.ko-chevron');
    const open=body.classList.toggle('ko-body--open');
    chev.style.transform=open?'rotate(180deg)':'rotate(0deg)';
  }

  function reset(){
    const a=document.getElementById('cf-team-a'),b=document.getElementById('cf-team-b');
    if(a)a.value=''; if(b)b.value='';
    const out=document.getElementById('cf-result');
    if(out)out.innerHTML='<div class="cf-hint">⬆️ Select two teams above.</div>';
    const bw=document.getElementById('cf-bracket-wrap');
    if(bw)bw.style.display='none';
  }

  function _render(){
    const host=document.getElementById('cfContainer'); if(!host)return;
    host.innerHTML=`
      <div class="cf-inner">
        <div class="cf-tagline">Pick any two teams — see the <strong>exact group-stage finish</strong> each team needs, for <strong>every possible route</strong> they could meet.</div>
        <div class="cf-selectors">
          <div class="cf-selector-group">
            <label class="cf-label">🟦 Team A</label>
            <div id="cf-select-a-wrap"></div>
          </div>
          <div class="cf-vs-divider">VS</div>
          <div class="cf-selector-group">
            <label class="cf-label">🟥 Team B</label>
            <div id="cf-select-b-wrap"></div>
          </div>
        </div>
        <div id="cf-result" class="cf-result">
          <div class="cf-hint">⬆️ Select two teams above.</div>
        </div>
        <div id="cf-bracket-wrap" style="display:none">
          <div class="cf-bracket-divider"><span id="cf-bracket-label">Bracket Paths</span></div>
          <div id="cf-bracket-host"></div>
        </div>
        <button class="cf-reset-btn" onclick="ClashFinder.reset()">↺ Reset</button>
      </div>`;
    _buildDropdowns();
  }

  function _buildDropdowns(){
    const wA=document.getElementById('cf-select-a-wrap');
    const wB=document.getElementById('cf-select-b-wrap');
    if(!wA||!wB)return;
    const mk=(id)=>{
      let h=`<select id="${id}" class="cf-select" onchange="ClashFinder._onTeamChange()"><option value="">— Select Team —</option>`;
      ['A','B','C','D','E','F','G','H','I','J','K','L'].forEach(g=>{
        h+=`<optgroup label="Group ${g}">`;
        GT[g].forEach(t=>{h+=`<option value="${t}">${flag(t)} ${t}</option>`;});
        h+=`</optgroup>`;
      });
      return h+'</select>';
    };
    wA.innerHTML=mk('cf-team-a');
    wB.innerHTML=mk('cf-team-b');
  }

  let _visible=false;

  function init(){
    if(document.getElementById('cfToggleBtn'))return;
    const bc=document.getElementById('bracketContent'); if(!bc)return;
    const tb=document.createElement('div');
    tb.className='cf-toggle-bar';
    tb.innerHTML=`<button id="cfToggleBtn" class="cf-toggle-btn" onclick="ClashFinder.toggle()">🔍 Team Clash Finder</button><span class="cf-toggle-hint">Find when two teams could meet — with every possible qualifying route</span>`;
    bc.parentElement.insertBefore(tb,bc);
    const panel=document.createElement('div');
    panel.id='cfPanel'; panel.className='cf-panel'; panel.style.display='none';
    panel.innerHTML=`<div class="cf-panel-inner"><div class="cf-title">🔍 Team Clash Finder</div><div id="cfContainer"></div></div>`;
    bc.parentElement.insertBefore(panel,bc);
  }

  function toggle(){
    _visible=!_visible;
    const panel=document.getElementById('cfPanel');
    const btn=document.getElementById('cfToggleBtn');
    if(!panel||!btn)return;
    if(_visible){
      panel.style.display='block';
      btn.classList.add('cf-toggle--active');
      btn.innerHTML='✕ Close Clash Finder';
      _render();
      panel.scrollIntoView({behavior:'smooth',block:'start'});
    } else {
      panel.style.display='none';
      btn.classList.remove('cf-toggle--active');
      btn.innerHTML='🔍 Team Clash Finder';
    }
  }

  return{init,toggle,reset,_onTeamChange,_toggleSection};
})();
