/** Served only after Access verification; never bundled into the public site. */
export const VISUAL_STYLES = String.raw`
/* ── Edit Mode bar ────────────────────────────────────────────────────────
   Wide screens: one row. Phones: a title row carrying the short notice, the
   publication status only when there is one, and a single strip of actions
   that scrolls sideways rather than wrapping into a tall block over the page.
   Only the strip scrolls; the page itself never gains horizontal overflow. */
.visual-editor-bar{position:sticky;top:0;z-index:1000;display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .8rem;padding:.5rem 1rem;background:#0c5283;color:white;font:600 14px/1.35 system-ui;box-shadow:0 1px 4px #0002}
.visual-bar-head{display:flex;align-items:baseline;gap:.7rem;flex:1 1 18rem;min-width:0}
.visual-bar-head strong{flex:none}
.visual-bar-notice{min-width:0;font-weight:400;font-size:13px;opacity:.92}
.visual-bar-notice-short{display:none}
.visual-bar-actions{display:flex;align-items:center;gap:.45rem;flex:none}
.visual-editor-bar a,.visual-editor-bar button{display:inline-flex;align-items:center;min-height:36px;color:white;border:1px solid #fff8;border-radius:6px;padding:.3rem .65rem;background:transparent;font:600 13px system-ui;text-decoration:none;white-space:nowrap;cursor:pointer}
.visual-editor-bar a:hover,.visual-editor-bar button:hover{background:#ffffff1f}
.visual-editor-bar a:focus-visible,.visual-editor-bar button:focus-visible{outline:2px solid white;outline-offset:2px}
.visual-edit-control{position:relative;z-index:2;display:inline-flex;align-items:center;gap:.4rem;min-height:36px;margin-block:.4rem;margin-inline-end:.4rem;padding:.3rem .8rem;border:1px solid #0c5283;border-radius:999px;background:#fff;color:#0c5283;font:600 13px system-ui;cursor:pointer}
.visual-edit-control:hover,.visual-edit-control:focus-visible{background:#e9f5fb;outline:2px solid #0c5283;outline-offset:2px}
.visual-dialog{width:min(780px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:0;border:1px solid #aac9d9;border-radius:14px;background:white;color:#183448;box-shadow:0 20px 60px #061f3d44}
.visual-dialog::backdrop{background:#071d2ab0}.visual-dialog-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:1rem;padding:1rem 1.2rem;background:white;border-bottom:1px solid #d5e1e7}.visual-dialog-head h2{font:700 1.25rem system-ui;margin:0;flex:1}.visual-dialog-main{padding:1.2rem;overflow-y:auto;max-height:calc(100dvh - 160px)}.visual-dialog .visual-warning{padding:.7rem;background:#fff4d9;border-inline-start:4px solid #a36c00;font:500 .85rem/1.45 system-ui}
.visual-dialog fieldset{margin:1rem 0;padding:1rem;border:1px solid #d5e1e7;border-radius:8px}.visual-dialog legend{font-weight:700;padding:0 .35rem}.visual-dialog label{display:block;margin:.75rem 0;font:600 .9rem system-ui}.visual-dialog input,.visual-dialog textarea,.visual-dialog select{display:block;width:100%;min-height:42px;margin-top:.3rem;padding:.5rem;border:1px solid #7891a0;border-radius:6px;background:white;color:#183448;font:400 1rem system-ui}.visual-dialog textarea{min-height:72px;resize:vertical}.visual-dialog input[type=checkbox]{display:inline-block;width:auto;min-height:auto;margin-inline-end:.5rem}.visual-dialog button{min-height:38px;margin:.25rem;padding:.35rem .7rem;border:1px solid #0c5283;border-radius:6px;background:white;color:#0c5283;font:600 .9rem system-ui;cursor:pointer}.visual-dialog button.primary{background:#0c5283;color:white}.visual-dialog button.danger{border-color:#9c2a2a;color:#9c2a2a}.visual-dialog button:disabled{opacity:.5;cursor:default}.visual-dialog .visual-row{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem}.visual-dialog .visual-row>*{flex:1}.visual-dialog .visual-actions{position:sticky;bottom:0;display:flex;justify-content:flex-end;padding:.8rem 0;background:white;border-top:1px solid #d5e1e7}.visual-dialog [role=status]{min-height:1.5rem;margin:.6rem 0;color:#0c5283;font:600 .9rem system-ui;white-space:pre-wrap}.visual-dialog .visual-item{margin:1rem 0;padding:.8rem;border:1px solid #c9d9e3;border-radius:8px}.visual-dialog .visual-item h3{font:700 1rem system-ui;margin:.2rem 0}.visual-dialog img{max-width:280px;max-height:180px;object-fit:contain}

/* ── Drag to reorder ──────────────────────────────────────────────────────
   Pointer Events, not HTML5 drag-and-drop: HTML5 DnD does not fire on touch,
   and the doctor reorders his gallery on a phone. One implementation covers
   mouse, pen and finger. */
.visual-sortable{touch-action:pan-y}
.visual-sortable .visual-item{position:relative;transition:transform .16s ease,box-shadow .16s ease}
.visual-grip{display:inline-flex;align-items:center;gap:.4rem;min-height:38px;padding:.3rem .6rem;margin-inline-end:.4rem;border:1px solid #7891a0;border-radius:6px;background:#f3f8fb;color:#26506b;font:600 .85rem system-ui;cursor:grab;touch-action:none;user-select:none}
.visual-grip:active{cursor:grabbing}
.visual-grip svg{pointer-events:none}
.visual-item.is-dragging{opacity:.55;box-shadow:0 12px 28px #061f3d33;z-index:3}
.visual-item.is-over{box-shadow:inset 0 3px 0 #0c5283}
.visual-item.is-over-after{box-shadow:inset 0 -3px 0 #0c5283}
.visual-order-hint{margin:.4rem 0;color:#4a6274;font:500 .8rem system-ui}
.visual-thumb{display:block;max-width:120px;max-height:90px;object-fit:cover;border-radius:6px;border:1px solid #c9d9e3}

/* ── Preview mode ─────────────────────────────────────────────────────────
   The doctor sees the page exactly as a patient does. The controls are
   removed from the accessibility tree too, not merely hidden, so a screen
   reader in preview hears the same page a visitor would. */
html[data-visual-preview] .visual-edit-control{display:none!important}
html[data-visual-preview] .visual-editor-bar{background:#26506b}
.visual-bar-status{flex:0 1 auto;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:.2rem .6rem;border-radius:999px;background:#ffffff22;font:600 12px system-ui}
.visual-bar-status:empty{display:none}
.visual-bar-status[data-state=published]{background:#0f6e3d}
.visual-bar-status[data-state=failed]{background:#9c2a2a}

/* ── Loading ──────────────────────────────────────────────────────────────
   The status line keeps the words (it is the live region a screen reader
   hears); the spinner and the skeleton are decoration and are hidden from
   assistive technology. Both stand still under reduced motion. */
.visual-loading{display:flex;align-items:center;gap:.6rem;color:#26506b;font:600 .9rem system-ui}
.visual-loading::before{content:"";flex:none;width:18px;height:18px;border-radius:50%;border:2px solid #c9dbe6;border-block-start-color:#0c5283;animation:visual-spin .8s linear infinite}
.visual-skeleton{display:grid;gap:.8rem;margin-block:1rem}
.visual-skeleton span{display:block;height:14px;border-radius:6px;background:linear-gradient(90deg,#eef4f8 25%,#dce8ef 50%,#eef4f8 75%);background-size:200% 100%;animation:visual-shimmer 1.3s ease-in-out infinite}
.visual-skeleton span:nth-child(3n+2){inline-size:65%}.visual-skeleton span:nth-child(3n){block-size:64px}
@keyframes visual-spin{to{transform:rotate(360deg)}}
@keyframes visual-shimmer{from{background-position:100% 0}to{background-position:-100% 0}}
@media(prefers-reduced-motion:reduce){.visual-loading::before,.visual-skeleton span{animation:none}}

@media(max-width:900px){
  .visual-editor-bar{padding:.45rem .75rem}
  .visual-bar-head{flex-basis:100%}
  .visual-bar-notice{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .visual-bar-notice-long{display:none}.visual-bar-notice-short{display:inline}
  .visual-bar-status{flex-basis:100%;text-align:start}
  .visual-bar-actions{flex:1 1 100%;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;padding-block:2px}
  .visual-bar-actions::-webkit-scrollbar{display:none}
  .visual-editor-bar a,.visual-editor-bar button{min-height:44px}
}
@media(max-width:600px){.visual-grip{min-height:44px}.visual-dialog-main{padding:.8rem}.visual-dialog .visual-row>*{flex-basis:100%}}
`;

export const VISUAL_CLIENT = String.raw`
(() => {
  'use strict';
  const bar = document.querySelector('[data-visual-editor-locale]');
  if (!bar) return;
  const locale = bar.getAttribute('data-visual-editor-locale') || 'he';
  const LANGS = ['he', 'ar', 'en'];
  const names = {he:'עברית', ar:'العربية', en:'English'};
  const urls = {copy:'/api/content/copy',services:'/api/content/services',doctor:'/api/content/doctor',faq:'/api/content/faq',contact:'/api/content/contact',hours:'/api/hours',photos:'/api/photos'};
  const titles = {copy:'טקסט האתר',services:'טיפולים ושירותים',doctor:'פרופיל הרופא',faq:'שאלות נפוצות',contact:'פרטי קשר ומרפאה',hours:'שעות פתיחה',photos:'תמונות המרפאה'};
  const dialog = document.createElement('dialog'); dialog.className='visual-dialog';
  const head = document.createElement('div'); head.className='visual-dialog-head';
  const title = document.createElement('h2');
  /* Closing with unsaved edits is the one destructive thing a doctor can do
     here by accident — nothing is committed until Save. */
  const close = button('סגירה', () => {
    if (dirty && !confirm('יש שינויים שלא נשמרו. לסגור ולאבד אותם?')) return;
    dirty = false; dialog.close();
  });
  head.append(title,close);
  const main = document.createElement('div'); main.className='visual-dialog-main';
  const warning = add(main,'p','תוכן מוסתר אינו סודי: כל תוכן ושינוי נשמרים במאגר ציבורי. אין להזין מידע על מטופלים, פרטים רפואיים אישיים או סודות.'); warning.className='visual-warning';
  const message = add(main,'p',''); message.setAttribute('role','status'); message.setAttribute('aria-live','polite');
  const body = add(main,'div',''); dialog.append(head,main); document.body.append(dialog);
  let kind='', sha='', draft=null, focus='', selected=0, busy=false, dirty=false;
  /** Marked on every field change, cleared on save. Guards the close. */
  function touch(){ dirty=true; }

  function add(parent, tag, text) { const node=document.createElement(tag); node.textContent=text; parent.append(node); return node; }
  function button(label, action, cls) { const node=document.createElement('button'); node.type='button'; node.textContent=label; if(cls) node.className=cls; node.addEventListener('click',action); return node; }
  function row(parent) { const node=add(parent,'div',''); node.className='visual-row'; return node; }
  function field(parent,label,value,change,options={}) {
    const wrap=add(parent,'label',label); const node=document.createElement(options.textarea?'textarea':'input');
    if(!options.textarea) node.type=options.type||'text';
    if(options.lang){ node.lang=options.lang; node.dir=options.lang==='en'?'ltr':'rtl'; }
    node.value=value==null?'':String(value); if(options.required!==false) node.required=true;
    node.addEventListener('input',()=>{touch();change(node.value);}); wrap.append(node); return node;
  }
  function select(parent,label,value,choices,change){const wrap=add(parent,'label',label);const node=add(wrap,'select','');for(const [v,t] of choices){const option=add(node,'option',t);option.value=String(v);}node.value=String(value);node.addEventListener('change',()=>{touch();change(node.value);});return node;}
  function check(parent,label,value,change){const wrap=add(parent,'label','');const node=document.createElement('input');node.type='checkbox';node.checked=!!value;node.addEventListener('change',()=>{touch();change(node.checked);});wrap.append(node,document.createTextNode(label));return node;}
  function group(parent,label){const fs=add(parent,'fieldset','');add(fs,'legend',label);return fs;}
  function translated(parent,label,obj,key,textarea=true){const fs=group(parent,label);for(const lang of LANGS){field(fs,names[lang],obj[key][lang],v=>{obj[key][lang]=v;},{textarea,lang});}}
  function listText(parent,label,obj,key){const fs=group(parent,label);for(const lang of LANGS){field(fs,names[lang]+' — שורה לכל פריט',obj[key][lang].join('\n'),v=>{obj[key][lang]=v.split('\n').map(x=>x.trim()).filter(Boolean);},{textarea:true,lang});}}
  async function api(url, method, payload){const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});let result;try{result=await response.json();}catch{throw new Error('תגובה לא תקינה מהשרת');}if(!response.ok||!result.ok){const code=result.error?.code||response.status;const issues=result.error?.issues?.join(', ')||'';throw new Error(String(code)+(issues?' — '+issues:''));}return result.data;}
  const short=(sha)=>String(sha).slice(0,7);
  function tell(text,state){message.textContent=text;barTell(text,state);}
  async function track(commit){if(!commit)return;for(let attempt=0;attempt<24;attempt++){await new Promise(r=>setTimeout(r,5000));if(!dialog.open)return;try{const data=await api('/api/status?sha='+encodeURIComponent(commit),'GET');if(data.state==='published'){tell('פורסם באתר','published');return;}if(data.state==='failed'){tell('נשמר, אך הפרסום נכשל. האתר מציג את הגרסה הקודמת.','failed');return;}tell('נשמר: '+short(commit)+' · ממתין לפרסום');}catch{tell('נשמר: '+short(commit)+' · לא ניתן לבדוק פרסום כעת');return;}}tell('נשמר: '+short(commit)+' · הפרסום עדיין בבדיקה');}
  function actions(){const strip=add(body,'div','');strip.className='visual-actions';strip.append(button('שמירה',save,'primary'));}
  function loading(on){message.classList.toggle('visual-loading',on);if(on){message.textContent='טוען את התוכן…';const sk=document.createElement('div');sk.className='visual-skeleton';sk.setAttribute('aria-hidden','true');for(let i=0;i<6;i++)sk.append(document.createElement('span'));body.replaceChildren(sk);body.setAttribute('aria-busy','true');}else{body.replaceChildren();body.removeAttribute('aria-busy');}}
  async function open(next,which=''){kind=next;focus=which;selected=0;sha='';draft=null;title.textContent=titles[kind]||kind;loading(true);if(!dialog.open)dialog.showModal();try{const data=await api(urls[kind],'GET');sha=data.sha;draft=structuredClone(kind==='hours'?data.rows:kind==='photos'?data.records:data.value);loading(false);tell('');render();}catch(error){loading(false);tell(error.message);}}
  async function save(){if(busy)return;busy=true;tell('בודק ושומר…');try{let payload;if(kind==='hours')payload={rows:draft,sha};else payload={value:draft,sha,confirmed:document.querySelector('#visual-owner-confirm')?.checked===true,sameLocation:document.querySelector('#visual-same-location')?.checked===true};const data=await api(urls[kind],'PUT',payload);dirty=false;tell('נשמר ב-commit '+short(data.sha)+'; עדיין לא פורסם.');void track(data.sha);}catch(error){tell(error.message);}finally{busy=false;}}
  function render(){body.replaceChildren();if(kind==='copy')copyForm();else if(kind==='doctor')doctorForm();else if(kind==='contact')contactForm();else if(kind==='hours')hoursForm();else if(kind==='faq')faqForm();else if(kind==='services')servicesForm();else if(kind==='photos')photosForm();if(kind!=='photos')actions();}
  function copyForm(){const keys=Object.keys(draft).filter(key=>!focus||key.startsWith(focus+'.')||(focus==='hero'&&key==='action.bookAppointment'));if(focus)body.append(button('כל הטקסטים',()=>{focus='';render();}));for(const key of keys)translated(body,key,{entry:draft[key]},'entry');}
  function doctorForm(){translated(body,'הקדמה',{entry:draft.intro},'entry');listText(body,'גישת המרפאה',{entry:draft.approach},'entry');const fs=group(body,'השכלה והסמכות — עובדות מאושרות בכתב בלבד');draft.credentials.forEach((item,index)=>{const box=add(fs,'div','');box.className='visual-item';for(const lang of LANGS)field(box,names[lang],item.label[lang],v=>{item.label[lang]=v;},{textarea:true,lang});field(box,'שנה',item.year||'',v=>{if(v)item.year=v;else delete item.year;},{required:false});box.append(button('הסרה',()=>{draft.credentials.splice(index,1);render();},'danger'));});fs.append(button('הוספת הסמכה',()=>{draft.credentials.push({label:{he:'',ar:'',en:''}});render();}));ownerConfirm();}
  function ownerConfirm(){const wrap=add(body,'label','');const input=document.createElement('input');input.type='checkbox';input.id='visual-owner-confirm';wrap.append(input,document.createTextNode('אני מאשר/ת בכתב שכל פרטי המרפאה/הרופא ששונו נכונים.'));}
  function contactForm(){add(body,'p','שינוי הכתובת כאן מיועד לתיקון ניסוח של אותו מקום. אם המרפאה עברה מקום, יש לעדכן גם את סיכת המפה וקישור Waze באמצעות המפתח לפני פרסום.');for(const key of ['landline','mobile','email','postalCode','instagram','facebook','googleBusiness'])field(body,key,draft[key],v=>{draft[key]=v;},{required:false});for(const key of ['street','locality','region'])translated(body,key,{entry:draft[key]},'entry',false);ownerConfirm();const wrap=add(body,'label','');const input=document.createElement('input');input.type='checkbox';input.id='visual-same-location';wrap.append(input,document.createTextNode('אני מאשר/ת שזו אותה כתובת פיזית, וסיכת המפה וקישור Waze עדיין נכונים.'));}
  function hoursForm(){const days={Sunday:'ראשון',Monday:'שני',Tuesday:'שלישי',Wednesday:'רביעי',Thursday:'חמישי',Friday:'שישי',Saturday:'שבת'};draft.forEach(rowValue=>{const fs=group(body,days[rowValue.day]||rowValue.day);check(fs,'סגור',rowValue.closed,v=>{rowValue.closed=v;if(v){rowValue.opens='';rowValue.closes='';}render();});if(!rowValue.closed){const pair=row(fs);field(pair,'פתיחה',rowValue.opens,v=>{rowValue.opens=v;},{type:'time',required:false});field(pair,'סגירה',rowValue.closes,v=>{rowValue.closes=v;},{type:'time',required:false});}});}
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
    // Built with DOM calls, not innerHTML. The icon is a static literal, but
    // a blanket "no innerHTML anywhere in the editor" rule is worth more than
    // the convenience — it is checked by a test, and an exception here is an
    // exception a later owner-text change could hide behind.
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
    handle.append(document.createTextNode('גרירה'));
    return handle;
  }

  /** Make a list of .visual-item children reorderable by dragging its grips. */
  function sortable(container, collection, done){
    container.classList.add('visual-sortable');
    let dragging=null, from=-1, marked=null;

    const itemAt=(y)=>{
      const items=[...container.querySelectorAll('.visual-item')];
      for(const node of items){
        if(node===dragging) continue;
        const box=node.getBoundingClientRect();
        if(y<box.top+box.height/2) return {node,after:false};
        if(y<box.bottom) return {node,after:true};
      }
      const last=items[items.length-1];
      return last && last!==dragging ? {node:last,after:true} : null;
    };

    const clear=()=>{ if(marked){marked.node.classList.remove('is-over','is-over-after');marked=null;} };

    container.addEventListener('pointerdown', (event)=>{
      const handle=event.target.closest('.visual-grip');
      if(!handle||!container.contains(handle)) return;
      dragging=handle.closest('.visual-item');
      if(!dragging) return;
      from=[...container.querySelectorAll('.visual-item')].indexOf(dragging);
      dragging.classList.add('is-dragging');
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();          // stop the page scrolling under the finger
    });

    container.addEventListener('pointermove', (event)=>{
      if(!dragging) return;
      const target=itemAt(event.clientY);
      if(marked && (!target || target.node!==marked.node || target.after!==marked.after)) clear();
      if(target && !marked){
        target.node.classList.add(target.after?'is-over-after':'is-over');
        marked=target;
      }
    });

    const finish=()=>{
      if(!dragging) return;
      dragging.classList.remove('is-dragging');
      if(marked && from>-1){
        const items=[...container.querySelectorAll('.visual-item')];
        let to=items.indexOf(marked.node);
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

  function itemButtons(parent,item,index,collection){const r=row(parent);const mark=()=>touch();void mark;r.append(button('למעלה',()=>{if(index>0){[collection[index-1],collection[index]]=[collection[index],collection[index-1]];collection.forEach((x,i)=>x.order=i);touch();render();}}));r.append(button('למטה',()=>{if(index<collection.length-1){[collection[index+1],collection[index]]=[collection[index],collection[index+1]];collection.forEach((x,i)=>x.order=i);touch();render();}}));r.append(button(item.status==='published'?'הסתרה מהאתר':'הצגה באתר',()=>{item.status=item.status==='published'?'unpublished':'published';touch();render();}));if(item.status==='unpublished')r.append(button('הסרה',()=>{if(confirm('להסיר לצמיתות מהרשימה? התוכן יישאר בהיסטוריית המאגר.')){collection.splice(index,1);touch();render();}},'danger'));}
  function faqForm(){add(body,'p','שאלה חדשה דורשת נוסח עברי, ערבי ואנגלי. הסתרה משנה נראות באתר בלבד.');body.append(button('הוספת שאלה',()=>{touch();draft.push({id:'faq-'+Date.now().toString(36),status:'unpublished',order:draft.length,q:{he:'',ar:'',en:''},a:{he:'',ar:'',en:''}});render();}));add(body,'p','אפשר לגרור פריט כדי לשנות את הסדר, או להשתמש בכפתורי למעלה/למטה.').className='visual-order-hint';const list=add(body,'div','');draft.sort((a,b)=>a.order-b.order).forEach((item,index)=>{const box=add(list,'div','');box.className='visual-item';const heading=add(box,'h3','');heading.append(grip(),document.createTextNode(item.q[locale]||item.id));itemButtons(box,item,index,draft);translated(box,'שאלה',{entry:item.q},'entry');translated(box,'תשובה',{entry:item.a},'entry');});sortable(list,draft,()=>{draft.forEach((x,i)=>{x.order=i;});touch();render();});}
  function lines(parent,label,obj,key,minimum){const fs=group(parent,label);obj[key].forEach((value,index)=>{const r=row(fs);field(r,'פריט '+(index+1),value,v=>{obj[key][index]=v;},{textarea:true});r.append(button('הסרה',()=>{obj[key].splice(index,1);render();},'danger'));});fs.append(button('הוספת פריט',()=>{obj[key].push('');render();}));if(obj[key].length<minimum)add(fs,'p','נדרשים לפחות '+minimum+' פריטים.');}
  function pairs(parent,label,obj,key,first,second){const fs=group(parent,label);obj[key].forEach((value,index)=>{const box=add(fs,'div','');box.className='visual-item';field(box,first,value[first],v=>{value[first]=v;},{textarea:true});field(box,second,value[second],v=>{value[second]=v;},{textarea:true});box.append(button('הסרה',()=>{obj[key].splice(index,1);render();},'danger'));});fs.append(button('הוספת פריט',()=>{obj[key].push({[first]:'',[second]:''});render();}));}
  function newService(){const ordinal=Date.now().toString(36);return{id:'service-'+ordinal,slug:'service-'+ordinal,status:'unpublished',tier:2,order:draft.length,icon:'aesthetic',locales:Object.fromEntries(LANGS.map(lang=>[lang,{title:'',cardTitle:'',summary:'',candidacy:[''],process:[{step:'',detail:''},{step:'',detail:''}],expect:[''],faq:[],seoDescription:''}]))};}
  function servicesForm(){const sorted=draft.sort((a,b)=>a.tier-b.tier||a.order-b.order);body.append(button('הוספת טיפול',()=>{touch();draft.push(newService());selected=draft.length-1;render();}));add(body,'p','אפשר לגרור טיפול כדי לשנות את סדר ההצגה, או להשתמש בכפתורי למעלה/למטה.').className='visual-order-hint';const list=add(body,'div','');for(const [index,item] of sorted.entries()){const box=add(list,'div','');box.className='visual-item';const heading=add(box,'h3','');heading.append(grip(),document.createTextNode((item.locales[locale]?.title||item.slug)+' · '+(item.status==='published'?'מוצג':'מוסתר')));const buttons=row(box);buttons.append(button('עריכת טיפול',()=>{selected=index;render();}));itemButtons(box,item,index,draft);}sortable(list,draft,()=>{draft.forEach((x,i)=>{x.order=i;});touch();render();});const item=draft[selected];if(!item)return;const editor=group(body,'עריכת טיפול: '+item.slug);field(editor,'כתובת URL (לטיפול חדש בלבד)',item.slug,v=>{item.slug=v;item.id=v;});select(editor,'עדיפות',item.tier,[[1,'1'],[2,'2']],v=>{item.tier=Number(v);});select(editor,'אייקון',item.icon,['implant','crown','whitening','filling','veneer','aligner','root-canal','extraction','cleaning','emergency','aesthetic'].map(x=>[x,x]),v=>{item.icon=v;});for(const lang of LANGS){const section=group(editor,names[lang]);section.lang=lang;section.dir=lang==='en'?'ltr':'rtl';const local=item.locales[lang];for(const key of ['title','cardTitle','summary','seoTitle','seoDescription'])field(section,key,local[key]||'',v=>{if(v||key!=='seoTitle')local[key]=v;else delete local[key];},{textarea:key==='summary'||key==='seoDescription',required:key!=='seoTitle',lang});lines(section,'למי מתאים',local,'candidacy',1);pairs(section,'מהלך הטיפול',local,'process','step','detail');lines(section,'למה לצפות',local,'expect',1);pairs(section,'שאלות נפוצות',local,'faq','q','a');field(section,'תאריך בדיקה רפואית YYYY-MM-DD',local.reviewedOn||'',v=>{if(v)local.reviewedOn=v;else delete local.reviewedOn;},{required:false,lang:'en'});}}
  async function reloadPhotos(){const data=await api('/api/photos','GET');sha=data.sha;draft=structuredClone(data.records);render();}
  async function photoAction(file,action){if(action==='delete'&&!confirm('מחיקה לצמיתות מהמאגר הציבורי? ההיסטוריה נשמרת ב-Git.'))return;try{tell('שומר…');const result=await api('/api/photos/'+action,'POST',{file});await reloadPhotos();tell('נשמר ב-commit '+short(result.sha)+'; עדיין לא פורסם.');void track(result.sha);}catch(error){tell(error.message);}}
  async function savePhotoOrder(){try{tell('שומר סדר…');const result=await api('/api/photos/order','POST',{files:draft.map(x=>x.file)});await reloadPhotos();tell('הסדר נשמר ב-commit '+short(result.sha)+'; עדיין לא פורסם.');void track(result.sha);}catch(error){tell(error.message);await reloadPhotos();}}
  async function replacePhoto(file,input){const picked=input.files?.[0];if(!picked){tell('יש לבחור תמונה להחלפה.');return;}try{tell('בודק ומחליף…');const result=await api('/api/photos/replace','POST',{file,contentBase64:await encode(picked)});await reloadPhotos();tell('התמונה הוחלפה ב-commit '+short(result.sha)+'; עדיין לא פורסם.');void track(result.sha);}catch(error){tell(error.message);}}
  async function encode(file){if(file.size>8*1024*1024)throw new Error('הקובץ גדול מדי (עד 8 מגהבייט).');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
  function photosForm(){add(body,'p','תמונה חדשה נשמרת כמוסתרת. פריט מוסתר אינו סודי ונשאר במאגר הציבורי.');
    add(body,'p','הסדר כאן הוא הסדר באתר. אפשר לגרור תמונה למקום אחר, או להשתמש בכפתורי למעלה/למטה, ואז לשמור את הסדר.').className='visual-order-hint';
    const list=add(body,'div','');
    draft.forEach((item,index)=>{const box=add(list,'div','');box.className='visual-item';
      const heading=add(box,'h3','');heading.append(grip(),document.createTextNode(item.file+' · '+(item.status==='published'?'מוצג':'מוסתר')));
      // A thumbnail is how the doctor recognises the photograph he means. The
      // file is served from the repository, so Edit Mode shows the real image.
      const thumb=add(box,'img','');thumb.className='visual-thumb';thumb.loading='lazy';thumb.alt=item.alt[locale]||item.file;thumb.src='/api/photo?file='+encodeURIComponent(item.file);thumb.addEventListener('error',()=>{thumb.hidden=true;});
      add(box,'p',item.alt[locale]||'');
      const r=row(box);
      r.append(button('למעלה',()=>{if(index>0){[draft[index-1],draft[index]]=[draft[index],draft[index-1]];render();}}));
      r.append(button('למטה',()=>{if(index<draft.length-1){[draft[index+1],draft[index]]=[draft[index],draft[index+1]];render();}}));
      r.append(button(item.status==='published'?'הסתרה':'הצגה באתר',()=>photoAction(item.file,item.status==='published'?'unpublish':'publish')));
      const swap=document.createElement('input');swap.type='file';swap.accept='image/jpeg,image/png';swap.hidden=true;swap.addEventListener('change',()=>void replacePhoto(item.file,swap));
      r.append(button('החלפת תמונה',()=>swap.click()));box.append(swap);
      if(item.status==='unpublished')r.append(button('מחיקה',()=>photoAction(item.file,'delete'),'danger'));
    });
    sortable(list,draft,()=>{render();});
    body.append(button('שמירת הסדר',()=>void savePhotoOrder(),'primary'));
    const form=group(body,'העלאת תמונות');const input=field(form,'JPG / PNG — אפשר לבחור כמה קבצים', '',()=>{},{type:'file',required:true});input.accept='image/jpeg,image/png';input.multiple=true;const preview=add(form,'img','');preview.alt='תצוגה מקדימה';preview.hidden=true;let previewUrl='';input.addEventListener('change',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);const first=input.files?.[0];if(first){previewUrl=URL.createObjectURL(first);preview.src=previewUrl;preview.hidden=false;}else{preview.hidden=true;}});
    const category=select(form,'סוג תמונה','reception',['exterior','reception','treatment-room','equipment','doctor-working','team','atmosphere'].map(x=>[x,x]),()=>{});
    const alt={};for(const lang of LANGS)field(form,'תיאור תמונה — '+names[lang],'',v=>{alt[lang]=v;},{textarea:true,lang});const confirmed=check(form,'אני מאשר/ת שבתמונה אין מטופל, חלק ממטופל או תמונת לפני/אחרי.',false,()=>{});
    form.append(button('העלאה כמוסתר',async()=>{const files=[...(input.files||[])];if(!files.length){tell('יש לבחור תמונה.');return;}let last='';try{for(const [n,file] of files.entries()){tell('בודק ומעלה '+(n+1)+' מתוך '+files.length+'…');const result=await api('/api/photos','POST',{category:category.value,contentBase64:await encode(file),altHe:alt.he,altAr:alt.ar,altEn:alt.en,confirmed:confirmed.checked});last=result.sha;}await reloadPhotos();tell(files.length+' תמונות נשמרו כמוסתרות. האחרונה ב-commit '+short(last)+'. יש להציג אותן בנפרד.');void track(last);}catch(error){tell(error.message);await reloadPhotos();}},'primary'));
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

  /** Mirrors the dialog's status so it survives closing the dialog. */
  function barTell(text,state){
    barStatus.textContent=text||'';
    if(state) barStatus.setAttribute('data-state',state); else barStatus.removeAttribute('data-state');
  }

  for(const [key,label] of [['copy','כל הטקסטים'],['services','טיפולים'],['photos','תמונות']]){barActions.append(button(label,()=>void open(key)));}

  /* Preview hides every control without reloading, so the doctor can check a
     change the way a patient will see it and come straight back. */
  let previewing=false;
  const previewButton=button('תצוגת מטופל',()=>{
    previewing=!previewing;
    if(previewing) document.documentElement.setAttribute('data-visual-preview','');
    else document.documentElement.removeAttribute('data-visual-preview');
    previewButton.textContent=previewing?'חזרה לעריכה':'תצוגת מטופל';
    previewButton.setAttribute('aria-pressed',String(previewing));
  });
  previewButton.setAttribute('aria-pressed','false');
  barActions.append(previewButton);

  /* Leaving Edit Mode means leaving the admin host entirely. */
  const exit=document.createElement('a');
  exit.textContent='יציאה';
  exit.href='https://www.drkhalilkanani.com/';
  exit.rel='noopener';
  barActions.append(exit);

  /* Nothing is committed until Save, so an accidental reload is the one way
     to lose work that the dialog guard cannot catch. */
  window.addEventListener('beforeunload',(event)=>{ if(dirty){event.preventDefault();event.returnValue='';} });
})();
`;
