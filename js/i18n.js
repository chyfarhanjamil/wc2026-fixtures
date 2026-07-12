/**
 * i18n.js — Complete internationalisation module
 * Covers: UI strings, time/date formatting, numerals, AM/PM,
 *         team names, group letters — for all 8 languages.
 */
'use strict';

const I18n = (() => {

  /* ── Language metadata ─────────────────────────────────────────────────── */
  const LANGUAGES = [
    { id: 'en', label: 'English',    nativeLabel: 'English',   dir: 'ltr', flag: '🇬🇧' },
    { id: 'bn', label: 'Bangla',     nativeLabel: 'বাংলা',     dir: 'ltr', flag: '🇧🇩' },
    { id: 'hi', label: 'Hindi',      nativeLabel: 'हिन्दी',     dir: 'ltr', flag: '🇮🇳' },
    { id: 'fr', label: 'French',     nativeLabel: 'Français',  dir: 'ltr', flag: '🇫🇷' },
    { id: 'de', label: 'Deutsch',    nativeLabel: 'Deutsch',   dir: 'ltr', flag: '🇩🇪' },
    { id: 'es', label: 'Spanish',    nativeLabel: 'Español',   dir: 'ltr', flag: '🇪🇸' },
    { id: 'pt', label: 'Portuguese', nativeLabel: 'Português', dir: 'ltr', flag: '🇧🇷' },
    { id: 'ar', label: 'Arabic',     nativeLabel: 'العربية',   dir: 'rtl', flag: '🇸🇦' },
  ];

  /* ── Numeral systems ────────────────────────────────────────────────────── */
  // Languages that use non-Latin digits
  const NUMERAL_MAPS = {
    bn: ['০','১','২','৩','৪','৫','৬','৭','৮','৯'],  // Bengali
    hi: ['०','१','२','३','४','५','६','७','८','९'],    // Devanagari
    ar: ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'],  // Arabic-Indic
  };

  function convertNumerals(str, lang) {
    const map = NUMERAL_MAPS[lang];
    if (!map) return str;
    return String(str).replace(/[0-9]/g, d => map[+d]);
  }

  // Convert a number, respecting current language
  function num(n) { return convertNumerals(n, _lang); }

  /* ── AM / PM per language ──────────────────────────────────────────────── */
  const AMPM = {
    en: { am: 'AM', pm: 'PM' },
    bn: { am: 'পূর্বাহ্ণ', pm: 'অপরাহ্ণ' },
    hi: { am: 'पूर्वाह्न', pm: 'अपराह्न' },
    fr: { am: 'AM', pm: 'PM' },   // French uses 24h but we keep 12h for consistency
    de: { am: 'AM', pm: 'PM' },
    es: { am: 'a. m.', pm: 'p. m.' },
    pt: { am: 'AM', pm: 'PM' },
    ar: { am: 'ص', pm: 'م' },
  };

  /* ── Month abbreviations per language ─────────────────────────────────── */
  const MONTHS_SHORT = {
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    bn: ['জানু','ফেব','মার্চ','এপ্রি','মে','জুন','জুলাই','আগ','সেপ','অক্টো','নভে','ডিসে'],
    hi: ['जन','फर','मार्च','अप्रैल','मई','जून','जुलाई','अग','सित','अक्टू','नव','दिस'],
    fr: ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'],
    de: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
    es: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    pt: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  };

  /* Full month names per language */
  const MONTHS_FULL = {
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    bn: ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'],
    hi: ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'],
    fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    pt: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
    ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  };

  /* Short day names */
  const DAYS_SHORT = {
    en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    bn: ['রবি','সোম','মঙ্গল','বুধ','বৃহস্প','শুক্র','শনি'],
    hi: ['रवि','सोम','मंगल','बुध','गुरु','शुक्र','शनि'],
    fr: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
    de: ['So','Mo','Di','Mi','Do','Fr','Sa'],
    es: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
    pt: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
    ar: ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'],
  };

  /* ── Group letter — always stays A–L in every language (universal standard) */
  function groupLetter(letter) { return letter; }

  const _STAGE_LABEL_KEYS = {
    r32: 'bracket_label_r32', r16: 'bracket_label_r16', qf: 'bracket_label_qf',
    sf: 'bracket_label_sf', '3rd': 'bracket_label_3rd', final: 'bracket_label_final',
  };
  function stageLabel(stage) {
    const key = _STAGE_LABEL_KEYS[stage];
    return key ? t(key) : stage;
  }

  /* ── Team name translations ─────────────────────────────────────────────── */
  const TEAM_NAMES = {
    'Mexico':               { bn:'মেক্সিকো',          hi:'मेक्सिको',       fr:'Mexique',           de:'Mexiko',          es:'México',          pt:'México',          ar:'المكسيك' },
    'South Africa':         { bn:'দক্ষিণ আফ্রিকা',    hi:'दक्षिण अफ्रीका', fr:'Afrique du Sud',    de:'Südafrika',       es:'Sudáfrica',       pt:'África do Sul',   ar:'جنوب أفريقيا' },
    'Korea Republic':       { bn:'দক্ষিণ কোরিয়া',    hi:'दक्षिण कोरिया',  fr:'Corée du Sud',      de:'Südkorea',        es:'Corea del Sur',   pt:'Coreia do Sul',   ar:'كوريا الجنوبية' },
    'Czechia':              { bn:'চেকিয়া',            hi:'चेकिया',         fr:'Tchéquie',          de:'Tschechien',      es:'Chequia',         pt:'Tchéquia',        ar:'التشيك' },
    'Canada':               { bn:'কানাডা',            hi:'कनाडा',          fr:'Canada',            de:'Kanada',          es:'Canadá',          pt:'Canadá',          ar:'كندا' },
    'Bosnia & Herzegovina': { bn:'বসনিয়া ও হার্জেগোভিনা', hi:'बोस्निया और हर्जेगोविना', fr:'Bosnie-Herzégovine', de:'Bosnien-Herzegowina', es:'Bosnia y Herzegovina', pt:'Bósnia e Herzegovina', ar:'البوسنة والهرسك' },
    'USA':                  { bn:'যুক্তরাষ্ট্র',      hi:'संयुक्त राज्य',  fr:'États-Unis',        de:'USA',             es:'Estados Unidos',  pt:'Estados Unidos',  ar:'الولايات المتحدة' },
    'Paraguay':             { bn:'প্যারাগুয়ে',        hi:'पैराग्वे',       fr:'Paraguay',          de:'Paraguay',        es:'Paraguay',        pt:'Paraguai',        ar:'باراغواي' },
    'Qatar':                { bn:'কাতার',             hi:'कतर',            fr:'Qatar',             de:'Katar',           es:'Catar',           pt:'Catar',           ar:'قطر' },
    'Switzerland':          { bn:'সুইজারল্যান্ড',     hi:'स्विट्ज़रलैंड',  fr:'Suisse',            de:'Schweiz',         es:'Suiza',           pt:'Suíça',           ar:'سويسرا' },
    'Brazil':               { bn:'ব্রাজিল',           hi:'ब्राज़ील',        fr:'Brésil',            de:'Brasilien',       es:'Brasil',          pt:'Brasil',          ar:'البرازيل' },
    'Morocco':              { bn:'মরক্কো',            hi:'मोरक्को',        fr:'Maroc',             de:'Marokko',         es:'Marruecos',       pt:'Marrocos',        ar:'المغرب' },
    'Haiti':                { bn:'হাইতি',             hi:'हैती',           fr:'Haïti',             de:'Haiti',           es:'Haití',           pt:'Haiti',           ar:'هايتي' },
    'Scotland':             { bn:'স্কটল্যান্ড',       hi:'स्कॉटलैंड',      fr:'Écosse',            de:'Schottland',      es:'Escocia',         pt:'Escócia',         ar:'اسكتلندا' },
    'Australia':            { bn:'অস্ট্রেলিয়া',      hi:'ऑस्ट्रेलिया',    fr:'Australie',         de:'Australien',      es:'Australia',       pt:'Austrália',       ar:'أستراليا' },
    'Türkiye':              { bn:'তুরস্ক',            hi:'तुर्किये',        fr:'Turquie',           de:'Türkei',          es:'Turquía',         pt:'Turquia',         ar:'تركيا' },
    'Germany':              { bn:'জার্মানি',          hi:'जर्मनी',         fr:'Allemagne',         de:'Deutschland',     es:'Alemania',        pt:'Alemanha',        ar:'ألمانيا' },
    'Curaçao':              { bn:'কুরাসাও',           hi:'कुराकाओ',        fr:'Curaçao',           de:'Curaçao',         es:'Curazao',         pt:'Curaçao',         ar:'كوراساو' },
    'Netherlands':          { bn:'নেদারল্যান্ডস',     hi:'नीदरलैंड',       fr:'Pays-Bas',          de:'Niederlande',     es:'Países Bajos',    pt:'Países Baixos',   ar:'هولندا' },
    'Japan':                { bn:'জাপান',             hi:'जापान',          fr:'Japon',             de:'Japan',           es:'Japón',           pt:'Japão',           ar:'اليابان' },
    'Ivory Coast':          { bn:'আইভরি কোস্ট',      hi:'आइवरी कोस्ट',   fr:'Côte d\'Ivoire',    de:'Elfenbeinküste',  es:'Costa de Marfil', pt:'Costa do Marfim', ar:'ساحل العاج' },
    'Ecuador':              { bn:'ইকুয়েডর',          hi:'इक्वाडोर',       fr:'Équateur',          de:'Ecuador',         es:'Ecuador',         pt:'Equador',         ar:'الإكوادور' },
    'Sweden':               { bn:'সুইডেন',            hi:'स्वीडन',         fr:'Suède',             de:'Schweden',        es:'Suecia',          pt:'Suécia',          ar:'السويد' },
    'Tunisia':              { bn:'তিউনিসিয়া',        hi:'ट्यूनीशिया',     fr:'Tunisie',           de:'Tunesien',        es:'Túnez',           pt:'Tunísia',         ar:'تونس' },
    'Spain':                { bn:'স্পেন',             hi:'स्पेन',          fr:'Espagne',           de:'Spanien',         es:'España',          pt:'Espanha',         ar:'إسبانيا' },
    'Cabo Verde':           { bn:'কেপ ভার্দে',        hi:'काबो वर्दे',     fr:'Cap-Vert',          de:'Kap Verde',       es:'Cabo Verde',      pt:'Cabo Verde',      ar:'الرأس الأخضر' },
    'Belgium':              { bn:'বেলজিয়াম',         hi:'बेल्जियम',       fr:'Belgique',          de:'Belgien',         es:'Bélgica',         pt:'Bélgica',         ar:'بلجيكا' },
    'Egypt':                { bn:'মিশর',              hi:'मिस्र',          fr:'Égypte',            de:'Ägypten',         es:'Egipto',          pt:'Egito',           ar:'مصر' },
    'Saudi Arabia':         { bn:'সৌদি আরব',         hi:'सऊदी अरब',       fr:'Arabie Saoudite',   de:'Saudi-Arabien',   es:'Arabia Saudita',  pt:'Arábia Saudita',  ar:'السعودية' },
    'Uruguay':              { bn:'উরুগুয়ে',          hi:'उरुग्वे',        fr:'Uruguay',           de:'Uruguay',         es:'Uruguay',         pt:'Uruguai',         ar:'أوروغواي' },
    'Iran':                 { bn:'ইরান',              hi:'ईरान',           fr:'Iran',              de:'Iran',            es:'Irán',            pt:'Irã',             ar:'إيران' },
    'New Zealand':          { bn:'নিউজিল্যান্ড',      hi:'न्यूज़ीलैंड',    fr:'Nouvelle-Zélande',  de:'Neuseeland',      es:'Nueva Zelanda',   pt:'Nova Zelândia',   ar:'نيوزيلندا' },
    'France':               { bn:'ফ্রান্স',           hi:'फ्रांस',         fr:'France',            de:'Frankreich',      es:'Francia',         pt:'França',          ar:'فرنسا' },
    'Senegal':              { bn:'সেনেগাল',           hi:'सेनेगल',         fr:'Sénégal',           de:'Senegal',         es:'Senegal',         pt:'Senegal',         ar:'السنغال' },
    'Iraq':                 { bn:'ইরাক',              hi:'इराक',           fr:'Irak',              de:'Irak',            es:'Irak',            pt:'Iraque',          ar:'العراق' },
    'Norway':               { bn:'নরওয়ে',            hi:'नॉर्वे',         fr:'Norvège',           de:'Norwegen',        es:'Noruega',         pt:'Noruega',         ar:'النرويج' },
    'Argentina':            { bn:'আর্জেন্টিনা',      hi:'अर्जेंटीना',     fr:'Argentine',         de:'Argentinien',     es:'Argentina',       pt:'Argentina',       ar:'الأرجنتين' },
    'Algeria':              { bn:'আলজেরিয়া',         hi:'अल्जीरिया',      fr:'Algérie',           de:'Algerien',        es:'Argelia',         pt:'Argélia',         ar:'الجزائر' },
    'Austria':              { bn:'অস্ট্রিয়া',        hi:'ऑस्ट्रिया',      fr:'Autriche',          de:'Österreich',      es:'Austria',         pt:'Áustria',         ar:'النمسا' },
    'Jordan':               { bn:'জর্ডান',            hi:'जॉर्डन',         fr:'Jordanie',          de:'Jordanien',       es:'Jordania',        pt:'Jordânia',        ar:'الأردن' },
    'Portugal':             { bn:'পর্তুগাল',          hi:'पुर्तगाल',       fr:'Portugal',          de:'Portugal',        es:'Portugal',        pt:'Portugal',        ar:'البرتغال' },
    'Congo DR':             { bn:'কঙ্গো ডিআর',        hi:'कांगो डीआर',     fr:'RD Congo',          de:'DR Kongo',        es:'RD Congo',        pt:'Congo RD',        ar:'الكونغو الديمقراطية' },
    'England':              { bn:'ইংল্যান্ড',         hi:'इंग्लैंड',       fr:'Angleterre',        de:'England',         es:'Inglaterra',      pt:'Inglaterra',      ar:'إنجلترا' },
    'Croatia':              { bn:'ক্রোয়েশিয়া',      hi:'क्रोएशिया',      fr:'Croatie',           de:'Kroatien',        es:'Croacia',         pt:'Croácia',         ar:'كرواتيا' },
    'Ghana':                { bn:'ঘানা',              hi:'घाना',           fr:'Ghana',             de:'Ghana',           es:'Ghana',           pt:'Gana',            ar:'غانا' },
    'Panama':               { bn:'পানামা',            hi:'पनामा',          fr:'Panama',            de:'Panama',          es:'Panamá',          pt:'Panamá',          ar:'بنما' },
    'Uzbekistan':           { bn:'উজবেকিস্তান',      hi:'उज्बेकिस्तान',   fr:'Ouzbékistan',       de:'Usbekistan',      es:'Uzbekistán',      pt:'Uzbequistão',     ar:'أوزبكستان' },
    'Colombia':             { bn:'কলম্বিয়া',         hi:'कोलंबिया',       fr:'Colombie',          de:'Kolumbien',       es:'Colombia',        pt:'Colômbia',        ar:'كولومبيا' },
  };

  // Translate a team name to the current language (falls back to English)
  function teamName(englishName) {
    if (_lang === 'en') return englishName;
    const entry = TEAM_NAMES[englishName];
    return (entry && entry[_lang]) ? entry[_lang] : englishName;
  }

  /* ── Date / time formatting ────────────────────────────────────────────── */

  // Format a UTC Date object (already offset-shifted) into localised "Jan 11" style
  function formatDate(d) {
    const ms  = MONTHS_SHORT[_lang] || MONTHS_SHORT.en;
    const day = convertNumerals(d.getUTCDate(), _lang);
    return `${ms[d.getUTCMonth()]} ${day}`;
  }

  // Format "Jun 11" long-form for calendar header
  function formatDateLong(d) {
    const mf  = MONTHS_FULL[_lang] || MONTHS_FULL.en;
    const day = convertNumerals(d.getUTCDate(), _lang);
    return `${mf[d.getUTCMonth()]} ${day}`;
  }

  // Format time as localised 12-hour with native AM/PM and native digits
  function formatTime(d) {
    const h    = d.getUTCHours();
    const m    = d.getUTCMinutes();
    const ampm = AMPM[_lang] || AMPM.en;
    const period = h >= 12 ? ampm.pm : ampm.am;
    const h12    = (h % 12) || 12;
    const hStr   = convertNumerals(String(h12).padStart(2,'0'), _lang);
    const mStr   = convertNumerals(String(m).padStart(2,'0'), _lang);
    return `${hStr}:${mStr} ${period}`;
  }

  // Format a calendar month+year heading like "JUNE 2026" → "জুন ২০২৬"
  function formatCalendarHeading(monthIndex, year) {
    const mf   = MONTHS_FULL[_lang] || MONTHS_FULL.en;
    const name = mf[monthIndex].toUpperCase();
    const yr   = convertNumerals(year, _lang);
    return `${name} ${yr}`;
  }

  // Short day names array for current language
  function days()        { return DAYS_SHORT[_lang]  || DAYS_SHORT.en;  }
  function months()      { return MONTHS_FULL[_lang] || MONTHS_FULL.en; }
  function monthsShort() { return MONTHS_SHORT[_lang]|| MONTHS_SHORT.en;}

  /* ── Time slot labels ──────────────────────────────────────────────────── */
  // Returns translated label for a slot key like 'slot_early'
  function slotLabel(key) { return t(key); }

  function timeSlots() {
    return ['slot_early','slot_morning','slot_afternoon','slot_evening'].map(k => t(k));
  }

  /* ── Translation table ─────────────────────────────────────────────────── */
  const STRINGS = {

    header_title: {
      en:'⚽ FIFA WORLD CUP 2026', bn:'⚽ ফিফা বিশ্বকাপ ২০২৬', hi:'⚽ फीफा विश्व कप 2026',
      fr:'⚽ FIFA COUPE DU MONDE 2026', de:'⚽ FIFA WELTMEISTERSCHAFT 2026',
      es:'⚽ FIFA COPA MUNDIAL 2026', pt:'⚽ FIFA COPA DO MUNDO 2026', ar:'⚽ كأس العالم فيفا 2026',
    },
    header_sub: {
      en:'All 104 Matches · Group Stage to Final · {tz}',
      bn:'সকল ১০৪টি ম্যাচ · গ্রুপ পর্যায় থেকে ফাইনাল · {tz}',
      hi:'सभी 104 मैच · ग्रुप स्टेज से फाइनल · {tz}',
      fr:'104 matchs · Phase de groupes à la Finale · {tz}',
      de:'Alle 104 Spiele · Gruppenphase bis Finale · {tz}',
      es:'104 partidos · Fase de grupos hasta la Final · {tz}',
      pt:'Todos os 104 jogos · Fase de grupos até a Final · {tz}',
      ar:'جميع ١٠٤ مباريات · من دور المجموعات إلى النهائي · {tz}',
    },
    search_placeholder: {
      en:'Search team (e.g. Brazil, France, USA…)',
      bn:'দল খুঁজুন (যেমন: ব্রাজিল, ফ্রান্স, আমেরিকা…)',
      hi:'टीम खोजें (जैसे: ब्राज़ील, फ्रांस, अमेरिका…)',
      fr:'Rechercher une équipe (ex. Brésil, France, USA…)',
      de:'Team suchen (z.B. Brasilien, Frankreich, USA…)',
      es:'Buscar equipo (ej. Brasil, Francia, EE.UU.…)',
      pt:'Buscar equipe (ex. Brasil, França, EUA…)',
      ar:'ابحث عن فريق (مثل: البرازيل، فرنسا…)',
    },
    lang_label: {
      en:'Language', bn:'ভাষা', hi:'भाषा', fr:'Langue', de:'Sprache',
      es:'Idioma', pt:'Idioma', ar:'اللغة',
    },
    tz_label: {
      en:'Timezone', bn:'সময় অঞ্চল', hi:'समय क्षेत्र',
      fr:'Fuseau horaire', de:'Zeitzone', es:'Zona horaria', pt:'Fuso horário', ar:'المنطقة الزمنية',
    },
    mode_group:    { en:'By Group',  bn:'গ্রুপভিত্তিক',  hi:'ग्रुप अनुसार', fr:'Par groupe',  de:'Nach Gruppe', es:'Por grupo',   pt:'Por grupo',   ar:'حسب المجموعة' },
    mode_time:     { en:'By Time',   bn:'সময়ভিত্তিক',   hi:'समय अनुसार',   fr:'Par horaire', de:'Nach Zeit',   es:'Por horario', pt:'Por horário', ar:'حسب الوقت'    },
    mode_home:     { en:'Home',      bn:'হোম',           hi:'होम',          fr:'Accueil',     de:'Startseite',  es:'Inicio',      pt:'Início',      ar:'الرئيسية'     },
    mode_calendar: { en:'Calendar',  bn:'ক্যালেন্ডার',  hi:'कैलेंडर',      fr:'Calendrier',  de:'Kalender',    es:'Calendario',  pt:'Calendário',  ar:'التقويم'      },
    mode_knockout: { en:'Knockout',  bn:'নকআউট',        hi:'नॉकआउट',       fr:'Élimination', de:'KO-Runde',    es:'Eliminatoria',pt:'Eliminatória',ar:'الإقصاء'      },

    label_today:     { en:'Today',     bn:'আজ',        hi:'आज',       fr:"Aujourd'hui", de:'Heute',    es:'Hoy',      pt:'Hoje',     ar:'اليوم'   },
    label_yesterday: { en:'Yesterday', bn:'গতকাল',      hi:'कल',       fr:'Hier',        de:'Gestern',  es:'Ayer',     pt:'Ontem',    ar:'أمس'     },
    label_tomorrow:  { en:'Tomorrow',  bn:'আগামীকাল',   hi:'कल',       fr:'Demain',      de:'Morgen',   es:'Mañana',   pt:'Amanhã',   ar:'غدًا'    },
    today_matches_title:    { en:"Today's Matches",      bn:'আজকের ম্যাচ',       hi:'आज के मैच',      fr:"Matchs d'aujourd'hui", de:'Heutige Spiele',   es:'Partidos de hoy',    pt:'Jogos de hoje',     ar:'مباريات اليوم' },
    yesterday_matches_title:{ en:"Yesterday's Results",   bn:'গতকালের ফলাফল',    hi:'कल के परिणाम',   fr:"Résultats d'hier",    de:'Gestrige Ergebnisse', es:'Resultados de ayer', pt:'Resultados de ontem',ar:'نتائج الأمس' },
    no_matches_today:       { en:'No matches scheduled today.', bn:'আজ কোনো ম্যাচ নেই।', hi:'आज कोई मैच नहीं।', fr:"Aucun match aujourd'hui.", de:'Heute keine Spiele.', es:'Sin partidos hoy.', pt:'Sem jogos hoje.', ar:'لا مباريات اليوم.' },
    no_matches_yesterday:   { en:'No matches were played yesterday.', bn:'গতকাল কোনো ম্যাচ হয়নি।', hi:'कल कोई मैच नहीं हुआ।', fr:"Aucun match hier.", de:'Gestern keine Spiele.', es:'Sin partidos ayer.', pt:'Sem jogos ontem.', ar:'لا مباريات أمس.' },
    no_matches_tomorrow:    { en:'No matches scheduled tomorrow.', bn:'আগামীকাল কোনো ম্যাচ নেই।', hi:'कल कोई मैच नहीं है।', fr:"Aucun match demain.", de:'Morgen keine Spiele.', es:'Sin partidos mañana.', pt:'Sem jogos amanhã.', ar:'لا مباريات غدًا.' },
    score_pending_live: { en:'Score updating…', bn:'স্কোর আপডেট হচ্ছে…', hi:'स्कोर अपडेट हो रहा है…', fr:'Score en cours de mise à jour…', de:'Ergebnis wird aktualisiert…', es:'Actualizando marcador…', pt:'Atualizando o placar…', ar:'جارٍ تحديث النتيجة…' },
    group_stage_matches_title: { en:'Group Stage Matches', bn:'গ্রুপ পর্যায়ের ম্যাচ', hi:'ग्रुप स्टेज मैच', fr:'Matchs de la phase de groupes', de:'Spiele der Gruppenphase', es:'Partidos de fase de grupos', pt:'Jogos da fase de grupos', ar:'مباريات دور المجموعات' },
    search_no_matches: { en:'No matches found for "{q}".', bn:'"{q}" এর সাথে কোনো ম্যাচ পাওয়া যায়নি।', hi:'"{q}" से कोई मैच नहीं मिला।', fr:'Aucun match pour «{q}».', de:'Keine Spiele für „{q}".', es:'Sin partidos para "{q}".', pt:'Nenhum jogo para "{q}".', ar:'لا مباريات لـ "{q}".' },


    all_groups:    { en:'All Groups',bn:'সব গ্রুপ',       hi:'सभी ग्रुप',    fr:'Tous les groupes', de:'Alle Gruppen', es:'Todos los grupos', pt:'Todos os grupos', ar:'جميع المجموعات' },
    group_prefix:  { en:'Group',     bn:'গ্রুপ',          hi:'ग्रुप',        fr:'Groupe',           de:'Gruppe',       es:'Grupo',            pt:'Grupo',           ar:'مجموعة'          },
    all_times:     { en:'All Times', bn:'সব সময়',        hi:'सभी समय',      fr:'Tous les horaires', de:'Alle Zeiten', es:'Todos los horarios',pt:'Todos os horários',ar:'جميع الأوقات' },

    slot_early:    { en:'Early Morning (12AM–6AM)', bn:'ভোররাত (রাত ১২টা–ভোর ৬টা)', hi:'तड़के (12AM–6AM)', fr:'Petit matin (0h–6h)',       de:'Früh (0–6 Uhr)',         es:'Madrugada (0–6h)',   pt:'Madrugada (0h–6h)',  ar:'فجراً (12ص–6ص)'       },
    slot_morning:  { en:'Morning (6AM–12PM)',       bn:'সকাল (ভোর ৬টা–দুপুর ১২টা)', hi:'सुबह (6AM–12PM)',  fr:'Matin (6h–12h)',            de:'Morgen (6–12 Uhr)',      es:'Mañana (6h–12h)',    pt:'Manhã (6h–12h)',     ar:'صباحاً (6ص–12م)'     },
    slot_afternoon:{ en:'Afternoon (12PM–6PM)',     bn:'বিকেল (দুপুর ১২টা–সন্ধ্যা ৬টা)', hi:'दोपहर (12PM–6PM)',fr:'Après-midi (12h–18h)',   de:'Nachmittag (12–18 Uhr)', es:'Tarde (12h–18h)',    pt:'Tarde (12h–18h)',    ar:'بعد الظهر (12م–6م)'  },
    slot_evening:  { en:'Evening/Night (6PM–12AM)', bn:'সন্ধ্যা/রাত (সন্ধ্যা ৬টা–রাত ১২টা)', hi:'शाम/रात (6PM–12AM)',fr:'Soir/Nuit (18h–0h)',  de:'Abend/Nacht (18–0 Uhr)', es:'Tarde/Noche (18h–0h)',pt:'Noite (18h–0h)',    ar:'مساءً/ليلاً (6م–12م)' },

    matches_count: { en:'{n} matches', bn:'{n}টি ম্যাচ', hi:'{n} मैच', fr:'{n} matchs', de:'{n} Spiele', es:'{n} partidos', pt:'{n} jogos', ar:'{n} مباريات' },
    vs:            { en:'vs', bn:'বনাম', hi:'बनाम', fr:'c.', de:'vs', es:'vs', pt:'vs', ar:'ضد' },

    no_team_found:   { en:'No team found matching "{q}".', bn:'"{q}" এর সাথে কোনো দল পাওয়া যায়নি।', hi:'"{q}" से कोई टीम नहीं मिली।', fr:'Aucune équipe pour «{q}».', de:'Kein Team für „{q}".', es:'Sin equipo para "{q}".', pt:'Nenhuma equipe para "{q}".', ar:'لا فرق تطابق "{q}".' },
    no_teams_filter: { en:'No teams match current filters.', bn:'বর্তমান ফিল্টারে কোনো দল নেই।', hi:'फ़िल्टर से कोई टीम नहीं।', fr:'Aucune équipe.', de:'Keine Teams.', es:'Sin equipos.', pt:'Sem equipes.', ar:'لا فرق.' },
    no_slot_matches: { en:'No {slot} matches for {team}. They play in: {slots}.', bn:'{team} এর {slot} সময়ে কোনো ম্যাচ নেই। তারা খেলে: {slots}।', hi:'{team} का {slot} में कोई मैच नहीं: {slots}।', fr:'Pas de match {slot} pour {team}: {slots}.', de:'Keine Spiele {slot} für {team}: {slots}.', es:'Sin partidos {slot} para {team}: {slots}.', pt:'Sem jogos {slot} para {team}: {slots}.', ar:'لا مباريات {slot} لـ {team}: {slots}.' },

    cal_match:       { en:'{n} match',   bn:'{n}টি ম্যাচ', hi:'{n} मैच', fr:'{n} match',  de:'{n} Spiel',  es:'{n} partido', pt:'{n} jogo',  ar:'{n} مباراة'  },
    cal_matches:     { en:'{n} matches', bn:'{n}টি ম্যাচ', hi:'{n} मैच', fr:'{n} matchs', de:'{n} Spiele', es:'{n} partidos',pt:'{n} jogos', ar:'{n} مباريات' },
    cal_day_header:  { en:'All matches on {date}', bn:'{date} তারিখের সকল ম্যাচ', hi:'{date} के सभी मैच', fr:'Tous les matchs du {date}', de:'Alle Spiele am {date}', es:'Todos los partidos del {date}', pt:'Todos os jogos em {date}', ar:'جميع المباريات في {date}' },
    cal_day_header_q:{ en:'Matches on {date} for "{q}"', bn:'{date} তারিখে "{q}" সম্পর্কিত', hi:'{date} को "{q}" के मैच', fr:'Matchs du {date} pour «{q}»', de:'Spiele am {date} für „{q}"', es:'Partidos del {date} para "{q}"', pt:'Jogos em {date} para "{q}"', ar:'مباريات {date} لـ "{q}"' },
    cal_no_match:    { en:'No matches for "{q}" on {date}', bn:'{date} তারিখে "{q}" এর ম্যাচ নেই', hi:'{date} को "{q}" के मैच नहीं', fr:'Pas de match pour «{q}» le {date}', de:'Keine Spiele für „{q}" am {date}', es:'Sin partidos para "{q}" el {date}', pt:'Sem jogos para "{q}" em {date}', ar:'لا مباريات لـ "{q}" في {date}' },
    cal_other_matches:{ en:'Other matches for this search:', bn:'এই অনুসন্ধানের অন্য ম্যাচ:', hi:'इस खोज के अन्य मैच:', fr:'Autres matchs:', de:'Weitere Spiele:', es:'Otros partidos:', pt:'Outros jogos:', ar:'مباريات أخرى:' },
    cal_no_results:  { en:'No matches found.', bn:'কোনো ম্যাচ পাওয়া যায়নি।', hi:'कोई मैच नहीं मिला।', fr:'Aucun match.', de:'Keine Spiele.', es:'Sin partidos.', pt:'Sem jogos.', ar:'لا مباريات.' },

    bracket_label_r32:   { en:'Round of 32',    bn:'রাউন্ড অব ৩২',      hi:'राउंड ऑफ 32',     fr:'Huitièmes',           de:'Runde der 32',    es:'Ronda de 32',       pt:'Rodada de 32',   ar:'دور الـ 32'      },
    bracket_label_r16:   { en:'Round of 16',    bn:'রাউন্ড অব ১৬',      hi:'राउंड ऑफ 16',     fr:'Seizièmes',           de:'Runde der 16',    es:'Ronda de 16',       pt:'Rodada de 16',   ar:'دور الـ 16'      },
    bracket_label_qf:    { en:'Quarter-Finals', bn:'কোয়ার্টার ফাইনাল', hi:'क्वार्टर-फाइनल', fr:'Quarts de finale',    de:'Viertelfinale',   es:'Cuartos de final',  pt:'Quartas de final',ar:'ربع النهائي'    },
    bracket_label_sf:    { en:'Semi-Finals',    bn:'সেমি-ফাইনাল',       hi:'सेमी-फाइनल',      fr:'Demi-finales',        de:'Halbfinale',      es:'Semifinales',       pt:'Semifinais',     ar:'نصف النهائي'    },
    bracket_label_3rd:   { en:'3rd Place',      bn:'তৃতীয় স্থান',      hi:'तीसरा स्थान',     fr:'3ème place',          de:'Platz 3',         es:'3.er lugar',        pt:'3.º lugar',      ar:'المركز الثالث'  },
    bracket_label_final: { en:'Final',          bn:'ফাইনাল',            hi:'फाइनल',           fr:'Finale',              de:'Finale',          es:'Final',             pt:'Final',          ar:'النهائي'         },
    bracket_legend:      { en:'Hover any team slot to see qualifying group info.', bn:'গ্রুপ তথ্য দেখতে যেকোনো স্লটে হোভার করুন।', hi:'ग्रुप जानकारी के लिए होवर करें।', fr:'Survolez un slot pour plus d\'infos.', de:'Hover für Gruppeninfos.', es:'Pase el cursor para ver el grupo.', pt:'Passe o cursor para ver o grupo.', ar:'مرر المؤشر لمعرفة المجموعة.' },
    knockout_bracket:    { en:'🏆 Knockout Bracket', bn:'🏆 নকআউট ব্র্যাকেট', hi:'🏆 नॉकआउट ब्रैकेट', fr:'🏆 Tableau K.O.', de:'🏆 K.O.-Tableau', es:'🏆 Cuadro Eliminatorio', pt:'🏆 Chave Eliminatória', ar:'🏆 مرحلة الإقصاء' },

    stage_group: { en:'Group Stage',   bn:'গ্রুপ পর্যায়',       hi:'ग्रुप स्टेज',       fr:'Phase de groupes', de:'Gruppenphase', es:'Fase de grupos',  pt:'Fase de grupos', ar:'دور المجموعات' },
    stage_r32:   { en:'Round of 32',   bn:'রাউন্ড অব ৩২',       hi:'राउंड ऑफ 32',       fr:'Huitièmes',        de:'Runde der 32',  es:'Ronda de 32',     pt:'Rodada de 32',   ar:'دور الـ 32'     },
    stage_r16:   { en:'Round of 16',   bn:'রাউন্ড অব ১৬',       hi:'राउंड ऑफ 16',       fr:'Seizièmes',        de:'Runde der 16',  es:'Ronda de 16',     pt:'Rodada de 16',   ar:'دور الـ 16'     },
    stage_qf:    { en:'Quarter-Final', bn:'কোয়ার্টার ফাইনাল',  hi:'क्वार्टर-फाइनल',   fr:'Quart de finale',  de:'Viertelfinale', es:'Cuarto de final', pt:'Quarta de final',ar:'ربع النهائي'   },
    stage_sf:    { en:'Semi-Final',    bn:'সেমি-ফাইনাল',        hi:'सेमी-फाइनल',        fr:'Demi-finale',      de:'Halbfinale',    es:'Semifinal',       pt:'Semifinal',      ar:'نصف النهائي'   },
    stage_3rd:   { en:'3rd Place',     bn:'তৃতীয় স্থান',       hi:'तीसरा स्थान',       fr:'3ème place',       de:'Platz 3',       es:'3.er lugar',      pt:'3.º lugar',      ar:'المركز الثالث' },
    stage_final: { en:'Final',         bn:'ফাইনাল',             hi:'फाइनल',             fr:'Finale',           de:'Finale',        es:'Final',           pt:'Final',          ar:'النهائي'        },

    standings_title:   { en:'📊 Group Standings', bn:'📊 গ্রুপ পয়েন্ট তালিকা', hi:'📊 ग्रुप अंक तालिका', fr:'📊 Classements',   de:'📊 Tabelle',    es:'📊 Clasificación', pt:'📊 Classificação', ar:'📊 الترتيب' },
    standings_col_p:   { en:'P',   bn:'খে',  hi:'खेले', fr:'J',   de:'Sp',  es:'PJ', pt:'PJ', ar:'ل'      },
    standings_col_w:   { en:'W',   bn:'জয়', hi:'जीत',  fr:'G',   de:'S',   es:'G',  pt:'V',  ar:'ف'      },
    standings_col_d:   { en:'D',   bn:'ড্র', hi:'ड्रॉ', fr:'N',   de:'U',   es:'E',  pt:'E',  ar:'ت'      },
    standings_col_l:   { en:'L',   bn:'হা',  hi:'हार',  fr:'P',   de:'N',   es:'P',  pt:'D',  ar:'خ'      },
    standings_col_gd:  { en:'GD',  bn:'গোপা',hi:'गोअं', fr:'DA',  de:'TD',  es:'DG', pt:'SG', ar:'فارق'   },
    standings_col_pts: { en:'Pts', bn:'পয়', hi:'अंक',  fr:'Pts', de:'Pkt', es:'Pts',pt:'Pts',ar:'نقاط'  },

    export_btn:         { en:'📲 Add to iPhone / Google Calendar', bn:'📲 ক্যালেন্ডারে যোগ করুন', hi:'📲 कैलेंडर में जोड़ें', fr:'📲 Ajouter au calendrier', de:'📲 Zum Kalender', es:'📲 Añadir al calendario', pt:'📲 Adicionar à agenda', ar:'📲 إضافة إلى التقويم' },
    export_title:       { en:'📲 Export to Calendar', bn:'📲 ক্যালেন্ডারে এক্সপোর্ট', hi:'📲 कैलेंडर में एक्सपोर्ट', fr:'📲 Exporter vers le calendrier', de:'📲 In Kalender exportieren', es:'📲 Exportar al calendario', pt:'📲 Exportar para o calendário', ar:'📲 تصدير إلى التقويم' },
    export_sub:         { en:'Choose teams to add their group-stage schedule to your calendar app.', bn:'গ্রুপ পর্যায়ের সময়সূচি যোগ করতে দল বেছে নিন।', hi:'ग्रुप स्टेज शेड्यूल जोड़ने के लिए टीम चुनें।', fr:'Choisissez des équipes pour ajouter leur calendrier.', de:'Teams für Gruppenspielplan wählen.', es:'Elija equipos para agregar su calendario.', pt:'Escolha equipes para adicionar à agenda.', ar:'اختر الفرق لإضافة جدول دور المجموعات.' },
    select_teams_label: { en:'Select Teams', bn:'দল বেছে নিন', hi:'टीम चुनें', fr:'Sélectionner les équipes', de:'Teams auswählen', es:'Seleccionar equipos', pt:'Selecionar equipes', ar:'اختر الفرق' },
    select_all:         { en:'Select All',   bn:'সব নির্বাচন', hi:'सभी चुनें', fr:'Tout sélectionner',       de:'Alle auswählen', es:'Seleccionar todo',     pt:'Selecionar tudo',   ar:'اختر الكل'  },
    deselect_all:       { en:'Deselect All', bn:'সব বাতিল',    hi:'सभी हटाएं', fr:'Tout désélectionner',     de:'Alle abwählen',  es:'Deseleccionar todo',   pt:'Desmarcar tudo',    ar:'إلغاء الكل' },
    download_ics:       { en:'⬇️ Download .ics', bn:'⬇️ .ics ডাউনলোড', hi:'⬇️ .ics डाउनलोड', fr:'⬇️ Télécharger .ics', de:'⬇️ .ics laden', es:'⬇️ Descargar .ics', pt:'⬇️ Baixar .ics', ar:'⬇️ تنزيل .ics' },
    downloaded:         { en:'✅ Downloaded!', bn:'✅ হয়েছে!', hi:'✅ हो गया!', fr:'✅ Téléchargé!', de:'✅ Geladen!', es:'✅ ¡Descargado!', pt:'✅ Baixado!', ar:'✅ تم!' },
    download_all:       { en:'⬇️ Download All Matches .ics', bn:'⬇️ সব ম্যাচ .ics', hi:'⬇️ सभी मैच .ics', fr:'⬇️ Tous les matchs .ics', de:'⬇️ Alle Spiele .ics', es:'⬇️ Todos los partidos .ics', pt:'⬇️ Todos os jogos .ics', ar:'⬇️ جميع المباريات .ics' },
    download_n_teams:   { en:'⬇️ Download {n} Teams .ics', bn:'⬇️ {n}টি দল .ics', hi:'⬇️ {n} टीम .ics', fr:'⬇️ {n} équipes .ics', de:'⬇️ {n} Teams .ics', es:'⬇️ {n} equipos .ics', pt:'⬇️ {n} equipes .ics', ar:'⬇️ {n} فرق .ics' },
    download_1_team:    { en:'⬇️ Download {team} .ics', bn:'⬇️ {team} .ics', hi:'⬇️ {team} .ics', fr:'⬇️ {team} .ics', de:'⬇️ {team} .ics', es:'⬇️ {team} .ics', pt:'⬇️ {team} .ics', ar:'⬇️ {team} .ics' },
    ics_note_iphone:    { en:'<strong>iPhone:</strong> Open the .ics → tap "Add All". Group matches + all possible knockout matches are included. Knockout events marked [TBD] auto-update once teams are confirmed.', bn:'<strong>আইফোন:</strong> .ics ফাইল খুলুন → "Add All" চাপুন।', hi:'<strong>iPhone:</strong> .ics खोलें → "Add All" टैप करें।', fr:'<strong>iPhone :</strong> Ouvrez le .ics → «Tout ajouter».', de:'<strong>iPhone:</strong> .ics öffnen → „Alle hinzufügen".', es:'<strong>iPhone:</strong> Abra el .ics → "Agregar todo".', pt:'<strong>iPhone:</strong> Abra o .ics → "Adicionar tudo".', ar:'<strong>iPhone:</strong> افتح .ics → "إضافة الكل".' },
    ics_note_google:    { en:'<strong>Google:</strong> calendar.google.com → Settings → Import. Re-import the file after each round to update confirmed knockout teams.', bn:'<strong>গুগল:</strong> calendar.google.com → সেটিংস → ইমপোর্ট।', hi:'<strong>Google:</strong> calendar.google.com → Settings → Import.', fr:'<strong>Google :</strong> calendar.google.com → Paramètres → Importer.', de:'<strong>Google:</strong> calendar.google.com → Einstellungen → Importieren.', es:'<strong>Google:</strong> calendar.google.com → Ajustes → Importar.', pt:'<strong>Google:</strong> calendar.google.com → Configurações → Importar.', ar:'<strong>Google:</strong> calendar.google.com → الإعدادات → استيراد.' },


    /* ── Stats page ─────────────────────────────────────────────────────── */
    mode_stats:         { en:'Stats',            bn:'পরিসংখ্যান',   hi:'आँकड़े',       fr:'Stats',        de:'Statistik',    es:'Estadísticas', pt:'Estatísticas', ar:'إحصائيات' },
    stats_title:        { en:'Player Statistics',bn:'খেলোয়াড় পরিসংখ্যান',hi:'खिलाड़ी आँकड़े',fr:'Statistiques des joueurs',de:'Spielerstatistiken',es:'Estadísticas de jugadores',pt:'Estatísticas dos jogadores',ar:'إحصائيات اللاعبين' },
    stats_search:       { en:'Search player or team…',bn:'খেলোয়াড় বা দল খুঁজুন…',hi:'खिलाड़ी या टीम खोजें…',fr:'Rechercher un joueur ou équipe…',de:'Spieler oder Team suchen…',es:'Buscar jugador o equipo…',pt:'Buscar jogador ou equipe…',ar:'ابحث عن لاعب أو فريق…' },
    stats_tab_goals:    { en:'Goals',            bn:'গোল',          hi:'गोल',          fr:'Buts',         de:'Tore',         es:'Goles',        pt:'Gols',         ar:'أهداف' },
    stats_tab_assists:  { en:'Assists',          bn:'অ্যাসিস্ট',   hi:'असिस्ट',       fr:'Passes décisives',de:'Vorlagen',   es:'Asistencias',  pt:'Assistências', ar:'تمريرات حاسمة' },
    stats_tab_gk:       { en:'Goalkeepers',      bn:'গোলকিপার',    hi:'गोलकीपर',      fr:'Gardiens',     de:'Torhüter',     es:'Porteros',     pt:'Goleiros',     ar:'حراس المرمى' },
    stats_tab_cards:    { en:'Cards',            bn:'কার্ড',        hi:'कार्ड',         fr:'Cartons',      de:'Karten',       es:'Tarjetas',     pt:'Cartões',      ar:'بطاقات' },
    stats_tab_teams:    { en:'Teams',            bn:'দল',          hi:'टीम',           fr:'Équipes',      de:'Teams',        es:'Equipos',      pt:'Equipes',      ar:'فرق' },
    stats_goals:        { en:'G',               bn:'গো',          hi:'गो',            fr:'B',            de:'T',            es:'G',            pt:'G',            ar:'أه' },
    stats_assists:      { en:'A',               bn:'অ্যা',        hi:'अस',            fr:'PD',           de:'V',            es:'As',           pt:'As',           ar:'تم' },
    stats_matches:      { en:'MP',              bn:'ম্যাচ',       hi:'मैच',           fr:'MJ',           de:'Sp',           es:'PJ',           pt:'PJ',           ar:'م' },
    stats_goals_long:   { en:'Goals',           bn:'গোল',         hi:'गोल',           fr:'Buts',         de:'Tore',         es:'Goles',        pt:'Gols',         ar:'أهداف' },
    stats_assists_long: { en:'Assists',         bn:'অ্যাসিস্ট',  hi:'असिस्ट',        fr:'Passes',       de:'Vorlagen',     es:'Asistencias',  pt:'Assistências', ar:'تمريرات' },
    stats_pens:         { en:'Pens',            bn:'পেনাল্টি',    hi:'पेनल्टी',       fr:'Pen.',          de:'Elf.',         es:'Pen.',         pt:'Pen.',         ar:'ركلات' },
    stats_og:           { en:'OG',              bn:'আত্মঘাতী',   hi:'OG',            fr:'CSC',          de:'ET',           es:'PP',           pt:'CG',           ar:'أه.ذاتية' },
    stats_clean_sheets: { en:'Clean Sheets',    bn:'ক্লিন শিট',  hi:'क्लीन शीट',     fr:'Clean Sheets', de:'Zu-Null',      es:'Portería a cero',pt:'Jogos sem gol',ar:'شباك نظيفة' },
    stats_saves:        { en:'Saves',           bn:'সেভ',         hi:'सेव',           fr:'Arrêts',       de:'Paraden',      es:'Paradas',      pt:'Defesas',      ar:'تصديات' },
    stats_save_pct:     { en:'Save %',          bn:'সেভ %',       hi:'सेव %',         fr:'% Arrêts',     de:'Parade %',     es:'% Paradas',    pt:'% Defesas',    ar:'% التصديات' },
    stats_yellow:       { en:'Yellow',          bn:'হলুদ',        hi:'पीला',          fr:'Jaunes',       de:'Gelb',         es:'Amarillas',    pt:'Amarelos',     ar:'صفراء' },
    stats_red:          { en:'Red',             bn:'লাল',         hi:'लाल',           fr:'Rouges',       de:'Rot',          es:'Rojas',        pt:'Vermelhos',    ar:'حمراء' },
    stats_team_goals:   { en:'Goals For',       bn:'গোল করেছে',  hi:'किए गोल',       fr:'Buts pour',    de:'Tore',         es:'Goles a favor',pt:'Gols marcados',ar:'أهداف مسجلة' },
    stats_team_ga:      { en:'Goals Against',   bn:'গোল খেয়েছে', hi:'खाए गोल',      fr:'Buts contre',  de:'Gegentore',    es:'Goles en contra',pt:'Gols sofridos',ar:'أهداف مستقبلة' },
    stats_team_gd:      { en:'Goal Diff',       bn:'গোল পার্থক্য',hi:'गोल अंतर',    fr:'Diff.',         de:'Tordiff.',     es:'Diferencia',   pt:'Saldo',        ar:'فارق الأهداف' },
    stats_possession:   { en:'Possession',      bn:'বল দখল',      hi:'गेंद नियंत्रण', fr:'Possession',  de:'Ballbesitz',   es:'Posesión',     pt:'Posse de bola',ar:'حيازة الكرة' },
    stats_top_scorer:   { en:'Top Scorer',      bn:'শীর্ষ গোলদাতা',hi:'शीर्ष स्कोरर',fr:'Meilleur buteur',de:'Torschützenkönig',es:'Máximo goleador',pt:'Artilheiro',ar:'هداف البطولة' },
    stats_show_more:    { en:'Show more',        bn:'আরো দেখুন',  hi:'और देखें',      fr:'Voir plus',    de:'Mehr zeigen',  es:'Ver más',      pt:'Ver mais',     ar:'عرض المزيد' },
    stats_show_less:    { en:'Show less',        bn:'কম দেখুন',   hi:'कम देखें',      fr:'Voir moins',   de:'Weniger',      es:'Ver menos',    pt:'Ver menos',    ar:'عرض أقل' },
    stats_no_data:      { en:'No data yet — stats update once matches are played.',bn:'এখনো তথ্য নেই।',hi:'डेटा नहीं।',fr:'Pas encore de données.',de:'Noch keine Daten.',es:'Sin datos aún.',pt:'Sem dados ainda.',ar:'لا بيانات بعد.' },
    stats_filter_all:   { en:'All Teams',        bn:'সব দল',      hi:'सभी टीम',       fr:'Toutes équipes',de:'Alle Teams',  es:'Todos los equipos',pt:'Todas equipes',ar:'جميع الفرق' },
    stats_rank:         { en:'#',               bn:'#',           hi:'#',             fr:'#',            de:'#',            es:'#',            pt:'#',            ar:'#' },
    stats_player:       { en:'Player',          bn:'খেলোয়াড়',  hi:'खिलाड़ी',       fr:'Joueur',       de:'Spieler',      es:'Jugador',      pt:'Jogador',      ar:'لاعب' },
    stats_team:         { en:'Team',            bn:'দল',          hi:'टीम',           fr:'Équipe',       de:'Team',         es:'Equipo',       pt:'Equipe',       ar:'فريق' },
    stats_nation:       { en:'Nation',          bn:'দেশ',         hi:'देश',           fr:'Nation',       de:'Nation',       es:'Nación',       pt:'Nação',        ar:'بلد' },
    stats_cs:           { en:'CS',              bn:'ক্লিন',       hi:'CS',            fr:'CS',           de:'ZN',           es:'PPC',          pt:'SPG',          ar:'شبكة' },
    stats_live_note:    { en:'Stats update live as matches are played. Add your API key in js/live.js for real data.',bn:'ম্যাচ অনুযায়ী আপডেট হয়।',hi:'मैच के साथ अपडेट।',fr:'Mis à jour en direct.',de:'Wird live aktualisiert.',es:'Se actualiza en vivo.',pt:'Atualiza ao vivo.',ar:'يُحدَّث مباشرة.' },
    live_badge:{ en:'LIVE', bn:'লাইভ', hi:'लाइव', fr:'EN DIRECT', de:'LIVE', es:'EN VIVO', pt:'AO VIVO', ar:'مباشر' },
    live_ht:   { en:'HT',   bn:'বিরতি',hi:'HT',   fr:'MT',        de:'HZ',   es:'ET',      pt:'INT',     ar:'استراحة'},
    live_ft:   { en:'FT',   bn:'সমাপ্ত',hi:'FT',  fr:'FT',        de:'ET',   es:'FT',      pt:'FT',      ar:'انتهت'  },
  };

  /* ── State ──────────────────────────────────────────────────────────────── */
  let _lang = localStorage.getItem('wc2026_lang') || 'en';

  /* ── Core translate ─────────────────────────────────────────────────────── */
  function t(key, vars = {}) {
    const entry = STRINGS[key];
    if (!entry) { console.warn(`[i18n] Missing key: ${key}`); return key; }
    const raw = entry[_lang] || entry['en'] || key;
    let str = raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
    // Convert numerals in substituted values if needed
    if (vars && Object.keys(vars).some(k => /^\d+$/.test(String(vars[k])))) {
      // already substituted above; caller should pass pre-converted nums when needed
    }
    return str;
  }

  /* ── Language switch ─────────────────────────────────────────────────── */
  function setLang(id) {
    const lang = LANGUAGES.find(l => l.id === id);
    if (!lang) return;
    _lang = id;
    localStorage.setItem('wc2026_lang', id);
    document.documentElement.setAttribute('dir', lang.dir);
    document.documentElement.setAttribute('lang', id);
    // Rebuild fixtures with new formatting, then re-render everything
    if (typeof WC2026 !== 'undefined') WC2026.rebuildForLang();
    if (typeof App    !== 'undefined') App.rerenderAll();
  }

  function getLang() { return _lang; }
  function getDir()  { return LANGUAGES.find(l => l.id === _lang)?.dir || 'ltr'; }

  /* ── Static DOM strings (data-i18n) ─────────────────────────────────── */
  function _applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n, attr = el.dataset.i18nAttr;
      const val = t(key);
      if (attr) el.setAttribute(attr, val); else el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
  }

  /* ── Build language dropdown (matches timezone selector style) ────────── */
  function buildSwitcher(unusedId) {
    // No-op: language is now a <select> built in buildDropdown(), called by App.init()
  }

  function buildDropdown(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    LANGUAGES.forEach(lang => {
      const opt = document.createElement('option');
      opt.value = lang.id;
      opt.textContent = lang.flag + '  ' + lang.nativeLabel;
      if (lang.id === _lang) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = () => setLang(sel.value);
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  function init() {
    const lang = LANGUAGES.find(l => l.id === _lang) || LANGUAGES[0];
    document.documentElement.setAttribute('dir', lang.dir);
    document.documentElement.setAttribute('lang', _lang);
  }

  return {
    t, num, teamName, groupLetter, stageLabel, convertNumerals,
    formatTime, formatDate, formatDateLong, formatCalendarHeading,
    days, months, monthsShort, timeSlots, slotLabel,
    setLang, getLang, getDir, buildSwitcher, buildDropdown, init, LANGUAGES
  };
})();
