
'use strict';
const BUILD = '2026-11-12.supps1';
const STORE_KEY = 'myday.v1';
const MEETINGS_DB_URL = 'https://www.notion.so/6311b06337a4468bb661111f32c063b2';
const TASKS_DB_URL = 'https://www.notion.so/2e2e528fadf88195bcedf39c537ae294';
// Other apps. On Android an intent link asks the phone to open the app itself (the installed Pocket CRM, the LinkedIn app) and falls back to the web page when it is not installed.
const POCKET_CRM_URL = 'https://contact-capture.matthias-homan.workers.dev/';
const LINKEDIN_URL = 'https://www.linkedin.com/feed/';
const RANKINGS_URL = 'https://matthias-sport.github.io/racket-rankings-app/';
const RANKINGS_PACKAGE = 'org.chromium.webapk.a0d7a67882b031cc1_v2'; // the installed Racket Rankings app (chrome://webapks lists it)
const LIBRARY_URL = 'https://librarymh.github.io/library-app/';
const GOLF_URL = 'https://golfcaddie-ai.github.io/golfcaddie-ai/';
const CALORIE_URL = 'https://caloriesin-n-out.github.io/Calorie-tracker/';
const GYM_URL = 'https://gymmh.github.io/gym-app/';
const GYM_PACKAGE = 'org.chromium.webapk.a09d48c4912ac408f_v2'; // the installed Gym app (chrome://webapks lists it)
const POCKET_CRM_PACKAGE = 'org.chromium.webapk.a5bf4b8d4443f6622_v2'; // the installed Pocket CRM app (Chrome's chrome://webapks lists it)
const intentLink = (url, pkg) => { const u = new URL(url); return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(':', '')};action=android.intent.action.VIEW;${pkg ? `package=${pkg};` : ''}S.browser_fallback_url=${encodeURIComponent(url)};end`; };
const DEFAULT_SUPPS = ['Omega 3', 'Curcuma', 'Magnesium', 'Vitamin D', 'Q10', 'Vitamin C', 'Longevity Mix'];
const suppList = () => (Array.isArray(S.settings.supplements) && S.settings.supplements.length ? S.settings.supplements : DEFAULT_SUPPS);
const suppsTaken = r => (r && Array.isArray(r.supps) ? r.supps : []);
const suppAll = r => { const l = suppList(); return l.length > 0 && l.every(x => suppsTaken(r).includes(x)); };
/** Consecutive days, ending on the given day, on which every supplement on your list was ticked. */
function suppStreak(date) { let n = 0; for (let d = date; suppAll(S.reviews[d]); d = addDays(d, -1)) n++; return n; }
const DRINKS = [['beer', 'Beer'], ['wine', 'Wine'], ['long', 'Long drink'], ['shot', 'Shot']];
const GLASS_ML = 250; // one tap on Water is one glass
const drinkTotal = r => DRINKS.reduce((n, [k]) => n + ((r.drinks || {})[k] || 0), 0);
const drank = r => !!(r && (r.alcohol || drinkTotal(r) > 0));
const MOODS = [['😞', 'Rough'], ['🙁', 'Meh'], ['😐', 'Okay'], ['🙂', 'Good'], ['😄', 'Great']];
const BASE_TAGS = ['Work', 'Social', 'Family', 'Errands', 'Learning', 'Reading', 'Rest', 'Travel', 'Outdoors', 'Creative'];
const SPORT_TAGS = ['Run', 'Walk', 'Gym', 'Golf 9', 'Golf 18', 'Golf Indoor', 'Tennis', 'Padel', 'Golf', 'Class'];
const isSport = r => (r.tags || []).some(t => t === 'Sport' || SPORT_TAGS.includes(t)); // 'Sport' kept so older entries still count
const WORK_START = 9, WORK_END = 18; // window used to find your longest free block
const HH = 52, LW = 46; // timeline: pixels per hour, width of the hour labels

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
const today = () => ymd(new Date());
function weekStart(s) { return addDays(s, -((parseYmd(s).getDay() + 6) % 7)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmt(n) { return Math.round(n).toLocaleString(); }
function dur(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`; }
const timeStr = iso => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function dayLabel(s) {
  const t = today();
  if (s === t) return 'Today'; if (s === addDays(t, 1)) return 'Tomorrow'; if (s === addDays(t, -1)) return 'Yesterday';
  return parseYmd(s).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}
const longDate = s => parseYmd(s).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = s => parseYmd(s).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
const evKey = e => `${e.uid}|${e.start}`;
const dueDay = t => (t.due ? t.due.slice(0, 10) : null);
const hasTime = t => !!t.due && t.due.includes('T');
const linkify = s => esc(s).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
const minutesIn = (date, iso) => (Date.parse(iso) - parseYmd(date).getTime()) / 6e4; // minutes since midnight of `date`
const hm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
function untilStr(ms) { const m = Math.max(1, Math.round(ms / 6e4)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; }
function ago(d) {
  const n = Math.round((Date.now() - Date.parse(d)) / 864e5);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 14 ? `${n} days ago` : n < 60 ? `${Math.round(n / 7)} weeks ago` : `${Math.round(n / 30)} months ago`;
}
function mailTime(ms) {
  const d = new Date(ms);
  return ymd(d) === today() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/* ---------- state ---------- */
function blank() { return { reviews: {}, prep: {}, health: {}, cache: {}, tasks: null, inbox: null, tags: [], crypto: { holdings: [], quotes: {}, at: 0 }, settings: { baseUrl: '', appKey: '', theme: 'dark', hideBalances: false, weekDays: 7 }, status: {}, healthAt: 0, demo: false }; }
function load() {
  try { const o = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); const s = Object.assign(blank(), o); s.settings = Object.assign(blank().settings, o.settings); return s; }
  catch { return blank(); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch { toast('Could not save: browser storage is full or blocked.'); }
}
let S = load();
let view = 'today';
let viewDate = today();
let reviewDate = addDays(today(), -1); // the review is about the previous day, so the steps and calendar are complete
let lastToday = today();
// A phone app can stay open past midnight: move "today" along so the Day tab does not keep showing yesterday.
function rollDay() {
  const t = today();
  if (t === lastToday) return false;
  if (viewDate === lastToday) { viewDate = t; didScroll = false; }
  lastToday = t; return true;
}
let sbMsg = null, sbList = null;
async function sbRefresh(quiet) {
  if (!SharedBackup.configured()) { sbList = null; return; }
  try { sbList = await SharedBackup.list(); if (!quiet) sbMsg = { ok: true, text: 'Connected.' }; } catch (e) { sbList = null; sbMsg = { ok: false, text: e.message }; }
  if (view === 'settings') render();
}
let histDays = 30, mailFilter = 'all', loading = false, didScroll = false;

function applyTheme() {
  const t = ['dark', 'light', 'auto'].includes(S.settings.theme) ? S.settings.theme : 'dark';
  document.documentElement.dataset.theme = t;
  const light = t === 'light' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
  $('themeColor').setAttribute('content', light ? '#f4f4f5' : '#111113');
}

/* ---------- sports week: plans are private, explicit calendar add confirms done ---------- */
let sportsDate=weekStart(today()),sportsBusy=false,sportsError='';
S.sports=Object.assign({plans:{},weeks:{}},S.sports||{});
const sportId=()=>crypto.randomUUID();
const sportsKinds=['Gym','Run','Tennis','Padel','Golf'];
const sportsMarker=id=>'[myday-activity:'+id+']';
const sportsClassTime=iso=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
const sportsDay=iso=>!String(iso).includes('T')?String(iso).slice(0,10):new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
function sportsPersist(){save();}
function sportsWeek(){return S.sports.weeks[sportsDate]||null;}
function sportOf(e){
 const t=String(e.title||'');if(/^Class · /i.test(t))return 'Class';
 if(/^(book|booking|reserve|reserva|deadline|remember|reminder)\b/i.test(t)||/Reserva Tenis|Green Fee/i.test(t))return '';
 if(/\b(gym|gimnasio)\b/i.test(t))return 'Gym';
 if(/\b(run|running|carrera)\b/i.test(t))return 'Run';if(/\b(walk|walking|caminar)\b/i.test(t))return 'Walk';
 if(/\b(tennis|tenis)\b/i.test(t))return 'Tennis';
 if(/\b(padel|pádel|PTG)\b/i.test(t))return 'Padel';
 if(/\b(golf)\b/i.test(t))return 'Golf';return '';
}
function sportsReconcile(events,at){
 for(const p of Object.values(S.sports.plans)){
  if(p.deleted)continue;
  const found=events.find(e=>(p.existingEvent?(e.id===p.event?.id):(e.description||'').includes(sportsMarker(p.id))));
  if(found){p.event={id:found.id,uid:found.uid,start:found.start,link:found.link};if(p.kind==='Class'){p.calendarPlaced=true;p.date=sportsDay(found.start);p.time=sportsClassTime(found.start);if(found.end)p.endTime=sportsClassTime(found.end)}else p.confirmed=true;p.uncertain=false;p.canceled=false;p.actualDate=sportsDay(found.start);p.updatedAt=at;}
  else if((p.confirmed||p.calendarPlaced||p.uncertain)&&p.actualDate>=sportsDate&&p.actualDate<addDays(sportsDate,7)){
   if(p.kind==='Class')p.calendarPlaced=false;else p.confirmed=false;p.uncertain=true;p.canceled=true;p.updatedAt=at;
  }
 }
}
async function loadSportsWeek(){
 if(!connected()){sportsError=S.demo?'Demo mode: no calendar writes.':'Connect MyDay to Google in Settings to load matches and confirm activities.';render();return}
 sportsBusy=true;sportsError='';render();const requested=sportsDate;
 try{
  const from=parseYmd(requested).toISOString(),to=parseYmd(addDays(requested,7)).toISOString();
  const d=await api(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if(!Array.isArray(d.events))throw Error('Calendar response was incomplete.');
  if(d.errors?.length)throw Error('Some calendars could not refresh. Keeping the previous copy; completion has not been changed.');
  const at=Date.now();S.sports.weeks[requested]={at,events:d.events};
  if(requested===sportsDate&&d.events.length<100)sportsReconcile(d.events,at);else if(d.events.length>=100)sportsError='This busy week may be incomplete. Missing entries are not treated as canceled.';
  save();
 }catch(e){sportsError=e.message}finally{sportsBusy=false;if(view==='sports')render()}
}
function sportsRows(){
 const week=sportsWeek(),events=week?.events||[],rows=[],used=new Set();
 for(const p of Object.values(S.sports.plans)){
  if(p.deleted)continue;
  const found=events.find(e=>(p.existingEvent?(e.id===p.event?.id):(e.description||'').includes(sportsMarker(p.id))));
  const date=found?sportsDay(found.start):p.confirmed?(p.actualDate||p.date):p.date;
  if(date<sportsDate||date>=addDays(sportsDate,7))continue;
  if(found)used.add(found.id||evKey(found));
  rows.push({date,title:p.title,kind:p.kind,status:p.kind==='Class'?(p.attended?'Done':p.uncertain?'Check calendar':found||p.calendarPlaced?'Planned · in calendar':'Planned'):found||p.confirmed?(p.existingEvent&&['Tennis','Padel'].includes(p.kind)&&!/\b(Resultado|Result|Score):\s*\S/i.test(found?.description||'')?'Done · result pending':'Done'):p.uncertain?'Check calendar':p.canceled?'Canceled / plan kept':'Planned',p,event:found||p.event,time:found?timeStr(found.start):p.confirmed&&p.event?.start?timeStr(p.event.start):p.time||''});
 }
 for(const e of events){
  if(e.status==='cancelled'||e.response==='declined'||used.has(e.id||evKey(e)))continue;
  const kind=sportOf(e);if(!kind)continue;
  // User rule: gym/run entries confirm done on add. Match time alone never proves played.
  const result=kind!=='Class'&&(['Gym','Run','Walk'].includes(kind)||/\b(Resultado|Result|Score):\s*\S/i.test(e.description||'')||/\[(?:sports-source:gym\||myday-activity:)[^\]]+\]/.test(e.description||''));
  const date=sportsDay(e.start);if(date<sportsDate||date>=addDays(sportsDate,7))continue;
  rows.push({date,title:e.title,kind,status:result?'Done':date<today()?'Confirm played':'Scheduled',event:e,time:e.allDay?'All day':timeStr(e.start)});
 }
 return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
}

// Only auto-owned chips are removed on cancellation or a changed activity date.
// Existing manual tags, text, mood and counters are never overwritten.
function sportsReviewTag(kind,title){
 if(kind!=='Golf')return kind;
 if(/\b(indoor|simulator|simulador)\b/i.test(title))return 'Golf Indoor';
 if(/\b18\b/.test(title))return 'Golf 18';if(/\b9\b/.test(title))return 'Golf 9';return 'Golf';
}
function sportsSyncReview(){
 const current=sportsDate,items=new Map(),wanted={};
 const put=(key,v,at)=>{if(!items.has(key)||items.get(key).at<at)items.set(key,{...v,at})};
 for(const [date,c] of Object.entries(S.cache||{}))for(const e of c.events||[]){const kind=sportOf(e);if(!kind)continue;
  const done=e.status!=='cancelled'&&e.response!=='declined'&&kind!=='Class'&&(['Gym','Run','Walk'].includes(kind)||/\b(Resultado|Result|Score):\s*\S/i.test(e.description||'')||/\[(?:sports-source:gym\||myday-activity:)[^\]]+\]/.test(e.description||''));
  put('event:'+(e.id||evKey(e)),{date:sportsDay(e.start),kind,title:e.title,done},c.at||0);
 }
 for(const [week,c] of Object.entries(S.sports.weeks||{})){for(const [key,v] of items)if(key.startsWith('event:')&&v.date>=week&&v.date<addDays(week,7)&&v.at<(c.at||0)&&!(c.events||[]).some(e=>'event:'+(e.id||evKey(e))===key))put(key,{...v,done:false},c.at||0);for(const e of c.events||[])if(e.status==='cancelled'||e.response==='declined')put('event:'+(e.id||evKey(e)),{date:sportsDay(e.start),kind:sportOf(e),title:e.title,done:false},c.at||0);sportsDate=week;for(const r of sportsRows())put(r.p?'plan:'+r.p.id:'event:'+(r.event.id||evKey(r.event)),{date:r.date,kind:r.kind,title:r.title,done:r.status.startsWith('Done')},c.at||0)}sportsDate=current;
 // Plans are authoritative even before a week has loaded, and suppress old event copies.
 for(const p of Object.values(S.sports.plans||{})){
  if(p.event?.id)items.delete('event:'+p.event.id);
  const done=!p.deleted&&(p.kind==='Class'?!!p.attended:!!p.confirmed&&!p.uncertain&&!p.canceled);
  const date=p.actualDate||p.date;
  items.set('plan:'+p.id,{date,kind:p.kind,title:p.title,done});
 }
 for(const v of items.values())if(v.done&&/^\d{4}-\d{2}-\d{2}$/.test(v.date)){const tag=sportsReviewTag(v.kind,v.title||'');if(SPORT_TAGS.includes(tag))(wanted[v.date]||(wanted[v.date]=new Set())).add(tag)}
 let changed=false;
 for(const date of new Set([...Object.keys(wanted),...Object.keys(S.reviews)])){
  const existing=S.reviews[date],r=existing||{},prev=r.sportsAutoTags||[],tags=r.tags||[],need=[...(wanted[date]||[])];
  const manual=tags.filter(t=>!prev.includes(t)),owned=need.filter(t=>!manual.includes(t)),next=[...new Set([...manual,...need])];
  if(JSON.stringify(tags)!==JSON.stringify(next)||JSON.stringify(prev)!==JSON.stringify(owned)){
   S.reviews[date]={...r,tags:next,sportsAutoTags:owned,updatedAt:Date.now()};changed=true;
  }
 }
 if(changed)save();
}

function sportsHtml(){
 const week=sportsWeek(),rows=sportsRows(),plans=rows.filter(r=>!r.status.startsWith('Done')).length,done=rows.filter(r=>r.status.startsWith('Done')).length;
 return `<style>
 .swday.swempty{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;min-height:0}.swday.swempty h3{margin:0;font-size:14px}.swday.swempty .swmeta{margin:0;font-size:13px}
 .swpage .swheader{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0 16px}.swpage h1{font-size:24px;line-height:1.2;margin:0;font-weight:650;letter-spacing:-.5px}.swpage .swheader .btn{min-height:40px;padding:8px 12px;font-size:12px;border-radius:12px;flex:none}.swpage .swperiod{display:grid;grid-template-columns:40px 1fr 40px;align-items:center;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:4px}.swpage .swperiod .btn{border:0;background:transparent;min-width:0;min-height:40px;padding:6px;font-size:22px}.swpage .swperiod .swperiodlabel{font-size:13px;font-weight:600;line-height:1.5;text-align:center}.swpage .swperiod .swperiodlabel small{display:block;font-size:11px;color:var(--muted);font-weight:400}.swpage .swsummary{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:12px 0;color:var(--muted);font-size:12px}.swpage .swsummary b{color:var(--ink);font-weight:600}.swpage .swsummary .btn{flex:none;min-width:0;min-height:36px;padding:7px 10px;font-size:12px;border-radius:10px}.swpage .swadd{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}.swpage .swadd .btn{min-height:42px;padding:9px 10px;font-size:13px;border-radius:12px}.swpage .swchecked{font-size:11px;margin:0 2px 14px}.swpage .swday{margin-bottom:12px;padding:12px 14px;border-radius:16px}.swpage .swday h3{font-size:13px;line-height:1.5;margin:0 0 8px;font-weight:600}.swpage .swtoday h3{color:var(--ink)}.swpage .swactivity{padding:12px 0}.swpage .swactivity:last-child{padding-bottom:0}.swpage .swline{gap:8px;align-items:start;flex-wrap:wrap}.swpage .swline b{font-size:14px;line-height:1.4;flex:1 1 165px;font-weight:600}.swpage .swstate{font-size:10px;line-height:1.5;max-width:100%;white-space:normal;border:0;background:var(--soft);padding:3px 7px;border-radius:7px}.swpage .swdone{color:var(--good)}.swpage .swmeta{font-size:12px;line-height:1.5;margin-top:4px}.swpage .swbuttons{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.swpage .swbuttons .btn{min-height:36px;padding:7px 9px;font-size:11px;border-radius:9px;background:transparent;flex:none}.swpage .swday>p{margin:4px 0}.swpage .swtools{margin-top:18px}.swpage .swtools .row{gap:8px}.swpage .swtools .btn{min-height:40px;padding:8px 10px;font-size:12px}.swpage .swtools>.card{margin-bottom:12px}
 </style><div class="swpage"><header class="swheader"><h1>Sports week</h1><button class="btn" data-sw="refresh" ${sportsBusy?'disabled':''}>${sportsBusy?'Updating…':'Refresh'}</button></header>
 <div class="swperiod"><button class="btn" data-sw="prev" aria-label="Previous week">‹</button><div class="swperiodlabel">${shortDate(sportsDate)} - ${shortDate(addDays(sportsDate,6))}<small>Your plans and completed activities</small></div><button class="btn" data-sw="next" aria-label="Next week">›</button></div>
 <div class="swsummary"><span><b>${done}</b> done &nbsp;·&nbsp; <b>${plans}</b> planned / to confirm</span><button class="btn" data-sw="today">This week</button></div>
 <div class="swadd"><button class="btn day" data-sw="new">+ Plan / activity</button><button class="btn" data-sw="new-class">+ Class</button></div>
 ${sportsError?`<div class="errbox">${esc(sportsError)} ${!connected()?'<button class="btn" data-act="goto-settings">Settings</button>':''}</div>`:''}
 <p class="muted swchecked">${week?'Calendar checked '+new Date(week.at).toLocaleString():'Calendar not loaded for this week.'} ${week&&Date.now()-week.at>3600000?'Saved copy, refresh to check changes.':''}</p>
 ${Array.from({length:7},(_,i)=>addDays(sportsDate,i)).map(date=>{const list=rows.filter(r=>r.date===date);return `<section class="card swday ${date===today()?'swtoday':''} ${list.length?'':'swempty'}"><h3>${esc(dayLabel(date))}</h3>${list.map(r=>`<div class="swactivity"><div class="swline"><b>${esc(r.title)}</b><span class="swstate ${r.status.startsWith('Done')?'swdone':''}">${esc(r.status)}</span></div><div class="muted swmeta">${esc(r.kind)}${r.time?' · '+esc(r.time):''}${r.p?.target?' · '+esc(r.p.target):''}${r.p?.series?' · '+esc(r.p.series):''}</div><div class="row swbuttons">${r.p?`<button class="btn" data-sw="edit" data-id="${esc(r.p.id)}">${r.p.kind==='Class'?'Class details / attendance':r.p.confirmed?'Details':'Edit / add to calendar'}</button>${r.p.kind==='Gym'&&!r.p.existingEvent?`<a class="btn" href="${GYM_URL+'?mydayActivity='+encodeURIComponent(r.p.id)}" target="_blank" rel="noopener">Open Gym</a>`:''}`:`<button class="btn" data-sw="confirm-event" data-id="${esc(r.event.id||evKey(r.event))}">${r.status.startsWith('Done')?'Result / details':r.status==='Confirm played'?(r.kind==='Tennis'||r.kind==='Padel'?'Played / result pending':'Confirm completed'):'Details'}</button>`}${r.event?.link?`<a class="btn" href="${esc(r.event.link)}" target="_blank" rel="noopener">Calendar</a>`:''}</div></div>`).join('')||'<span class="muted swmeta">Nothing planned</span>'}</section>`}).join('')}
 <div class="swtools"><div class="card"><h3>Metropolitan Abascal classes</h3><a class="btn" href="https://clubmetropolitan.com/club/madrid/abascal/" target="_blank" rel="noopener">Open live timetable</a><p class="muted swmeta">Opens Metropolitan's website separately. No automatic import or booking. Tell your assistant the sessions you want, or use + Class to enter a plan. Putting a class in Calendar keeps it planned until you confirm attendance.</p></div><p id="sportsGymHandoff" class="muted swmeta">${esc(sessionStorage.getItem('myday.gym.handoff')||'')}</p><div class="row"><button class="btn" data-sw="connect-gym">Connect Gym calendar</button><button class="btn" data-sw="connect-golf">Connect Golf calendar</button><button class="btn" data-sw="import">Import training plan (CSV)</button></div><p class="muted swmeta">Gym and run plans stay here until you add them to your calendar. Adding confirms done, even before starting; cancel the calendar entry if you do not do it, then refresh here. Missing or moved entries are flagged for checking. Scheduled matches stay separate until a result or your played confirmation. Connect Gym once on this device for future saved workouts. Connect Golf once for future saved rounds. Past rounds are not backfilled; date/time mismatches and possible duplicate entries wait for your review. No pain tracking or extra scores.</p></div></div>`;
}
function sportsPlanForm(id){
 if(id&&S.sports.plans[id]?.kind==='Class')return sportsClassForm(id);
 const p=id?S.sports.plans[id]:null,date=p?.date||today(),confirmed=!!p?.confirmed;
 openSheet(`<h2>${p?'Activity':'Plan / activity'}</h2>${confirmed?'<p class="muted">Confirmed done by your calendar add. To undo, cancel that calendar entry and refresh this week. The plan will stay.</p>':''}
 <label>Sport</label><select class="field" id="swKind">${sportsKinds.map(k=>`<option ${k===(p?.kind||'Gym')?'selected':''}>${k}</option>`).join('')}</select>
 <label>Session</label><input class="field" id="swTitle" maxlength="150" value="${esc(p?.title||'')}" placeholder="e.g. Easy run or Upper body">
 <label>Day</label><input class="field" type="date" id="swDate" value="${esc(date)}">
 <label>Time (optional for a rough plan)</label><input class="field" type="time" id="swTime" value="${esc(p?.time||'')}">
 <label>Target (optional)</label><input class="field" id="swTarget" maxlength="200" value="${esc(p?.target||'')}" placeholder="Distance, duration or your plan's instructions">
 <div class="row" style="margin-top:16px"><button class="btn" id="swSave" ${confirmed?'disabled':''}>Save plan</button>${!confirmed?'<button class="btn day" id="swCalendar">Add to calendar = done</button>':''}${p&&!confirmed?'<button class="btn" id="swRemove">Remove plan</button>':''}<button class="btn" id="swClose">Close</button></div>${p?.uncertain?'<p class="errbox">The calendar link needs checking. The event may have moved, been removed, or the last add may not have finished. Open Calendar before adding again.</p><button class="btn" id="swResetLink">I checked: no calendar entry remains</button>':''}`);
 $('swClose').onclick=closeSheet;
 if($('swResetLink'))$('swResetLink').onclick=()=>{if(confirm('Confirm you checked Calendar and this activity is not there, including other days?')){p.uncertain=false;p.confirmed=false;p.canceled=false;p.event=null;p.updatedAt=Date.now();save();closeSheet();render()}};
 const collect=()=>{const kind=$('swKind').value,title=$('swTitle').value.trim()||kind,d=$('swDate').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(d))throw Error('Pick a day.');return {...p,id:p?.id||sportId(),kind,title,date:d,time:$('swTime').value,target:$('swTarget').value.trim(),updatedAt:Date.now()}};
 $('swSave').onclick=()=>{try{const n=collect();S.sports.plans[n.id]=n;save();closeSheet();sportsDate=weekStart(n.date);render()}catch(e){toast(e.message)}};
 if($('swRemove'))$('swRemove').onclick=()=>{if(confirm('Remove this plan?')){S.sports.plans[id]={...p,deleted:true,updatedAt:Date.now()};save();closeSheet();render()}};
 if($('swCalendar'))$('swCalendar').onclick=()=>{try{const n=collect();S.sports.plans[n.id]=n;save();sportsCalendarForm(n)}catch(e){toast(e.message)}};
}
function sportsWall(date,time){
 const parts=(date+'T'+time).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);if(!parts)return new Date(NaN);
 const a=parts.slice(1).map(Number),wall=Date.UTC(a[0],a[1]-1,a[2],a[3],a[4]);let guess=wall;
 const f=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const v=Object.fromEntries(f.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));guess+=wall-Date.UTC(+v.year,+v.month-1,+v.day,+v.hour,+v.minute);}
 const v=Object.fromEntries(f.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));if(v.year!==parts[1]||v.month!==parts[2]||v.day!==parts[3]||v.hour!==parts[4]||v.minute!==parts[5])return new Date(NaN);return new Date(guess);
}
function sportsCalendarForm(p){
 if(!connected())return toast('Connect Google in Settings first. Your plan is saved.');
 if(p.uncertain)return toast('Check the linked entry in Calendar before adding again.');
 openSheet(`<h2>Add ${esc(p.kind)} = done</h2><p class="muted">This is your completion confirmation on your main Google Calendar, even if you add it before starting. Cancel the calendar entry if you do not do it. No guests or invitations.</p>
 <label>Actual day</label><input class="field" id="swActual" type="date" value="${esc(p.date)}"><label>Start (Madrid time)</label><input class="field" id="swStart" type="time" value="${esc(p.time||'09:00')}"><label>End</label><input class="field" id="swEnd" type="time" value="${p.time?hm(Number(p.time.slice(0,2))*60+Number(p.time.slice(3))+60):'10:00'}">
 <div class="row" style="margin-top:16px"><button class="btn day" id="swCommit">Add to calendar and confirm done</button><button class="btn" id="swCancel">Back</button></div>`);
 $('swCancel').onclick=()=>sportsPlanForm(p.id);
 $('swCommit').onclick=async()=>{
  const date=$('swActual').value,start=sportsWall(date,$('swStart').value),end=sportsWall(date,$('swEnd').value);
  if(!date||isNaN(start)||isNaN(end)||end<=start)return toast('Choose a valid day and end after start.');
  $('swCommit').disabled=true;
  p.actualDate=date;p.uncertain=true;p.updatedAt=Date.now();save();
  try{
   const added=await post('/api/calendar/add',{title:p.kind+' · '+p.title,start:start.toISOString(),end:end.toISOString(),timeZone:'Europe/Madrid',calendarId:'primary',guests:[],meet:false,description:'Completed activity confirmed by calendar add.\n'+sportsMarker(p.id)});
   p.confirmed=true;p.uncertain=false;p.canceled=false;p.event={id:added.event?.id,uid:added.event?.uid,start:added.event?.start||start.toISOString(),link:added.event?.link};p.updatedAt=Date.now();save();closeSheet();sportsDate=weekStart(date);toast('Added to calendar · confirmed done');await loadSportsWeek();
  }catch(e){closeSheet();sportsDate=weekStart(date);sportsError='Could not confirm the add: '+e.message+'. Refresh before retrying so no duplicate is created.';render()}
 };
}
function sportsEventForm(id){
 const e=(sportsWeek()?.events||[]).find(e=>(e.id||evKey(e))===id);if(!e)return;
 const key='event:'+id,p=S.sports.plans[key],date=sportsDay(e.start),kind=sportOf(e),match=['Tennis','Padel'].includes(kind);
 openSheet(`<h2>${esc(e.title)}</h2><p>${esc(shortDate(date))} · ${esc(timeStr(e.start))}</p><p class="muted">${esc(e.description||'No result in this event yet.')}</p><p class="muted">Scheduled time alone does not mean played. If you played, confirm here without making another calendar entry. Official results should update the original event.</p><div class="row"><button class="btn day" id="swPlayed">${match?'Played · result pending':'Confirm completed'}</button>${p?'<button class="btn" id="swUnplayed">Undo played confirmation</button>':''}<button class="btn" id="swDone">Close</button></div>`);
 $('swDone').onclick=closeSheet;
 $('swPlayed').onclick=()=>{if(kind==='Class'&&Date.parse(e.end||e.start)>Date.now())return toast('Confirm attendance only after the class has finished.');S.sports.plans[key]={id:key,title:e.title,kind,date,actualDate:date,confirmed:true,attended:kind==='Class',calendarPlaced:kind==='Class',time:kind==='Class'?sportsClassTime(e.start):timeStr(e.start),endTime:kind==='Class'?sportsClassTime(e.end):timeStr(e.end),event:{id:e.id,uid:e.uid,start:e.start,link:e.link},existingEvent:true,updatedAt:Date.now()};save();closeSheet();render()};
 if($('swUnplayed'))$('swUnplayed').onclick=()=>{S.sports.plans[key]={...p,deleted:true,updatedAt:Date.now()};save();closeSheet();render()};
}

function sportsClassForm(id){
 const p=id?S.sports.plans[id]:null,locked=!!(p?.calendarPlaced||p?.uncertain||p?.attended);
 openSheet(`<h2>Metropolitan class</h2><p class="muted">A private plan, not a reservation. Book on Metropolitan's website/app yourself. Classes are done only after you confirm attendance. Times are Madrid time.</p>
 <label>Class name</label><input class="field" id="clName" maxlength="150" value="${esc(p?.title||'')}" ${locked?'disabled':''}>
 <label>Day</label><input class="field" type="date" id="clDate" value="${esc(p?.date||today())}" ${locked?'disabled':''}>
 <label>Start</label><input class="field" type="time" id="clStart" value="${esc(p?.time||'')}" ${locked?'disabled':''}>
 <label>End</label><input class="field" type="time" id="clEnd" value="${esc(p?.endTime||'')}" ${locked?'disabled':''}>
 <p class="muted">Metropolitan Abascal · no guests or invitations. Existing calendar entries must be changed in Calendar, not copied here.</p>
 <div class="row" style="flex-wrap:wrap">${!locked?'<button class="btn" id="clSave">Save planned class</button><button class="btn day" id="clCal">Add to calendar · still planned</button>':''}${p&&!p.attended?'<button class="btn" id="clAttended">I attended this class</button>':''}${p?.attended?'<button class="btn" id="clUndo">Undo attendance</button>':''}${p?.event?.link?`<a class="btn" target="_blank" rel="noopener" href="${esc(p.event.link)}">Open Calendar</a>`:''}<button class="btn" id="clClose">Close</button></div>
 ${p?.uncertain?'<p class="errbox">The calendar add or link is uncertain. Check Calendar before adding anything again. Your plan is kept.</p>':''}
 ${p&&!p.calendarPlaced&&!p.uncertain?'<button class="btn" id="clRemove">Remove private plan</button>':''}`);
 $('clClose').onclick=closeSheet;
 const collect=()=>{const title=$('clName').value.trim(),date=$('clDate').value,time=$('clStart').value,endTime=$('clEnd').value;if(!title)throw Error('Enter the class name.');const start=sportsWall(date,time),end=sportsWall(date,endTime);if(isNaN(start)||isNaN(end)||end<=start)throw Error('Enter a valid day and an end after the start.');return{...p,id:p?.id||sportId(),kind:'Class',title,date,time,endTime,updatedAt:Date.now()}};
 const store=n=>{S.sports.plans[n.id]=n;save();sportsDate=weekStart(n.date);closeSheet();render();return n};
 if($('clSave'))$('clSave').onclick=()=>{try{store(collect())}catch(e){toast(e.message)}};
 if($('clCal'))$('clCal').onclick=async()=>{
  let n;try{n=collect()}catch(e){return toast(e.message)}
  if(!connected()){store(n);return toast('Plan saved. Connect Google in MyDay Settings before adding to Calendar.')}
  if(!confirm('Add this planned class to your main Google Calendar at Metropolitan Abascal? This does not book a place or confirm attendance.'))return;
  $('clCal').disabled=true;n.uncertain=true;n.actualDate=n.date;S.sports.plans[n.id]=n;save();
  try{const r=await post('/api/calendar/add',{title:'Class · '+n.title,start:sportsWall(n.date,n.time).toISOString(),end:sportsWall(n.date,n.endTime).toISOString(),timeZone:'Europe/Madrid',calendarId:'primary',guests:[],meet:false,location:'Metropolitan Abascal',description:'Planned class only. Booking and attendance are not confirmed.\n'+sportsMarker(n.id)});if(!r.event?.id)throw Error('Calendar did not return an event ID');n.event=r.event;n.calendarPlaced=true;n.uncertain=false;store(n);toast('Class in Calendar · still planned');await loadSportsWeek();}catch(e){store(n);sportsError='Class calendar add is uncertain: '+e.message+'. Check Calendar before retrying.';render()}
 };
 if($('clAttended'))$('clAttended').onclick=()=>{const end=sportsWall(p.date,p.endTime);if(isNaN(end)||end>Date.now())return toast('Confirm attendance only after the class has finished.');if(confirm('Confirm you actually attended this class?'))store({...p,attended:true,updatedAt:Date.now()})};
 if($('clUndo'))$('clUndo').onclick=()=>store({...p,attended:false,updatedAt:Date.now()});
 if($('clRemove'))$('clRemove').onclick=()=>{if(confirm('Remove this private class plan?'))store({...p,deleted:true,updatedAt:Date.now()})};
}

function sportsImport(){
 openSheet(`<h2>Import a training plan</h2><p class="muted">CSV with columns date,sport,title,target,time. Date is YYYY-MM-DD; sport is Gym or Run. This imports rough plans only, never calendar entries or completed activities. Use a plan you have chosen; no training prescription is generated here.</p><input id="swFile" type="file" accept=".csv,text/csv"><div id="swImportPreview"></div><button class="btn" id="swImportClose">Close</button>`);
 $('swImportClose').onclick=closeSheet;
 $('swFile').onchange=async()=>{
 try{
  const f=$('swFile').files[0];if(!f)return;if(f.size>300000)throw Error('Use a CSV smaller than 300 KB.');
  const lines=(await f.text()).replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.length>501)throw Error('Up to 500 sessions per import.');
  const parse=line=>{const a=[];let v='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){v+='"';i++}else q=!q}else if(c===','&&!q){a.push(v.trim());v=''}else v+=c}if(q)throw Error('Unclosed CSV quote. Use one session per line.');a.push(v.trim());return a};
  const h=parse(lines.shift()).map(x=>x.toLowerCase());if(!['date','sport','title'].every(x=>h.includes(x)))throw Error('Required columns: date,sport,title.');
  const entries=lines.filter(Boolean).map((line,i)=>{const a=parse(line),get=k=>a[h.indexOf(k)]||'',date=get('date'),kind=get('sport'),title=get('title');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||ymd(parseYmd(date))!==date||!['Gym','Run'].includes(kind)||!title||title.length>150||get('target').length>200||get('time')&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(get('time')))throw Error('Check row '+(i+2)+': valid date, Gym/Run, title and optional HH:MM time.');return {date,kind,title,target:get('target'),time:get('time')}});
  const unique=entries.filter(n=>!Object.values(S.sports.plans).some(p=>!p.deleted&&p.date===n.date&&p.kind===n.kind&&p.title===n.title));
  $('swImportPreview').innerHTML=`<p>${entries.length} sessions, ${unique.length} new. No calendar changes.</p><ul>${unique.slice(0,8).map(p=>`<li>${esc(p.date+' · '+p.kind+' · '+p.title)}</li>`).join('')}</ul><label>Plan name (optional)</label><input class="field" id="swSeries" maxlength="100"><button class="btn day" id="swImportCommit">Import ${unique.length} rough plans</button>`;
  $('swImportCommit').onclick=()=>{const series=$('swSeries').value.trim();for(const n of unique){const id=sportId();S.sports.plans[id]={...n,id,series,updatedAt:Date.now()}}save();closeSheet();if(unique.length)sportsDate=weekStart(unique[0].date);render();toast('Training plan imported · no calendar entries made')};
 }catch(e){$('swImportPreview').textContent=e.message}
 };
}
let sportsGymPopup=null,sportsGymPairUntil=0,sportsGymSent=false;
function sportsGymStatus(text){sessionStorage.setItem('myday.gym.handoff',text);let el=$('sportsGymHandoff');if(!el){const b=document.querySelector('[data-sw="connect-gym"]');if(b){el=document.createElement('p');el.id='sportsGymHandoff';el.className='muted swmeta';b.parentElement.after(el)}}if(el)el.textContent=text;const day=$('dayGymHandoff');if(day)day.textContent=text;toast(text);}

async function sportsConnectGym(){
 if(!connected())return toast('Connect MyDay in Settings first.');
 if(baseUrl()!=='https://calorie-tracker.matthias-homan.workers.dev')return toast('Check the calendar Worker address in Settings.');
 if(sportsGymSent)return;sportsGymSent=true;
 sportsGymStatus('Preparing a secure Gym connection...');
 try{
  const r=await post('/api/gym/pair',{});
  if(typeof r.pair!=='string'||!r.pair.startsWith('pair2.'))throw Error('Connection service did not return a pairing link.');
  sportsGymStatus('Opening Gym. Its Calendar status will confirm the connection.');
  location.assign('https://gymmh.github.io/gym-app/#gymPair='+encodeURIComponent(r.pair));
 }catch(e){sportsGymSent=false;sportsGymStatus('Gym connection was not opened: '+e.message+'. Existing data has not changed.');}
}
let sportsGolfSent=false;
function sportsGolfStatus(text){let el=$('sportsGolfHandoff');if(!el){const b=document.querySelector('[data-sw=connect-golf]');if(b){el=document.createElement('p');el.id='sportsGolfHandoff';el.className='muted swmeta';b.parentElement.after(el)}}if(el)el.textContent=text;toast(text);}
async function sportsConnectGolf(){
 if(!connected())return toast('Connect MyDay in Settings first.');
 if(baseUrl()!=='https://calorie-tracker.matthias-homan.workers.dev')return toast('Check the calendar Worker address in Settings.');
 if(sportsGolfSent)return;sportsGolfSent=true;
 sportsGolfStatus('Preparing a secure Golf connection...');
 try{
  const r=await post('/api/golf/pair',{});
  if(typeof r.pair!=='string'||!r.pair.startsWith('pairg2.'))throw Error('Connection service did not return a pairing link.');
  sportsGolfStatus('Opening Golf. Its Calendar status will confirm the connection.');
  location.assign('https://golfcaddie-ai.github.io/golfcaddie-ai/#golfPair='+encodeURIComponent(r.pair));
 }catch(e){sportsGolfSent=false;sportsGolfStatus('Golf connection was not opened: '+e.message+'. Existing data has not changed.');}
}
window.addEventListener('pageshow',()=>{sportsGolfSent=false});
window.addEventListener('pageshow',()=>{sportsGymSent=false});
document.addEventListener('click',e=>{const b=e.target.closest('[data-sw]');if(!b)return;const a=b.dataset.sw;
 if(a==='prev'||a==='next'){sportsDate=addDays(sportsDate,a==='prev'?-7:7);render();loadSportsWeek()}
 else if(a==='today'){sportsDate=weekStart(today());render();loadSportsWeek()}
 else if(a==='connect-golf')sportsConnectGolf();else if(a==='connect-gym')sportsConnectGym();else if(a==='refresh')loadSportsWeek();else if(a==='new')sportsPlanForm();else if(a==='new-class')sportsClassForm();else if(a==='edit')sportsPlanForm(b.dataset.id);else if(a==='confirm-event')sportsEventForm(b.dataset.id);else if(a==='import')sportsImport();
});

/* ---------- Worker access ---------- */
function baseUrl() { const b = (S.settings.baseUrl || '').trim().replace(/\/$/, ''); return /^https?:\/\//.test(b) ? b : null; }
async function api(path, opts = {}) {
  const base = baseUrl();
  if (base === null) throw new Error('Enter your Worker address in Settings first (it starts with https://).');
  const headers = { ...(opts.headers || {}), 'X-App-Key': S.settings.appKey };
  if (opts.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { ...opts, headers });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error((body && body.error) || `Server returned ${res.status}`);
  return body;
}
const connected = () => !!(S.settings.appKey && baseUrl()) && !S.demo;
const post = (path, b) => api(path, { method: 'POST', body: JSON.stringify(b) });

// Load everything for one day. Each part can fail on its own; whatever worked is kept and the rest keeps its saved copy.
async function loadDay(date) {
  if (!connected()) return;
  loading = true; if (view === 'today' || view === 'review') render();
  const from = parseYmd(date).toISOString(), to = parseYmd(addDays(date, 1)).toISOString();
  const [cal, tasks, health] = await Promise.allSettled([
    api(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    api(`/api/tasks?date=${date}`),
    api(`/api/days?from=${addDays(date, -1)}&to=${date}`),
  ]);
  const at = Date.now();
  if (cal.status === 'fulfilled') {
    S.cache[date] = { at, events: cal.value.events, calendars: cal.value.calendars, errors: cal.value.errors };
    S.status.cal = { at, ok: true, message: cal.value.errors.length ? cal.value.errors.map(e => `${e.calendar}: ${e.message}`).join('\n') : '' };
  } else S.status.cal = { at, ok: false, message: cal.reason.message };
  if (tasks.status === 'fulfilled') {
    const prev = S.tasks || { doneOn: {} };
    S.tasks = { at, open: tasks.value.open, doneOn: { ...prev.doneOn, [date]: tasks.value.doneOn } };
    S.status.tasks = { at, ok: true, message: '' };
  } else S.status.tasks = { at, ok: false, message: tasks.reason.message };
  if (health.status === 'fulfilled') { mergeHealth(health.value); S.status.health = { at, ok: !health.value.errors?.length, message: (health.value.errors || []).map(e => `${e.type}: ${e.message}`).join('\n') }; }
  else S.status.health = { at, ok: false, message: health.reason.message };
  for (const d of Object.keys(S.cache).sort().slice(0, -21)) delete S.cache[d]; // keep the 21 most recent days
  loading = false; save(); render();
}
function mergeHealth(out) { for (const [d, v] of Object.entries(out.days || {})) S.health[d] = Object.assign(S.health[d] || {}, v); S.healthAt = Date.now(); }
async function syncHealth(days) {
  if (!connected()) return;
  try { const to = today(); mergeHealth(await api(`/api/days?from=${addDays(to, -(days - 1))}&to=${to}`)); S.status.health = { at: Date.now(), ok: true, message: '' }; }
  catch (e) { S.status.health = { at: Date.now(), ok: false, message: e.message }; }
  save(); render();
}
async function loadInbox(force) {
  if (!connected() || (!force && view !== 'inbox')) return; // there is no Inbox tab any more: do not fetch mail nobody can see
  try { const r = await api('/api/mail/inbox'); S.inbox = { at: Date.now(), account: r.account, unread: r.unread, messages: r.messages }; S.status.mail = { at: Date.now(), ok: true, message: '' }; }
  catch (e) { S.status.mail = { at: Date.now(), ok: false, message: e.message }; }
  save(); render();
}

/* ---------- day shape ---------- */
function dayShape(events, date) {
  const timed = events.filter(e => !e.allDay);
  if (!timed.length) return null;
  const lo = parseYmd(date).getTime() + WORK_START * 36e5, hi = parseYmd(date).getTime() + WORK_END * 36e5;
  const iv = timed.filter(e => e.busy).map(e => [Math.max(lo, Date.parse(e.start)), Math.min(hi, Date.parse(e.end))]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const x of iv) { if (merged.length && x[0] <= merged.at(-1)[1]) merged.at(-1)[1] = Math.max(merged.at(-1)[1], x[1]); else merged.push([...x]); }
  let best = null, cur = lo;
  for (const [a, b] of [...merged, [hi, hi]]) { if (a - cur > (best ? best[1] - best[0] : 0)) best = [cur, a]; cur = Math.max(cur, b); }
  const mins = timed.filter(e => e.busy).reduce((a, e) => a + (Date.parse(e.end) - Date.parse(e.start)) / 6e4, 0);
  return { count: timed.length, mins, free: best && best[1] - best[0] >= 30 * 6e4 ? best : null };
}

/* ---------- rendering ---------- */
const NAV = [['today', 'Day', '▦'], ['sports', 'Sports', '◷'], ['review', 'Review', '☺'], ['more', 'More', '≡']];
const LAYOUT_STYLES = `<style>
.layout-checkin{padding:0;overflow:hidden}.layout-checkin-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px 0;font-size:13px}.layout-checkin-top .muted{font-size:12px;margin-left:5px}.layout-log{border:0;background:none;padding:8px 0 8px 8px;font-size:13px;white-space:nowrap}.layout-checkin summary{list-style:none;display:flex;align-items:center;gap:9px;min-height:48px;padding:8px 12px;cursor:pointer;font-size:13px}.layout-checkin summary::-webkit-details-marker,.layout-review-details summary::-webkit-details-marker{display:none}.layout-checkin summary .muted{flex:1;min-width:0}.layout-checkin summary .layout-water{font-size:13px;flex:none;min-height:36px;padding:4px 6px;border:0;background:transparent}.layout-checkin[open] .layout-chevron,.layout-review-details[open] .layout-chevron{transform:rotate(180deg)}.layout-checkin-content{padding:0 12px 12px;border-top:1px solid var(--line)}.layout-checkin-content .rd{margin-top:10px}.layout-checkin-content .track{margin-top:10px}.layout-review-details{padding:0}.layout-review-details summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:12px 14px;font-size:14px}.layout-review-details summary span{font-size:12px;color:var(--muted);text-align:right}.layout-review-details .layout-details-body{padding:0 14px 14px}.layout-review-note{font-size:12px;margin:8px 3px 0}.layout-review-core .field{width:100%;min-width:0}.layout-review-core textarea{min-height:100px}.layout-more-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.layout-more-grid .menu{margin:0;min-width:0;align-items:flex-start;padding:12px;min-height:76px}.layout-more-grid .menu span{min-width:0;font-size:14px}.layout-more-grid .menu small{font-size:11px;line-height:1.4;margin-top:4px;overflow-wrap:anywhere}.layout-more h2{font-size:16px;margin:18px 2px 8px}.layout-more-group{padding:0 12px}.layout-more-group .menu{border:0;border-bottom:1px solid var(--line);border-radius:0;margin:0;padding:12px 2px;background:none}.layout-more-group .menu:last-child{border-bottom:0}.layout-more-group .menu i{display:none}.layout-more-group .menu span{font-size:14px}.layout-more-group .menu small{font-size:11px}.layout-top-settings{align-self:center;min-height:40px}.layout-review-core .saved{min-height:18px}

.nextup{padding:12px 14px}.nextup h3{margin:0 0 4px;font-size:15px}.nuw{display:flex;gap:12px;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line);padding:10px 0;min-height:48px}.nuw:first-of-type{border-top:0}.nut{flex:none;min-width:62px;white-space:nowrap;font-weight:650;font-size:14px}.nun{flex:1;min-width:0;font-size:15px;overflow-wrap:anywhere}.nun small{display:block;color:var(--muted);font-size:12px;margin-top:2px}
.showall{display:block;width:100%;background:none;border:0;color:var(--muted);font-size:14px;padding:10px 0;min-height:44px;text-align:left}
.task .chk{position:relative}.task .chk::after{content:'';position:absolute;inset:-8px}.wk .ar{min-width:40px;min-height:40px}.mini{min-height:36px}
.layout-more-grid .menu{gap:10px}.layout-more-grid .menu i{display:block;flex:none;width:24px;margin-top:1px;font-size:20px;line-height:1.1;font-style:normal;text-align:center}
.layout-checkin summary{flex-wrap:wrap;row-gap:8px}.layout-checkin summary .ckline{order:1}.layout-checkin summary .layout-chevron{order:2;min-width:32px;text-align:center}.layout-checkin summary .ckbtns{order:3;flex:0 0 100%;display:flex;gap:12px}.ckbtn{flex:1 1 0;min-width:0;min-height:48px;border:1px solid var(--line);background:var(--card);border-radius:12px;font-size:15px;font-weight:600;padding:8px 10px}.layout-checkin summary .layout-water.ckbtn{flex:1 1 0;min-height:48px;padding:8px 10px;border:1px solid var(--line);background:var(--card)}
.sm{min-width:52px;height:48px}.drow{gap:12px;padding:6px 2px}.tick{min-height:48px}.tick input{width:26px;height:26px}.cnt .big{min-height:56px}
.supps{padding:14px}.supphead{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px}.supphead h3{margin:0}.chip.sup{min-height:48px;padding:10px 16px;font-size:15px}.chips:has(.sup){gap:10px}.suppall{margin-top:12px;min-height:48px;width:100%}
.lockbox{text-align:center;padding:30px 18px}.lockbox .big{font-size:38px}
</style>`;
let trayAll = false, dayCheckOpen = false, reviewDetailsOpen = false;
function render() {
  sportsSyncReview();
  const active = { history: 'more', settings: 'more', portfolio: 'more' }[view] || view, unread = S.inbox ? S.inbox.unread : 0;
  $('nav').innerHTML = NAV.map(([k, l, ic]) => `<button data-v="${k}" class="${active === k ? 'on' : ''}"><i>${ic}</i>${l}${k === 'inbox' && unread ? `<span class="nb">${unread > 99 ? '99+' : unread}</span>` : ''}</button>`).join('');
  $('nav').querySelectorAll('button').forEach(b => b.onclick = () => go(b.dataset.v));
  $('fabslot').innerHTML = view === 'today' ? '<button class="fab" data-act="fab" aria-label="Add">+</button>' : '';
  const app = $('app');
  const locked = viewLocked(view);
  app.innerHTML = LAYOUT_STYLES + (locked ? lockScreenHtml(view) : { today: dayHtml, inbox: inboxHtml, review: reviewHtml, more: moreHtml, history: historyHtml, settings: settingsHtml, portfolio: portfolioHtml, sports: sportsHtml }[view]());
  if (locked && lockTried !== view) { lockTried = view; setTimeout(lockUnlock, 50); } else if (!locked) lockTried = '';
  bind(app); bind($('fabslot'));
  if (slideDir && view === 'today') { app.classList.remove('slide-next', 'slide-prev'); void app.offsetWidth; app.classList.add('slide-' + slideDir); }
  slideDir = '';
  if (view === 'today' && viewDate === today() && !didScroll) {
    const n = document.querySelector('.now');
    if (n) { didScroll = true; window.scrollTo(0, Math.max(0, n.getBoundingClientRect().top + window.scrollY - 260)); }
  }
}
let slideDir = '';
function changeDay(delta) {
  viewDate = addDays(viewDate, delta); slideDir = delta > 0 ? 'next' : 'prev';
  render(); window.scrollTo(0, 0); loadDay(viewDate);
}
function go(v) {
  if (v === 'review' && view !== 'review') reviewDate = addDays(today(), -1); // each visit starts on the previous day; use › for today
  view = v; render(); window.scrollTo(0, 0);
  if (v === 'review') loadDay(reviewDate);
  if (v === 'today') loadDay(viewDate);
  if (v === 'inbox') loadInbox();
  if (v === 'sports') loadSportsWeek();
}
function pill(extra = '') {
  let p;
  if (S.demo) p = `<span class="pill">Demo data</span>`;
  else if (!connected()) p = `<button class="pill" data-act="goto-settings">Not connected</button>`;
  else if (loading) p = `<span class="pill">Updating…</span>`;
  else {
    const bad = ['cal', 'tasks', 'health', 'mail'].filter(k => S.status[k] && !S.status[k].ok);
    const at = Math.max(0, ...['cal', 'tasks'].map(k => (S.status[k] || {}).at || 0));
    p = bad.length ? `<button class="pill bad" data-act="goto-settings">${bad.length} problem${bad.length > 1 ? 's' : ''} · details</button>`
      : `<button class="pill" data-act="refresh">${at ? 'Updated ' + new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Refresh'}</button>`;
  }
  return `<span class="pills">${extra}${p}</span>`;
}

/* ----- day (timeline) ----- */
function weekHtml(date) {
  const mon = weekStart(date), t = today(), dow = parseYmd(date).getDay();
  const n = S.settings.weekDays === 5 && dow >= 1 && dow <= 5 ? 5 : 7; // a weekend day always shows the full week so it stays visible
  const days = Array.from({ length: n }, (_, i) => addDays(mon, i));
  return `<div class="wk"><button class="ar" data-act="wprev" aria-label="Previous week">‹</button>${days.map(d => `<button class="wd ${d === date ? 'on' : ''} ${d === t ? 'today' : ''}" data-day="${d}">${parseYmd(d).toLocaleDateString([], { weekday: 'narrow' })}<b>${parseYmd(d).getDate()}</b></button>`).join('')}<button class="ar" data-act="wnext" aria-label="Next week">›</button></div>`;
}
function healthLine(d, withTiles = true) {
  const h = S.health[d] || {};
  const p = [h.sleepMinutes != null && `Slept ${dur(h.sleepMinutes)}`, h.restingHr != null && `resting ${Math.round(h.restingHr)} bpm`].filter(Boolean);
  const tiles = withTiles && (h.steps != null || h.caloriesOut != null) ? `<div class="vit num">${h.steps != null ? `<div><b>${fmt(h.steps)}</b><span>steps so far</span></div>` : ''}${h.caloriesOut != null ? `<div><b>${fmt(h.caloriesOut)}</b><span>kcal burned so far</span></div>` : ''}</div>` : '';
  return tiles + (p.length ? `<p class="health">${p.join(' · ')}</p>` : '');
}
function bucketTasks(open, date) {
  const t = today(), soonEnd = addDays(date, 3), b = { overdue: [], onDay: [], timed: [], waiting: [], progress: [], soon: [], nodate: [], later: 0 };
  for (const x of open) {
    const d = dueDay(x);
    if (x.waiting) b.waiting.push(x);
    else if (d === date && hasTime(x)) b.timed.push(x);
    else if (d === date) b.onDay.push(x);
    else if (d && d < date && date === t) b.overdue.push(x);
    else if (x.status === 'In progress') b.progress.push(x);
    else if (d && d > date && d <= soonEnd) b.soon.push(x);
    else if (!d) b.nodate.push(x);
    else if (d > date) b.later++;
  }
  return b;
}
function taskRow(t, done) {
  const d = dueDay(t), meta = [d && d !== viewDate ? `due ${shortDate(d)}` : '', t.types.join(', '), t.crm ? 'CRM' : '', t.status === 'In progress' ? 'in progress' : ''].filter(Boolean).join(' · ');
  return `<div class="task ${done ? 'done' : ''}"><button class="chk ${done ? 'on' : ''}" data-done="${t.id}" aria-label="${done ? 'Mark not done' : 'Mark done'}">✓</button>
    <button class="tt" data-task="${t.id}"><span class="tn">${esc(t.title)}</span>${meta ? `<span class="sub">${esc(meta)}</span>` : ''}</button></div>`;
}
function trayHtml(date, b) {
  const st = S.status.tasks, T = S.tasks;
  if (!T) return `<div class="card"><h3>To-dos</h3><p class="empty">${connected() ? (loading ? 'Loading your tasks…' : st && !st.ok ? esc(st.message) : 'Nothing loaded yet.') : 'Connect in Settings to see your Notion tasks.'}</p><button class="addrow" data-act="add-task">+ Add task</button></div>`;
  const grp = (label, list, cls = '', total = list.length) => list.length ? `<div class="grouphd ${cls}"><span>${label}</span><span>${total}</span></div>${list.map(t => taskRow(t)).join('')}` : '';
  // At most five rows at first; the rest is one tap away.
  let room = trayAll ? 1e9 : 5; const cap = list => { const part = list.slice(0, room); room -= part.length; return part; };
  const hiddenN = trayAll ? 0 : Math.max(0, b.overdue.length + b.onDay.length - 5);
  const overdueShow = cap(b.overdue), dueShow = cap(b.onDay);
  const top = b.overdue.length + b.onDay.length + b.timed.length, more = b.progress.length + b.soon.length + b.waiting.length + b.nodate.length;
  const done = date === today() ? (T.doneOn[today()] || []) : [];
  const open = S.settings.trayOpen !== false;
  return `<details class="card tray" id="tray" ${open ? 'open' : ''}><summary><span>To-dos · ${top}${b.timed.length ? ` <span class="muted" style="font-weight:400;font-size:13px">(${b.timed.length} on the timeline)</span>` : ''}</span><button class="mini" data-act="add-task">+ Add</button></summary>
    <div class="body">
    ${grp('Overdue', overdueShow, 'bad', b.overdue.length)}${grp(date === today() ? 'Due today' : 'Due ' + dayLabel(date).toLowerCase(), dueShow, '', b.onDay.length)}${hiddenN ? `<button class="showall" data-act="tray-all">Show ${hiddenN} more ›</button>` : (trayAll && b.overdue.length + b.onDay.length > 5 ? '<button class="showall" data-act="tray-all">Show fewer</button>' : '')}
    ${top - b.timed.length ? '' : `<p class="empty">${b.timed.length ? 'Everything else is on the timeline below.' : 'Nothing due. Clear day.'}</p>`}
    ${more + done.length ? `<details style="margin-top:8px"><summary class="muted" style="font-size:14px;cursor:pointer">${more ? `${more} more: in progress, soon, waiting, no date` : ''}${more && done.length ? ' · ' : ''}${done.length ? `${done.length} done today` : ''}</summary>${grp('In progress', b.progress)}${grp('Next three days', b.soon)}${grp('Waiting on others', b.waiting)}${grp('No date', b.nodate)}${done.length ? `<div class="grouphd"><span>Done today</span><span>${done.length}</span></div>${done.map(t => taskRow(t, true)).join('')}` : ''}</details>` : ''}
    ${st && !st.ok ? `<div class="errbox">Could not refresh: ${esc(st.message)}</div>` : ''}</div></details>`;
}
// Side-by-side lanes for overlapping items.
function layoutLanes(items) {
  const sorted = items.slice().sort((a, b) => a.s - b.s || b.e - a.e), clusters = [];
  let cur = null;
  for (const it of sorted) {
    if (!cur || it.s >= cur.end) { cur = { end: it.e, items: [], lanes: [] }; clusters.push(cur); }
    cur.end = Math.max(cur.end, it.e);
    let l = cur.lanes.findIndex(x => x <= it.s);
    if (l < 0) { l = cur.lanes.length; cur.lanes.push(it.e); } else cur.lanes[l] = it.e;
    it.lane = l; cur.items.push(it);
  }
  clusters.forEach(c => c.items.forEach(it => { it.n = c.lanes.length; }));
  return sorted;
}
function timelineHtml(date, timed, tasks) {
  const isToday = date === today(), now = Date.now(), nowM = (now - parseYmd(date).getTime()) / 6e4;
  const items = [
    ...timed.map(ev => { const s = Math.max(0, minutesIn(date, ev.start)); return { ev, s, e: Math.max(s + 15, Math.min(1440, minutesIn(date, ev.end))) }; }),
    ...tasks.map(t => { const s = Math.max(0, minutesIn(date, t.due)); return { t, s, e: s + 30 }; }),
  ];
  let lo = 8, hi = 18;
  for (const i of items) { lo = Math.min(lo, Math.floor(i.s / 60)); hi = Math.max(hi, Math.ceil(i.e / 60)); }
  if (isToday) { lo = Math.min(lo, Math.floor(nowM / 60)); hi = Math.max(hi, Math.ceil(nowM / 60) + 1); }
  lo = Math.max(0, Math.min(lo, 23)); hi = Math.min(24, Math.max(hi, lo + 1));
  const y = m => (m - lo * 60) / 60 * HH, nextEv = isToday ? timed.find(e => Date.parse(e.end) > now) : null;
  let html = '';
  for (let h = lo; h <= hi; h++) html += `<div class="hl" style="top:${(h - lo) * HH}px"></div>${h < hi ? `<div class="hr" style="top:${(h - lo) * HH + 3}px">${String(h).padStart(2, '0')}:00</div>` : ''}`;
  for (const it of layoutLanes(items)) {
    const top = y(it.s), pos = `left:calc(${LW}px + (100% - ${LW}px) * ${it.lane} / ${it.n});width:calc((100% - ${LW}px) / ${it.n} - 4px);`;
    if (it.ev) {
      const e = it.ev, h = Math.max(24, y(it.e) - top - 2), tight = h < 40, past = isToday && Date.parse(e.end) <= now;
      const sub = tight ? '' : `<span>${timeStr(e.start)}–${timeStr(e.end)}${e.location ? ' · ' + esc(e.location.split('\n')[0]) : ''}${e.attendeeCount > 1 ? ` · ${e.attendeeCount} people` : ''}</span>`;
      html += `<button class="tev ${e.busy ? '' : 'n'} ${past ? 'past' : ''} ${nextEv === e ? 'next' : ''}" data-ev="${esc(evKey(e))}" style="top:${top}px;height:${h}px;${pos}"><b>${esc(e.title)}${tight ? ' · ' + timeStr(e.start) : ''}</b>${sub}</button>`;
    } else {
      const t = it.t;
      html += `<div class="ttk" style="top:${top}px;height:30px;${pos}"><button class="chk" data-done="${t.id}" aria-label="Mark done">✓</button><button class="nm" data-task="${t.id}">${esc(t.title)} · ${hm(it.s)}</button></div>`;
    }
  }
  if (isToday) html += `<div class="now" style="top:${y(nowM)}px"></div>`;
  return `<div class="tl" data-start="${lo}" style="height:${(hi - lo) * HH}px">${html}</div>`;
}
function dayHtml() {
  const d = viewDate, isToday = d === today(), c = S.cache[d], ev = c ? c.events : [], now = Date.now();
  const timed = ev.filter(e => !e.allDay), allDay = ev.filter(e => e.allDay), upcoming = isToday ? timed.find(e => Date.parse(e.end) > now) : null;
  const sub = isToday ? (upcoming ? (Date.parse(upcoming.start) <= now ? `Now: ${upcoming.title}` : `Next: ${upcoming.title} in ${untilStr(Date.parse(upcoming.start) - now)}`) : (timed.length ? 'Nothing more today' : 'No meetings today'))
    : (timed.length ? `${timed.length} meeting${timed.length > 1 ? 's' : ''}` : 'No meetings');
  const b = bucketTasks(S.tasks ? S.tasks.open : [], d), sh = c ? dayShape(ev, d) : null;
  const y = addDays(today(), -1), needReview = isToday && !(S.reviews[y] && (S.reviews[y].mood || S.reviews[y].did)) && new Date().getHours() < 14;
  const stale = S.status.cal && !S.status.cal.ok && c ? `<div class="errbox">Could not refresh the calendar: ${esc(S.status.cal.message)}<br>Showing the copy from ${new Date(c.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</div>` : '';
  const calMsg = !c ? `<p class="empty">${connected() ? (loading ? 'Loading your calendar…' : S.status.cal && !S.status.cal.ok ? esc(S.status.cal.message) : 'Nothing loaded yet.') : 'Connect Google in Settings to see your meetings.'}</p>` : '';
  return `<div class="hd"><div><h1>${parseYmd(d).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</h1><div class="mu">${esc(sub)}</div></div>${pill(isToday ? '' : '<button class="pill" data-act="today">Today</button>')}</div>
    ${weekHtml(d)}
    <div class="stack">
    ${isToday ? dayCheckinHtml(d, needReview) : d <= today() ? trackCard(d) : ''}${isToday ? portfolioLine() : ''}
    ${allDay.length ? `<div class="allday">${allDay.map(e => `<span>${esc(e.title)}</span>`).join('')}</div>` : ''}
    ${nextUpHtml(d, timed)}
    ${trayHtml(d, b)}
    <h2 style="font-size:16px;margin:12px 2px 8px">Agenda</h2>
    ${sh ? `<p class="shape"><b>${sh.count} meeting${sh.count > 1 ? 's' : ''}</b> · ${dur(sh.mins)} booked${sh.free ? ` · longest free block <b>${timeStr(sh.free[0])}–${timeStr(sh.free[1])}</b>` : ''}</p>` : ''}
    ${calMsg}${timelineHtml(d, timed, b.timed)}${stale}
    ${c && c.errors && c.errors.length ? `<div class="errbox">Some calendars could not be read: ${esc(c.errors.map(e => e.calendar).join(', '))}</div>` : ''}
    </div>`;
}

function dayCheckinHtml(d, needReview) {
  const r = readiness(d), entry = S.reviews[d] || {}, h = S.health[d] || {}, locked = lockedNow();
  // One line that is always visible: readiness, steps, calories burned and water. Tap it for the detail and the counters.
  const line = [r.pending ? 'Readiness pending' : `Readiness ${r.score}/10`, h.steps != null ? `${fmt(h.steps)} steps` : '', h.caloriesOut != null ? `${fmt(h.caloriesOut)} kcal` : '', `💧 ${entry.water || 0}`, drank(entry) ? `🍺 ${drinkTotal(entry)}` : ''].filter(Boolean).map(x => `<span style="white-space:nowrap">${esc(x)}</span>`).join(' · ');
  return `<div class="card layout-checkin"><div class="layout-checkin-top"><div><b>Check-in</b>${needReview ? ' <span class="muted">Yesterday not logged</span>' : ''}</div>${needReview ? '<button class="layout-log" data-act="review-yesterday">Log it ›</button>' : ''}</div><details class="layout-checkin" id="dayCheckDetails" ${dayCheckOpen ? 'open' : ''}><summary><span class="muted ckline">${line}</span><span class="layout-chevron">⌄</span><span class="ckbtns"><button class="ckbtn layout-water" data-cnt data-date="${d}" data-key="water" data-by="1" aria-label="Add a glass of water">+ 💧 Water</button>${drank(entry) && !locked ? `<button class="ckbtn layout-beer" data-cnt data-date="${d}" data-key="beer" data-by="1" aria-label="Add a beer">+ 🍺 Beer</button>` : ''}</span></summary><div class="layout-checkin-content">${readinessCard(d)}${healthLine(d, false)}<div class="track" style="margin-top:8px">${trackHtml(d, false, locked)}</div></div></details></div>`;
}
/** The next meetings of today, so the day's shape is clear before the to-dos. */
function nextUpHtml(d, timed) {
  if (d !== today()) return '';
  const now = Date.now(), list = timed.filter(e => Date.parse(e.end) > now).slice(0, 3);
  if (!list.length) return '';
  return `<div class="card nextup"><h3>Next up</h3>${list.map(e => { const live = Date.parse(e.start) <= now; return `<button class="nuw" data-ev="${esc(evKey(e))}"><span class="nut num">${live ? 'Now' : esc(timeStr(e.start))}</span><span class="nun">${esc(e.title)}${e.location ? `<small>${esc(e.location)}</small>` : e.video ? '<small>Video call</small>' : ''}</span></button>`; }).join('')}</div>`;
}
/* ----- readiness for training (1 to 10), from your own sleep, resting heart rate, HRV and recent load ----- */
const median = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// Your normal for a metric: the median of up to 28 earlier days, and how much it usually varies (robust spread, with a floor so tiny wobbles do not count).
function baseline(metric, date, floor) {
  const v = [];
  for (let i = 1; i <= 28; i++) { const x = (S.health[addDays(date, -i)] || {})[metric]; if (typeof x === 'number') v.push(x); }
  if (v.length < 7) return { n: v.length, ok: false };
  const med = median(v), mad = median(v.map(x => Math.abs(x - med))) * 1.4826;
  return { n: v.length, ok: true, med, sd: Math.max(mad, floor) };
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
function readiness(date) {
  const h = S.health[date] || {};
  if (typeof h.sleepMinutes !== 'number') return { pending: true };
  const parts = [];
  // Sleep: nothing under 4 hours, full marks at 8, with a little credit for deep and REM making up around 40 percent of it.
  const dScore = clamp((h.sleepMinutes - 240) / 240, 0, 1) * 100;
  const stage = typeof h.sleepDeepMin === 'number' ? (h.sleepDeepMin + (h.sleepRemMin || 0)) / h.sleepMinutes : null;
  parts.push({ k: 'sleep', name: 'Sleep', w: 0.35, pts: stage == null ? dScore : dScore * 0.8 + Math.min(1, stage / 0.4) * 20, text: `${dur(h.sleepMinutes)}${stage != null ? `, ${Math.round(stage * 100)}% deep and REM` : ''}`, hint: 'Full marks from 8 hours.' });
  const bHrv = baseline('hrv', date, 3), bRhr = baseline('restingHr', date, 1.5);
  if (typeof h.hrv === 'number' && bHrv.ok) { const z = (h.hrv - bHrv.med) / bHrv.sd; parts.push({ k: 'hrv', name: 'Heart rate variability', w: 0.25, pts: clamp(60 + 20 * z, 0, 100), text: `${Math.round(h.hrv)} ms, ${h.hrv >= bHrv.med ? '+' : '−'}${Math.abs(Math.round(h.hrv - bHrv.med))} vs your usual ${Math.round(bHrv.med)}`, hint: 'Higher than your normal is better.' }); }
  if (typeof h.restingHr === 'number' && bRhr.ok) { const z = (h.restingHr - bRhr.med) / bRhr.sd; parts.push({ k: 'rhr', name: 'Resting heart rate', w: 0.25, pts: clamp(60 - 20 * z, 0, 100), text: `${Math.round(h.restingHr)} bpm, ${h.restingHr >= bRhr.med ? '+' : '−'}${Math.abs(Math.round(h.restingHr - bRhr.med))} vs your usual ${Math.round(bRhr.med)}`, hint: 'Lower than your normal is better.' }); }
  // Recent load: the last two days of activity against your own 28-day average.
  const load = [1, 2].map(i => (S.health[addDays(date, -i)] || {}).activeKcal).filter(x => typeof x === 'number'), bLoad = baseline('activeKcal', date, 50);
  if (load.length && bLoad.ok) { const ratio = (load.reduce((a, b) => a + b, 0) / load.length) / bLoad.med; parts.push({ k: 'load', name: 'Recent training load', w: 0.15, pts: clamp(100 - (ratio - 0.7) * 100, 20, 100), text: ratio <= 0.85 ? 'lighter than usual' : ratio <= 1.15 ? 'about your usual' : `${Math.round((ratio - 1) * 100)}% above your usual`, hint: 'A heavy last two days lowers it.' }); }
  const wSum = parts.reduce((a, p) => a + p.w, 0), base = parts.reduce((a, p) => a + p.w * p.pts, 0) / wSum;
  // Body signals that look like the start of an illness cap the score.
  const flags = [];
  if (typeof h.skinTempDelta === 'number' && h.skinTempDelta >= 0.8) flags.push(`skin temperature ${h.skinTempDelta.toFixed(1)}°C above your normal`);
  const bBr = baseline('breathingRate', date, 0.4);
  if (typeof h.breathingRate === 'number' && bBr.ok && h.breathingRate - bBr.med >= 1.5) flags.push(`breathing rate up ${(h.breathingRate - bBr.med).toFixed(1)} per minute`);
  const bOx = baseline('spo2', date, 0.5);
  if (typeof h.spo2 === 'number' && bOx.ok && bOx.med - h.spo2 >= 2) flags.push(`blood oxygen ${(bOx.med - h.spo2).toFixed(1)} points below usual`);
  // An average night with average vitals lands around 7. With only sleep to go on, it cannot claim more than 7.
  let raw = 1 + 9 * clamp((base - 10) / 90, 0, 1);
  if (parts.length < 3) raw = Math.min(raw, 7);
  const ill = !!(S.reviews[date] || {}).ill; // you said you are ill or injured
  const capped = (flags.length > 0 || ill) && raw > 5;
  const score = clamp(Math.round(capped ? 5 : raw), 1, 10);
  const label = score >= 8 ? 'Good to go hard' : score >= 6 ? 'Normal training' : score >= 4 ? 'Keep it light' : 'Rest or recover';
  const missing = [!parts.some(p => p.k === 'hrv') && 'HRV', !parts.some(p => p.k === 'rhr') && 'resting heart rate', !parts.some(p => p.k === 'load') && 'training load'].filter(Boolean);
  return { score, label, parts, flags, ill, capped, missing, base: Math.round(base), learning: Math.min(bHrv.n, bRhr.n) };
}
function readinessColor(sc) { return sc >= 8 ? 'var(--good)' : sc >= 6 ? 'var(--ink)' : sc >= 4 ? 'var(--warn)' : 'var(--danger)'; }
function readinessCard(date) {
  const r = readiness(date);
  if (r.pending) return `<div class="rd" style="cursor:default"><span class="n muted">–<small>/10</small></span><span class="t"><b>Readiness for training</b><span>Waiting for last night's sleep data. Refresh after your watch has synced.</span></span></div>`;
  const note = r.ill ? 'You marked yourself ill or injured, so it is held at 5.' : r.flags.length ? `Body signals look off: ${r.flags[0]}.` : r.missing.length ? `Based on ${r.parts.map(p => p.name.toLowerCase()).join(' and ')}.` : 'Sleep, HRV, resting heart rate and recent load.';
  return `<button class="rd" data-act="readiness"><span class="n" style="color:${readinessColor(r.score)}">${r.score}<small>/10</small></span><span class="t"><b>${r.label}</b><span>${esc(note)}</span></span></button>`;
}
function openReadiness() {
  const r = readiness(viewDate);
  if (r.pending) return openSheet(`<h2>Readiness for training</h2><p class="muted">There is no sleep figure for ${esc(dayLabel(viewDate).toLowerCase())} yet. It appears once your watch has synced last night's sleep.</p><div class="row" style="margin-top:14px"><button class="btn day" id="rdOk">Close</button></div>`) || ($('rdOk').onclick = closeSheet);
  openSheet(`<h2><span style="color:${readinessColor(r.score)}">${r.score}/10</span> · ${r.label}</h2>
    <p class="muted" style="margin:2px 0 8px">${esc(longDate(viewDate))}. Each part is scored against your own normal over the last 28 days.</p>
    ${r.ill ? `<div class="errbox">You marked ${esc(dayLabel(viewDate).toLowerCase())} as ill or injured, so the score is held at 5. Untick it on the day screen if that changes.</div>` : ''}
    ${r.flags.length ? `<div class="errbox">${r.capped ? 'The score is held at 5 because ' : 'Worth watching: '}${esc(r.flags.join(', '))}. These can come before an illness. Treat today as a lighter day.</div>` : ''}
    ${r.parts.map(p => `<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-weight:600">${esc(p.name)}</b><span class="muted num">${Math.round(p.pts)} of 100 · ${Math.round(p.w / r.parts.reduce((a, q) => a + q.w, 0) * 100)}% of the score</span></div><div class="bar2"><i style="width:${Math.round(p.pts)}%"></i></div><div class="muted" style="font-size:13px;margin-top:3px">${esc(p.text)}. ${esc(p.hint)}</div></div>`).join('')}
    ${r.missing.length ? `<p class="muted" style="font-size:13px;margin-top:14px">Not included yet: ${esc(r.missing.join(', '))}${r.learning < 7 ? `. Your baseline needs at least 7 days of data (you have ${r.learning}).` : '. No figure for it today.'}</p>` : ''}
    <p class="muted" style="font-size:12px;margin-top:14px">A rule of thumb from your own numbers, not medical advice. If you feel unwell, listen to your body over this score.</p>
    <div class="row" style="margin-top:14px"><button class="btn day" id="rdOk">Close</button></div>`);
  $('rdOk').onclick = closeSheet;
}

/* ----- inbox ----- */
const mailBodies = {}, mailOpen = new Set(); // mail text is kept in memory only, never saved on the phone
function toggleMail(id) {
  if (mailOpen.has(id)) mailOpen.delete(id);
  else { mailOpen.add(id); if (!mailBodies[id] || mailBodies[id].error) loadMailBody(id); }
  render();
}
async function loadMailBody(id) {
  mailBodies[id] = { loading: true };
  try { mailBodies[id] = S.demo ? demoMailBody(id) : await post('/api/mail/message', { id }); }
  catch (e) { mailBodies[id] = { error: e.message }; }
  if (view === 'inbox') render();
}
function demoMailBody(id) {
  const t = { m1: 'Hi Matthias,\n\nThanks for sending this over. Can we move the kickoff to the week of the 16th? Legal wants one more look at the terms before we sign.\n\nBest,\nDana', m2: 'Your October statement is now available in online banking. Sign in to view it.', m3: 'Are you free around one on Thursday? Café Central again?\n\nTom' };
  return { text: t[id] || 'Demo mail.', truncated: false, files: id === 'm1' ? [{ name: 'Terms v3.pdf', size: 2048 }] : [] };
}
const mailLink = m => `https://mail.google.com/mail/u/${encodeURIComponent((S.inbox && S.inbox.account) || '0')}/#inbox/${m.threadId}`;
function inboxHtml() {
  const I = S.inbox, st = S.status.mail, now = Date.now();
  const f = { all: () => true, crm: m => !!m.crm, starred: m => m.starred, recent: m => now - m.at < 2 * 864e5 }[mailFilter];
  const list = I ? I.messages.filter(f) : [];
  const chips = [['all', 'All'], ['crm', 'From CRM'], ['starred', 'Starred'], ['recent', 'Last 2 days']];
  return `<div class="hd"><div><h1>Inbox</h1><div class="mu">${I ? `${I.unread} unread in your main inbox${I.messages.length < I.unread ? ` · showing the latest ${I.messages.length}` : ''}` : ''}</div></div>${pill()}</div>
    <div class="chips" style="margin-bottom:6px">${chips.map(([k, l]) => `<button class="chip ${mailFilter === k ? 'on' : ''}" data-mf="${k}">${l}</button>`).join('')}</div>
    ${!I ? `<p class="empty">${connected() ? (st && !st.ok ? '' : 'Loading your inbox…') : 'Connect Google in Settings to see your unread mail.'}</p>` : ''}
    ${st && !st.ok ? `<div class="errbox">${esc(st.message)}${I ? '<br>Showing the copy from ' + new Date(I.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.' : ''}</div>` : ''}
    ${I && !list.length ? '<p class="empty">Nothing here. Inbox zero for this filter.</p>' : ''}
    ${list.map(m => { const open = mailOpen.has(m.id), b = mailBodies[m.id]; return `<div class="mail ${open ? 'open' : ''}"><div class="mrow"><button class="mb" data-mopen="${esc(m.id)}" aria-expanded="${open}">
      <div class="l1"><b>${esc(m.from.name)}${m.crm ? `<span class="badge day" style="color:var(--ink)">CRM${m.crm.tier ? ' ' + esc(m.crm.tier.split(' ')[0]) : ''}</span>` : ''}${m.starred ? ' ★' : ''}</b><span>${mailTime(m.at)}</span></div>
      <div class="l2">${esc(m.subject)}</div><div class="l3">${esc(m.snippet)}</div></button>
      <button class="mt" data-mtask="${esc(m.id)}" aria-label="Make a task from this mail">+ Task</button></div>
      ${open ? `<div class="mexp">${!b || b.loading ? '<span class="muted">Loading the mail…</span>' : b.error ? `<div class="errbox" style="margin-top:0">${esc(b.error)}</div>`
        : `<div class="mbody">${linkify(b.text)}</div>${b.truncated ? '<div class="muted" style="font-size:12px;margin-top:6px">Shortened. Open the mail in Gmail for the rest.</div>' : ''}${b.files && b.files.length ? `<div class="muted" style="font-size:12px;margin-top:6px">Attachments: ${esc(b.files.map(f => f.name).join(', '))}</div>` : ''}`}
        <div class="mact"><a class="btn day" href="${esc(mailLink(m))}" target="_blank" rel="noopener">Open in Gmail</a><button class="btn" data-mopen="${esc(m.id)}">Close</button></div></div>` : ''}</div>`; }).join('')}
    <p class="muted" style="font-size:12px;margin:12px 2px 0">Your main (Primary) inbox only: social, promotions and updates are left out. Tap a mail to read it here, or open it in Gmail. Reading here does not mark it as read in Gmail. My Day only reads your mail.</p>`;
}

/* ----- more / history ----- */
function moreHtml() {
 return `<div class="layout-more"><div class="hd"><h1>More</h1><button class="pill layout-top-settings" data-act="to-settings">Settings ›</button></div><h2>Your apps</h2><div class="layout-more-grid"><a class="menu" href="${POCKET_CRM_URL}" target="_blank" rel="noopener" data-android="${esc(intentLink(POCKET_CRM_URL, POCKET_CRM_PACKAGE))}"><i>☎</i><span>Pocket CRM<small>Your contacts, people and next meetings</small></span></a>
<a class="menu" href="${LINKEDIN_URL}" target="_blank" rel="noopener" data-android="${esc(intentLink(LINKEDIN_URL, 'com.linkedin.android'))}"><i>in</i><span>LinkedIn<small>Opens the LinkedIn app</small></span></a>
<a class="menu" href="${RANKINGS_URL}" target="_blank" rel="noopener" data-android="${esc(intentLink(RANKINGS_URL, RANKINGS_PACKAGE))}"><i>🎾</i><span>Racket Rankings<small>Your tennis and padel results and rankings</small></span></a>
<a class="menu" href="${GYM_URL}" target="_blank" rel="noopener" data-android="${esc(intentLink(GYM_URL, GYM_PACKAGE))}"><i>🏋</i><span>Gym<small>Your workouts, programme and progress</small></span></a>
    <a class="menu" href="${GOLF_URL}" target="_blank" rel="noopener"><i>⛳</i><span>GolfCaddie<small>Golf rounds</small></span></a>
    <a class="menu" href="${LIBRARY_URL}" target="_blank" rel="noopener"><i>📚</i><span>Library<small>Books and reading</small></span></a>
    <a class="menu" href="${CALORIE_URL}" target="_blank" rel="noopener"><i>🍎</i><span>Calorie tracker<small>Food and nutrition</small></span></a>
<button class="menu" data-act="to-portfolio"><i>📈</i><span>Portfolio<small>${portfolioSubtitle()}</small></span></button></div><h2>Notion</h2><div class="card layout-more-group"><button class="menu" data-act="new-note-now"><i>＋</i><span>New meeting note<small>Creates it in your Notion Meetings database and opens it</small></span></button><a class="menu" href="${MEETINGS_DB_URL}" target="_blank" rel="noopener"><i>▤</i><span>Meetings database<small>Open in Notion</small></span></a><a class="menu" href="${TASKS_DB_URL}" target="_blank" rel="noopener"><i>☑</i><span>Task database<small>Open in Notion</small></span></a></div><h2>MyDay</h2><div class="card layout-more-group"><button class="menu" data-act="to-history"><i>↗</i><span>History<small>Mood over time and patterns</small></span></button><button class="menu" data-act="to-settings"><i>⚙</i><span>Settings<small>Connection, theme, backup</small></span></button></div></div>`;
}
function suppHistoryHtml(days) {
  const logged = days.filter(d => S.reviews[d]), list = suppList(), any = logged.some(d => suppsTaken(S.reviews[d]).length);
  if (!any) return '';
  const full = logged.filter(d => suppAll(S.reviews[d])).length;
  return `<div class="card"><h3>Supplements</h3><div class="kv num">${list.map(t => `<span class="k">${esc(t)}</span><b>${logged.filter(d => suppsTaken(S.reviews[d]).includes(t)).length} of ${logged.length} days</b>`).join('')}<span class="k">All of them</span><b>${full} of ${logged.length} days</b></div></div>`;
}
function insightHtml(days) {
  const rows = days.map(d => ({ d, r: S.reviews[d], h: S.health[d] })).filter(x => x.r && x.r.mood);
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const cmp = (label, yes, no, yl, nl) => (yes.length >= 4 && no.length >= 4)
    ? `<span class="k">${label}</span><b>${avg(yes.map(x => x.r.mood)).toFixed(1)} vs ${avg(no.map(x => x.r.mood)).toFixed(1)}</b><span class="k" style="grid-column:1/-1;font-size:12px;margin-top:-4px">average mood: ${yl} (${yes.length} days) vs ${nl} (${no.length} days)</span>` : '';
  const withSleep = rows.filter(x => x.h && x.h.sleepMinutes != null);
  const lines = [
    cmp('Sleep 7h or more', withSleep.filter(x => x.h.sleepMinutes >= 420), withSleep.filter(x => x.h.sleepMinutes < 420), '7h+ of sleep', 'less sleep'),
    cmp('Days with sport', rows.filter(x => isSport(x.r)), rows.filter(x => !isSport(x.r)), 'sport', 'no sport'),
    cmp('All supplements taken', rows.filter(x => suppAll(x.r)), rows.filter(x => !suppAll(x.r)), 'all taken', 'not all'),
    cmp('Days with alcohol', rows.filter(x => drank(x.r)), rows.filter(x => !drank(x.r)), 'alcohol', 'no alcohol'),
    cmp('Days with 6+ glasses of water', rows.filter(x => (x.r.water || 0) >= 6), rows.filter(x => (x.r.water || 0) < 6), '6+ glasses', 'less water'),
    cmp('Travel days', rows.filter(x => x.r.travel), rows.filter(x => !x.r.travel), 'travelling', 'at home'),
    cmp('Days ill or injured', rows.filter(x => x.r.ill), rows.filter(x => !x.r.ill), 'ill or injured', 'well'),
    cmp('Days with sex', rows.filter(x => x.r.sex), rows.filter(x => !x.r.sex), 'sex', 'none'),
    cmp('Days with 8,000+ steps', rows.filter(x => x.h && x.h.steps >= 8000), rows.filter(x => x.h && x.h.steps != null && x.h.steps < 8000), '8,000+ steps', 'fewer steps'),
  ].filter(Boolean);
  return `<div class="card"><h3>Patterns</h3>${lines.length ? `<div class="kv num">${lines.join('')}</div>` : `<p class="empty">Patterns show up once you have at least four logged days on each side of a comparison (sleep, sport, steps, alcohol, water). You have ${rows.length} mood entries in this period.</p>`}
    <p class="muted" style="font-size:12px;margin:10px 0 0">These are averages of your own entries, not proof that one thing causes the other.</p></div>`;
}
function sportHtml(days) {
  const counts = {};
  for (const d of days) for (const t of (S.reviews[d] || {}).tags || []) if (SPORT_TAGS.includes(t)) counts[t] = (counts[t] || 0) + 1;
  const total = days.filter(d => S.reviews[d] && isSport(S.reviews[d])).length;
  return `<div class="card"><h3>Sport</h3>${total ? `<div class="kv num">${SPORT_TAGS.filter(t => counts[t]).map(t => `<span class="k">${esc(t)}</span><b>${counts[t]}×</b>`).join('')}<span class="k">Days with sport</span><b>${total} of ${days.length}</b></div>` : '<p class="empty">Tag a day with Run, Walk, Gym, Golf, Tennis or Padel in the Review and it shows up here.</p>'}</div>`;
}
function moodChart(days) {
  const W = 340, H = 110, padL = 22, padB = 16, padT = 8, pw = W - padL - 6, ph = H - padB - padT;
  const x = i => padL + (days.length === 1 ? pw / 2 : (i / (days.length - 1)) * pw), y = v => padT + ph - ((v - 1) / 4) * ph;
  let svg = [1, 3, 5].map(v => `<line x1="${padL}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${padL - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('');
  let seg = [], path = '';
  const flush = () => { if (seg.length > 1) path += `<polyline points="${seg.join(' ')}" fill="none" stroke="var(--ink)" stroke-width="2"/>`; seg = []; };
  days.forEach((d, i) => { const m = (S.reviews[d] || {}).mood; if (m) seg.push(`${x(i).toFixed(1)},${y(m).toFixed(1)}`); else flush(); });
  flush();
  const dots = days.map((d, i) => { const m = (S.reviews[d] || {}).mood; return m ? `<circle cx="${x(i).toFixed(1)}" cy="${y(m).toFixed(1)}" r="3" fill="var(--ink)"/>` : ''; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Mood over time">${svg}${path}${dots}</svg>`;
}
function historyHtml() {
  const t = today(), days = [];
  for (let i = histDays - 1; i >= 0; i--) days.push(addDays(t, -i));
  const logged = days.filter(d => S.reviews[d]);
  const list = [...logged].reverse().map(d => {
    const r = S.reviews[d], h = S.health[d] || {};
    const sub = [(r.tags || []).join(', '), r.energy ? `energy ${r.energy}/5` : '', h.sleepMinutes != null ? `slept ${dur(h.sleepMinutes)}` : '', h.steps != null ? `${fmt(h.steps)} steps` : '', drinkTotal(r) ? `${drinkTotal(r)} drink${drinkTotal(r) === 1 ? '' : 's'}` : '', r.water ? `${litres(r.water)} L water` : '', r.travel ? 'travelling' : '', r.ill ? 'ill or injured' : ''].filter(Boolean).join(' · ');
    const text = (r.win || r.did || '').split('\n')[0];
    return `<button class="hrow" data-rev="${d}"><span class="em">${r.mood ? MOODS[r.mood - 1][0] : '•'}</span><span><span class="hd2">${shortDate(d)}</span><span class="sub">${esc(sub)}</span>${text ? `<span class="sub" style="color:var(--ink)">${esc(text.slice(0, 120))}</span>` : ''}</span></button>`;
  }).join('');
  return `<button class="back" data-act="to-more">‹ More</button><div class="hd"><h1>History</h1>${pill()}</div><div class="stack">
    <div class="seg">${[14, 30, 90].map(n => `<button data-hist="${n}" class="${histDays === n ? 'on' : ''}">${n} days</button>`).join('')}</div>
    <div class="card"><h3>Mood</h3>${moodChart(days)}<p class="muted" style="font-size:12px;margin:6px 0 0">${logged.length} of ${histDays} days logged. Gaps are days with no entry.</p></div>
    ${sportHtml(days)}
    ${suppHistoryHtml(days)}
    ${insightHtml(days)}
    <div class="card"><h3>Your days</h3>${list || '<p class="empty">Nothing logged yet. Try the Review tab tomorrow morning.</p>'}</div></div>`;
}

/* ----- review ----- */
function dateBar(date, prevAct, nextAct) {
  return `<div class="hd"><div style="display:flex;align-items:center;gap:6px">
    <button class="pill" data-act="${prevAct}" aria-label="Previous day">‹</button>
    <div><h1 style="font-size:19px">${dayLabel(date)}</h1><div class="mu">${longDate(date)}</div></div>
    <button class="pill" data-act="${nextAct}" aria-label="Next day">›</button></div>${pill()}</div>`;
}
function factsHtml(date) {
  const c = S.cache[date], done = (S.tasks && S.tasks.doneOn[date]) || [], h = S.health[date] || {};
  const timed = c ? c.events.filter(e => !e.allDay) : [];
  const hb = [h.steps != null && `${fmt(h.steps)} steps`, h.sleepMinutes != null && `slept ${dur(h.sleepMinutes)} the night before`, h.caloriesOut != null && `${fmt(h.caloriesOut)} kcal burned`, h.restingHr != null && `resting HR ${Math.round(h.restingHr)}`].filter(Boolean);
  if (!timed.length && !done.length && !hb.length) return '';
  return `<div class="card facts"><h3>What the day looked like</h3>
    ${timed.length ? `<div class="muted" style="font-size:13px">Meetings</div><ul>${timed.map(e => `<li>${timeStr(e.start)} ${esc(e.title)}</li>`).join('')}</ul>` : ''}
    ${done.length ? `<div class="muted" style="font-size:13px">Tasks completed</div><ul>${done.map(t => `<li>${esc(t.title)}</li>`).join('')}</ul>` : ''}
    ${hb.length ? `<div class="muted" style="font-size:13px">Health</div><p style="margin:4px 0;font-size:14px">${hb.join(' · ')}</p>` : ''}
    ${timed.length || done.length ? `<button class="btn" style="margin-top:8px" data-act="fill-notes">Add meetings and tasks to my notes</button>` : ''}</div>`;
}
function suppCardHtml(date) {
  const r = S.reviews[date] || {}, list = suppList(), got = suppsTaken(r).filter(x => list.includes(x)).length, all = suppAll(r), st = suppStreak(date);
  return `<div class="card supps"><div class="supphead"><h3>Supplements</h3><span class="muted num">${got}/${list.length}${st >= 2 ? ` · 🔥 ${st} days in a row` : ''}</span></div>
    <div class="chips">${list.map(t => `<button class="chip sup ${suppsTaken(r).includes(t) ? 'on' : ''}" data-supp="${esc(t)}" aria-pressed="${suppsTaken(r).includes(t)}">${esc(t)}</button>`).join('')}</div>
    <button class="btn suppall" data-supp-all="${all ? 'clear' : 'all'}">${all ? 'Clear all' : 'Took all'}</button></div>`;
}
function reviewHtml() {
  const r = S.reviews[reviewDate] || {}, tags = [...BASE_TAGS, ...S.tags];
  return `${dateBar(reviewDate, 'rprev', 'rnext')}<div class="stack">
    <div class="card layout-review-core"><h3>How was the day?</h3>
      <div class="moods">${MOODS.map(([e, l], i) => `<button data-mood="${i + 1}" class="${r.mood === i + 1 ? 'on' : ''}" aria-label="${l}">${e}<small>${l}</small></button>`).join('')}</div>
      <span class="lbl2">Energy</span>
      <div class="scale">${[1, 2, 3, 4, 5].map(n => `<button data-energy="${n}" class="${r.energy === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="scalehint"><span>drained</span><span>full of energy</span></div>
      <span class="lbl2">What happened</span>
      <textarea class="field" id="did" style="margin-top:0" placeholder="Meetings, workout, who you saw, anything worth remembering">${esc(r.did || '')}</textarea>
      <span class="lbl2">Best moment or one win</span>
      <input class="field" id="win" style="margin-top:0" value="${esc(r.win || '')}" placeholder="Optional">
      <div class="saved" id="saved">${r.updatedAt ? 'Saved ✓' : ''}</div></div>
    ${suppCardHtml(reviewDate)}
    <details class="card layout-review-details" id="reviewDetails" ${reviewDetailsOpen ? 'open' : ''}><summary><b>Details</b><span>Tags, sport, water & more <i class="layout-chevron">⌄</i></span></summary><div class="layout-details-body">      <span class="lbl2">Sport</span><p class="muted" style="font-size:12px">Completed activities select their sport automatically on the activity day. Plans and class calendar holds do not.</p>
      <div class="chips">${SPORT_TAGS.map(t => `<button class="chip ${(r.tags || []).includes(t) ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <span class="lbl2">What was it about?</span>
      <div class="chips">${tags.map(t => `<button class="chip ${(r.tags || []).includes(t) ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}<button class="chip" data-act="new-tag">+ tag</button></div>
      <span class="lbl2">Water, alcohol and other</span>
      ${trackHtml(reviewDate, true)}
</div></details><p class="muted layout-review-note">Completed sports still fill in automatically.</p>
    ${factsHtml(reviewDate)}
    ${r.updatedAt ? `<button class="btn" data-act="clear-review">Clear this day's review</button>` : ''}</div>`;
}
let saveTimer;
// One entry per day holds the review and the quick counters, so the day screen and the Review tab always agree.
function patchDay(date, patch) {
  const r = S.reviews[date] || (S.reviews[date] = {});
  Object.assign(r, patch, { updatedAt: Date.now() });
  const empty = !r.mood && !r.energy && !r.alcohol && !r.sex && !r.travel && !r.ill && !suppsTaken(r).length && !r.water && !drinkTotal(r) && !(r.tags || []).length && !(r.did || '').trim() && !(r.win || '').trim();
  if (empty) delete S.reviews[date];
  save();
}
function patchReview(patch) {
  patchDay(reviewDate, patch);
  const el = $('saved'); if (el) el.textContent = 'Saved ✓';
}
function bump(date, key, by) {
  const r = S.reviews[date] || {};
  if (key === 'water') return patchDay(date, { water: Math.max(0, (r.water || 0) + by) });
  patchDay(date, { drinks: { ...(r.drinks || {}), [key]: Math.max(0, ((r.drinks || {})[key] || 0) + by) }, alcohol: true });
}
function setFlag(date, key, on) {
  const r = S.reviews[date] || {};
  if (key === 'alcohol' && !on && drinkTotal(r) > 0) { if (!confirm('Switch off alcohol and clear the drinks you counted?')) return false; return patchDay(date, { alcohol: false, drinks: {} }); }
  patchDay(date, { [key]: on });
}
const litres = n => (n * GLASS_ML / 1000).toFixed(2).replace(/\.?0+$/, '');
/** The day screen's box: one slim line when closed (with a quick +1 glass), the full counters when open. It edits the same day entry the Review tab shows. */
function trackCard(d) {
  const r = S.reviews[d] || {}, open = !!S.settings.trackOpen, w = r.water || 0, n = drinkTotal(r);
  const lk = lockedNow(), sum = [w ? `💧 ${w}` : '', !lk && n ? `🍺 ${n}` : '', !lk && r.travel ? '✈ travelling' : '', !lk && r.ill ? '🤒 ill or injured' : ''].filter(Boolean).join(' · ') || 'Water, alcohol, travel, ill';
  return `<div class="card track"><div class="thead"><button class="tog" data-act="track-toggle" aria-expanded="${open}"><span>${d === today() ? '' : `<b>${esc(shortDate(d))}</b> · `}${esc(sum)}</span><i>${open ? '▴' : '▾'}</i></button>${open ? '' : `<button class="sm" data-cnt data-date="${d}" data-key="water" data-by="1" aria-label="Add a glass of water">+💧</button>`}</div>${open ? `<div style="margin-top:8px">${trackHtml(d, false)}</div>` : ''}</div>`;
}
/** Water counter, drink counters (only while "drinking alcohol" is ticked), travel and illness. Shared by the day screen and Review. */
function trackHtml(date, withSex, locked = lockedNow()) {
  const r = S.reviews[date] || {}, w = r.water || 0, tick = (k, label) => `<label class="tick"><input type="checkbox" data-flag="${k}" data-date="${date}" ${r[k] ? 'checked' : ''}> ${label}</label>`;
  return `<div class="cnt"><button class="big" data-cnt data-date="${date}" data-key="water" data-by="1" aria-label="Add a glass of water"><span>💧 Water</span><b class="num">${w}</b><small>${w ? `${w === 1 ? 'glass' : 'glasses'} · ${litres(w)} L` : 'tap to add a glass'}</small></button>${w ? `<button class="sm" data-cnt data-date="${date}" data-key="water" data-by="-1" aria-label="Remove a glass">−</button>` : ''}</div>
    ${locked ? '<button class="btn" data-act="lock-unlock" style="margin-top:8px">🔒 Unlock for alcohol, travel and illness</button>' : ''}${locked ? '' : tick('alcohol', 'Drinking alcohol')}
    ${!locked && drank(r) ? DRINKS.map(([k, l]) => { const n = (r.drinks || {})[k] || 0; return `<div class="drow"><span>${l}</span><button class="sm" data-cnt data-date="${date}" data-key="${k}" data-by="-1" ${n ? '' : 'disabled'} aria-label="One less ${l}">−</button><b class="num">${n}</b><button class="sm" data-cnt data-date="${date}" data-key="${k}" data-by="1" aria-label="One more ${l}">+</button></div>`; }).join('') + `<div class="muted" style="font-size:12px;margin:2px 2px 6px">${drinkTotal(r)} drink${drinkTotal(r) === 1 ? '' : 's'} in total</div>` : ''}
    ${locked ? '' : tick('travel', 'Travelling') + tick('ill', 'Ill or injured') + (withSex ? tick('sex', 'Had sex') : '')}`;
}
function bindReview(root) {
  root.querySelectorAll('[data-mood]').forEach(b => b.onclick = () => { const v = +b.dataset.mood, cur = (S.reviews[reviewDate] || {}).mood; patchReview({ mood: cur === v ? null : v }); render(); });
  root.querySelectorAll('[data-energy]').forEach(b => b.onclick = () => { const v = +b.dataset.energy, cur = (S.reviews[reviewDate] || {}).energy; patchReview({ energy: cur === v ? null : v }); render(); });
  root.querySelectorAll('[data-supp]').forEach(b => b.onclick = () => { const t = b.dataset.supp, cur = suppsTaken(S.reviews[reviewDate]); patchReview({ supps: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] }); render(); });
  root.querySelectorAll('[data-supp-all]').forEach(b => b.onclick = () => { patchReview({ supps: b.dataset.suppAll === 'all' ? [...suppList()] : [] }); render(); });
  root.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => {
    const t = b.dataset.tag, cur = (S.reviews[reviewDate] || {}).tags || [];if((S.reviews[reviewDate]?.sportsAutoTags||[]).includes(t))return toast('Selected from a completed activity. Change its completion in Sports to undo.');
    patchReview({ tags: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] }); render();
  });
  const typed = (id, key) => { const el = $(id); if (!el) return; el.oninput = () => { clearTimeout(saveTimer); $('saved').textContent = 'Saving…'; saveTimer = setTimeout(() => patchReview({ [key]: el.value }), 400); }; el.onblur = () => { clearTimeout(saveTimer); patchReview({ [key]: el.value }); }; };
  typed('did', 'did'); typed('win', 'win');
}

/* ----- portfolio (prices from CoinMarketCap; amounts stay on this phone) ----- */
const DEMO_COINS = { BTC: [1, 'Bitcoin', 64000, -0.4, 1], ETH: [1027, 'Ethereum', 3100, 1.1, 2], SOL: [5426, 'Solana', 145, 2.3, 5], DOGE: [74, 'Dogecoin', 0.12, -1.2, 9] };
async function cryptoPost(path, body) {
  if (!S.demo) return post(path, body);
  if (path.endsWith('/search')) return { results: Object.fromEntries(body.symbols.map(sy => [sy, DEMO_COINS[sy] ? [{ id: DEMO_COINS[sy][0], name: DEMO_COINS[sy][1], symbol: sy, rank: DEMO_COINS[sy][4], chain: '' }] : []])) };
  const quotes = {};
  for (const [sy, c] of Object.entries(DEMO_COINS)) if (body.ids.includes(c[0])) quotes[c[0]] = { symbol: sy, name: c[1], price: c[2], change24h: c[3] };
  return { at: Date.now(), quotes };
}
const usd = (v, dp = 2) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
function fmtPrice(p) {
  if (p >= 1000) return usd(p, 2); if (p >= 10) return usd(p, 2); if (p >= 1) return usd(p, 4);
  return '$' + p.toFixed(Math.min(10, Math.max(4, 2 - Math.floor(Math.log10(p)))));
}
function fmtAmt(a) { return a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a.toLocaleString(undefined, { maximumFractionDigits: a < 1 ? 8 : a < 1000 ? 4 : 2 }); }
function parseAmount(str) {
  const m = /^\s*([0-9][0-9,]*\.?[0-9]*|\.[0-9]+)\s*([kKmMbB]?)\s*$/.exec(String(str));
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, '')) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1);
  return isFinite(n) && n > 0 ? n : null;
}
const hidden = txt => (S.settings.hideBalances ? '•••••' : txt);
function portfolioRows() {
  return S.crypto.holdings.map(h => {
    const q = S.crypto.quotes[h.id], price = q ? q.price : null, value = price != null ? price * h.amount : null;
    const change = q && q.change24h != null ? q.change24h : null;
    const prev = value != null && change != null ? value / (1 + change / 100) : value;
    return { h, price, value, change, delta: value != null ? value - prev : 0 };
  }).sort((a, b) => (b.value || 0) - (a.value || 0));
}
function portfolioTotals() {
  const rows = portfolioRows(), total = rows.reduce((a, r) => a + (r.value || 0), 0), delta = rows.reduce((a, r) => a + r.delta, 0);
  return { rows, total, delta, pct: total - delta > 0 ? delta / (total - delta) * 100 : 0, priced: rows.filter(r => r.value != null).length };
}
const chg = (c, arrow = true) => c == null ? '' : `<span class="${c < 0 ? 'down' : c > 0 ? 'up' : ''}">${arrow ? (c < 0 ? '▼ ' : c > 0 ? '▲ ' : '') : (c > 0 ? '+' : c < 0 ? '−' : '')}${Math.abs(c).toFixed(2)}%</span>`;
function portfolioLine() {
  if (!S.crypto.holdings.length || !S.crypto.at || lockedNow()) return '';
  const t = portfolioTotals();
  return `<button class="pline" data-act="to-portfolio">Portfolio <b>${hidden(usd(t.total, 0))}</b> · ${chg(t.pct, false)} in 24 h</button>`;
}
function portfolioSubtitle() {
  if (!S.crypto.holdings.length) return 'Add your coins to see their value';
  if (!S.crypto.at) return `${S.crypto.holdings.length} coins`;
  const t = portfolioTotals(); return `${hidden(usd(t.total, 0))} · ${t.pct < 0 ? '−' : '+'}${Math.abs(t.pct).toFixed(1)}% in 24 h`;
}
let cryptoLoading = false;
async function loadPrices(force) {
  if (!S.crypto.holdings.length || (!connected() && !S.demo)) return;
  if (cryptoLoading || (!force && S.crypto.at && Date.now() - S.crypto.at < 60 * 1000)) return;
  cryptoLoading = true; if (view === 'portfolio') render();
  try {
    const r = await cryptoPost('/api/crypto/quotes', { ids: S.crypto.holdings.map(h => h.id) });
    S.crypto.quotes = r.quotes; S.crypto.at = r.at; S.status.crypto = { at: Date.now(), ok: true, message: '' };
  } catch (e) { S.status.crypto = { at: Date.now(), ok: false, message: e.message }; }
  cryptoLoading = false; save(); render();
}
function portfolioHtml() {
  const t = portfolioTotals(), st = S.status.crypto, up = t.delta >= 0, n = S.crypto.holdings.length;
  const missing = t.rows.filter(r => r.value == null).length;
  return `<button class="back" data-act="to-more">‹ More</button>
    <div class="hd"><div><h1>Portfolio</h1><div class="mu">Prices from CoinMarketCap${S.crypto.at ? ` · updated ${new Date(S.crypto.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</div></div>
      <span class="pills"><button class="pill" data-act="crypto-hide">${S.settings.hideBalances ? 'Show amounts' : 'Hide amounts'}</button><button class="pill" data-act="crypto-refresh">${cryptoLoading ? 'Updating…' : 'Refresh'}</button></span></div>
    <div class="stack">
    ${n ? `<div class="card"><div class="mu">Total value</div><div class="tot num">${hidden(usd(t.total))}</div>
      <div class="num" style="font-size:14px">${S.crypto.at ? `<span class="${up ? 'up' : 'down'}">${hidden(`${up ? '+' : '−'}${usd(Math.abs(t.delta))}`)} · ${up ? '▲' : '▼'} ${Math.abs(t.pct).toFixed(2)}%</span> <span class="muted">in 24 h</span>` : '<span class="muted">Prices not loaded yet.</span>'}</div></div>` : ''}
    <div class="card">${n ? t.rows.map(r => `<button class="prow" data-hold="${r.h.id}"><span><span class="sym">${esc(r.h.symbol)}</span><small>${esc(r.h.name || '')}</small></span>
        <span class="r num">${r.price != null ? fmtPrice(r.price) : '—'}<small>${chg(r.change)}</small></span>
        <span class="r num">${r.value != null ? hidden(usd(r.value)) : '—'}<small>${hidden(fmtAmt(r.h.amount))} ${esc(r.h.symbol)}</small></span></button>`).join('')
      : '<p class="empty">No coins yet. Add one by ticker, or paste your whole list at once.</p>'}
      <div class="row" style="margin-top:10px"><button class="btn day" data-act="crypto-add">+ Add coin</button><button class="btn" data-act="crypto-paste">Paste a list</button></div></div>
    ${st && !st.ok ? `<div class="errbox">${esc(st.message)}${S.crypto.at ? '<br>Showing prices from ' + new Date(S.crypto.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.' : ''}</div>` : ''}
    ${missing && S.crypto.at && !(st && !st.ok) ? `<div class="errbox">${missing} coin${missing > 1 ? 's have' : ' has'} no price from CoinMarketCap. Tap ${missing > 1 ? 'one' : 'it'} to check it is the right coin.</div>` : ''}
    <p class="muted" style="font-size:12px;margin:4px 2px 0">The amounts are what you enter here and stay on this phone. Prices are informational and refresh about once a minute while you look.</p></div>`;
}
function coinLabel(c) { return `${c.name} (${c.symbol})${c.rank ? ` · rank ${c.rank}` : ' · unranked'}${c.chain ? ` · on ${c.chain}` : ''}`; }
function addHolding(coin, amount) {
  const ex = S.crypto.holdings.find(h => h.id === coin.id);
  if (ex) ex.amount = amount; else S.crypto.holdings.push({ id: coin.id, symbol: coin.symbol, name: coin.name, amount });
}
function openAddHolding() {
  let found = [];
  openSheet(`<h2>Add a coin</h2><p class="muted" style="margin:2px 0 4px">Type the ticker, then pick the right coin. Some tickers belong to several coins.</p>
    <div class="row"><input class="field" id="cTicker" placeholder="Ticker, for example HYPE" autocapitalize="characters" autofocus><button class="btn" id="cFind" style="margin-top:8px">Find</button></div>
    <div id="cPick"></div>
    <div class="row" style="margin-top:16px"><button class="btn day" id="cSave" disabled>Add coin</button><button class="btn" id="cCancel">Cancel</button></div>`);
  $('cCancel').onclick = closeSheet;
  const find = async () => {
    const sym = $('cTicker').value.trim().toUpperCase(); if (!/^[A-Z0-9]{1,12}$/.test(sym)) return toast('Enter a ticker, letters and numbers only.');
    $('cPick').innerHTML = '<p class="muted">Looking it up…</p>';
    try {
      found = (await cryptoPost('/api/crypto/search', { symbols: [sym] })).results[sym] || [];
      $('cPick').innerHTML = found.length ? `<span class="lbl2">Which coin?</span><select class="field" id="cSel" style="margin-top:0">${found.map((c, i) => `<option value="${i}">${esc(coinLabel(c))}</option>`).join('')}</select>
        <span class="lbl2">How many do you hold?</span><input class="field" id="cAmt" inputmode="decimal" placeholder="For example 169.5 or 17.99M" style="margin-top:0">` : '<div class="errbox">CoinMarketCap has no active coin with that ticker.</div>';
      $('cSave').disabled = !found.length;
    } catch (e) { $('cPick').innerHTML = `<div class="errbox">${esc(e.message)}</div>`; }
  };
  $('cFind').onclick = find; $('cTicker').onkeydown = e => { if (e.key === 'Enter') find(); };
  $('cSave').onclick = () => {
    const amt = parseAmount($('cAmt') ? $('cAmt').value : ''); if (amt == null) return toast('Enter how many you hold, as a number.');
    const coin = found[+$('cSel').value], ex = S.crypto.holdings.find(h => h.id === coin.id);
    if (ex && !confirm(`${coin.symbol} is already in your portfolio with ${fmtAmt(ex.amount)}. Replace that with ${fmtAmt(amt)}?`)) return;
    addHolding(coin, amt); save(); closeSheet(); render(); loadPrices(true); toast(ex ? 'Amount updated' : 'Coin added');
  };
}
function openPasteHoldings() {
  openSheet(`<h2>Paste your coins</h2><p class="muted" style="margin:2px 0 4px">One per line: ticker, then the amount. For example <b>HYPE 169.5</b>. Amounts like 17.99M or 5k work too.</p>
    <textarea class="field" id="pText" placeholder="HYPE 169.5&#10;BTC 0.00001943"></textarea>
    <div id="pReview"></div>
    <div class="row" style="margin-top:16px"><button class="btn day" id="pLook">Look up</button><button class="btn" id="pCancel">Cancel</button></div>`);
  $('pCancel').onclick = closeSheet;
  let items = [];
  $('pLook').onclick = async () => {
    if (items.length) { // second tap: save the reviewed list
      const picked = items.filter(it => it.coins.length).map(it => ({ coin: it.coins[+($(`pSel${it.i}`) ? $(`pSel${it.i}`).value : 0)], amount: it.amount }));
      picked.forEach(x => addHolding(x.coin, x.amount)); save(); closeSheet(); render(); loadPrices(true); return toast(`${picked.length} coin${picked.length === 1 ? '' : 's'} added or updated`);
    }
    const sums = {}, bad = [];
    for (const line of $('pText').value.split('\n').map(l => l.trim()).filter(Boolean)) {
      const m = /^([A-Za-z0-9]{1,12})[\s:=,\t]+(.+)$/.exec(line), amt = m ? parseAmount(m[2]) : null;
      if (!m || amt == null) bad.push(line); else sums[m[1].toUpperCase()] = (sums[m[1].toUpperCase()] || 0) + amt;
    }
    const symbols = Object.keys(sums); if (!symbols.length) return toast('Nothing to look up. Use one line per coin, like HYPE 169.5');
    $('pLook').disabled = true; $('pReview').innerHTML = '<p class="muted">Looking them up…</p>';
    try {
      const res = (await cryptoPost('/api/crypto/search', { symbols: symbols.slice(0, 30) })).results;
      items = symbols.map((sy, i) => ({ i, sy, amount: sums[sy], coins: res[sy] || [] }));
      $('pReview').innerHTML = `<span class="lbl2">Check each coin, then add. A coin you already hold gets the new amount.</span>${items.map(it => it.coins.length
        ? `<div class="card" style="margin-top:6px;padding:10px 12px"><b>${esc(it.sy)}</b> · <span class="muted">${esc(fmtAmt(it.amount))}</span><select class="field" id="pSel${it.i}" style="margin-top:6px">${it.coins.map((c, k) => `<option value="${k}">${esc(coinLabel(c))}</option>`).join('')}</select></div>`
        : `<div class="errbox"><b>${esc(it.sy)}</b>: no active coin with that ticker, skipped.</div>`).join('')}
        ${bad.length ? `<div class="errbox">Could not read: ${esc(bad.join(' | '))}</div>` : ''}`;
      $('pLook').textContent = `Add ${items.filter(it => it.coins.length).length} coins`; $('pLook').disabled = !items.some(it => it.coins.length);
    } catch (e) { items = []; $('pLook').disabled = false; $('pReview').innerHTML = `<div class="errbox">${esc(e.message)}</div>`; }
  };
}
function openHolding(id) {
  const h = S.crypto.holdings.find(x => x.id === id); if (!h) return;
  openSheet(`<h2>${esc(h.name || h.symbol)} (${esc(h.symbol)})</h2><p class="muted" style="margin:2px 0 4px">CoinMarketCap id ${h.id}. If the price looks wrong, remove it and add the right coin.</p>
    <span class="lbl2">Amount you hold</span><input class="field" id="hAmt" inputmode="decimal" value="${h.amount}" style="margin-top:0">
    <div class="row" style="margin-top:16px"><button class="btn day" id="hSave">Save</button><button class="btn" id="hDel">Remove</button><button class="btn" id="hCancel">Cancel</button></div>`);
  $('hCancel').onclick = closeSheet;
  $('hSave').onclick = () => { const a = parseAmount($('hAmt').value); if (a == null) return toast('Enter the amount as a number.'); h.amount = a; save(); closeSheet(); render(); };
  $('hDel').onclick = () => { if (!confirm(`Remove ${h.symbol} from your portfolio?`)) return; S.crypto.holdings = S.crypto.holdings.filter(x => x.id !== id); delete S.crypto.quotes[id]; save(); closeSheet(); render(); };
}

/* ----- settings ----- */
function settingsHtml() {
  const st = S.status, fmtAt = a => new Date(a).toLocaleString();
  const row = (label, s) => s ? `<div class="${s.ok ? 'okbox' : 'errbox'}"><b>${label}</b> ${fmtAt(s.at)}: ${s.ok ? 'OK' : ''}${s.message ? '<br>' + esc(s.message).replace(/\n/g, '<br>') : ''}</div>` : '';
  return `<button class="back" data-act="to-more">‹ More</button><div class="hd"><h1>Settings</h1></div><div class="stack set">
    <div class="card"><h3>Connection</h3>
      <p class="muted">Uses the same Worker as Calorie tracker. Calendar, Gmail and tasks come through it. Sleep and heart-rate figures use the Google Health connection you made in Calorie tracker.</p>
      <label class="lbl2" for="baseUrl">Worker address</label>
      <input class="field" style="margin-top:0" id="baseUrl" inputmode="url" autocapitalize="off" value="${esc(S.settings.baseUrl)}" placeholder="https://calorie-tracker.yourname.workers.dev">
      <label class="lbl2" for="appKey">App key</label>
      <input class="field" style="margin-top:0" id="appKey" type="password" autocomplete="off" value="${esc(S.settings.appKey)}" placeholder="paste your app key">
      <div class="row" style="margin-top:12px;flex-wrap:wrap">
        <button class="btn day" data-act="save-conn">Save</button>
        <button class="btn" data-act="connect">Connect Google (Calendar and Gmail)</button>
        <button class="btn" data-act="check">Check connection</button>
        <button class="btn" data-act="sync-all">Refresh everything</button>
      </div>
      <div id="checkOut"></div>
      ${row('Calendar', st.cal)}${row('Tasks', st.tasks)}${row('Mail', st.mail)}${row('Health', st.health)}</div>
    <div class="card"><h3>Display</h3>
      <span class="lbl2" style="margin-top:0">Theme</span>
      <div class="seg">${[['dark', 'Dark'], ['light', 'Light'], ['auto', 'Match phone']].map(([k, l]) => `<button data-theme-set="${k}" class="${S.settings.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <span class="lbl2">Week strip on the Day tab</span>
      <div class="seg">${[[7, '7 days'], [5, 'Mon to Fri']].map(([k, l]) => `<button data-week-set="${k}" class="${S.settings.weekDays === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <p class="muted" style="font-size:12px;margin-top:8px">Swipe left or right on the Day tab to move between days. A weekend day always shows the full week.</p></div>
    <div class="card"><h3>Your tags</h3>
      <p class="muted">Quick tags in the Review. Add your own from the Review tab; tap one of yours here to remove it.</p>
      <div class="chips">${[...SPORT_TAGS, ...BASE_TAGS].map(t => `<span class="chip">${esc(t)}</span>`).join('')}${S.tags.map(t => `<button class="chip on" data-tagdel="${esc(t)}">${esc(t)} ✕</button>`).join('')}</div></div>
    <div class="card"><h3>Your supplements</h3>
      <p class="muted">The list on the Review tab. Tap one to remove it from the list; the days you already ticked keep it.</p>
      <div class="chips">${suppList().map(t => `<button class="chip on" data-suppdel="${esc(t)}">${esc(t)} ✕</button>`).join('')}<button class="chip" data-act="supp-add">+ add</button></div></div>
    ${lockSettingsHtml()}
    <div class="card"><h3>Shared backup (Notion)</h3>
      <p class="muted">Saves My Day, and your other apps, into the Notion database <b>App backups</b> through your Pocket CRM service. It backs up by itself once a day when you open the app.</p>
      <label class="lbl2" for="sbUrl">Pocket CRM address</label>
      <input class="field" style="margin-top:0" id="sbUrl" inputmode="url" autocapitalize="off" value="${esc(SharedBackup.url())}">
      <label class="lbl2" for="sbTok">Pocket CRM access token</label>
      <input class="field" style="margin-top:0" id="sbTok" type="password" autocomplete="off" value="${esc(SharedBackup.token())}" placeholder="the same token as in Pocket CRM">
      <label class="tick"><input type="checkbox" id="sbHold" ${S.settings.backupHoldings ? 'checked' : ''}> Include my portfolio amounts</label>
      <div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn day" data-act="sb-save">Back up now</button><button class="btn" data-act="sb-restore">Restore My Day</button><button class="btn" data-act="sb-refresh">Check</button></div>
      ${sbMsg ? `<div class="${sbMsg.ok ? 'okbox' : 'errbox'}" style="margin-top:10px">${esc(sbMsg.text)}</div>` : ''}
      ${SharedBackup.configured() ? `<div class="kv" style="margin-top:10px">${Object.entries(SharedBackup.NAMES).map(([k, n]) => { const b = (sbList || []).find(x => x.app === k); const old = b && Date.now() - new Date(b.at).getTime() > 7 * 864e5; return `<span class="k">${n}</span><span style="${old || !b ? 'color:var(--warn)' : ''}">${sbList ? (b ? `${esc(SharedBackup.ago(b.at))} · ${b.size_kb} KB${b.device ? ' · ' + esc(b.device) : ''}` : 'no backup yet') : '…'}</span>`; }).join('')}</div><p class="muted" style="font-size:12px;margin:8px 0 0">Racket Rankings and Pocket CRM back themselves up from their own Settings or Data page. Restoring only adds what is missing or newer here; it never deletes.</p>` : ''}</div>
    <div class="card"><h3>Your data</h3>
      <p class="muted">Reviews and prep notes live on this device only. Export a backup now and then.</p>
      <div class="row" style="flex-wrap:wrap"><button class="btn" data-act="export">Export backup</button><button class="btn" data-act="import">Import backup</button>
      ${S.demo ? `<button class="btn" data-act="demo-off">Remove demo data</button>` : `<button class="btn" data-act="demo-on">Load demo data</button>`}</div>
      <input type="file" id="importFile" accept="application/json" hidden></div>
    <div class="card"><h3>About</h3>
      <p class="muted">Build <b>${BUILD}</b> · <a href="privacy.html">Privacy policy</a></p>
      <button class="btn" data-act="force">Force refresh app</button>
      <p class="muted" style="font-size:12px">Clears cached files and reloads. Your reviews are not touched.</p></div></div>`;
}

/* ---------- sheets ---------- */
function openSheet(html) {
  $('overlay').innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog">${html}</div></div>`;
  $('scrim').onclick = e => { if (e.target.id === 'scrim') closeSheet(); };
}
function closeSheet() { $('overlay').innerHTML = ''; }
function findEvent(key) {
  for (const c of Object.values(S.cache)) { const e = c.events.find(x => evKey(x) === key); if (e) return e; }
  return null;
}
const RESP = { accepted: '✓', declined: '✗', tentative: '?', needsAction: '·' };
const crmCache = {}, crmPending = {}, mailCache = {};

function openEvent(key) {
  const e = findEvent(key); if (!e) return;
  const mins = (Date.parse(e.end) - Date.parse(e.start)) / 6e4, people = e.attendees.filter(a => !a.self);
  openSheet(`<h2>${esc(e.title)}</h2>
    <p class="muted" style="margin:2px 0 10px">${e.allDay ? 'All day' : `${shortDate(ymd(new Date(e.start)))} · ${timeStr(e.start)} to ${timeStr(e.end)} (${dur(mins)})`}${e.calendar ? ' · ' + esc(e.calendar) : ''}</p>
    <div class="row" style="flex-wrap:wrap">${e.video ? `<a class="btn day" href="${esc(e.video)}" target="_blank" rel="noopener">Join call</a>` : ''}<button class="btn" id="mnBtn">New meeting note</button>${e.link ? `<a class="btn" href="${esc(e.link)}" target="_blank" rel="noopener">Open in Calendar</a>` : ''}</div>
    ${e.location ? `<span class="lbl2">Where</span><div>${linkify(e.location)}</div>` : ''}
    ${e.organizer ? `<span class="lbl2">Organiser</span><div>${esc(e.organizer)}</div>` : ''}
    ${people.length ? `<span class="lbl2">Who (${e.attendeeCount})</span>${people.map(a => `<div class="people"><span class="r">${RESP[a.response] || '·'}</span>${esc(a.name)}${a.organizer ? ' · organiser' : ''}${a.optional ? ' · optional' : ''}</div>`).join('')}${e.attendeeCount > e.attendees.length ? `<div class="muted" style="font-size:12px">and ${e.attendeeCount - e.attendees.length} more</div>` : ''}<div class="muted" style="font-size:12px">✓ yes · ? maybe · ✗ no · · no reply</div>` : ''}
    ${e.description ? `<span class="lbl2">Description</span><div class="desc">${linkify(e.description)}</div>` : ''}
    <div id="crm"></div><div id="mails"></div>
    <span class="lbl2">Your prep notes (kept on this phone)</span>
    <textarea class="field" style="margin-top:0" id="prep" placeholder="What do you want out of this? Questions to ask, numbers to have ready.">${esc(S.prep[key] || '')}</textarea>
    <div class="row" style="margin-top:14px"><button class="btn day" id="prepDone">Done</button></div>`);
  const store = () => { const v = $('prep').value.trim(); if (v) S.prep[key] = v; else delete S.prep[key]; save(); };
  $('prep').onblur = store;
  $('prepDone').onclick = () => { store(); closeSheet(); };
  $('mnBtn').onclick = async () => {
    let ids = [];
    try { const r = crmCache[key] || await crmPending[key]; ids = (r ? r.people : []).map(p => p.id); } catch { /* note is still created, just without attendees */ }
    startMeetingNote({ title: e.title, start: e.start, end: e.end, attendees: ids });
  };
  loadBrief(e, key); loadThreads(e, key);
}

/* ---- CRM context for the people in a meeting (Notion People database, read only) ---- */
function crmHtml(r, e) {
  const people = r.people.map(p => {
    const last = p.lastContacted || p.latestInteraction || p.latestMeeting;
    const bits = [p.role, p.company].filter(Boolean).join(' · ');
    const flag = /overdue/i.test(p.followStatus) ? '<span class="badge">follow-up overdue</span>' : /this week/i.test(p.followStatus) ? '<span class="badge day">follow-up due this week</span>' : '';
    return `<div class="card" style="margin-top:8px;padding:12px">
      <div><b><a href="${esc(p.url)}" target="_blank" rel="noopener" style="color:inherit">${esc(p.name || 'Unnamed')}</a></b>${p.tier ? `<span class="badge day">${esc(p.tier.split(' ')[0])}</span>` : ''}${flag}</div>
      ${bits ? `<div class="muted" style="font-size:13px">${esc(bits)}</div>` : ''}
      <div class="muted" style="font-size:13px">${last ? `Last contact ${ago(last)}` : 'No contact logged yet'}${p.how ? ' · ' + esc(p.how) : ''}</div>
      ${p.summary ? `<div style="font-size:14px;margin-top:6px;white-space:pre-wrap">${esc(p.summary)}</div>` : ''}
      ${p.tasks.length ? `<div class="muted" style="font-size:12px;margin-top:8px">Open tasks</div>${p.tasks.map(t => `<div style="font-size:14px">• ${esc(t.title)}${t.due ? ` <span class="muted">(${shortDate(t.due.slice(0, 10))})</span>` : ''}${t.waiting ? ' <span class="badge">waiting</span>' : ''}</div>`).join('')}` : ''}
      <button class="addrow" style="margin-top:10px" data-addfor="${esc(p.id)}" data-name="${esc((p.name || '').split(' ')[0])}">+ Task for ${esc((p.name || 'them').split(' ')[0])}</button></div>`;
  }).join('');
  const names = r.unmatched.map(m => (e.attendees.find(a => (a.email || '').toLowerCase() === m) || {}).name || m);
  return `<span class="lbl2">From your CRM</span>${people || '<p class="muted" style="margin:0">Nobody in this meeting is in your CRM yet.</p>'}
    ${names.length && people ? `<p class="muted" style="font-size:12px;margin:8px 0 0">Not in your CRM: ${esc(names.join(', '))}</p>` : ''}`;
}
function loadBrief(e, key) {
  const emails = e.attendees.filter(a => !a.self && a.email).map(a => a.email);
  if (!emails.length || (!connected() && !S.demo)) return;
  $('crm').innerHTML = '<span class="lbl2">From your CRM</span><p class="muted" style="margin:0">Looking up the attendees…</p>';
  crmPending[key] = crmCache[key] ? Promise.resolve(crmCache[key]) : (S.demo ? Promise.resolve(demoBrief(emails)) : post('/api/brief', { emails }));
  crmPending[key].then(r => {
    crmCache[key] = r;
    const box = $('crm'); if (!box) return;
    box.innerHTML = crmHtml(r, e);
    box.querySelectorAll('[data-addfor]').forEach(b => b.onclick = () => openAddTask({ person: { id: b.dataset.addfor, name: b.dataset.name } }));
  }).catch(err => { delete crmCache[key]; const box = $('crm'); if (box) box.innerHTML = `<span class="lbl2">From your CRM</span><div class="errbox">${esc(err.message)}</div>`; });
}
function loadThreads(e, key) {
  const emails = e.attendees.filter(a => !a.self && a.email).map(a => a.email);
  if (!emails.length || (!connected() && !S.demo)) return;
  const p = mailCache[key] ? Promise.resolve(mailCache[key]) : (S.demo ? Promise.resolve(demoThreads()) : post('/api/mail/threads', { emails }));
  p.then(r => {
    mailCache[key] = r;
    const box = $('mails'); if (!box || !r.messages.length) return;
    const acct = encodeURIComponent(r.account || '0');
    box.innerHTML = `<span class="lbl2">Recent email with them</span><div class="card" style="padding:6px 14px">${r.messages.map(m => `<a class="thread" href="https://mail.google.com/mail/u/${acct}/#all/${m.threadId}" target="_blank" rel="noopener"><b style="font-weight:600">${esc(m.subject)}</b><div class="muted" style="font-size:12px">${m.mine ? 'You' : esc(m.from.name)} · ${mailTime(m.at)}</div></a>`).join('')}</div>`;
  }).catch(err => { const box = $('mails'); if (box) box.innerHTML = `<span class="lbl2">Recent email with them</span><div class="errbox">${esc(err.message)}</div>`; });
}
function demoBrief(emails) {
  return { unmatched: emails.slice(1), people: [{ id: 'demo-p1', url: '#', name: 'Dana Fox', email: emails[0], role: 'CFO', company: 'Acme Corp', tier: 'A - Key', summary: 'Met at the Vienna summit in June. Interested in a pilot for Q1; asked for pricing and two references. Last call went well.', how: 'Met at a conference', lastContacted: addDays(today(), -26), followStatus: 'Overdue', nextFollowUp: null, latestInteraction: null, latestMeeting: null,
    tasks: [{ id: 'demo-1', title: 'Send proposal to Acme', due: addDays(today(), -1), status: 'Not started', waiting: false }, { id: 'demo-w', title: 'Dana to confirm budget', due: null, status: 'Not started', waiting: true }] }] };
}
function demoThreads() {
  const now = Date.now();
  return { account: 'me@example.com', messages: [{ threadId: 'x1', subject: 'Re: pilot terms', from: { name: 'Dana Fox' }, mine: false, at: now - 2 * 864e5 }, { threadId: 'x2', subject: 'Pricing and references', from: { name: 'Me' }, mine: true, at: now - 9 * 864e5 }] };
}

function openTask(id) {
  const t = findTask(id); if (!t) return;
  openSheet(`<h2>${esc(t.title)}</h2>
    <p class="muted" style="margin:2px 0 10px">${[t.status, dueDay(t) ? 'due ' + shortDate(dueDay(t)) + (hasTime(t) ? ' ' + hm(minutesIn(dueDay(t), t.due)) : '') : 'no due date', t.types.join(', ')].filter(Boolean).join(' · ')}</p>
    ${t.next ? `<span class="lbl2">Next step</span><div>${linkify(t.next)}</div>` : ''}
    <div class="row" style="margin-top:14px;flex-wrap:wrap"><button class="btn day" id="tDone">${t.status === 'Done' ? 'Mark not done' : 'Mark done'}</button>
      <button class="btn" id="tBlock">Block time</button><a class="btn" href="${esc(t.url)}" target="_blank" rel="noopener">Open in Notion</a><button class="btn" id="tClose">Close</button></div>`);
  $('tDone').onclick = () => { closeSheet(); toggleTask(id); };
  $('tBlock').onclick = () => { closeSheet(); openEventForm({ title: t.title, description: `Task: ${t.url}`, date: dueDay(t) && dueDay(t) >= today() ? dueDay(t) : (viewDate >= today() ? viewDate : today()) }); };
  $('tClose').onclick = closeSheet;
}
function findTask(id) {
  if (!S.tasks) return null;
  return S.tasks.open.find(t => t.id === id) || Object.values(S.tasks.doneOn).flat().find(t => t.id === id) || null;
}
function openAddTask(o = {}) {
  const person = o.person;
  let due = viewDate >= today() ? viewDate : today(), type = '';
  const draw = () => {
    $('dueChips').innerHTML = [[today(), 'Today'], [addDays(today(), 1), 'Tomorrow'], ['', 'No date']].map(([d, l]) => `<button class="chip ${due === d ? 'on' : ''}" data-d="${d}">${l}</button>`).join('');
    $('typeChips').innerHTML = [['', 'None'], ['Personal', 'Personal'], ['Work', 'Work']].map(([v, l]) => `<button class="chip ${type === v ? 'on' : ''}" data-t="${v}">${l}</button>`).join('');
    $('dueChips').querySelectorAll('button').forEach(b => b.onclick = () => { due = b.dataset.d; $('dueDate').value = due; draw(); });
    $('typeChips').querySelectorAll('button').forEach(b => b.onclick = () => { type = b.dataset.t; draw(); });
  };
  openSheet(`<h2>New task</h2><p class="muted" style="margin:2px 0 8px">Goes straight into your Notion task database${person ? `, linked to ${esc(person.name || 'this person')} in your CRM` : ''}.</p>
    <input class="field" id="tTitle" placeholder="${person ? `e.g. Follow up with ${esc(person.name)}` : 'What needs doing?'}" maxlength="200" value="${esc(o.title || '')}" autofocus>
    <span class="lbl2">Due</span><div class="chips" id="dueChips"></div>
    <input class="field" id="dueDate" type="date" value="${due}">
    <span class="lbl2">Type</span><div class="chips" id="typeChips"></div>
    <div class="row" style="margin-top:16px"><button class="btn day" id="tSave">Add task</button><button class="btn" id="tCancel">Cancel</button></div>`);
  draw();
  $('dueDate').onchange = () => { due = $('dueDate').value; draw(); };
  $('tCancel').onclick = closeSheet;
  $('tSave').onclick = async () => {
    const title = $('tTitle').value.trim(); if (!title) return $('tTitle').focus();
    $('tSave').disabled = true;
    try {
      if (S.tasks === null) S.tasks = { at: Date.now(), open: [], doneOn: {} };
      if (S.demo) S.tasks.open.push({ id: 'demo-' + Date.now(), title, status: 'Not started', due: due || null, done: null, types: type ? [type] : [], tags: [], waiting: false, crm: !!person, people: [], next: '', url: '#' });
      else { const r = await post('/api/tasks/add', { title, due: due || undefined, type: type || undefined, person: person ? person.id : undefined, notes: o.notes || undefined }); S.tasks.open.push(r.task); }
      save(); closeSheet(); render(); toast('Task added');
    } catch (e) { $('tSave').disabled = false; toast('Could not add: ' + e.message); }
  };
}
function toggleTask(id) {
  const T = S.tasks, t = findTask(id); if (!t || !T) return;
  const wasDone = t.status === 'Done', doneList = T.doneOn[today()] || (T.doneOn[today()] = []);
  const prevStatus = wasDone ? 'Not started' : t.status;
  const apply = nowDone => {
    if (nowDone) { T.open = T.open.filter(x => x.id !== id); if (!doneList.some(x => x.id === id)) doneList.push({ ...t, status: 'Done', done: today() }); }
    else { T.doneOn[today()] = doneList.filter(x => x.id !== id); if (!T.open.some(x => x.id === id)) T.open.push({ ...t, status: prevStatus, done: null }); }
    save(); render();
  };
  const send = async nowDone => { if (S.demo) return; await post(nowDone ? '/api/tasks/done' : '/api/tasks/reopen', nowDone ? { id, date: today() } : { id, status: prevStatus }); };
  const nowDone = !wasDone;
  apply(nowDone);
  send(nowDone).then(() => toast(nowDone ? `Done · ${t.title}` : `Reopened · ${t.title}`, 'Undo', () => { apply(!nowDone); send(!nowDone).catch(e => toast('Undo failed in Notion: ' + e.message)); }))
    .catch(e => { apply(!nowDone); toast('Notion did not accept that: ' + e.message); });
}

/* ---- add an event to Google Calendar ---- */
function openEventForm(o = {}) {
  const base = o.date || (viewDate >= today() ? viewDate : today());
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  let startMin = o.startMin != null ? o.startMin : (base === today() ? Math.ceil((nowM + 5) / 30) * 30 : 9 * 60);
  startMin = Math.max(0, Math.min(startMin, 23 * 60 + 30));
  const t = m => hm(Math.min(m, 1439));
  openSheet(`<h2>New event</h2><p class="muted" style="margin:2px 0 4px">Added to your Google Calendar.</p>
    <input class="field" id="evTitle" placeholder="Title" maxlength="200" value="${esc(o.title || '')}" autofocus>
    <label class="ck2"><input type="checkbox" id="evAll"> All day</label>
    <div class="row"><input class="field" type="date" id="evDate" value="${base}"><input class="field" type="date" id="evDate2" value="${base}" hidden></div>
    <div class="row" id="evTimes"><input class="field" type="time" id="evStart" value="${t(startMin)}"><input class="field" type="time" id="evEnd" value="${t(startMin + 60)}"></div>
    <input class="field" id="evWhere" placeholder="Where (optional)">
    <input class="field" id="evGuests" placeholder="Guests: email addresses separated by commas (optional)" inputmode="email">
    <div class="mu" id="evGuestNote" hidden style="margin:6px 2px 0">Guests get a calendar invitation when you save.</div>
    <label class="ck2"><input type="checkbox" id="evMeet"> Add a Google Meet link</label>
    <div class="row" style="margin-top:16px"><button class="btn day" id="evSave">Add to calendar</button><button class="btn" id="evCancel">Cancel</button></div>`);
  const mins = v => { const [h, m] = (v || '0:0').split(':').map(Number); return h * 60 + m; };
  let span = 60;
  $('evStart').onchange = () => { $('evEnd').value = t(mins($('evStart').value) + span); };
  $('evEnd').onchange = () => { span = Math.max(15, mins($('evEnd').value) - mins($('evStart').value)); };
  $('evAll').onchange = () => { const a = $('evAll').checked; $('evTimes').hidden = a; $('evDate2').hidden = !a; };
  $('evGuests').oninput = () => { $('evGuestNote').hidden = !$('evGuests').value.trim(); };
  $('evCancel').onclick = closeSheet;
  $('evSave').onclick = async () => {
    const title = $('evTitle').value.trim(); if (!title) return $('evTitle').focus();
    const all = $('evAll').checked, date = $('evDate').value; if (!date) return toast('Pick a date.');
    const guests = $('evGuests').value.split(/[\s,;]+/).filter(Boolean);
    if (guests.some(g => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g))) return toast('Check the guest email addresses.');
    let body = { title, location: $('evWhere').value.trim() || undefined, description: o.description, guests, meet: $('evMeet').checked };
    if (all) { const end = $('evDate2').value || date; if (end < date) return toast('The end date is before the start.'); body = { ...body, allDay: true, start: date, end: addDays(end, 1) }; }
    else {
      const s = new Date(`${date}T${$('evStart').value}`), e = new Date(`${date}T${$('evEnd').value}`);
      if (isNaN(s) || isNaN(e) || e <= s) return toast('The end time must be after the start.');
      body = { ...body, start: s.toISOString(), end: e.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
    $('evSave').disabled = true;
    try {
      if (S.demo) {
        const c = S.cache[date] || (S.cache[date] = { at: Date.now(), events: [], calendars: [], errors: [] });
        c.events.push({ id: 'demo-' + Date.now(), uid: 'demo-' + Date.now(), calendar: 'Demo', title, start: body.start, end: body.end, allDay: !!all, location: body.location || '', description: '', video: null, link: null, response: 'accepted', busy: true, organizer: '', attendees: [], attendeeCount: 0 });
        c.events.sort((a, b) => (b.allDay - a.allDay) || (Date.parse(a.start) - Date.parse(b.start)));
      } else await post('/api/calendar/add', body);
      closeSheet(); toast(guests.length ? `Event added · invitations sent to ${guests.length}` : 'Event added');
      viewDate = date; if (S.demo) { save(); render(); } else await loadDay(date);
    } catch (err) { $('evSave').disabled = false; toast('Could not add the event: ' + err.message); }
  };
}
function openFabMenu() {
  openSheet(`<h2>Add</h2>
    <button class="menu" id="fEv"><i>▦</i><span>New event<small>On your Google Calendar</small></span></button>
    <button class="menu" id="fTask"><i>☑</i><span>New task<small>In your Notion task database</small></span></button>
    <button class="menu" id="fNote"><i>✎</i><span>New meeting note<small>In your Notion Meetings database</small></span></button>
    <a class="menu" href="${MEETINGS_DB_URL}" target="_blank" rel="noopener"><i>▤</i><span>Open Meetings database<small>In Notion</small></span></a>`);
  $('fEv').onclick = () => { closeSheet(); openEventForm(); };
  $('fTask').onclick = () => { closeSheet(); openAddTask(); };
  $('fNote').onclick = () => { closeSheet(); startMeetingNote({ title: 'Meeting', start: new Date().toISOString() }); };
}
async function startMeetingNote(o) {
  if (S.demo) return toast('Demo: this would create a note in your Notion Meetings database.');
  if (!connected()) return toast('Connect in Settings first.');
  toast('Creating the meeting note…');
  try {
    const r = await post('/api/meetings/new', { title: o.title || 'Meeting', start: o.start, end: o.end, attendees: o.attendees || [] });
    toast('Meeting note created', 'Open in Notion', () => window.open(r.url, '_blank', 'noopener'));
  } catch (e) { toast('Could not create the note: ' + e.message); }
}
function openMailTask(id) {
  const m = S.inbox && S.inbox.messages.find(x => x.id === id); if (!m) return;
  openAddTask({ title: `Reply: ${m.subject.replace(/^((re|fwd?|aw|wg):\s*)+/i, '')}`.slice(0, 200), notes: `Mail from ${m.from.name} <${m.from.email}>\n${mailLink(m)}`, person: m.crm ? { id: m.crm.id, name: m.crm.name.split(' ')[0] } : undefined });
}

/* ---------- events ---------- */
function bind(root) {
  root.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => openEvent(b.dataset.ev));
  root.querySelectorAll('[data-done]').forEach(b => b.onclick = () => toggleTask(b.dataset.done));
  root.querySelectorAll('[data-task]').forEach(b => b.onclick = () => openTask(b.dataset.task));
  root.querySelectorAll('[data-hold]').forEach(b => b.onclick = () => openHolding(+b.dataset.hold));
  root.querySelectorAll('[data-cnt]').forEach(b => b.onclick = () => { bump(b.dataset.date, b.dataset.key, +b.dataset.by); render(); });
  root.querySelectorAll('[data-flag]').forEach(b => b.onchange = () => { setFlag(b.dataset.date, b.dataset.flag, b.checked); render(); });
  root.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { viewDate = b.dataset.day; render(); loadDay(viewDate); });
  root.querySelectorAll('[data-mf]').forEach(b => b.onclick = () => { mailFilter = b.dataset.mf; render(); });
  root.querySelectorAll('[data-mopen]').forEach(b => b.onclick = () => toggleMail(b.dataset.mopen));
  root.querySelectorAll('[data-mtask]').forEach(b => b.onclick = () => openMailTask(b.dataset.mtask));
  root.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => { reviewDate = b.dataset.rev; view = 'review'; render(); window.scrollTo(0, 0); loadDay(reviewDate); });
  root.querySelectorAll('[data-hist]').forEach(b => b.onclick = () => { histDays = +b.dataset.hist; render(); });
  root.querySelectorAll('[data-suppdel]').forEach(b => b.onclick = () => { if (!confirm(`Remove ${b.dataset.suppdel} from your list?`)) return; S.settings.supplements = suppList().filter(x => x !== b.dataset.suppdel); save(); render(); });
  root.querySelectorAll('[data-tagdel]').forEach(b => b.onclick = () => { S.tags = S.tags.filter(t => t !== b.dataset.tagdel); save(); render(); });
  root.querySelectorAll('[data-week-set]').forEach(b => b.onclick = () => { S.settings.weekDays = +b.dataset.weekSet; save(); render(); });
  root.querySelectorAll('[data-theme-set]').forEach(b => b.onclick = () => { S.settings.theme = b.dataset.themeSet; save(); applyTheme(); render(); });
  root.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act(b.dataset.act));
  if (view === 'review' && !viewLocked(view)) bindReview(root);
  if (view === 'settings') { const f = $('importFile'); if (f) f.onchange = importData; bindLock(); }
  const checkDetails = root.querySelector('#dayCheckDetails');
  if (checkDetails) checkDetails.ontoggle = () => { dayCheckOpen = checkDetails.open; };
  const optionalDetails = root.querySelector('#reviewDetails');
  if (optionalDetails) optionalDetails.ontoggle = () => { reviewDetailsOpen = optionalDetails.open; };
  root.querySelectorAll('summary [data-cnt]').forEach(b => b.addEventListener('click', e => e.preventDefault()));
  const tray = root.querySelector('#tray');
  if (tray) tray.ontoggle = () => { S.settings.trayOpen = tray.open; save(); };
  root.querySelectorAll('.tray .mini').forEach(b => b.addEventListener('click', e => e.preventDefault()));
  const tl = root.querySelector('.tl');
  if (tl) tl.onclick = ev => { // tap an empty slot to add an event there
    if (ev.target.closest('.tev, .ttk')) return;
    const r = tl.getBoundingClientRect(), min = Math.round(((ev.clientY - r.top) / HH * 60 + +tl.dataset.start * 60) / 15) * 15;
    openEventForm({ date: viewDate, startMin: min });
  };
}
// On Android, "open the app" links go through an intent so the phone starts the app instead of a browser tab.
document.addEventListener('click', ev => {
  const a = ev.target.closest && ev.target.closest('a[data-android]');
  if (a && /Android/i.test(navigator.userAgent)) { ev.preventDefault(); location.href = a.dataset.android; }
});
async function act(a) {
  if (a === 'wprev') { viewDate = addDays(viewDate, -7); render(); loadDay(viewDate); }
  else if (a === 'wnext') { viewDate = addDays(viewDate, 7); render(); loadDay(viewDate); }
  else if (a === 'supp-add') { const t = (prompt('Supplement name') || '').trim().slice(0, 40); if (t && !suppList().some(x => x.toLowerCase() === t.toLowerCase())) { S.settings.supplements = [...suppList(), t]; save(); render(); } }
  else if (a === 'lock-unlock') lockUnlock();
  else if (a === 'lock-now') lockNow();
  else if (a === 'lock-reset') { if (confirm('This removes the lock from this phone. Your data is not touched. Continue?')) { lsDel(LOCK_CRED); lockOpen = true; lockMsg = ''; render(); } }
  else if (a === 'tray-all') { trayAll = !trayAll; render(); }
  else if (a === 'track-toggle') { S.settings.trackOpen = !S.settings.trackOpen; save(); render(); }
  else if (a === 'today') { viewDate = today(); didScroll = false; render(); loadDay(viewDate); }
  else if (a === 'rprev') { reviewDate = addDays(reviewDate, -1); render(); loadDay(reviewDate); }
  else if (a === 'rnext') { reviewDate = addDays(reviewDate, 1); render(); loadDay(reviewDate); }
  else if (a === 'refresh') { loadDay(viewDate); loadInbox(); }
  else if (a === 'goto-settings' || a === 'to-settings') { view = 'settings'; sbMsg = null; render(); window.scrollTo(0, 0); sbRefresh(true); }
  else if (a === 'to-more') { view = 'more'; render(); window.scrollTo(0, 0); }
  else if (a === 'to-history') { view = 'history'; render(); window.scrollTo(0, 0); }
  else if (a === 'to-portfolio') { view = 'portfolio'; render(); window.scrollTo(0, 0); loadPrices(); }
  else if (a === 'crypto-refresh') loadPrices(true);
  else if (a === 'crypto-add') openAddHolding();
  else if (a === 'crypto-paste') openPasteHoldings();
  else if (a === 'crypto-hide') { S.settings.hideBalances = !S.settings.hideBalances; save(); render(); }
  else if (a === 'review-yesterday') { reviewDate = addDays(today(), -1); go('review'); }
  else if (a === 'add-task') openAddTask();
  else if (a === 'fab') openFabMenu();
  else if (a === 'readiness') openReadiness();
  else if (a === 'new-note-now') startMeetingNote({ title: 'Meeting', start: new Date().toISOString() });
  else if (a === 'new-tag') {
    const t = (prompt('New tag name') || '').trim().slice(0, 20);
    if (t && ![...BASE_TAGS, ...SPORT_TAGS, ...S.tags].some(x => x.toLowerCase() === t.toLowerCase())) { S.tags.push(t); save(); }
    if (t) { const cur = (S.reviews[reviewDate] || {}).tags || [], name = [...BASE_TAGS, ...SPORT_TAGS, ...S.tags].find(x => x.toLowerCase() === t.toLowerCase()); if (!cur.includes(name)) patchReview({ tags: [...cur, name] }); render(); }
  }
  else if (a === 'fill-notes') {
    const c = S.cache[reviewDate], done = (S.tasks && S.tasks.doneOn[reviewDate]) || [], lines = [];
    const timed = c ? c.events.filter(e => !e.allDay) : [];
    if (timed.length) lines.push('Meetings: ' + timed.map(e => `${e.title} (${timeStr(e.start)})`).join(', '));
    if (done.length) lines.push('Done: ' + done.map(t => t.title).join(', '));
    const cur = (S.reviews[reviewDate] || {}).did || '', add = lines.filter(l => !cur.includes(l));
    if (add.length) { patchReview({ did: (cur ? cur.trimEnd() + '\n' : '') + add.join('\n') }); render(); }
  }
  else if (a === 'clear-review') { if (confirm('Clear this day\'s review?')) { delete S.reviews[reviewDate]; save(); render(); } }
  else if (a === 'save-conn') { saveConn(); toast('Saved'); }
  else if (a === 'connect') {
    saveConn(); const base = baseUrl();
    if (base === null) return toast('Enter the Worker address first.');
    window.open(base + '/auth/start?service=calendar', '_blank');
  }
  else if (a === 'check') {
    saveConn();
    const out = $('checkOut'); out.innerHTML = '<p class="muted">Checking…</p>';
    try {
      const r = await api('/api/status'), sc = r.calendarScopes || '';
      const full = /calendar\.events/.test(sc) && /gmail\.readonly/.test(sc);
      const lines = ['Worker reachable.',
        !r.calendarConnected ? 'Google Calendar and Gmail: <b>not connected yet</b>. Tap “Connect Google (Calendar and Gmail)”.'
          : full ? 'Google Calendar and Gmail: connected, including adding events.' : 'Google Calendar: connected, but <b>Gmail and adding events are not granted yet</b>. Tap “Connect Google (Calendar and Gmail)” again and approve.',
        r.connected ? 'Google Health (sleep, steps): connected.' : 'Google Health: <b>not connected</b>. Open Calorie tracker → Settings → Connect Google Health.',
        r.notion ? 'Notion: set up on the Worker.' : 'Notion: <b>not set up</b> on the Worker yet.',
        r.meetingsDb ? 'Meetings database: set up.' : 'Meetings database: <b>not set up</b> on the Worker yet.',
        r.crypto ? 'CoinMarketCap (Portfolio prices): set up.' : 'CoinMarketCap (Portfolio prices): <b>not set up</b> on the Worker yet. Optional.'];
      out.innerHTML = `<div class="${r.calendarConnected && full && r.connected && r.notion && r.meetingsDb ? 'okbox' : 'errbox'}">${lines.join('<br>')}</div>`;
    } catch (e) { out.innerHTML = `<div class="errbox">${esc(e.message)}</div>`; }
  }
  else if (a === 'sync-all') { saveConn(); await syncHealth(30); loadInbox(); loadDay(view === 'review' ? reviewDate : viewDate); }
  else if (a === 'sb-save' || a === 'sb-refresh') {
    SharedBackup.setup($('sbUrl').value, $('sbTok').value); S.settings.backupHoldings = $('sbHold').checked; save();
    if (!SharedBackup.configured()) { sbMsg = { ok: false, text: 'Enter the Pocket CRM access token first.' }; return render(); }
    if (a === 'sb-refresh') { sbMsg = { ok: true, text: 'Checking…' }; render(); return sbRefresh(); }
    sbMsg = { ok: true, text: 'Backing up…' }; render();
    try { const b = await SharedBackup.save('myday', backupObject(!!S.settings.backupHoldings)); sbMsg = { ok: true, text: `Backed up (${b.size_kb} KB).` }; } catch (e) { sbMsg = { ok: false, text: e.message }; }
    render(); sbRefresh(true);
  }
  else if (a === 'sb-restore') {
    SharedBackup.setup($('sbUrl').value, $('sbTok').value);
    if (!confirm('Add the latest My Day backup from Notion to this phone? Days that are newer here stay as they are; nothing is deleted.')) return;
    sbMsg = { ok: true, text: 'Restoring…' }; render();
    try { const r = await SharedBackup.load('myday'); const n = mergeBackup(r.object); sbMsg = { ok: true, text: `Restored ${n} day${n === 1 ? '' : 's'} from the backup of ${new Date(r.at).toLocaleString()}.` }; } catch (e) { sbMsg = { ok: false, text: e.message }; }
    render();
  }
  else if (a === 'export') exportData();
  else if (a === 'import') $('importFile').click();
  else if (a === 'demo-on') { loadDemo(); render(); toast('Demo data loaded'); }
  else if (a === 'demo-off') { removeDemo(); render(); toast('Demo data removed'); }
  else if (a === 'force') forceRefresh();
}
function saveConn() {
  S.settings.appKey = ($('appKey') ? $('appKey').value : S.settings.appKey).trim();
  S.settings.baseUrl = ($('baseUrl') ? $('baseUrl').value : S.settings.baseUrl).trim();
  save();
}
let toastTimer;
function toast(msg, label, fn) {
  clearTimeout(toastTimer);
  $('toast').innerHTML = `<div class="toast"><span>${esc(msg)}</span>${label ? `<button id="toastBtn">${esc(label)}</button>` : ''}</div>`;
  if (label) $('toastBtn').onclick = () => { fn(); $('toast').innerHTML = ''; };
  toastTimer = setTimeout(() => { $('toast').innerHTML = ''; }, label ? 9000 : 3500);
}


/* ---------- fingerprint lock (Review, History, Portfolio and the private counters) ---------- */
// The phone's own fingerprint or screen lock through WebAuthn. It keeps people who pick up your unlocked phone out of these screens;
// it does not encrypt what the browser has stored. Kept outside the app data, so it is never part of a backup.
const LOCK_CRED = 'myday.lock.cred', LOCK_MINS = 'myday.lock.mins', LOCKED_VIEWS = ['review', 'history', 'portfolio'];
const lsGet = (k, d = '') => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage off */ } };
const lsDel = k => { try { localStorage.removeItem(k); } catch { /* storage off */ } };
let lockOpen = false, lockHiddenAt = 0, lockSupported = null, lockMsg = '', lockTried = '';
const lockEnabled = () => !!lsGet(LOCK_CRED);
const lockMinutes = () => { const n = Number(lsGet(LOCK_MINS, '5')); return Number.isFinite(n) && n >= 0 ? n : 5; };
const lockedNow = () => lockEnabled() && !lockOpen;
const viewLocked = v => lockedNow() && LOCKED_VIEWS.includes(v);
const lockB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const lockUnb64 = t => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const lockRand = n => crypto.getRandomValues(new Uint8Array(n));
async function lockCheckSupport() {
  try { lockSupported = !!(window.PublicKeyCredential && navigator.credentials && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { lockSupported = false; }
  if (view === 'settings') render();
}
async function lockRegister() {
  const cred = await navigator.credentials.create({ publicKey: { challenge: lockRand(32), rp: { name: 'My Day', id: location.hostname }, user: { id: lockRand(16), name: 'my-day', displayName: 'My Day' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none' } });
  lsSet(LOCK_CRED, lockB64(cred.rawId));
}
/** Asks for the fingerprint (or the phone's PIN). Resolves true when it was given. */
async function lockUnlock() {
  if (!lockEnabled()) return true;
  try {
    await navigator.credentials.get({ publicKey: { challenge: lockRand(32), rpId: location.hostname, userVerification: 'required', timeout: 60000, allowCredentials: [{ type: 'public-key', id: lockUnb64(lsGet(LOCK_CRED)), transports: ['internal'] }] } });
    lockOpen = true; lockMsg = ''; render();
    return true;
  } catch { lockMsg = 'Not unlocked yet. Tap Unlock to try again.'; if (viewLocked(view)) render(); return false; }
}
function lockNow() { if (!lockEnabled()) return; lockOpen = false; lockTried = ''; closeSheet(); render(); }
const LOCK_NAMES = { review: 'Review', history: 'History', portfolio: 'Portfolio' };
function lockScreenHtml(v) {
  return `<div class="card lockbox"><div class="big">🔒</div><h2 style="margin:8px 0 4px">${LOCK_NAMES[v] || 'This screen'} is locked</h2><p class="muted" id="lockMsg">${esc(lockMsg || 'Touch the fingerprint sensor to open.')}</p><button class="btn day" data-act="lock-unlock">Unlock</button></div>`;
}
function lockSettingsHtml() {
  const on = lockEnabled();
  return `<div class="card"><h3>App lock</h3>
      <label class="tick"><input type="checkbox" id="lockOn" ${on ? 'checked' : ''} ${lockSupported === false && !on ? 'disabled' : ''}> Lock Review, History and Portfolio with my fingerprint</label>
      <p class="muted" style="font-size:12px;margin:2px 0 6px">${lockSupported === false && !on ? 'This phone has no fingerprint or screen lock that the app can use. Set one up in the phone\'s settings first.' : 'Also hides alcohol, travel and illness on the Day screen and the portfolio line. The Day, Sports and More screens stay open.'}</p>
      ${on ? `<label class="lbl2" for="lockMins">Lock again after leaving the app for</label><select class="field" style="margin-top:0" id="lockMins">${[[0, 'At once'], [5, '5 minutes'], [15, '15 minutes'], [60, '1 hour']].map(([n, l]) => `<option value="${n}" ${lockMinutes() === n ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn" data-act="lock-now">🔒 Lock now</button><button class="btn" data-act="lock-reset">Can't unlock? Remove the lock</button></div>` : ''}
      ${lockMsg && view === 'settings' ? `<p class="muted" style="font-size:13px;margin:6px 0 0">${esc(lockMsg)}</p>` : ''}</div>`;
}
function bindLock() {
  const on = $('lockOn'); if (!on) return;
  on.onchange = async () => {
    lockMsg = '';
    if (on.checked) { try { await lockRegister(); lockOpen = true; } catch (e) { lockMsg = e && e.name === 'NotAllowedError' ? 'Cancelled.' : 'The lock could not be set up on this phone.'; } }
    else if (!lockOpen && !(await lockUnlock())) lockMsg = 'Unlock first to switch the lock off.';
    else { lsDel(LOCK_CRED); lockOpen = true; }
    render();
  };
  const m = $('lockMins'); if (m) m.onchange = () => lsSet(LOCK_MINS, m.value);
}
document.addEventListener('visibilitychange', () => {
  if (!lockEnabled()) return;
  if (document.visibilityState === 'hidden') { lockHiddenAt = Date.now(); return; }
  if (lockOpen && lockHiddenAt && Date.now() - lockHiddenAt >= lockMinutes() * 60000) lockNow();
});

/* ---------- backup / demo / refresh ---------- */
/* Shared backup client. The same code runs in My Day, Racket Rankings and Pocket CRM. Each app compresses its own data and
   sends it to the Pocket CRM service, which keeps it in the Notion database "App backups". */
const SharedBackup = (() => {
  const DEFAULT_URL = 'https://contact-capture.matthias-homan.workers.dev';
  const K = { url: 'sb.url', tok: 'sb.token', auto: 'sb.autoAt', last: 'sb.lastOk' };
  const get = (k, d = '') => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage off */ } };
  const NAMES = { myday: 'My Day', rankings: 'Racket Rankings', crm: 'Pocket CRM' };
  const b64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
  const api = {
    NAMES,
    url: () => (get(K.url) || DEFAULT_URL).replace(/\/+$/, ''),
    token: () => get(K.tok),
    configured: () => !!get(K.tok),
    setup(url, token) { set(K.url, (url || '').trim()); set(K.tok, (token || '').trim()); },
    lastOk: () => Number(get(K.last, '0')) || 0,
    device() { const m = /Android[^;)]*;\s*([^;)]+?)(?:\sBuild|\))/.exec(navigator.userAgent); return m && m[1] && m[1] !== 'K' ? m[1] : /Android/.test(navigator.userAgent) ? 'Android phone' : 'Browser'; },
    /** object -> "gz:<base64>" (or "raw:" when the browser cannot compress). */
    async pack(obj) {
      const bytes = new TextEncoder().encode(JSON.stringify(obj));
      if (typeof CompressionStream === 'function') return 'gz:' + b64(await pipe(bytes, new CompressionStream('gzip')));
      return 'raw:' + b64(bytes);
    },
    async unpack(str) {
      const raw = unb64(str.slice(str.indexOf(':') + 1));
      const bytes = str.startsWith('gz:') ? await pipe(raw, new DecompressionStream('gzip')) : raw;
      return JSON.parse(new TextDecoder().decode(bytes));
    },
    async call(path, init = {}) {
      let res;
      try { res = await fetch(api.url() + path, { ...init, headers: { Authorization: 'Bearer ' + api.token(), ...(init.body ? { 'Content-Type': 'application/json' } : {}) }, signal: AbortSignal.timeout(45000) }); }
      catch { throw new Error('Could not reach the Pocket CRM service. Check the signal and the address.'); }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 401 ? 'The access token is wrong. Use the same token as Pocket CRM.' : data.error || `The service said no (${res.status}).`);
      return data;
    },
    async save(app, obj) {
      const data = await api.pack(obj);
      const res = await api.call('/backup/save', { method: 'POST', body: JSON.stringify({ app, data, device: api.device() }) });
      set(K.last, String(Date.now()));
      return res.backup;
    },
    async load(app) { const r = await api.call('/backup/load?app=' + app); return { ...r, object: await api.unpack(r.data) }; },
    async list() { return (await api.call('/backup/list')).backups; },
    /** Once a day when the app is opened (and it has something to save). Silent: never throws. */
    async auto(app, makeObject) {
      if (!api.configured() || !navigator.onLine) return false;
      if (Date.now() - (Number(get(K.auto, '0')) || 0) < 20 * 3600 * 1000) return false;
      try { const o = makeObject(); if (!o) return false; set(K.auto, String(Date.now())); await api.save(app, o); return true; } catch { set(K.auto, '0'); return false; }
    },
    /** "3 hours ago" style label. */
    ago(iso) { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); if (!(m >= 0)) return ''; if (m < 2) return 'just now'; if (m < 90) return m + ' minutes ago'; if (m < 36 * 60) return Math.round(m / 60) + ' hours ago'; return Math.round(m / 1440) + ' days ago'; },
  };
  return api;
})();

// What a backup holds: reviews and counters, prep notes, tags. Portfolio amounts only when asked for. Never the connection or keys.
function backupObject(withHoldings = true) {
  return { app: 'myday', version: 1, exportedAt: Date.now(), reviews: S.reviews, prep: S.prep, tags: S.tags, supplements: suppList(), sports: {plans:S.sports.plans}, ...(withHoldings ? { holdings: S.crypto.holdings } : {}) };
}
/** Adds a backup to what is on the phone: a day is replaced only by a newer version of it, nothing is deleted. Returns the number of days taken over. */
function mergeBackup(d) {
  if (!d || d.app !== 'myday' || typeof d.reviews !== 'object') throw new Error('not a backup from this app');
  let n = 0;
  for (const [date, rv] of Object.entries(d.reviews)) { const mine = S.reviews[date]; if (!mine || (rv.updatedAt || 0) > (mine.updatedAt || 0)) { S.reviews[date] = rv; n++; } }
  for (const [k, v] of Object.entries(d.prep || {})) if (!S.prep[k]) S.prep[k] = v;
  for(const [id,p] of Object.entries(d.sports?.plans||{})){if(p&&typeof p==='object'&&p.id===id&&(!S.sports.plans[id]||(p.updatedAt||0)>(S.sports.plans[id].updatedAt||0)))S.sports.plans[id]=p;}
  for (const t of d.tags || []) if (!S.tags.includes(t)) S.tags.push(t);
  if (Array.isArray(d.supplements)) for (const t of d.supplements) if (typeof t === 'string' && !suppList().includes(t)) S.settings.supplements = [...suppList(), t.slice(0, 40)];
  for (const h of d.holdings || []) if (h && h.id && !S.crypto.holdings.some(x => x.id === h.id)) S.crypto.holdings.push(h);
  save();
  return n;
}
function exportData() {
  const blob = new Blob([JSON.stringify(backupObject(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `myday-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importData(ev) {
  const file = ev.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const n = mergeBackup(JSON.parse(r.result));
      render(); toast(`Imported ${n} day${n === 1 ? '' : 's'}`);
    } catch (e) { toast('Could not import: ' + e.message); }
  };
  r.readAsText(file);
}
function loadDemo() {
  const t = today(), at = (h, m = 0, d = t) => { const x = parseYmd(d); x.setHours(h, m); return x.toISOString(); };
  const ev = (id, title, h1, m1, h2, m2, extra = {}) => ({ id, uid: id, calendar: 'Demo', title, start: at(h1, m1), end: at(h2, m2), allDay: false, location: '', description: '', video: null, link: null, response: 'accepted', busy: true, recurring: false, organizer: '', attendees: [], attendeeCount: 0, ...extra });
  S.cache[t] = { at: Date.now(), calendars: ['Demo'], errors: [], events: [
    { ...ev('d0', 'Maria’s birthday', 0, 0, 0, 0), allDay: true, start: t, end: addDays(t, 1) },
    ev('d1', 'Team standup', 9, 30, 9, 45, { video: 'https://meet.example/standup', organizer: 'Sam Lee', attendeeCount: 6, attendees: [{ name: 'Sam Lee', email: 'sam@example.com', response: 'accepted', self: false, organizer: true, optional: false }, { name: 'Priya Nair', email: 'priya@example.com', response: 'tentative', self: false, organizer: false, optional: false }], description: 'Quick sync. Agenda: blockers, launch date.\nNotes: https://docs.example/standup' }),
    ev('d2', 'Pitch review with Acme', 11, 0, 12, 0, { location: 'Meeting room 2', response: 'tentative', attendeeCount: 3, attendees: [{ name: 'Dana Fox', email: 'dana@acme.example', response: 'accepted', self: false, organizer: true, optional: false }], organizer: 'Dana Fox', description: 'Walk through the deck and agree next steps.' }),
    ev('d5', 'Design check-in', 11, 30, 12, 0, { attendeeCount: 2 }),
    ev('d3', 'Lunch with Tom', 13, 0, 14, 0, { location: 'Café Central', busy: false }),
    ev('d4', '1:1 with manager', 15, 30, 16, 0, { video: 'https://meet.example/11', attendeeCount: 2 })] };
  const task = (id, title, due, status = 'Not started', types = ['Work']) => ({ id: 'demo-' + id, title, status, due, done: null, types, tags: [], waiting: false, crm: false, people: [], next: '', url: '#' });
  S.tasks = { at: Date.now(), open: [task('1', 'Send proposal to Acme', addDays(t, -1)), task('2', 'Prepare pitch notes', t), task('3', 'Book dentist', t, 'Not started', ['Personal']), task('9', 'Call the bank', `${t}T16:30:00`, 'Not started', ['Personal']), { ...task('8', 'Dana to confirm budget', null), waiting: true, crm: true }, task('4', 'Review budget', null, 'In progress'), task('5', 'Renew passport', addDays(t, 2), 'Not started', ['Personal']), task('6', 'Plan Q1 offsite', null)],
    doneOn: { [t]: [{ ...task('7', 'Reply to Dana', t), status: 'Done', done: t }] } };
  const now = Date.now();
  S.inbox = { at: now, account: 'me@example.com', unread: 3, messages: [
    { id: 'm1', threadId: 'a1', from: { name: 'Dana Fox', email: 'dana@acme.example' }, subject: 'Re: pilot terms', snippet: 'Thanks for sending this over. Can we move the kickoff to the week of the 16th? Legal wants one more look.', at: now - 36e5, starred: true, crm: { id: 'demo-p1', name: 'Dana Fox', tier: 'A - Key' } },
    { id: 'm2', threadId: 'a2', from: { name: 'Bank', email: 'noreply@bank.example' }, subject: 'Your October statement is ready', snippet: 'Your statement is now available in online banking.', at: now - 5 * 36e5, starred: false, crm: null },
    { id: 'm3', threadId: 'a3', from: { name: 'Tom Reid', email: 'tom@example.com' }, subject: 'Lunch on Thursday?', snippet: 'Are you free around one? Café Central again?', at: now - 3 * 864e5, starred: false, crm: null }] };
  for (let i = 1; i <= 21; i++) {
    const d = addDays(t, -i), seed = (i * 37) % 11, mood = 1 + ((seed + i) % 5);
    S.health[d] = Object.assign(S.health[d] || {}, { steps: 4000 + seed * 900, sleepMinutes: 360 + seed * 14, sleepDeepMin: 60 + seed, sleepRemMin: 80 + seed * 2, restingHr: 55 + (seed % 5), caloriesOut: 2300 + seed * 60, activeKcal: 500 + seed * 35, hrv: 40 + (seed % 7) * 2 });
    if (i % 4 !== 0) S.reviews[d] = { mood: Math.min(5, Math.max(1, S.health[d].sleepMinutes >= 420 ? mood + 1 : mood)), energy: 1 + (seed % 5), tags: [['Work'], ['Work', 'Run'], ['Social', 'Family', 'Golf 9'], ['Rest'], ['Work', 'Learning', 'Padel']][i % 5], did: ['Busy day of meetings, then a run.', 'Dinner with friends.', 'Quiet day, caught up on admin.', 'Long planning session.'][i % 4], win: i % 3 ? '' : 'Finished the report', updatedAt: Date.now() - i, demo: true };
  }
  S.health[t] = Object.assign(S.health[t] || {}, { steps: 5240, caloriesOut: 1860, sleepMinutes: 432, sleepDeepMin: 74, sleepRemMin: 98, restingHr: 56, hrv: 46 });
  S.health[addDays(t, -1)] = Object.assign(S.health[addDays(t, -1)] || {}, { steps: 9120 });
  S.crypto = { holdings: [{ id: 1, symbol: 'BTC', name: 'Bitcoin', amount: 0.05 }, { id: 1027, symbol: 'ETH', name: 'Ethereum', amount: 1.2 }, { id: 74, symbol: 'DOGE', name: 'Dogecoin', amount: 1500 }], quotes: {}, at: 0 };
  S.demo = true; S.status = {}; save();
}
function removeDemo() {
  S.demo = false; S.cache = {}; S.tasks = null; S.inbox = null; S.health = {}; S.status = {}; S.crypto = { holdings: [], quotes: {}, at: 0 };
  for (const [d, r] of Object.entries(S.reviews)) if (r.demo) delete S.reviews[d];
  save();
}
async function forceRefresh() {
  try {
    if (navigator.serviceWorker) (await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister());
    if (window.caches) (await caches.keys()).forEach(k => caches.delete(k));
  } catch { /* ignore */ }
  location.href = location.pathname + '?v=' + Date.now();
}

/* ---------- swipe between days ---------- */
let swipe = null;
document.addEventListener('touchstart', e => {
  const t = e.touches[0];
  swipe = view === 'today' && e.touches.length === 1 && !$('overlay').innerHTML && t.clientX > 24 && t.clientX < innerWidth - 24 // leave the screen edges to Android's own back gesture
    ? { x: t.clientX, y: t.clientY, at: Date.now() } : null;
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!swipe) return;
  const t = e.changedTouches[0], dx = t.clientX - swipe.x, dy = t.clientY - swipe.y, quick = Date.now() - swipe.at < 800;
  swipe = null;
  if (quick && Math.abs(dx) > 70 && Math.abs(dx) > 1.6 * Math.abs(dy)) changeDay(dx < 0 ? 1 : -1);
}, { passive: true });
document.addEventListener('touchcancel', () => { swipe = null; }, { passive: true });

/* ---------- boot ---------- */
applyTheme();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* app works without it */ });
}
render();
// Home-screen shortcuts (press and hold the app icon): ?new=task and ?new=event open the matching sheet straight away; ?new=review opens the Review tab.
{
  const q = new URLSearchParams(location.search).get('new');if(q==='class'){history.replaceState(null,'',location.pathname);go('sports');sportsClassForm();}
  if (q === 'task' || q === 'event' || q === 'review') {
    history.replaceState(null, '', location.pathname + '?source=pwa'); // a refresh must not open it again
    if (q === 'review') { go('review'); }
    else setTimeout(() => { if (q === 'task') openAddTask(); else openEventForm({ date: today() }); }, 0);
  }
}
lockCheckSupport();
SharedBackup.auto('myday', () => (Object.keys(S.reviews).length || Object.keys(S.sports.plans).length ? backupObject(!!S.settings.backupHoldings) : null));
if (connected()) {
  loadDay(viewDate); loadInbox(); loadPrices();
  if (!Object.keys(S.health).length) syncHealth(30); else if (Date.now() - S.healthAt > 30 * 60 * 1000) syncHealth(7);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const rolled = rollDay();
  if (rolled && !$('overlay').innerHTML) { render(); if (connected()) loadDay(viewDate); }
  if (!connected() || $('overlay').innerHTML) return;
  const d = view === 'review' ? reviewDate : viewDate, c = S.cache[d];
  if ((view === 'today' || view === 'review') && (!c || Date.now() - c.at > 5 * 60 * 1000)) loadDay(d);
  if (view === 'inbox' && (!S.inbox || Date.now() - S.inbox.at > 5 * 60 * 1000)) loadInbox();
});
setInterval(() => { if (view === 'portfolio' && !document.hidden && !$('overlay').innerHTML) loadPrices(); }, 5 * 60 * 1000); // keeps prices fresh while the page is open
setInterval(() => { if (rollDay() && connected() && !$('overlay').innerHTML) loadDay(viewDate); if (view === 'today' && viewDate === today() && !$('overlay').innerHTML && !document.hidden) render(); }, 60 * 1000); // keeps the now-line and "next" label current

// Republish verified Sports layout after a stalled hosting build.
