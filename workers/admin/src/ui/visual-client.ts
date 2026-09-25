/**
 * Edit Mode's browser code. Served only after Access verification; never
 * bundled into the public site.
 *
 * Rebuilt after using the deployed admin as the doctor would. What that found,
 * and what this file therefore guarantees:
 *
 * - Every mutation ends in a visible result: working, saved, nothing to save,
 *   or an error that says what to do. An error is never overwritten by a
 *   background status check (it used to be, within five seconds).
 * - Errors are sentences in Hebrew, naming the item, field and language —
 *   never "INVALID — row_1_times_required".
 * - "Edit treatment" opens THAT treatment, at the top, focused. It used to
 *   render the first treatment 1,700px below the fold.
 * - A second save in the same sitting works (the new blob SHA is kept).
 * - One publication tracker at a time.
 *
 * Owner text reaches the DOM only as textContent or a form value. No
 * innerHTML, anywhere — a test enforces it.
 */
import { EDITOR_STRINGS } from './visual-strings.ts';

// The dictionary is inlined as a JSON literal; '<' is escaped so no string can
// close the script element it is served in.
const STRINGS_JSON = JSON.stringify(EDITOR_STRINGS).replace(/</g, '\\u003c');

const SOURCE = String.raw`
(() => {
  'use strict';
  const bar = document.querySelector('[data-visual-editor-locale]');
  if (!bar) return;
  const locale = bar.getAttribute('data-visual-editor-locale') || 'he';
  const LANGS = ['he', 'ar', 'en'];
  const STRINGS = __STRINGS__;
  const S = STRINGS[locale] || STRINGS.he;
  /** Interface text in the page's language; {name}-style values filled in. */
  function t(key, values){ let text=S[key]; if(text==null) text=STRINGS.he[key]; if(text==null) text=key; if(values) for(const k of Object.keys(values)) text=text.split('{'+k+'}').join(String(values[k])); return text; }
  const names = {he:STRINGS.he.langName, ar:STRINGS.ar.langName, en:STRINGS.en.langName};
  const urls = {copy:'/api/content/copy',services:'/api/content/services',doctor:'/api/content/doctor',faq:'/api/content/faq',contact:'/api/content/contact',hours:'/api/hours',photos:'/api/photos'};
  const MIN_EDGE = 1200;
  // What is actually sent. The site never shows a photograph wider than
  // 1536px, and a 10 MB request from a phone is slow and was refused outright
  // by a browser during testing, so anything over this is resized first.
  const SEND_LIMIT = 6 * 1024 * 1024, SEND_EDGE = 2560;
  const COPY_LABELS=S.copyLabels, CONTACT_LABELS=S.contactLabels, CATEGORY_LABELS=S.categories, ICON_LABELS=S.icons, SERVICE_FIELDS=S.serviceFields, ERRORS=S.errors, ISSUES=S.issues, REASONS=S.reasons, DAYS=S.days;
  const DAY_INDEX = {Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};
  // The dialog speaks the page's language, in its direction. Fields for a
  // specific language keep their own lang and dir.
  const DIR = locale==='en'?'ltr':'rtl';

  /* ── Small DOM helpers (text only) ──────────────────────────────────── */
  function add(parent, tag, text) { const node=document.createElement(tag); if(text!=null) node.textContent=text; parent.append(node); return node; }
  function button(label, action, cls) { const node=document.createElement('button'); node.type='button'; node.textContent=label; if(cls) node.className=cls; node.addEventListener('click',action); return node; }
  function row(parent) { const node=add(parent,'div'); node.className='visual-row'; return node; }
  function badge(parent, published, text) { const b=add(parent,'span',text||(published?t('published'):t('hidden'))); b.className='visual-badge'; b.setAttribute('data-state',published?'published':'hidden'); return b; }
  function field(parent,label,value,change,options={}) {
    const wrap=add(parent,'label',label); const node=document.createElement(options.textarea?'textarea':'input');
    if(!options.textarea) node.type=options.type||'text';
    if(options.lang){ node.lang=options.lang; node.dir=options.lang==='en'?'ltr':'rtl'; }
    if(options.dir) node.dir=options.dir;
    if(options.path) node.setAttribute('data-path',options.path);
    node.value=value==null?'':String(value);
    node.addEventListener('input',()=>{touch();node.removeAttribute('aria-invalid');change(node.value);}); wrap.append(node); return node;
  }
  function select(parent,label,value,choices,change,path){const wrap=add(parent,'label',label);const node=add(wrap,'select');if(path)node.setAttribute('data-path',path);for(const [v,t] of choices){const option=add(node,'option',t);option.value=String(v);}node.value=String(value);node.addEventListener('change',()=>{touch();change(node.value);});return node;}
  function check(parent,label,value,change,path){const wrap=add(parent,'label');wrap.className='visual-check';const node=document.createElement('input');node.type='checkbox';node.checked=!!value;if(path)node.setAttribute('data-path',path);node.addEventListener('change',()=>{touch();node.removeAttribute('aria-invalid');change(node.checked);});wrap.append(node,document.createTextNode(label));return node;}
  function group(parent,label){const fs=add(parent,'fieldset');add(fs,'legend',label);return fs;}
  function translated(parent,label,obj,key,path,textarea=true){const fs=group(parent,label);for(const lang of LANGS){field(fs,names[lang],obj[key][lang],v=>{obj[key][lang]=v;},{textarea,lang,path:path+'.'+lang});}return fs;}
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const short=(sha)=>String(sha).slice(0,7);

  /* ── Dialog shell: header, scrolling body, sticky footer with the result ─ */
  const dialog = document.createElement('dialog'); dialog.className='visual-dialog'; dialog.setAttribute('aria-labelledby','visual-dialog-title'); dialog.lang=locale; dialog.dir=DIR;
  const head = add(dialog,'div'); head.className='visual-dialog-head';
  const title = add(head,'h2'); title.id='visual-dialog-title';
  /* Closing with unsaved edits is the one destructive thing a doctor can do
     here by accident — nothing is committed until Save. */
  const close = button(t('close'), () => {
    if (dirty && !confirm(t('unsavedClose'))) return;
    dirty = false; dialog.close();
  });
  head.append(close);
  const main = add(dialog,'div'); main.className='visual-dialog-main';
  const warning = add(main,'p',t('warning')); warning.className='visual-warning';
  const body = add(main,'div');
  const foot = add(dialog,'div'); foot.className='visual-dialog-foot';
  const message = add(foot,'p'); message.className='visual-status'; message.setAttribute('role','status'); message.setAttribute('aria-live','polite');
  const errorBox = add(foot,'div'); errorBox.className='visual-errors'; errorBox.setAttribute('role','alert'); errorBox.hidden=true;
  const pubLine = add(foot,'p'); pubLine.className='visual-pub'; pubLine.hidden=true;
  const footActions = add(foot,'div'); footActions.className='visual-foot-actions';
  const saveButton = button(t('save'), () => void save(), 'primary');
  footActions.append(saveButton);
  document.body.append(dialog);
  dialog.addEventListener('cancel',(event)=>{ if (dirty && !confirm(t('unsavedClose'))) event.preventDefault(); else dirty=false; });

  let kind='', sha='', draft=null, original=null, focus='', busy=false, dirty=false, publishing='test';
  let view={mode:'list',id:'',lang:locale}, expanded=new Set(), versions={}, edits={}, orderDirty=false, pending=[], sent=null, altOpenSet=new Set();
  /** Marked on every field change, cleared on save. Guards the close. */
  function touch(){ dirty=true; }

  function tell(text,state){message.textContent=text;message.setAttribute('data-state',state||'');message.classList.remove('visual-loading');barTell(text,state);}
  function setBusy(on){busy=on;saveButton.disabled=on;main.inert=on;if(on)main.setAttribute('aria-busy','true');else main.removeAttribute('aria-busy');}
  function clearErrors(){errorBox.replaceChildren();errorBox.hidden=true;for(const n of dialog.querySelectorAll('[aria-invalid]'))n.removeAttribute('aria-invalid');}

  /* ── Network ────────────────────────────────────────────────────────── */
  function ApiError(code, issues){ this.code=code; this.issues=issues||[]; }
  async function api(url, method, payload){
    let response;
    try {
      // redirect:'manual' — an expired Access session answers with a redirect
      // to the login page, which a fetch would otherwise follow into a CORS
      // failure and report as "no network".
      response=await fetch(url,{method,headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined,cache:'no-store',redirect:'manual',credentials:'same-origin'});
    } catch { throw new ApiError('NETWORK'); }
    if (response.type==='opaqueredirect' || response.status===0) throw new ApiError('AUTH_REQUIRED');
    let result=null; try { result=await response.json(); } catch { result=null; }
    if (!result) throw new ApiError(response.status===413?'PAYLOAD_TOO_LARGE':response.status===429?'RATE_LIMITED':'SERVER_ERROR');
    if (!response.ok || !result.ok) throw new ApiError(result.error && result.error.code || 'SERVER_ERROR', result.error && result.error.issues);
    return result.data;
  }

  /* ── Turning an issue key into a sentence and a field ───────────────── */
  function reasonOf(r){ if(/^claim_/.test(r)) return t('claim'); return REASONS[r]||REASONS.invalid_value; }
  /** An item's own name in the page language when it has one, else in Hebrew, else its number. */
  function localTitle(texts){ return texts && (texts[locale] || texts.he) || ''; }
  function itemName(i){ const item=sent&&sent[i]; const n=Number(i)+1; if(!item) return t('itemN',{n}); if(kind==='services') return t('treatmentNamed',{name:localTitle(item.locales&&{he:item.locales.he.title,ar:item.locales.ar.title,en:item.locales.en.title})||item.slug}); if(kind==='faq') return t('questionNamed',{name:localTitle(item.q)||n}); return t('itemN',{n}); }
  function describeIssue(issue){
    if (ISSUES[issue]) return ISSUES[issue];
    let m=/^row_(\d)_(.*)$/.exec(issue);
    if (m) { const day=t('dayLabel',{day:DAYS[Number(m[1])]}); if(m[2]==='times_required') return t('timesRequired',{day}); if(m[2]==='opens_after_closes') return t('opensAfterCloses',{day}); if(/^time/.test(m[2])) return t('badTime',{day}); return t('badDay',{day}); }
    m=/^alt_(he|ar|en)_claim_/.exec(issue); if(m) return t('altClaim',{lang:names[m[1]]});
    const at=issue.lastIndexOf(':'); if(at<0) return t('invalidValue');
    const path=issue.slice(0,at).split('.'), reason=reasonOf(issue.slice(at+1));
    if (kind==='services'||kind==='faq') {
      const lang=path.find(p=>LANGS.includes(p)); const key=path.slice(1).find(p=>SERVICE_FIELDS[p]);
      return itemName(path[0])+' · '+(key?SERVICE_FIELDS[key]:t('field'))+(lang?' ('+names[lang]+')':'')+': '+reason;
    }
    if (kind==='copy') { const lang=path[path.length-1]; const key=path.slice(0,-1).join('.'); return (COPY_LABELS[key]||key)+(names[lang]?' ('+names[lang]+')':'')+': '+reason; }
    if (kind==='contact') { const lang=path.find(p=>LANGS.includes(p)); return (CONTACT_LABELS[path[0]]||path[0])+(lang?' ('+names[lang]+')':'')+': '+reason; }
    if (kind==='doctor') { const lang=path.find(p=>LANGS.includes(p)); const part=S.doctorParts[path[0]]||path[0]; return part+(lang?' ('+names[lang]+')':'')+': '+reason; }
    return reason;
  }
  function fieldFor(issue){
    const at=issue.lastIndexOf(':'); const path=at<0?issue:issue.slice(0,at);
    const m=/^row_(\d)_/.exec(issue); if(m) return dialog.querySelector('[data-path="row_'+m[1]+'"]');
    if(issue==='owner_confirmation_required') return dialog.querySelector('#visual-owner-confirm');
    if(issue==='same_location_confirmation_required') return dialog.querySelector('#visual-same-location');
    if(issue==='confirmation_required') return dialog.querySelector('#visual-upload-confirm');
    // The exact field, or the nearest enclosing group (a list that is too
    // short has no field of its own to point at).
    for(let cut=path; cut; cut=cut.includes('.')?cut.slice(0,cut.lastIndexOf('.')):''){
      const node=dialog.querySelector('[data-path="'+CSS.escape(cut)+'"]');
      if(node) return node;
    }
    return null;
  }
  /** Put the issue on screen: for a treatment or FAQ, open the item and the language it is in. */
  function goTo(issue){
    const at=issue.lastIndexOf(':'); const path=(at<0?issue:issue.slice(0,at)).split('.');
    if ((kind==='services'||kind==='faq') && sent && /^\d+$/.test(path[0])) {
      const item=sent[Number(path[0])]; const lang=path.find(p=>LANGS.includes(p));
      if (item && kind==='services') view={mode:'item',id:item.id,lang:lang||view.lang};
      if (item && kind==='faq') expanded.add(item.id);
      render();
    }
    const node=fieldFor(issue);
    if (node) { node.setAttribute('aria-invalid','true'); node.scrollIntoView({block:'center'}); node.focus({preventScroll:true}); }
  }

  function fail(error){
    const code=error instanceof ApiError?error.code:'SERVER_ERROR';
    tell(ERRORS[code]||ERRORS.SERVER_ERROR,'error');
    errorBox.replaceChildren();
    if (code==='INVALID' && error.issues.length) {
      const list=add(errorBox,'ul');
      for (const issue of error.issues) {
        const li=add(list,'li'); const text=describeIssue(issue);
        const node=fieldFor(issue); if(node) node.setAttribute('aria-invalid','true');
        li.append(button(text,()=>goTo(issue),'visual-link'));
      }
      // The Worker reports at most twenty at a time.
      if(error.issues.length>=20) add(errorBox,'p',t('moreIssues')).className='visual-hint';
      errorBox.hidden=false;
    } else if (code==='CONFLICT' || code==='NOT_FOUND') {
      errorBox.append(button(t('reloadLatest'),()=>{ if(dirty&&!confirm(t('unsavedReload')))return; dirty=false; void open(kind,focus,true); },'primary'));
      errorBox.hidden=false;
    } else if (code==='AUTH_REQUIRED' || code==='AUTH_INVALID') {
      errorBox.append(button(t('refreshSignIn'),()=>location.reload(),'primary'));
      errorBox.hidden=false;
    }
  }

  /* ── Publication: ONE tracker; it never touches the dialog's result line ─ */
  let trackToken=0;
  function pubTell(text,state){ pubLine.textContent=text; pubLine.hidden=!text; pubLine.setAttribute('data-state',state||''); barTell(text,state); }
  /*
   * After a save the doctor sees, in order: Saved → Updating the website view
   * → Updated, and the page reloads itself with the new content. "Updated" is
   * claimed only when the Worker reports that the build it is SERVING contains
   * this exact commit (preview: 'ready') — not when a workflow merely says it
   * finished. Nothing reloads over unsaved work: with an open edit the doctor
   * gets a button instead.
   */
  async function track(commit){
    if(!commit) return;
    const token=++trackToken; let announced=false;
    pubTell(publishing==='test'?t('updating'):t('waitingPublish',{sha:short(commit)}),'working');
    for (let attempt=0; attempt<150; attempt++) {
      await sleep(attempt<6?4000:6000);
      if (token!==trackToken) return;
      let data; try { data=await api('/api/status?sha='+encodeURIComponent(commit),'GET'); } catch { continue; }
      if (token!==trackToken) return;
      if (data.preview==='ready') { reloadWhenSafe(commit); return; }
      if (data.preview==='failed') { pubTell(t('updateFailed'),'failed'); return; }
      if (data.preview==='none' && attempt>=8 && !announced) { announced=true; pubTell(t('updateNotConfigured'),'info'); }
      if (publishing==='production') {
        if (data.state==='failed') { pubTell(t('publishFailed'),'failed'); return; }
        if (data.state==='published') { barTell(t('publishedSite'),'published'); }
      }
      if (data.preview==='building' && !announced) pubTell(t('updating'),'working');
      // About six minutes in: still waiting, but say it is slow rather than spin.
      if (data.preview==='building' && attempt===60) { announced=true; pubTell(t('updateSlow'),'info'); }
    }
  }
  /** The page now contains the change: reload into it, unless that would lose work. */
  function reloadWhenSafe(commit){
    if(!dirty && !pending.length && !busy){
      pubTell(t('updated'),'published');
      try{ sessionStorage.setItem('visual-updated',commit); }catch{}
      setTimeout(()=>location.reload(),1200);
      return;
    }
    reloadSlot.replaceChildren();
    reloadSlot.append(button(t('refreshNow'),()=>{ if(dirty&&!confirm(t('unsavedRefresh')))return; dirty=false; location.reload(); }));
    reloadSlot.hidden=false;
    pubTell(t('updatedDirty'),'published');
  }

  /* ── Opening, loading, saving ───────────────────────────────────────── */
  function loading(on){message.classList.toggle('visual-loading',on);if(on){message.textContent=t('loading');message.setAttribute('data-state','working');const sk=document.createElement('div');sk.className='visual-skeleton';sk.setAttribute('aria-hidden','true');for(let i=0;i<6;i++)sk.append(document.createElement('span'));body.replaceChildren(sk);body.setAttribute('aria-busy','true');}else{body.replaceChildren();body.removeAttribute('aria-busy');}}
  async function open(next,which='',reload=false){
    if(dialog.open && dirty && !reload && !confirm(t('unsavedSwitch'))) return;
    kind=next;focus=which;sha='';draft=null;original=null;dirty=false;orderDirty=false;edits={};pending=[];expanded=new Set();sent=null;altOpenSet=new Set();
    view={mode:'list',id:'',lang:locale};
    title.textContent=S.titles[kind]||kind; clearErrors(); pubLine.hidden=true;
    saveButton.hidden = kind==='photos';
    loading(true); if(!dialog.open) dialog.showModal();
    try {
      const data=await api(urls[kind],'GET');
      sha=data.sha; versions=data.versions||{};
      draft=structuredClone(kind==='hours'?data.rows:kind==='photos'?data.records:data.value);
      original=structuredClone(draft);
      if (kind==='services' && focus==='new') { const created=newService(); draft.push(created); dirty=true; view={mode:'item',id:created.id,lang:locale}; focus=''; }
      else if (kind==='services' && focus) { const item=draft.find(x=>x.slug===focus); if(item) view={mode:'item',id:item.id,lang:locale}; }
      loading(false); tell(''); render(); main.scrollTop=0;
      const start=body.querySelector('[data-start]'); if(start) start.focus();
    } catch (error) { loading(false); fail(error); }
  }
  function payloadFor(){
    if(kind==='hours') return {rows:draft,sha};
    return {value:draft,sha,confirmed:document.querySelector('#visual-owner-confirm')?.checked===true,sameLocation:document.querySelector('#visual-same-location')?.checked===true};
  }
  async function save(){
    if(busy||kind==='photos') return;
    clearErrors(); sent=structuredClone(draft);
    setBusy(true); tell(t('saving'),'working');
    try {
      const data=await api(urls[kind],'PUT',payloadFor());
      if (data.blob) sha=data.blob;
      if (data.unchanged) { dirty=false; tell(t('nothingToSave'),'info'); return; }
      original=structuredClone(draft);
      dirty=false;tell(t(publishing==='test'?'savedTest':'savedProd',{sha:short(data.sha)}),'ok');
      render(); void track(data.sha);
    } catch (error) { fail(error); } finally { setBusy(false); }
  }
  function render(){
    body.replaceChildren();
    if(kind==='copy')copyForm();else if(kind==='doctor')doctorForm();else if(kind==='contact')contactForm();else if(kind==='hours')hoursForm();else if(kind==='faq')faqForm();else if(kind==='services')servicesForm();else if(kind==='photos')photosForm();
  }
  function focusTop(){ main.scrollTop=0; const start=body.querySelector('[data-start]'); if(start) start.focus(); }

  /* ── Simple forms ───────────────────────────────────────────────────── */
  function copyForm(){
    const keys=Object.keys(draft).filter(key=>!focus||key.startsWith(focus+'.')||(focus==='hero'&&key==='action.bookAppointment'));
    if(focus) body.append(button(t('showAllTexts'),()=>{focus='';render();}));
    for(const key of keys) translated(body,COPY_LABELS[key]||key,{entry:draft[key]},'entry',key);
  }
  function doctorForm(){
    translated(body,t('intro'),{entry:draft.intro},'entry','intro');
    const fs=group(body,t('approach'));
    for(const lang of LANGS) field(fs,names[lang],draft.approach[lang].join('\n'),v=>{draft.approach[lang]=v.split('\n').map(x=>x.trim()).filter(Boolean);},{textarea:true,lang,path:'approach.'+lang});
    const cred=group(body,t('credentials'));
    draft.credentials.forEach((item,index)=>{const box=add(cred,'div');box.className='visual-item';for(const lang of LANGS)field(box,names[lang],item.label[lang],v=>{item.label[lang]=v;},{textarea:true,lang,path:'credentials.'+index+'.label.'+lang});field(box,t('year'),item.year||'',v=>{if(v)item.year=v;else delete item.year;},{path:'credentials.'+index+'.year',dir:'ltr'});box.append(button(t('removeCredential'),()=>{draft.credentials.splice(index,1);touch();render();},'danger'));});
    cred.append(button(t('addCredential'),()=>{draft.credentials.push({label:{he:'',ar:'',en:''}});touch();render();}));
    ownerConfirm();
  }
  function ownerConfirm(){const wrap=add(body,'label');wrap.className='visual-check';const input=document.createElement('input');input.type='checkbox';input.id='visual-owner-confirm';wrap.append(input,document.createTextNode(t('ownerConfirm')));}
  function contactForm(){
    add(body,'p',t('contactHint')).className='visual-hint';
    for(const key of ['landline','mobile','email','postalCode','instagram','facebook','googleBusiness'])field(body,CONTACT_LABELS[key],draft[key],v=>{draft[key]=v.trim();},{path:key,dir:'ltr'});
    for(const key of ['street','locality','region'])translated(body,CONTACT_LABELS[key],{entry:draft[key]},'entry',key,false);
    ownerConfirm();
    const wrap=add(body,'label');wrap.className='visual-check';const input=document.createElement('input');input.type='checkbox';input.id='visual-same-location';wrap.append(input,document.createTextNode(t('sameLocation')));
  }
  function hoursForm(){
    if(draft.some(day=>!day.closed&&(!day.opens||!day.closes))) add(body,'p',t('hoursHint')).className='visual-hint';
    draft.forEach((day,index)=>{
      const fs=group(body,t('dayLabel',{day:DAYS[DAY_INDEX[day.day]]||day.day})); fs.setAttribute('data-path','row_'+index); fs.tabIndex=-1;
      check(fs,t('closedToday'),day.closed,v=>{day.closed=v;if(v){day.opens='';day.closes='';}render();});
      if(!day.closed){const pair=row(fs);field(pair,t('opens'),day.opens,v=>{day.opens=v;},{type:'time',dir:'ltr'});field(pair,t('closes'),day.closes,v=>{day.closes=v;},{type:'time',dir:'ltr'});}
    });
  }

  /* ── Drag to reorder ────────────────────────────────────────────────────
     Pointer Events so mouse, pen and touch all work — the doctor reorders
     his gallery on a phone, and HTML5 drag-and-drop never fires there.

     The Up/Down buttons stay. They are not a fallback nobody uses: dragging
     is unavailable to anyone on a keyboard or a screen reader, so the two
     are the same feature offered two ways, and the buttons carry the
     accessible names. */
  function grip(){
    const handle=document.createElement('span');
    handle.className='visual-grip';
    handle.setAttribute('aria-hidden','true');   // the buttons are the accessible path
    // Built with DOM calls, not innerHTML — a test enforces the blanket rule.
    const NS='http://www.w3.org/2000/svg';
    const icon=document.createElementNS(NS,'svg');
    icon.setAttribute('width','14');icon.setAttribute('height','14');
    icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('fill','currentColor');
    for(const [cx,cy] of [[9,6],[15,6],[9,12],[15,12],[9,18],[15,18]]){
      const dot=document.createElementNS(NS,'circle');
      dot.setAttribute('cx',String(cx));dot.setAttribute('cy',String(cy));dot.setAttribute('r','1.6');
      icon.append(dot);
    }
    handle.append(icon);
    handle.append(document.createTextNode(t('grip')));
    return handle;
  }

  /** Make a list or grid of .visual-item children reorderable by dragging its grips. */
  function sortable(container, collection, done){
    container.classList.add('visual-sortable');
    let dragging=null, from=-1, marked=null;
    const items=()=>[...container.children].filter(n=>n.classList.contains('visual-item'));
    const isGrid=()=>getComputedStyle(container).display==='grid';
    const itemAt=(x,y)=>{
      let best=null, dist=Infinity;
      for(const node of items()){
        if(node===dragging) continue;
        const r=node.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2;
        const d=(x-cx)*(x-cx)+(y-cy)*(y-cy); if(d<dist){dist=d;best={node,r,cx,cy};}
      }
      if(!best) return null;
      if(isGrid() && y>best.r.top && y<best.r.bottom){
        const rtl=getComputedStyle(container).direction==='rtl';
        return {node:best.node,after:rtl?x<best.cx:x>best.cx};
      }
      return {node:best.node,after:y>best.cy};
    };
    const clear=()=>{ if(marked){marked.node.classList.remove('is-over','is-over-after');marked=null;} };
    container.addEventListener('pointerdown', (event)=>{
      const handle=event.target.closest('.visual-grip');
      if(!handle||!container.contains(handle)) return;
      dragging=handle.closest('.visual-item');
      if(!dragging||dragging.parentElement!==container){dragging=null;return;}
      from=items().indexOf(dragging);
      dragging.classList.add('is-dragging');
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();          // stop the page scrolling under the finger
    });
    container.addEventListener('pointermove', (event)=>{
      if(!dragging) return;
      // Scroll the dialog when the finger nears its edge, so an item can be
      // carried past the part of a long list that is on screen.
      const box=main.getBoundingClientRect();
      if(event.clientY<box.top+48) main.scrollBy(0,-14); else if(event.clientY>box.bottom-48) main.scrollBy(0,14);
      const target=itemAt(event.clientX,event.clientY);
      if(marked && (!target || target.node!==marked.node || target.after!==marked.after)) clear();
      if(target && !marked){ target.node.classList.add(target.after?'is-over-after':'is-over'); marked=target; }
    });
    const finish=()=>{
      if(!dragging) return;
      dragging.classList.remove('is-dragging');
      if(marked && from>-1){
        let to=items().indexOf(marked.node);
        if(marked.after) to+=1;
        if(to>from) to-=1;
        if(to!==from && to>=0 && to<collection.length){
          const [moved]=collection.splice(from,1);
          collection.splice(to,0,moved);
          done();
        }
      }
      clear(); dragging=null; from=-1;
    };
    container.addEventListener('pointerup',finish);
    container.addEventListener('pointercancel',finish);
  }

  /** Up/Down for one item in an ordered list; the name makes each button unique for screen readers. */
  function orderButtons(parent,ordered,index,name,after){
    const up=button(t('up'),()=>{if(index>0){[ordered[index-1],ordered[index]]=[ordered[index],ordered[index-1]];after();}});
    up.setAttribute('aria-label',t('upNamed',{name})); up.disabled=index===0;
    const down=button(t('down'),()=>{if(index<ordered.length-1){[ordered[index+1],ordered[index]]=[ordered[index],ordered[index+1]];after();}});
    down.setAttribute('aria-label',t('downNamed',{name})); down.disabled=index===ordered.length-1;
    parent.append(up,down);
  }
  const savedStatus=(id)=>{ const item=(original||[]).find(x=>x.id===id); return item?item.status:null; };
  const byOrder=(list)=>[...list].sort((a,b)=>a.order-b.order);
  const renumber=(list)=>list.forEach((x,i)=>{x.order=i;});

  /* ── Treatments: a list, and one treatment at a time ────────────────── */
  function newService(){const ordinal=Date.now().toString(36);return{id:'service-'+ordinal,slug:'service-'+ordinal,status:'unpublished',tier:2,order:draft.reduce((m,x)=>Math.max(m,x.order),-1)+1,icon:'aesthetic',locales:Object.fromEntries(LANGS.map(lang=>[lang,{title:'',cardTitle:'',summary:'',candidacy:[''],process:[{step:'',detail:''},{step:'',detail:''}],expect:[''],faq:[],seoDescription:''}]))};}
  function serviceName(item){return localTitle({he:item.locales.he.title,ar:item.locales.ar.title,en:item.locales.en.title})||localTitle({he:item.locales.he.cardTitle,ar:item.locales.ar.cardTitle,en:item.locales.en.cardTitle})||t('newTreatment');}
  function servicesForm(){
    const item=view.mode==='item'?draft.find(x=>x.id===view.id):null;
    if(item) return serviceEditor(item);
    view={mode:'list',id:'',lang:view.lang};
    const top=row(body);
    const addButton=button(t('addTreatment'),()=>{const created=newService();draft.push(created);touch();view={mode:'item',id:created.id,lang:locale};render();focusTop();},'primary');
    addButton.setAttribute('data-start','');
    top.append(addButton);
    add(body,'p',t('servicesHint')).className='visual-order-hint';
    const ordered=byOrder(draft); const list=add(body,'div');
    ordered.forEach((service,index)=>{
      const box=add(list,'div'); box.className='visual-item'; box.setAttribute('data-id',service.id);
      const heading=add(box,'h3'); heading.append(grip(),document.createTextNode(serviceName(service)+' ')); badge(heading,service.status==='published');
      const r=row(box);
      const edit=button(t('editTreatment'),()=>{view={mode:'item',id:service.id,lang:locale};render();focusTop();},'primary'); edit.setAttribute('aria-label',t('named',{action:t('editTreatment'),name:serviceName(service)})); r.append(edit);
      orderButtons(r,ordered,index,serviceName(service),()=>{renumber(ordered);touch();render();});
      visibilityButtons(r,service,serviceName(service));
    });
    sortable(list,ordered,()=>{renumber(ordered);touch();render();});
  }
  function visibilityButtons(r,item,name){
    const toggle=button(item.status==='published'?t('unpublish'):t('publish'),()=>{item.status=item.status==='published'?'unpublished':'published';touch();render();});
    toggle.setAttribute('aria-label',t('named',{action:toggle.textContent,name})); r.append(toggle);
    const saved=savedStatus(item.id);
    if(item.status==='unpublished' && saved!=='published'){
      const del=button(t('delete'),()=>{if(confirm(t('deleteItemConfirm',{name}))){draft.splice(draft.indexOf(item),1);expanded.delete(item.id);if(kind==='services')renumber(byOrder(draft));touch();render();}},'danger');
      del.setAttribute('aria-label',t('named',{action:t('delete'),name})); r.append(del);
    } else if(item.status==='unpublished' && saved==='published'){
      add(r,'span',t('deleteNeedsSave')).className='visual-hint';
    }
  }
  function serviceEditor(item){
    const index=draft.indexOf(item); const isNew=savedStatus(item.id)===null;
    body.append(button(t('backToTreatments'),()=>{view={mode:'list',id:'',lang:view.lang};render();focusTop();}));
    const heading=add(body,'h3',t('editingTreatment',{name:serviceName(item)})); heading.tabIndex=-1; heading.setAttribute('data-start',''); heading.className='visual-editor-heading';
    const state=row(body); badge(state,item.status==='published'); visibilityButtons(state,item,serviceName(item));
    if(item.status==='unpublished') add(body,'p',t('draftHint')).className='visual-hint';
    if(isNew){ field(body,t('slugLabel'),item.slug,v=>{const slug=v.toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');item.slug=slug;item.id=slug||item.id;},{path:index+'.slug',dir:'ltr'}); }
    else { const url=add(body,'p',t('pageAddress')); url.className='visual-hint'; const path=add(url,'bdi','/treatments/'+item.slug+'/'); path.dir='ltr'; }
    select(body,t('iconLabel'),item.icon,Object.keys(ICON_LABELS).map(x=>[x,ICON_LABELS[x]]),v=>{item.icon=v;},index+'.icon');
    const tabs=add(body,'div'); tabs.className='visual-tabs'; tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label',t('languageLabel'));
    for(const lang of LANGS){const t=button(names[lang],()=>{view.lang=lang;render();const sel=body.querySelector('.visual-tabs [aria-selected="true"]');if(sel)sel.focus();});t.setAttribute('role','tab');t.setAttribute('aria-selected',String(view.lang===lang));tabs.append(t);}
    const lang=view.lang; const local=item.locales[lang]; const base=index+'.locales.'+lang;
    const section=add(body,'div'); section.setAttribute('role','tabpanel'); section.lang=lang; section.dir=lang==='en'?'ltr':'rtl';
    for(const key of ['title','cardTitle','summary'])field(section,SERVICE_FIELDS[key],local[key]||'',v=>{local[key]=v;},{textarea:key==='summary',lang,path:base+'.'+key});
    lines(section,SERVICE_FIELDS.candidacy,local,'candidacy',base,lang);
    pairs(section,SERVICE_FIELDS.process,local,'process','step','detail',base,lang);
    lines(section,SERVICE_FIELDS.expect,local,'expect',base,lang);
    pairs(section,SERVICE_FIELDS.faq,local,'faq','q','a',base,lang);
    field(section,SERVICE_FIELDS.seoTitle,local.seoTitle||'',v=>{if(v)local.seoTitle=v;else delete local.seoTitle;},{lang,path:base+'.seoTitle'});
    field(section,SERVICE_FIELDS.seoDescription,local.seoDescription||'',v=>{local.seoDescription=v;},{textarea:true,lang,path:base+'.seoDescription'});
    field(section,SERVICE_FIELDS.reviewedOn,local.reviewedOn||'',v=>{if(v)local.reviewedOn=v;else delete local.reviewedOn;},{type:'date',path:base+'.reviewedOn',dir:'ltr'});
  }
  function lines(parent,label,obj,key,base,lang){const fs=group(parent,label);fs.setAttribute('data-path',base+'.'+key);obj[key].forEach((value,index)=>{const r=row(fs);field(r,t('itemN',{n:index+1}),value,v=>{obj[key][index]=v;},{textarea:true,lang,path:base+'.'+key+'.'+index});r.append(button(t('remove'),()=>{obj[key].splice(index,1);touch();render();},'danger'));});fs.append(button(t('addItem'),()=>{obj[key].push('');touch();render();}));}
  function pairs(parent,label,obj,key,first,second,base,lang){const fs=group(parent,label);fs.setAttribute('data-path',base+'.'+key);obj[key].forEach((value,index)=>{const box=add(fs,'div');box.className='visual-pair';field(box,SERVICE_FIELDS[first],value[first],v=>{value[first]=v;},{textarea:true,lang,path:base+'.'+key+'.'+index+'.'+first});field(box,SERVICE_FIELDS[second],value[second],v=>{value[second]=v;},{textarea:true,lang,path:base+'.'+key+'.'+index+'.'+second});box.append(button(t('remove'),()=>{obj[key].splice(index,1);touch();render();},'danger'));});fs.append(button(t('addItem'),()=>{obj[key].push({[first]:'',[second]:''});touch();render();}));}

  /* ── FAQ: collapsed list, one opens to edit ─────────────────────────── */
  function faqForm(){
    const addButton=button(t('addQuestion'),()=>{const item={id:'faq-'+Date.now().toString(36),status:'unpublished',order:draft.reduce((m,x)=>Math.max(m,x.order),-1)+1,q:{he:'',ar:'',en:''},a:{he:'',ar:'',en:''}};draft.push(item);expanded.add(item.id);touch();render();const box=body.querySelector('[data-id="'+item.id+'"]');if(box){box.scrollIntoView({block:'start'});const first=box.querySelector('textarea');if(first)first.focus();}},'primary');
    addButton.setAttribute('data-start',''); body.append(addButton);
    add(body,'p',t('faqHint')).className='visual-order-hint';
    const ordered=byOrder(draft); const list=add(body,'div');
    ordered.forEach((item,index)=>{
      const box=add(list,'div'); box.className='visual-item'; box.setAttribute('data-id',item.id);
      const name=localTitle(item.q)||t('newQuestion');
      const heading=add(box,'h3'); heading.append(grip(),document.createTextNode(name+' ')); badge(heading,item.status==='published');
      const r=row(box); const open_=expanded.has(item.id);
      const edit=button(open_?t('closeEdit'):t('edit'),()=>{if(open_)expanded.delete(item.id);else expanded.add(item.id);render();}); edit.setAttribute('aria-expanded',String(open_)); edit.setAttribute('aria-label',t('named',{action:edit.textContent,name})); r.append(edit);
      orderButtons(r,ordered,index,name,()=>{renumber(ordered);touch();render();});
      visibilityButtons(r,item,name);
      if(open_){ const i=draft.indexOf(item); translated(box,t('question'),{entry:item.q},'entry',i+'.q'); translated(box,t('answer'),{entry:item.a},'entry',i+'.a'); }
    });
    sortable(list,ordered,()=>{renumber(ordered);touch();render();});
  }

  /* ── The gallery manager ────────────────────────────────────────────── */
  async function reloadPhotos(){const data=await api('/api/photos','GET');sha=data.sha;versions=data.versions||{};draft=structuredClone(data.records);original=structuredClone(draft);orderDirty=false;render();}
  async function photoRequest(url,payload,working,done){
    if(busy) return;
    // Every other action reloads the gallery, which would drop an unsaved
    // reorder without a word. Ask first.
    if(orderDirty && url!=='/api/photos/order' && !confirm(t('unsavedOrder'))) return null;
    clearErrors(); setBusy(true); tell(working,'working');
    try {
      const result=await api(url,'POST',payload);
      await reloadPhotos();
      if(result.unchanged){tell(t('noChange'),'info');return result;}
      tell(t(publishing==='test'?'doneTest':'doneProd',{what:done,sha:short(result.sha)}),'ok');
      void track(result.sha); return result;
    } catch(error){ fail(error); try{ await reloadPhotos(); }catch{} return null; }
    finally { setBusy(false); }
  }
  async function encode(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
  /**
   * Check a picked image the way the server will, before sending it, and
   * shrink one that is too large. A phone photo is often over 8 MB; failing
   * it with "too large" would leave the doctor nothing he could do.
   */
  async function prepare(file,mustType){
    const type=file.type||'';
    if(/hei[cf]/i.test(type)||/\.hei[cf]$/i.test(file.name)) throw new Error(t('heic'));
    if(!/^image\/(jpeg|png)$/.test(type)) throw new Error(t('notJpgPng',{name:file.name}));
    let bitmap; try{ bitmap=await createImageBitmap(file); }catch{ throw new Error(t('unreadable',{name:file.name})); }
    const w=bitmap.width,h=bitmap.height,long=Math.max(w,h);
    if(long<MIN_EDGE){bitmap.close();throw new Error(t('tooSmall',{name:file.name,w,h,min:MIN_EDGE}));}
    const target=mustType||type;
    if(file.size<=SEND_LIMIT && target===type){bitmap.close();return {blob:file,width:w,height:h,type};}
    // Largest first, and never larger than the original.
    for(const edge of [SEND_EDGE,2048,1600,MIN_EDGE].map(e=>Math.min(e,long)).filter((e,i,all)=>all.indexOf(e)===i)){
      const scale=edge/long; const canvas=document.createElement('canvas'); canvas.width=Math.round(w*scale); canvas.height=Math.round(h*scale);
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise(r=>canvas.toBlob(r,target,0.88));
      if(blob && blob.size<=SEND_LIMIT){bitmap.close();return {blob,width:canvas.width,height:canvas.height,type:target};}
    }
    bitmap.close(); throw new Error(t('tooLargeAfter',{name:file.name}));
  }
  function photoName(item){return (CATEGORY_LABELS[item.category]||item.category)+' · '+(localTitle(item.alt)||item.file);}
  function photosForm(){
    uploader();
    const heading=add(body,'h3',t('galleryCount',{n:draft.length})); heading.className='visual-editor-heading';
    if(!draft.length){ add(body,'p',t('galleryEmpty')).className='visual-hint'; return; }
    add(body,'p',t('galleryHint')).className='visual-order-hint';
    if(orderDirty){ const bar_=add(body,'div'); bar_.className='visual-order-bar'; add(bar_,'span',t('orderChanged')); bar_.append(button(t('saveOrder'),()=>void savePhotoOrder(),'primary'),button(t('cancel'),()=>{draft=structuredClone(original);orderDirty=false;render();})); }
    const list=add(body,'div'); list.className='visual-photo-grid';
    draft.forEach((item,index)=>{
      const card=add(list,'div'); card.className='visual-item visual-photo-card'; card.setAttribute('data-file',item.file);
      const top=add(card,'div'); top.className='visual-photo-top'; top.append(grip()); badge(top,item.status==='published');
      if(item.needsEnglishReview) add(top,'span',t('needsEnglish')).className='visual-badge';
      const figure=add(card,'div'); figure.className='visual-photo-frame';
      const thumb=add(figure,'img'); thumb.alt=localTitle(item.alt)||item.file; thumb.loading='lazy'; thumb.decoding='async';
      thumb.src='/api/photo?file='+encodeURIComponent(item.file)+'&v='+encodeURIComponent(versions[item.file]||'');
      thumb.addEventListener('error',()=>{thumb.remove();add(figure,'span',t('noPreview')).className='visual-hint';});
      add(card,'p',CATEGORY_LABELS[item.category]||item.category).className='visual-hint';
      const edit=edits[item.file]||(edits[item.file]={he:item.alt.he,ar:item.alt.ar,en:item.alt.en});
      const changed=()=>edit.he!==item.alt.he||edit.ar!==item.alt.ar||edit.en!==item.alt.en;
      // Collapsed by default so the manager shows photographs, not a wall of
      // text boxes; open when there is something to finish.
      const altOpen=altOpenSet.has(item.file)||changed()||item.needsEnglishReview===true;
      add(card,'p',localTitle(item.alt)).className='visual-photo-alt';
      const toggle=button(altOpen?t('closeDescription'):t('editDescription'),()=>{if(altOpen)altOpenSet.delete(item.file);else altOpenSet.add(item.file);render();});
      toggle.setAttribute('aria-expanded',String(altOpen)); toggle.setAttribute('aria-label',t('named',{action:toggle.textContent,name:photoName(item)})); card.append(toggle);
      if(altOpen){
        const fs=group(card,t('descriptionGroup'));
        const saveAlt=button(t('saveDescription'),async()=>{const r=await photoRequest('/api/photos/describe',{file:item.file,altHe:edit.he,altAr:edit.ar,altEn:edit.en},t('savingDescription'),t('descriptionSaved'));if(r){delete edits[item.file];altOpenSet.delete(item.file);render();}},'primary');
        for(const lang of LANGS) field(fs,names[lang],edit[lang],v=>{edit[lang]=v;saveAlt.disabled=!changed()&&!item.needsEnglishReview;},{textarea:true,lang,path:'alt.'+item.file+'.'+lang});
        saveAlt.disabled=!changed()&&!item.needsEnglishReview; fs.append(saveAlt);
      }
      const r=row(card);
      const up=button(t('up'),()=>{if(index>0){[draft[index-1],draft[index]]=[draft[index],draft[index-1]];orderDirty=true;render();}}); up.setAttribute('aria-label',t('upNamed',{name:photoName(item)})); up.disabled=index===0;
      const down=button(t('down'),()=>{if(index<draft.length-1){[draft[index+1],draft[index]]=[draft[index],draft[index+1]];orderDirty=true;render();}}); down.setAttribute('aria-label',t('downNamed',{name:photoName(item)})); down.disabled=index===draft.length-1;
      r.append(up,down);
      const vis=button(item.status==='published'?t('unpublish'):t('publish'),()=>void photoRequest('/api/photos/'+(item.status==='published'?'unpublish':'publish'),{file:item.file},t('saving'),item.status==='published'?t('photoHidden'):t('photoShown')));
      if(item.needsEnglishReview&&item.status!=='published'){vis.disabled=true;vis.title=t('needEnglishFirst');}
      vis.setAttribute('aria-label',t('named',{action:vis.textContent,name:photoName(item)})); r.append(vis);
      const picker=document.createElement('input'); picker.type='file'; picker.accept='image/jpeg,image/png'; picker.hidden=true; card.append(picker);
      picker.addEventListener('change',()=>void replacePhoto(item,picker));
      const rep=button(t('replace'),()=>picker.click()); rep.setAttribute('aria-label',t('named',{action:t('replace'),name:photoName(item)})); r.append(rep);
      if(item.status==='unpublished'){const del=button(t('delete'),()=>{if(confirm(t('deletePhotoConfirm',{name:photoName(item)})))void photoRequest('/api/photos/delete',{file:item.file},t('deleting'),t('photoDeleted'));},'danger');del.setAttribute('aria-label',t('named',{action:t('delete'),name:photoName(item)}));r.append(del);}
      else add(r,'span',t('hideFirst')).className='visual-hint';
    });
    sortable(list,draft,()=>{orderDirty=true;render();});
  }
  async function savePhotoOrder(){const r=await photoRequest('/api/photos/order',{files:draft.map(x=>x.file)},t('savingOrder'),t('orderSaved'));if(r)orderDirty=false;}
  async function replacePhoto(item,picker){
    const picked=picker.files&&picker.files[0]; picker.value=''; if(!picked) return;
    if(!confirm(t('replaceConfirm'))) return;
    clearErrors(); tell(t('checkingImage'),'working');
    let ready; try{ ready=await prepare(picked,item.file.toLowerCase().endsWith('.png')?'image/png':'image/jpeg'); }catch(error){ tell(error.message,'error'); return; }
    await photoRequest('/api/photos/replace',{file:item.file,contentBase64:await encode(ready.blob),confirmed:true},t('uploadingReplacement'),t('replaced'));
  }

  /* Multi-upload: every file gets its own preview, category and descriptions. */
  function uploader(){
    const fs=group(body,t('uploadGroup')); fs.className='visual-uploader';
    const zone=add(fs,'div'); zone.className='visual-dropzone';
    add(zone,'p',t('dropHere'));
    const input=document.createElement('input'); input.type='file'; input.accept='image/jpeg,image/png'; input.multiple=true; input.hidden=true; input.id='visual-upload-input';
    const pick=button(t('choosePhotos'),()=>input.click(),'primary'); pick.setAttribute('data-start','');
    zone.append(pick,input); add(zone,'p',t('uploadHint')).className='visual-hint';
    input.addEventListener('change',()=>{void addFiles([...(input.files||[])]);input.value='';});
    // File drop (from the desktop) — a different thing from reordering, which
    // is pointer events only.
    zone.addEventListener('dragenter',(e)=>{e.preventDefault();zone.classList.add('is-over');});
    zone.addEventListener('dragover',(e)=>{e.preventDefault();});
    zone.addEventListener('dragleave',()=>zone.classList.remove('is-over'));
    zone.addEventListener('drop',(e)=>{e.preventDefault();zone.classList.remove('is-over');void addFiles([...(e.dataTransfer&&e.dataTransfer.files||[])]);});
    if(!pending.length) return;
    const list=add(fs,'div'); list.className='visual-photo-grid';
    pending.forEach((p)=>{
      const card=add(list,'div'); card.className='visual-photo-card'; card.setAttribute('data-pending',p.id);
      const frame=add(card,'div'); frame.className='visual-photo-frame'; const img=add(frame,'img'); img.src=p.url; img.alt=t('previewOf',{name:p.file.name});
      add(card,'p',p.file.name+(p.ready?' · '+p.ready.width+'×'+p.ready.height:'')).className='visual-hint';
      if(p.error){ const e=add(card,'p',p.error); e.className='visual-inline-error'; }
      if(p.state==='uploading') add(card,'p',t('uploading')).className='visual-hint';
      if(p.ready && p.state!=='uploading'){
        select(card,t('photoCategory'),p.category,Object.keys(CATEGORY_LABELS).map(x=>[x,CATEGORY_LABELS[x]]),v=>{p.category=v;});
        const d=group(card,t('descriptionAll'));
        for(const lang of LANGS) field(d,names[lang],p.alt[lang],v=>{p.alt[lang]=v;},{textarea:true,lang,path:'pending.'+p.id+'.'+lang});
      }
      card.append(button(t('removeFromList'),()=>{URL.revokeObjectURL(p.url);pending=pending.filter(x=>x!==p);render();},'danger'));
    });
    const confirmWrap=add(fs,'label'); confirmWrap.className='visual-check';
    const confirmBox=document.createElement('input'); confirmBox.type='checkbox'; confirmBox.id='visual-upload-confirm';
    confirmWrap.append(confirmBox,document.createTextNode(t('uploadConfirm')));
    const readyCount=pending.filter(p=>p.ready).length;
    const go=button(readyCount===1?t('uploadOne'):t('uploadMany',{n:readyCount}),()=>void uploadPending(confirmBox.checked),'primary'); go.disabled=readyCount===0; fs.append(go);
  }
  async function addFiles(files){
    for(const file of files){
      const p={id:Math.random().toString(36).slice(2),file,url:URL.createObjectURL(file),category:'reception',alt:{he:'',ar:'',en:''},ready:null,error:'',state:'new'};
      pending.push(p);
      try{ p.ready=await prepare(file); }catch(error){ p.error=error.message; }
    }
    render();
    const box=body.querySelector('.visual-uploader'); if(box) box.scrollIntoView({block:'start'});
  }
  async function uploadPending(confirmed){
    if(busy) return; clearErrors();
    if(!confirmed){ tell(ISSUES.confirmation_required,'error'); const c=dialog.querySelector('#visual-upload-confirm'); if(c){c.setAttribute('aria-invalid','true');c.focus();} return; }
    const queue=pending.filter(p=>p.ready); let done=0, last='';
    setBusy(true);
    for(const [n,p] of queue.entries()){
      p.state='uploading'; p.error=''; tell(t('uploadingNofM',{n:n+1,m:queue.length}),'working');
      try{
        const result=await api('/api/photos','POST',{category:p.category,contentBase64:await encode(p.ready.blob),altHe:p.alt.he,altAr:p.alt.ar,altEn:p.alt.en,confirmed:true});
        last=result.sha; done++; URL.revokeObjectURL(p.url); pending=pending.filter(x=>x!==p);
      }catch(error){
        p.state='error';
        p.error=error instanceof ApiError?(error.issues.length?error.issues.map(describeIssue).join(' '):(ERRORS[error.code]||ERRORS.SERVER_ERROR)):t('uploadFailed');
      }
    }
    setBusy(false);
    try{ await reloadPhotos(); }catch(error){ fail(error); return; }
    const failed=queue.length-done;
    if(failed===0) tell(done===1?t('uploadedOne',{sha:short(last)}):t('uploadedMany',{n:done,sha:short(last)}),'ok');
    else tell(t('uploadedPartial',{n:done,m:queue.length,f:failed}),'error');
    if(last) void track(last);
  }

  document.addEventListener('click',event=>{const trigger=event.target.closest('[data-edit-kind]');if(trigger){event.preventDefault();void open(trigger.dataset.editKind,trigger.dataset.editFocus||'');}});

  /* ── Editor bar ─────────────────────────────────────────────────────────
     Restrained on purpose: the point of this product is that the doctor is
     looking at his own website, not at a tool. Four things only — what mode
     he is in, a way to see the page as a patient does, where his last change
     got to, and a way out. */
  const barStatus=document.createElement('span');
  barStatus.className='visual-bar-status';
  barStatus.setAttribute('role','status');
  barStatus.setAttribute('aria-live','polite');
  const barActions=bar.querySelector('.visual-bar-actions')||bar;
  bar.insertBefore(barStatus,barActions===bar?null:barActions);
  const reloadSlot=document.createElement('span'); reloadSlot.className='visual-bar-reload'; reloadSlot.hidden=true;
  bar.insertBefore(reloadSlot,barActions===bar?null:barActions);

  /** Mirrors the latest result so it survives closing the dialog. */
  function barTell(text,state){
    barStatus.textContent=text||'';
    if(state) barStatus.setAttribute('data-state',state); else barStatus.removeAttribute('data-state');
  }

  for(const [key,label] of [['copy',t('barTexts')],['services',t('barTreatments')],['photos',t('barPhotos')]]){barActions.append(button(label,()=>void open(key)));}

  /* Preview hides every control without reloading, so the doctor can check a
     change the way a patient will see it and come straight back. */
  let previewing=false;
  const previewButton=button(t('preview'),()=>{
    previewing=!previewing;
    if(previewing) document.documentElement.setAttribute('data-visual-preview','');
    else document.documentElement.removeAttribute('data-visual-preview');
    previewButton.textContent=previewing?t('backToEdit'):t('preview');
    previewButton.setAttribute('aria-pressed',String(previewing));
  });
  previewButton.setAttribute('aria-pressed','false');
  barActions.append(previewButton);

  /* Leaving Edit Mode means leaving the admin host entirely. */
  const exit=document.createElement('a');
  exit.textContent=t('exit');
  exit.href='https://www.drkhalilkanani.com/'+locale+'/';
  exit.rel='noopener';
  barActions.append(exit);

  /* Where saves go decides what the editor may claim afterwards. */
  api('/api/session','GET').then(data=>{ publishing=data.publishing==='production'?'production':'test'; if(publishing==='test' && !barStatus.textContent) barTell(t('testMode'),'info'); }).catch(()=>{});

  /* Arriving from an automatic reload: say the page is current. */
  try{ const shown=sessionStorage.getItem('visual-updated'); if(shown){ sessionStorage.removeItem('visual-updated'); barTell(t('updatedAfterReload'),'published'); } }catch{}

  /* Nothing is committed until Save, so an accidental reload is the one way
     to lose work that the dialog guard cannot catch. */
  window.addEventListener('beforeunload',(event)=>{ if(dirty||pending.length){event.preventDefault();event.returnValue='';} });
})();
`;

export const VISUAL_CLIENT = SOURCE.replace('__STRINGS__', () => STRINGS_JSON);
