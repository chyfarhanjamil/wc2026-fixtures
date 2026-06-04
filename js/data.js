/**
 * data.js — Single source of truth for all WC2026 fixtures
 * Source: Official FIFA / Fox Sports / Al Jazeera schedule (verified May 2026)
 * All times stored as UTC ISO strings; UI converts to selected timezone (default: BST UTC+6)
 */

'use strict';

const WC2026 = (() => {

  /* ── Flags ─────────────────────────────────────────────────────────────── */
  const FLAGS = {
    'Mexico':'🇲🇽','South Africa':'🇿🇦','Korea Republic':'🇰🇷','Czechia':'🇨🇿',
    'Canada':'🇨🇦','Bosnia & Herzegovina':'🇧🇦','USA':'🇺🇸','Paraguay':'🇵🇾',
    'Qatar':'🇶🇦','Switzerland':'🇨🇭','Brazil':'🇧🇷','Morocco':'🇲🇦',
    'Haiti':'🇭🇹','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Australia':'🇦🇺','Türkiye':'🇹🇷',
    'Germany':'🇩🇪','Curaçao':'🇨🇼','Netherlands':'🇳🇱','Japan':'🇯🇵',
    'Ivory Coast':'🇨🇮','Ecuador':'🇪🇨','Sweden':'🇸🇪','Tunisia':'🇹🇳',
    'Spain':'🇪🇸','Cabo Verde':'🇨🇻','Belgium':'🇧🇪','Egypt':'🇪🇬',
    'Saudi Arabia':'🇸🇦','Uruguay':'🇺🇾','Iran':'🇮🇷','New Zealand':'🇳🇿',
    'France':'🇫🇷','Senegal':'🇸🇳','Iraq':'🇮🇶','Norway':'🇳🇴',
    'Argentina':'🇦🇷','Algeria':'🇩🇿','Austria':'🇦🇹','Jordan':'🇯🇴',
    'Portugal':'🇵🇹','Congo DR':'🇨🇩','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croatia':'🇭🇷',
    'Ghana':'🇬🇭','Panama':'🇵🇦','Uzbekistan':'🇺🇿','Colombia':'🇨🇴'
  };

  /* ── Timezone definitions ──────────────────────────────────────────────── */
  const TIMEZONES = [
    { label: 'Bangladesh (BST)',        offset: +6,    id: 'bst'  },
    { label: 'UTC (Universal)',          offset:  0,    id: 'utc'  },
    { label: 'London (BST/GMT)',         offset: +1,    id: 'lon'  },
    { label: 'Paris / Berlin (CEST)',    offset: +2,    id: 'cet'  },
    { label: 'Dubai (GST)',              offset: +4,    id: 'gst'  },
    { label: 'India (IST)',              offset: +5.5,  id: 'ist'  },
    { label: 'Pakistan (PKT)',           offset: +5,    id: 'pkt'  },
    { label: 'Nepal (NPT)',              offset: +5.75, id: 'npt'  },
    { label: 'Sri Lanka / Kolkata',      offset: +5.5,  id: 'ist2' },
    { label: 'Jakarta (WIB)',            offset: +7,    id: 'wib'  },
    { label: 'Singapore / KL (SGT)',     offset: +8,    id: 'sgt'  },
    { label: 'Tokyo (JST)',              offset: +9,    id: 'jst'  },
    { label: 'Sydney (AEST)',            offset: +10,   id: 'aest' },
    { label: 'New York (EDT)',           offset: -4,    id: 'edt'  },
    { label: 'Chicago (CDT)',            offset: -5,    id: 'cdt'  },
    { label: 'Los Angeles (PDT)',        offset: -7,    id: 'pdt'  },
    { label: 'São Paulo (BRT)',          offset: -3,    id: 'brt'  },
    { label: 'Riyadh (AST)',             offset: +3,    id: 'ast'  },
  ];

  /* Active timezone — starts at BST (UTC+6) */
  let _tzOffset = 6;
  let _tzId     = 'bst';

  function setTimezone(id) {
    const tz = TIMEZONES.find(t => t.id === id);
    if (!tz) return;
    _tzId     = tz.id;
    _tzOffset = tz.offset;
    _rebuildDerived();
  }

  function getTimezone() {
    return TIMEZONES.find(t => t.id === _tzId);
  }

  /* ── Fixture raw data ─────────────────────────────────────────────────── */
  const FIXTURES_RAW = [
    // ── GROUP STAGE ──────────────────────────────────────────────────────

    // June 11
    {id:1,  stage:'group', group:'A', home:'Mexico',               away:'South Africa',         utc:'2026-06-11T19:00:00Z', venue:'Mexico City'},
    {id:2,  stage:'group', group:'A', home:'Korea Republic',        away:'Czechia',              utc:'2026-06-12T02:00:00Z', venue:'Guadalajara'},

    // June 12
    {id:3,  stage:'group', group:'B', home:'Canada',               away:'Bosnia & Herzegovina', utc:'2026-06-12T19:00:00Z', venue:'Toronto'},
    {id:4,  stage:'group', group:'D', home:'USA',                  away:'Paraguay',             utc:'2026-06-13T01:00:00Z', venue:'Los Angeles'},

    // June 13
    {id:5,  stage:'group', group:'B', home:'Qatar',                away:'Switzerland',          utc:'2026-06-13T19:00:00Z', venue:'San Francisco'},
    {id:6,  stage:'group', group:'C', home:'Brazil',               away:'Morocco',              utc:'2026-06-13T22:00:00Z', venue:'New York/NJ'},
    {id:7,  stage:'group', group:'C', home:'Haiti',                away:'Scotland',             utc:'2026-06-14T01:00:00Z', venue:'Boston'},
    {id:8,  stage:'group', group:'D', home:'Australia',            away:'Türkiye',              utc:'2026-06-14T04:00:00Z', venue:'Vancouver'},

    // June 14
    {id:9,  stage:'group', group:'E', home:'Germany',              away:'Curaçao',              utc:'2026-06-14T17:00:00Z', venue:'Houston'},
    {id:10, stage:'group', group:'F', home:'Netherlands',           away:'Japan',                utc:'2026-06-14T20:00:00Z', venue:'Dallas'},
    {id:11, stage:'group', group:'E', home:'Ivory Coast',          away:'Ecuador',              utc:'2026-06-14T23:00:00Z', venue:'Philadelphia'},
    {id:12, stage:'group', group:'F', home:'Tunisia',              away:'Sweden',               utc:'2026-06-15T02:00:00Z', venue:'Monterrey'},

    // June 15
    {id:13, stage:'group', group:'H', home:'Spain',                away:'Cabo Verde',           utc:'2026-06-15T16:00:00Z', venue:'Atlanta'},
    {id:14, stage:'group', group:'G', home:'Belgium',              away:'Egypt',                utc:'2026-06-15T19:00:00Z', venue:'Seattle'},
    {id:15, stage:'group', group:'H', home:'Saudi Arabia',         away:'Uruguay',              utc:'2026-06-15T22:00:00Z', venue:'Miami'},
    {id:16, stage:'group', group:'G', home:'Iran',                 away:'New Zealand',          utc:'2026-06-16T01:00:00Z', venue:'Los Angeles'},

    // June 16
    {id:17, stage:'group', group:'I', home:'France',               away:'Senegal',              utc:'2026-06-16T19:00:00Z', venue:'New York/NJ'},
    {id:18, stage:'group', group:'I', home:'Iraq',                 away:'Norway',               utc:'2026-06-16T22:00:00Z', venue:'Boston'},
    {id:19, stage:'group', group:'J', home:'Argentina',            away:'Algeria',              utc:'2026-06-17T01:00:00Z', venue:'Kansas City'},
    {id:20, stage:'group', group:'J', home:'Austria',              away:'Jordan',               utc:'2026-06-17T04:00:00Z', venue:'San Francisco'},

    // June 17
    {id:21, stage:'group', group:'K', home:'Portugal',             away:'Congo DR',             utc:'2026-06-17T17:00:00Z', venue:'Houston'},
    {id:22, stage:'group', group:'L', home:'England',              away:'Croatia',              utc:'2026-06-17T20:00:00Z', venue:'Dallas'},
    {id:23, stage:'group', group:'L', home:'Ghana',                away:'Panama',               utc:'2026-06-17T23:00:00Z', venue:'Toronto'},
    {id:24, stage:'group', group:'K', home:'Uzbekistan',           away:'Colombia',             utc:'2026-06-18T02:00:00Z', venue:'Mexico City'},

    // June 18
    {id:25, stage:'group', group:'A', home:'Czechia',              away:'South Africa',         utc:'2026-06-18T16:00:00Z', venue:'Atlanta'},
    {id:26, stage:'group', group:'B', home:'Switzerland',          away:'Bosnia & Herzegovina', utc:'2026-06-18T19:00:00Z', venue:'Los Angeles'},
    {id:27, stage:'group', group:'B', home:'Canada',               away:'Qatar',                utc:'2026-06-18T22:00:00Z', venue:'Vancouver'},
    {id:28, stage:'group', group:'A', home:'Mexico',               away:'Korea Republic',       utc:'2026-06-19T01:00:00Z', venue:'Guadalajara'},

    // June 19
    {id:29, stage:'group', group:'D', home:'USA',                  away:'Australia',            utc:'2026-06-19T19:00:00Z', venue:'Seattle'},
    {id:30, stage:'group', group:'C', home:'Scotland',             away:'Morocco',              utc:'2026-06-19T19:00:00Z', venue:'Boston'},
    {id:31, stage:'group', group:'C', home:'Brazil',               away:'Haiti',                utc:'2026-06-20T01:00:00Z', venue:'Philadelphia'},
    {id:32, stage:'group', group:'D', home:'Türkiye',              away:'Paraguay',             utc:'2026-06-20T04:00:00Z', venue:'San Francisco'},

    // June 20
    {id:33, stage:'group', group:'F', home:'Netherlands',           away:'Sweden',               utc:'2026-06-20T17:00:00Z', venue:'Houston'},
    {id:34, stage:'group', group:'E', home:'Germany',              away:'Ivory Coast',          utc:'2026-06-20T20:00:00Z', venue:'Toronto'},
    {id:35, stage:'group', group:'E', home:'Ecuador',              away:'Curaçao',              utc:'2026-06-21T00:00:00Z', venue:'Kansas City'},
    {id:36, stage:'group', group:'F', home:'Tunisia',              away:'Japan',                utc:'2026-06-21T04:00:00Z', venue:'Monterrey'},

    // June 21
    {id:37, stage:'group', group:'H', home:'Spain',                away:'Saudi Arabia',         utc:'2026-06-21T16:00:00Z', venue:'Atlanta'},
    {id:38, stage:'group', group:'G', home:'Belgium',              away:'Iran',                 utc:'2026-06-21T19:00:00Z', venue:'Los Angeles'},
    {id:39, stage:'group', group:'H', home:'Uruguay',              away:'Cabo Verde',           utc:'2026-06-21T22:00:00Z', venue:'Miami'},
    {id:40, stage:'group', group:'G', home:'New Zealand',          away:'Egypt',                utc:'2026-06-22T01:00:00Z', venue:'Vancouver'},

    // June 22
    {id:41, stage:'group', group:'J', home:'Argentina',            away:'Austria',              utc:'2026-06-22T17:00:00Z', venue:'Dallas'},
    {id:42, stage:'group', group:'I', home:'France',               away:'Iraq',                 utc:'2026-06-22T21:00:00Z', venue:'Philadelphia'},
    {id:43, stage:'group', group:'I', home:'Norway',               away:'Senegal',              utc:'2026-06-23T00:00:00Z', venue:'New York/NJ'},
    {id:44, stage:'group', group:'J', home:'Jordan',               away:'Algeria',              utc:'2026-06-23T03:00:00Z', venue:'San Francisco'},

    // June 23
    {id:45, stage:'group', group:'K', home:'Portugal',             away:'Uzbekistan',           utc:'2026-06-23T17:00:00Z', venue:'Houston'},
    {id:46, stage:'group', group:'L', home:'England',              away:'Ghana',                utc:'2026-06-23T20:00:00Z', venue:'Boston'},
    {id:47, stage:'group', group:'L', home:'Panama',               away:'Croatia',              utc:'2026-06-23T23:00:00Z', venue:'Toronto'},
    {id:48, stage:'group', group:'K', home:'Colombia',             away:'Congo DR',             utc:'2026-06-24T02:00:00Z', venue:'Guadalajara'},

    // June 24
    {id:49, stage:'group', group:'B', home:'Switzerland',          away:'Canada',               utc:'2026-06-24T19:00:00Z', venue:'Vancouver'},
    {id:50, stage:'group', group:'B', home:'Bosnia & Herzegovina', away:'Qatar',                utc:'2026-06-24T19:00:00Z', venue:'Seattle'},
    {id:51, stage:'group', group:'C', home:'Brazil',               away:'Scotland',             utc:'2026-06-24T22:00:00Z', venue:'Miami'},
    {id:52, stage:'group', group:'C', home:'Morocco',              away:'Haiti',                utc:'2026-06-24T22:00:00Z', venue:'Atlanta'},
    {id:53, stage:'group', group:'A', home:'Mexico',               away:'Czechia',              utc:'2026-06-25T01:00:00Z', venue:'Mexico City'},
    {id:54, stage:'group', group:'A', home:'Korea Republic',        away:'South Africa',         utc:'2026-06-25T01:00:00Z', venue:'Monterrey'},

    // June 25
    {id:55, stage:'group', group:'E', home:'Ecuador',              away:'Germany',              utc:'2026-06-25T20:00:00Z', venue:'New York/NJ'},
    {id:56, stage:'group', group:'E', home:'Curaçao',              away:'Ivory Coast',          utc:'2026-06-25T20:00:00Z', venue:'Philadelphia'},
    {id:57, stage:'group', group:'F', home:'Tunisia',              away:'Netherlands',           utc:'2026-06-25T23:00:00Z', venue:'Kansas City'},
    {id:58, stage:'group', group:'F', home:'Japan',                away:'Sweden',               utc:'2026-06-25T23:00:00Z', venue:'Dallas'},
    {id:59, stage:'group', group:'D', home:'USA',                  away:'Türkiye',              utc:'2026-06-26T02:00:00Z', venue:'Los Angeles'},
    {id:60, stage:'group', group:'D', home:'Paraguay',             away:'Australia',            utc:'2026-06-26T02:00:00Z', venue:'San Francisco'},

    // June 26
    {id:61, stage:'group', group:'I', home:'Norway',               away:'France',               utc:'2026-06-26T19:00:00Z', venue:'Boston'},
    {id:62, stage:'group', group:'I', home:'Senegal',              away:'Iraq',                 utc:'2026-06-26T19:00:00Z', venue:'Toronto'},
    {id:63, stage:'group', group:'H', home:'Uruguay',              away:'Spain',                utc:'2026-06-27T00:00:00Z', venue:'Guadalajara'},
    {id:64, stage:'group', group:'H', home:'Cabo Verde',           away:'Saudi Arabia',         utc:'2026-06-27T00:00:00Z', venue:'Houston'},
    {id:65, stage:'group', group:'G', home:'New Zealand',          away:'Belgium',              utc:'2026-06-27T03:00:00Z', venue:'Vancouver'},
    {id:66, stage:'group', group:'G', home:'Egypt',                away:'Iran',                 utc:'2026-06-27T03:00:00Z', venue:'Seattle'},

    // June 27
    {id:67, stage:'group', group:'L', home:'Panama',               away:'England',              utc:'2026-06-27T21:00:00Z', venue:'New York/NJ'},
    {id:68, stage:'group', group:'L', home:'Croatia',              away:'Ghana',                utc:'2026-06-27T21:00:00Z', venue:'Philadelphia'},
    {id:69, stage:'group', group:'K', home:'Colombia',             away:'Portugal',             utc:'2026-06-27T23:30:00Z', venue:'Miami'},
    {id:70, stage:'group', group:'K', home:'Congo DR',             away:'Uzbekistan',           utc:'2026-06-27T23:30:00Z', venue:'Atlanta'},
    {id:71, stage:'group', group:'J', home:'Argentina',            away:'Jordan',               utc:'2026-06-28T02:00:00Z', venue:'Dallas'},
    {id:72, stage:'group', group:'J', home:'Algeria',              away:'Austria',              utc:'2026-06-28T02:00:00Z', venue:'Kansas City'},

    // ── ROUND OF 32 ──────────────────────────────────────────────────────
    // June 28
    {id:73,  stage:'r32', group:null,
      home:'2nd Group A', away:'2nd Group B',
      homeDesc:'Runner-up Group A\n(Mexico, Korea Rep., Czechia, S. Africa)',
      awayDesc:'Runner-up Group B\n(Canada, Switzerland, Bosnia & Herz., Qatar)',
      utc:'2026-06-28T19:00:00Z', venue:'Los Angeles'},

    // June 29
    {id:76,  stage:'r32', group:null,
      home:'1st Group C', away:'2nd Group F',
      homeDesc:'Winner Group C\n(Brazil, Morocco, Haiti, Scotland)',
      awayDesc:'Runner-up Group F\n(Netherlands, Japan, Tunisia, Sweden)',
      utc:'2026-06-29T17:00:00Z', venue:'Houston'},
    {id:74,  stage:'r32', group:null,
      home:'1st Group E', away:'Best 3rd (A/B/C/D/F)',
      homeDesc:'Winner Group E\n(Germany, Ivory Coast, Ecuador, Curaçao)',
      awayDesc:'Best 3rd-place team from\nGroups A, B, C, D or F',
      utc:'2026-06-29T20:30:00Z', venue:'Boston'},
    {id:75,  stage:'r32', group:null,
      home:'1st Group F', away:'2nd Group C',
      homeDesc:'Winner Group F\n(Netherlands, Japan, Tunisia, Sweden)',
      awayDesc:'Runner-up Group C\n(Brazil, Morocco, Haiti, Scotland)',
      utc:'2026-06-30T01:00:00Z', venue:'Monterrey'},

    // June 30
    {id:78,  stage:'r32', group:null,
      home:'2nd Group E', away:'2nd Group I',
      homeDesc:'Runner-up Group E\n(Germany, Ivory Coast, Ecuador, Curaçao)',
      awayDesc:'Runner-up Group I\n(France, Norway, Iraq, Senegal)',
      utc:'2026-06-30T17:00:00Z', venue:'Dallas'},
    {id:77,  stage:'r32', group:null,
      home:'1st Group I', away:'Best 3rd (C/D/F/G/H)',
      homeDesc:'Winner Group I\n(France, Norway, Iraq, Senegal)',
      awayDesc:'Best 3rd-place team from\nGroups C, D, F, G or H',
      utc:'2026-06-30T21:00:00Z', venue:'New York/NJ'},
    {id:79,  stage:'r32', group:null,
      home:'1st Group A', away:'Best 3rd (C/E/F/H/I)',
      homeDesc:'Winner Group A\n(Mexico, Korea Rep., Czechia, S. Africa)',
      awayDesc:'Best 3rd-place team from\nGroups C, E, F, H or I',
      utc:'2026-07-01T01:00:00Z', venue:'Mexico City'},

    // July 1
    {id:80,  stage:'r32', group:null,
      home:'1st Group L', away:'Best 3rd (E/H/I/J/K)',
      homeDesc:'Winner Group L\n(England, Croatia, Ghana, Panama)',
      awayDesc:'Best 3rd-place team from\nGroups E, H, I, J or K',
      utc:'2026-07-01T16:00:00Z', venue:'Atlanta'},
    {id:82,  stage:'r32', group:null,
      home:'1st Group G', away:'Best 3rd (A/E/H/I/J)',
      homeDesc:'Winner Group G\n(Belgium, Iran, New Zealand, Egypt)',
      awayDesc:'Best 3rd-place team from\nGroups A, E, H, I or J',
      utc:'2026-07-01T20:00:00Z', venue:'Seattle'},
    {id:81,  stage:'r32', group:null,
      home:'1st Group D', away:'Best 3rd (B/E/F/I/J)',
      homeDesc:'Winner Group D\n(USA, Türkiye, Australia, Paraguay)',
      awayDesc:'Best 3rd-place team from\nGroups B, E, F, I or J',
      utc:'2026-07-02T00:00:00Z', venue:'San Francisco'},

    // July 2
    {id:84,  stage:'r32', group:null,
      home:'1st Group H', away:'2nd Group J',
      homeDesc:'Winner Group H\n(Spain, Uruguay, Saudi Arabia, Cabo Verde)',
      awayDesc:'Runner-up Group J\n(Argentina, Austria, Algeria, Jordan)',
      utc:'2026-07-02T19:00:00Z', venue:'Los Angeles'},
    {id:83,  stage:'r32', group:null,
      home:'2nd Group K', away:'2nd Group L',
      homeDesc:'Runner-up Group K\n(Portugal, Colombia, Uzbekistan, Congo DR)',
      awayDesc:'Runner-up Group L\n(England, Croatia, Ghana, Panama)',
      utc:'2026-07-02T23:00:00Z', venue:'Toronto'},
    {id:85,  stage:'r32', group:null,
      home:'1st Group B', away:'Best 3rd (E/F/G/I/J)',
      homeDesc:'Winner Group B\n(Canada, Switzerland, Bosnia & Herz., Qatar)',
      awayDesc:'Best 3rd-place team from\nGroups E, F, G, I or J',
      utc:'2026-07-03T03:00:00Z', venue:'Vancouver'},

    // July 3
    {id:88,  stage:'r32', group:null,
      home:'2nd Group D', away:'2nd Group G',
      homeDesc:'Runner-up Group D\n(USA, Türkiye, Australia, Paraguay)',
      awayDesc:'Runner-up Group G\n(Belgium, Iran, New Zealand, Egypt)',
      utc:'2026-07-03T18:00:00Z', venue:'Dallas'},
    {id:86,  stage:'r32', group:null,
      home:'1st Group J', away:'2nd Group H',
      homeDesc:'Winner Group J\n(Argentina, Austria, Algeria, Jordan)',
      awayDesc:'Runner-up Group H\n(Spain, Uruguay, Saudi Arabia, Cabo Verde)',
      utc:'2026-07-03T22:00:00Z', venue:'Miami'},
    {id:87,  stage:'r32', group:null,
      home:'1st Group K', away:'Best 3rd (D/E/I/J/L)',
      homeDesc:'Winner Group K\n(Portugal, Colombia, Uzbekistan, Congo DR)',
      awayDesc:'Best 3rd-place team from\nGroups D, E, I, J or L',
      utc:'2026-07-04T01:30:00Z', venue:'Kansas City'},

    // ── ROUND OF 16 ──────────────────────────────────────────────────────
    {id:90, stage:'r16', group:null,
      home:'Winner R32 Match 73 or 75', away:'Winner R32 Match 76',
      homeDesc:'Winner of R32: 2nd-A vs 2nd-B\nor Winner of R32: 1st-F vs 2nd-C',
      awayDesc:'Winner of R32: 1st-C vs 2nd-F',
      utc:'2026-07-04T17:00:00Z', venue:'Houston'},
    {id:89, stage:'r16', group:null,
      home:'Winner R32 Match 74', away:'Winner R32 Match 77',
      homeDesc:'Winner of R32: 1st-E vs Best 3rd',
      awayDesc:'Winner of R32: 1st-I vs Best 3rd',
      utc:'2026-07-04T21:00:00Z', venue:'Philadelphia'},
    {id:91, stage:'r16', group:null,
      home:'Winner R32 Match 75', away:'Winner R32 Match 78',
      homeDesc:'Winner of R32: 1st-F vs 2nd-C',
      awayDesc:'Winner of R32: 2nd-E vs 2nd-I',
      utc:'2026-07-05T20:00:00Z', venue:'New York/NJ'},
    {id:92, stage:'r16', group:null,
      home:'Winner R32 Match 79', away:'Winner R32 Match 80',
      homeDesc:'Winner of R32: 1st-A vs Best 3rd',
      awayDesc:'Winner of R32: 1st-L vs Best 3rd',
      utc:'2026-07-06T00:00:00Z', venue:'Mexico City'},
    {id:93, stage:'r16', group:null,
      home:'Winner R32 Match 81', away:'Winner R32 Match 82',
      homeDesc:'Winner of R32: 1st-D vs Best 3rd',
      awayDesc:'Winner of R32: 1st-G vs Best 3rd',
      utc:'2026-07-06T19:00:00Z', venue:'Dallas'},
    {id:94, stage:'r16', group:null,
      home:'Winner R32 Match 83', away:'Winner R32 Match 84',
      homeDesc:'Winner of R32: 2nd-K vs 2nd-L',
      awayDesc:'Winner of R32: 1st-H vs 2nd-J',
      utc:'2026-07-07T00:00:00Z', venue:'Seattle'},
    {id:95, stage:'r16', group:null,
      home:'Winner R32 Match 85', away:'Winner R32 Match 86',
      homeDesc:'Winner of R32: 1st-B vs Best 3rd',
      awayDesc:'Winner of R32: 1st-J vs 2nd-H',
      utc:'2026-07-07T16:00:00Z', venue:'Atlanta'},
    {id:96, stage:'r16', group:null,
      home:'Winner R32 Match 87', away:'Winner R32 Match 88',
      homeDesc:'Winner of R32: 1st-K vs Best 3rd',
      awayDesc:'Winner of R32: 2nd-D vs 2nd-G',
      utc:'2026-07-07T20:00:00Z', venue:'New York/NJ'},

    // ── QUARTER-FINALS ───────────────────────────────────────────────────
    {id:97, stage:'qf',  group:null,
      home:'Winner R16 Match 89', away:'Winner R16 Match 90',
      homeDesc:'Winner of Round of 16 (Jul 4 – Philadelphia)',
      awayDesc:'Winner of Round of 16 (Jul 4 – Houston)',
      utc:'2026-07-09T19:00:00Z', venue:'Dallas'},
    {id:98, stage:'qf',  group:null,
      home:'Winner R16 Match 91', away:'Winner R16 Match 92',
      homeDesc:'Winner of Round of 16 (Jul 5 – New York/NJ)',
      awayDesc:'Winner of Round of 16 (Jul 6 – Mexico City)',
      utc:'2026-07-09T23:00:00Z', venue:'Los Angeles'},
    {id:99, stage:'qf',  group:null,
      home:'Winner R16 Match 93', away:'Winner R16 Match 94',
      homeDesc:'Winner of Round of 16 (Jul 6 – Dallas)',
      awayDesc:'Winner of Round of 16 (Jul 7 – Seattle)',
      utc:'2026-07-10T19:00:00Z', venue:'New York/NJ'},
    {id:100,stage:'qf',  group:null,
      home:'Winner R16 Match 95', away:'Winner R16 Match 96',
      homeDesc:'Winner of Round of 16 (Jul 7 – Atlanta)',
      awayDesc:'Winner of Round of 16 (Jul 7 – New York/NJ)',
      utc:'2026-07-11T01:00:00Z', venue:'Boston'},

    // ── SEMI-FINALS ──────────────────────────────────────────────────────
    {id:101,stage:'sf',  group:null,
      home:'Winner QF Match 97', away:'Winner QF Match 98',
      homeDesc:'Winner of Quarter-Final (Jul 9 – Dallas)',
      awayDesc:'Winner of Quarter-Final (Jul 9 – Los Angeles)',
      utc:'2026-07-14T23:00:00Z', venue:'Dallas'},
    {id:102,stage:'sf',  group:null,
      home:'Winner QF Match 99', away:'Winner QF Match 100',
      homeDesc:'Winner of Quarter-Final (Jul 10 – New York/NJ)',
      awayDesc:'Winner of Quarter-Final (Jul 11 – Boston)',
      utc:'2026-07-15T21:00:00Z', venue:'New York/NJ'},

    // ── THIRD PLACE ──────────────────────────────────────────────────────
    {id:103,stage:'3rd', group:null,
      home:'Loser SF Match 101', away:'Loser SF Match 102',
      homeDesc:'Loser of Semi-Final (Jul 14 – Dallas)',
      awayDesc:'Loser of Semi-Final (Jul 15 – New York/NJ)',
      utc:'2026-07-18T19:00:00Z', venue:'Miami'},

    // ── FINAL ────────────────────────────────────────────────────────────
    {id:104,stage:'final',group:null,
      home:'Winner SF Match 101', away:'Winner SF Match 102',
      homeDesc:'Winner of Semi-Final (Jul 14 – Dallas)',
      awayDesc:'Winner of Semi-Final (Jul 15 – New York/NJ)',
      utc:'2026-07-19T19:00:00Z', venue:'New York/NJ'},
  ];

  /* ── Time helpers ──────────────────────────────────────────────────────── */
  function _applyOffset(utcStr, offset) {
    const totalMin = Math.round(offset * 60);
    const d = new Date(new Date(utcStr).getTime() + totalMin * 60000);
    return d;
  }

  function _formatTime(d) {
    const h = d.getUTCHours(), m = d.getUTCMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = ((h % 12) || 12);
    return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  function _formatDate(d) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  }

  function _dateObj(d) {
    return { month: d.getUTCMonth() + 1, day: d.getUTCDate(), year: d.getUTCFullYear() };
  }

  function _getTimeSlot(d) {
    const h = d.getUTCHours();
    if (h >= 0  && h < 6)  return 'Early Morning (12AM–6AM)';
    if (h >= 6  && h < 12) return 'Morning (6AM–12PM)';
    if (h >= 12 && h < 18) return 'Afternoon (12PM–6PM)';
    return 'Evening/Night (6PM–12AM)';
  }

  function stageLabel(stage) {
    return {
      group:'Group Stage', r32:'Round of 32', r16:'Round of 16',
      qf:'Quarter-Final', sf:'Semi-Final', '3rd':'3rd Place', final:'Final'
    }[stage] || stage;
  }

  /* ── Build / rebuild derived FIXTURES ────────────────────────────────── */
  let FIXTURES = [];
  let teamMap  = {};
  let dayMap   = {};

  function _rebuildDerived() {
    FIXTURES = FIXTURES_RAW.map(f => {
      const d = _applyOffset(f.utc, _tzOffset);
      return {
        ...f,
        tzTime:    _formatTime(d),
        tzDate:    _formatDate(d),
        tzDateObj: _dateObj(d),
        slot:      _getTimeSlot(d),
        label:     stageLabel(f.stage),
        teams:     f.stage === 'group' ? [f.home, f.away] : [],
        isKO:      f.stage !== 'group',
        // keep bst* aliases so old code still works
        bstTime:   _formatTime(d),
        bstDate:   _formatDate(d),
        bstDateObj:_dateObj(d),
      };
    });

    // team map (group stage only)
    teamMap = {};
    FIXTURES.filter(f => f.stage === 'group').forEach(f => {
      [f.home, f.away].forEach(team => {
        if (!teamMap[team]) teamMap[team] = { group: f.group, matches: [] };
        teamMap[team].matches.push(f);
      });
    });

    // day map keyed YYYY-MM-DD in selected tz
    dayMap = {};
    FIXTURES.forEach(f => {
      const { year, month, day } = f.tzDateObj;
      const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      if (!dayMap[key]) dayMap[key] = [];
      dayMap[key].push(f);
    });
  }

  // initial build
  _rebuildDerived();

  const teams    = Object.keys({}).concat([]); // populated lazily via getter
  const groups   = [...new Set(FIXTURES_RAW.filter(f=>f.group).map(f=>f.group))].sort();
  const TIME_SLOTS = [
    'Early Morning (12AM–6AM)',
    'Morning (6AM–12PM)',
    'Afternoon (12PM–6PM)',
    'Evening/Night (6PM–12AM)'
  ];

  /* public teams list must be lazy because teamMap is rebuilt */
  function getTeams() { return Object.keys(teamMap).sort(); }

  return {
    get FIXTURES() { return FIXTURES; },
    get teamMap()  { return teamMap;  },
    get dayMap()   { return dayMap;   },
    get teams()    { return getTeams(); },
    FLAGS, groups, TIME_SLOTS, TIMEZONES,
    setTimezone, getTimezone, stageLabel,
  };
})();
