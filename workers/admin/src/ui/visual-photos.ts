/**
 * The gallery manager — ONE interface for the two managed galleries:
 * clinic photography ('clinic') and the doctor's work ('work', ADR 0010).
 * Which one is open is always named in the heading, and the Worker decides
 * which file each name means; the browser never sends a path.
 *
 * Injected into the Edit Mode client, so it shares its helpers (t, api,
 * prepare, encode…). Photo-first: the doctor sees his photographs, drags them
 * into order, edits each one, and saves the whole gallery at once — one
 * commit, one deployment.
 *
 * Reordering is the photo itself: a long press on touch (a normal swipe still
 * scrolls), or click-and-hold / drag with a mouse. Pointer Events throughout;
 * HTML5 drag-and-drop does not fire on touch. Move earlier / Move later
 * buttons are the keyboard path, visible when focused.
 *
 * Owner text reaches the DOM only as textContent or form values.
 */
export const PHOTOS_SOURCE = String.raw`
  /* ── Photo manager ─────────────────────────────────────────────────── */
  const LONG_PRESS_MS = 450, HOLD_MS = 180, MOVE_CANCEL_PX = 10, MOUSE_START_PX = 6;
  const pm = { el:null, grid:null, status:null, statusText:null, retry:null, summary:null, saveBtn:null, confirmWrap:null, confirmBox:null,
    gallery:'clinic', sha:'', versions:{}, photos:[], original:'', deletes:[], busy:false, saveToken:0, lastSave:null };
  const isWork = () => pm.gallery==='work';
  let pmKey = 0;
  const frameOf = (p) => p.frame || { x: 50, y: 50, zoom: 1 };
  const round2 = (n) => Math.round(n * 100) / 100;
  function applyFrame(img, frame){ const f=frame||{x:50,y:50,zoom:1}; img.style.objectPosition=f.x+'% '+f.y+'%'; img.style.transform='scale('+f.zoom+')'; img.style.transformOrigin=f.x+'% '+f.y+'%'; }
  function icon(paths){ const NS='http://www.w3.org/2000/svg'; const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('width','20'); svg.setAttribute('height','20'); svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false'); for(const d of paths){ const p=document.createElementNS(NS,'path'); p.setAttribute('d',d); p.setAttribute('fill','none'); p.setAttribute('stroke','currentColor'); p.setAttribute('stroke-width','2'); p.setAttribute('stroke-linecap','round'); p.setAttribute('stroke-linejoin','round'); svg.append(p); } return svg; }
  const ICON_X=['M6 6l12 12','M18 6L6 18'], ICON_PEN=['M4 20h4L19 9l-4-4L4 16v4Z','M14 6l4 4'], ICON_PLUS=['M12 5v14','M5 12h14'];
  const ICON_TRASH=['M4 7h16','M9 7V4h6v3','M6 7l1 13h10l1-13','M10 11v6','M14 11v6'];
  const ICON_GRIP=['M9 6h.01','M15 6h.01','M9 12h.01','M15 12h.01','M9 18h.01','M15 18h.01'];
  const ICON_EYE=['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z','M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'];
  const ICON_EYE_OFF=['M3 3l18 18','M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2','M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10.5 10.5 0 0 0 5.4-1.6','M9.9 9.9a3 3 0 0 0 4.2 4.2'];
  const ICON_SWAP=['M4 7h13l-3-3','M20 17H7l3 3'];
  function iconButton(label, paths, cls, action){ const b=document.createElement('button'); b.type='button'; b.className=cls; b.setAttribute('aria-label',label); b.title=label; b.append(icon(paths)); b.addEventListener('click',(e)=>{ e.stopPropagation(); action(); }); return b; }
  function thumbSrc(p){ if(p.image&&p.image.url) return p.image.url; return '/api/photo?file='+encodeURIComponent(p.file)+'&v='+encodeURIComponent(pm.versions[p.file]||''); }
  /** The photo's own words: a doctor's-work title if it has one, else its description. */
  const photoText = (p) => (isWork() && p.caption && localTitle(p.caption)) || localTitle(p.alt) || '';
  function photoLabel(p, i){ return (photoText(p)||CATEGORY_LABELS[p.category]||t('pmNew'))+' ('+(i+1)+')'; }
  /*
   * A new or replacement photograph stays IN THE BROWSER (a local preview)
   * until Save, and is uploaded only then, with the no-patient confirmation
   * ticked. Nothing the doctor picks by mistake and removes again ever
   * reaches the repository's object store.
   */
  const hasNewImage = (p) => !!(p.image && (p.image.local || p.image.blob));
  const imgKey = (p) => p.image ? (p.image.blob || (p.image.local ? 'local:'+p.image.url : null)) : null;
  const capKey = (p) => p.caption ? [p.caption.he||'',p.caption.ar||'',p.caption.en||''].join('\u0001') : '';
  function snapshot(){ return JSON.stringify({ order: pm.photos.map(p=>p.file||p.key), photos: pm.photos.map(p=>({f:p.file,s:p.status,a:p.alt,fr:p.frame||null,img:imgKey(p),c:p.category,cap:capKey(p)})), del: pm.deletes }); }
  function changeCount(){
    if(!pm.original) return 0;
    const before=JSON.parse(pm.original); let n=pm.deletes.length;
    const prev=new Map(before.photos.map(p=>[p.f,p]));
    pm.photos.forEach((p,i)=>{ if(!p.file){ n++; return; } const o=prev.get(p.file); if(!o){ n++; return; } if(JSON.stringify([o.s,o.a,o.fr,o.img,o.cap])!==JSON.stringify([p.status,p.alt,p.frame||null,imgKey(p),capKey(p)])) n++; });
    if(JSON.stringify(pm.photos.filter(p=>p.file).map(p=>p.file))!==JSON.stringify(before.order.filter(f=>typeof f==='string'&&prev.has(f)&&!pm.deletes.includes(f)))) n++;
    return n;
  }
  const pmDirty = () => changeCount()>0 || pm.photos.some(p=>p.uploading);

  function pmTell(text, state, withRetry){ pm.statusText.textContent=text||''; pm.status.setAttribute('data-state',state||''); pm.status.hidden=!text; pm.retry.hidden=!withRetry; barTell(text,state); }

  function buildManager(){
    const el=document.createElement('dialog'); el.className='pm'; el.lang=locale; el.dir=DIR; el.setAttribute('aria-labelledby','pm-title'); el.setAttribute('aria-describedby','pm-about');
    const head=add(el,'div'); head.className='pm-head';
    const titles=add(head,'div'); titles.className='pm-titles';
    pm.title=add(titles,'h2'); pm.title.id='pm-title';
    pm.about=add(titles,'p'); pm.about.className='pm-about'; pm.about.id='pm-about';
    pm.summary=add(titles,'p'); pm.summary.className='pm-summary';
    head.append(iconButton(t('pmCloseLabel'),ICON_X,'pm-close',()=>closeManager()));
    const body=add(el,'div'); body.className='pm-body'; pm.body=body;
    pm.hint=add(body,'p',t('pmDragHint')); pm.hint.className='pm-hint';
    pm.grid=add(body,'div'); pm.grid.className='pm-grid'; pm.grid.setAttribute('role','list');
    // The footer is always on screen: what happened, what is needed, and Save.
    const foot=add(el,'div'); foot.className='pm-foot';
    pm.status=add(foot,'div'); pm.status.className='pm-status'; pm.status.setAttribute('role','status'); pm.status.setAttribute('aria-live','polite'); pm.status.hidden=true;
    pm.statusText=add(pm.status,'span');
    pm.retry=button(t('pmRetry'),()=>{ if(pm.lastSave&&pm.lastSave.commit) void trackPhotos(pm.lastSave.commit); else void savePhotos(); },'pm-retry'); pm.retry.hidden=true; pm.status.append(pm.retry);
    pm.issues=add(foot,'div'); pm.issues.className='pm-issues'; pm.issues.setAttribute('role','alert'); pm.issues.hidden=true;
    pm.confirmWrap=add(foot,'label'); pm.confirmWrap.className='pm-confirm'; pm.confirmWrap.hidden=true;
    pm.confirmBox=document.createElement('input'); pm.confirmBox.type='checkbox'; pm.confirmBox.id='pm-confirm';
    pm.confirmText=document.createElement('span');
    pm.confirmWrap.append(pm.confirmBox, pm.confirmText);
    const actions=add(foot,'div'); actions.className='pm-actions';
    actions.append(button(t('pmCancel'),()=>closeManager(),'pm-cancel'));
    pm.saveBtn=button(publishing==='production'?t('pmSavePublish'):t('pmSave'),()=>void savePhotos(),'pm-save');
    actions.append(pm.saveBtn);
    el.addEventListener('cancel',(e)=>{ e.preventDefault(); closeManager(); });
    document.body.append(el); pm.el=el;
  }

  async function openPhotoManager(gallery){
    if(!pm.el) buildManager();
    if(pm.el.open && pmDirty() && gallery!==pm.gallery && !confirm(t('pmCloseUnsaved'))) return;
    pm.gallery = gallery==='work' ? 'work' : 'clinic';
    pm.el.dataset.gallery=pm.gallery;
    // Which gallery this is, said in words at the top — never left to guess.
    pm.title.textContent=t(isWork()?'pmTitleWork':'pmTitleClinic');
    pm.about.textContent=t(isWork()?'pmAboutWork':'pmAboutClinic');
    pm.confirmText.textContent=t(isWork()?'pmConfirmWork':'pmConfirmPatients');
    pm.confirmBox.checked=false; pm.photos=[]; pm.original='';
    pm.issues.hidden=true; pm.issues.replaceChildren(); pmTell('');
    if(!pm.el.open) pm.el.showModal();
    pm.grid.replaceChildren(); const sk=add(pm.grid,'div'); sk.className='visual-loading'; sk.textContent=t('loading');
    // Nothing to save until the gallery has loaded.
    pm.saveBtn.disabled=true; pm.summary.textContent=''; pm.confirmWrap.hidden=true;
    try{
      loadInto(await api('/api/photos?gallery='+pm.gallery,'GET'));
    }catch(error){ pm.grid.replaceChildren(); pmFail(error); }
  }
  /** The server's view becomes the state to compare against. */
  function loadInto(data){
    pm.sha=data.sha; pm.versions=data.versions||{}; pm.deletes=[];
    pm.photos=data.records.map(r=>({ key:'p'+(++pmKey), file:r.file, category:r.category, status:r.status,
      alt:{he:r.alt.he,ar:r.alt.ar,en:r.alt.en},
      caption:r.caption?{he:r.caption.he,ar:r.caption.ar,en:r.caption.en}:null,
      frame:r.frame?{x:r.frame.x,y:r.frame.y,zoom:r.frame.zoom}:null,
      published:r.status==='published', width:r.width, height:r.height }));
    pm.original=snapshot(); pm.confirmBox.checked=false; renderGrid();
  }
  function closeManager(){
    if(pmDirty() && !confirm(t('pmCloseUnsaved'))) return;
    pm.el.close();
    if(pm.reloadOnClose){ try{ sessionStorage.setItem('visual-updated','1'); }catch{} location.reload(); }
  }

  function updateSummary(){
    const n=changeCount(); pm.summary.textContent=t('pmCount',{n:pm.photos.length})+' · '+(n?t('pmChanges',{n}):t('pmNoChanges'));
    pm.saveBtn.disabled=pm.busy||n===0||pm.photos.some(p=>p.invalid);
    const needsConfirm=pm.photos.some(hasNewImage);
    pm.confirmWrap.hidden=!needsConfirm;
  }

  function renderGrid(){
    pm.grid.replaceChildren();
    pm.photos.forEach((p,i)=>pm.grid.append(tile(p,i)));
    const addTile=document.createElement('div'); addTile.className='pm-tile pm-add'; addTile.setAttribute('role','listitem');
    const input=document.createElement('input'); input.type='file'; input.accept='image/jpeg,image/png'; input.multiple=true; input.hidden=true; input.id='pm-add-input';
    const addBtn=document.createElement('button'); addBtn.type='button'; addBtn.className='pm-add-button';
    addBtn.append(icon(ICON_PLUS)); add(addBtn,'span',t('pmAdd')).className='pm-add-label'; add(addBtn,'span',t('pmAddHint')).className='pm-add-hint';
    addBtn.addEventListener('click',()=>input.click());
    input.addEventListener('change',()=>{ void addPhotos([...(input.files||[])]); input.value=''; });
    addTile.append(addBtn,input); pm.grid.append(addTile);
    pm.hint.hidden=pm.photos.length<2;
    if(!pm.photos.length){
      // An empty gallery is a starting point, not a blank window.
      const e=document.createElement('div'); e.className='pm-empty';
      e.append(icon(['M4 5h16v14H4z','M4 15l4-4 4 4 3-3 5 5','M15 9h.01']));
      add(e,'h3',t('pmEmptyTitle'));
      add(e,'p',t(isWork()?'pmEmptyWork':'pmEmptyClinic'));
      pm.grid.prepend(e);
    }
    updateSummary();
  }

  function tile(p, i){
    const el=document.createElement('div'); el.className='pm-tile'; el.setAttribute('role','listitem'); el.dataset.key=p.key; if(p.file) el.dataset.file=p.file;
    el.setAttribute('aria-label',photoLabel(p,i));
    const frame=add(el,'div'); frame.className=isWork()?'pm-frame pm-frame-whole':'pm-frame';
    const img=document.createElement('img'); img.alt=''; img.draggable=false; img.decoding='async'; img.src=thumbSrc(p); if(!isWork()) applyFrame(img,p.frame); frame.append(img);
    img.addEventListener('error',()=>{ img.remove(); add(frame,'span',t('noPreview')).className='pm-noimg'; });
    const badges=add(frame,'div'); badges.className='pm-badges';
    if(p.status!=='published') add(badges,'span',t('pmHidden')).className='pm-badge';
    if(!p.file) add(badges,'span',t('pmNew')).className='pm-badge pm-badge-new';
    else if(p.image) add(badges,'span',t('pmReplaced')).className='pm-badge pm-badge-new';
    if(!(p.alt.he&&p.alt.ar&&p.alt.en)) add(badges,'span',t('pmNeedsText')).className='pm-badge pm-badge-warn';
    // The photo's words, and the everyday actions — without opening anything.
    const text=add(el,'p'); text.className='pm-text';
    if(isWork() && !(p.caption&&localTitle(p.caption))){ text.textContent=t('pmNoTitle'); text.classList.add('pm-text-missing'); }
    else text.textContent=photoText(p)||t('pmNeedsText');
    const bar_=add(el,'div'); bar_.className='pm-toolbar';
    const grip=iconButton(t('named',{action:t('pmDragHandle'),name:photoLabel(p,i)}),ICON_GRIP,'pm-tool pm-grip',()=>{});
    grip.tabIndex=-1; grip.setAttribute('aria-hidden','true');
    const shown=p.status==='published';
    const eye=iconButton(t('named',{action:shown?t('pmHide'):t('pmShow'),name:photoLabel(p,i)}),shown?ICON_EYE:ICON_EYE_OFF,'pm-tool pm-eye',()=>{ p.status=shown?'unpublished':'published'; renderGrid(); const again=pm.grid.querySelector('[data-key="'+p.key+'"] .pm-eye'); if(again) again.focus(); });
    eye.setAttribute('aria-pressed',String(shown));
    const pick=document.createElement('input'); pick.type='file'; pick.accept='image/jpeg,image/png'; pick.hidden=true;
    pick.addEventListener('change',()=>{ const f=pick.files&&pick.files[0]; pick.value=''; if(f) void replaceLocally(p,f); });
    const swap=iconButton(t('named',{action:t('pmReplacePhoto'),name:photoLabel(p,i)}),ICON_SWAP,'pm-tool pm-swap',()=>pick.click());
    bar_.append(grip,eye,swap,pick);
    if(p.error&&!p.invalid) add(badges,'span',p.error).className='pm-badge pm-badge-warn';
    if(p.uploading){ const u=add(frame,'div'); u.className='pm-uploading'; add(u,'span',t('pmUploading')); }
    if(p.invalid){ const u=add(frame,'div'); u.className='pm-uploading pm-upload-failed'; add(u,'span',p.error); u.append(button(t('pmRemove'),()=>{ pm.photos=pm.photos.filter(x=>x!==p); if(p.image&&p.image.url) URL.revokeObjectURL(p.image.url); renderGrid(); },'pm-mini')); }
    el.append(iconButton(t('named',{action:t('pmEditPhoto'),name:photoLabel(p,i)}),ICON_PEN,'pm-corner pm-edit',()=>openPhotoEditor(p)));
    el.append(iconButton(t('named',{action:t('pmDeletePhoto'),name:photoLabel(p,i)}),ICON_TRASH,'pm-corner pm-delete',()=>deletePhoto(p)));
    const kb=add(frame,'div'); kb.className='pm-keyboard';
    const up=button(t('pmMoveEarlier'),()=>movePhoto(p,-1),'pm-mini'); up.disabled=i===0; up.setAttribute('aria-label',t('named',{action:t('pmMoveEarlier'),name:photoLabel(p,i)}));
    const down=button(t('pmMoveLater'),()=>movePhoto(p,1),'pm-mini'); down.disabled=i===pm.photos.length-1; down.setAttribute('aria-label',t('named',{action:t('pmMoveLater'),name:photoLabel(p,i)}));
    kb.append(up,down);
    attachDrag(el,p);
    return el;
  }
  function movePhoto(p, delta){ const i=pm.photos.indexOf(p), j=i+delta; if(j<0||j>=pm.photos.length) return; pm.photos.splice(i,1); pm.photos.splice(j,0,p); renderGrid(); const again=pm.grid.querySelector('[data-key="'+p.key+'"] .pm-keyboard button:'+(delta<0?'first-child':'last-child')); if(again&&!again.disabled) again.focus(); else { const any=pm.grid.querySelector('[data-key="'+p.key+'"] .pm-keyboard button:not([disabled])'); if(any) any.focus(); } }

  function deletePhoto(p){
    if(p.file && p.published){
      // Shown on the site: never destroyed in one step. Offer to hide it.
      if(confirm(t('pmDeletePublished'))){ p.status='unpublished'; renderGrid(); }
      return;
    }
    if(!confirm(t('pmDeleteConfirm'))) return;
    pm.photos=pm.photos.filter(x=>x!==p);
    if(p.file) pm.deletes.push(p.file);
    if(p.image&&p.image.url) URL.revokeObjectURL(p.image.url);
    renderGrid();
  }

  /* ── Adding photographs: shown at once, kept in the browser until Save ─ */
  async function addPhotos(files){
    for(const file of files){
      const p={ key:'p'+(++pmKey), file:null, category:'reception', status:'unpublished', alt:{he:'',ar:'',en:''}, frame:null, image:{ url:URL.createObjectURL(file) } };
      pm.photos.push(p); renderGrid();
      try{ const ready=await prepare(file); p.image={ url:p.image.url, local:ready.blob, width:ready.width, height:ready.height }; }
      // Refused before upload (not an image, HEIC, too small): the tile says
      // why and offers Remove; Save waits until it is resolved.
      catch(error){ p.invalid=true; p.error=error.message; }
      renderGrid();
    }
  }
  /** Replace from the card: a local preview until Save; words are kept. */
  async function replaceLocally(p, file){
    try{
      const target=p.file?(p.file.toLowerCase().endsWith('.png')?'image/png':'image/jpeg'):undefined;
      const ready=await prepare(file,target);
      if(p.image&&p.image.url&&p.image.local) URL.revokeObjectURL(p.image.url);
      p.image={ url:URL.createObjectURL(ready.blob), local:ready.blob, width:ready.width, height:ready.height };
      // A focal point chosen for the old picture means nothing in the new one.
      if(!isWork()) p.frame=null;
      p.error='';
    }catch(error){ p.error=error.message; }
    renderGrid();
  }
  /** Upload one photograph's bytes as a git blob (no commit). Only from Save. */
  async function stageImage(p){
    if(!p.image||p.image.blob||!p.image.local) return;
    const data=await api('/api/photos/stage','POST',{contentBase64:await encode(p.image.local),confirmed:true});
    p.image={ ...p.image, blob:data.blob, width:data.width, height:data.height };
  }

  /* ── Long-press / click-and-hold drag on the photo itself ───────────── */
  let drag=null;
  // Once a drag is active, the page must not scroll under the finger. Only
  // then: before the long press completes, a swipe scrolls normally.
  document.addEventListener('touchmove',(e)=>{ if(drag&&drag.active) e.preventDefault(); },{passive:false});
  /*
   * The press starts on the tile; everything after it is followed on the
   * window. The tile itself moves in the DOM as the photos rearrange, and a
   * moved element loses pointer capture — listening on the tile, the release
   * was missed and the photo stayed stuck to the pointer.
   */
  function attachDrag(el, p){
    el.addEventListener('contextmenu',(e)=>{ if(drag) e.preventDefault(); });
    el.addEventListener('pointerdown',(e)=>{
      // The handle lifts the photo at once; anywhere else on the photo takes a
      // long press (touch) or a brief hold (mouse), so a swipe still scrolls.
      const handle=!!e.target.closest('.pm-grip');
      if(e.button!==0||pm.busy||drag||(!handle&&e.target.closest('button,input,a'))) return;
      const touch=e.pointerType!=='mouse';
      drag={ el, p, id:e.pointerId, x0:e.clientX, y0:e.clientY, x:e.clientX, y:e.clientY, active:false, touch, timer:0 };
      if(!touch||handle) e.preventDefault();
      if(handle){ startDrag(e.clientX,e.clientY); }
      else drag.timer=setTimeout(()=>{ if(drag&&!drag.active) startDrag(drag.x,drag.y); }, touch?LONG_PRESS_MS:HOLD_MS);
      window.addEventListener('pointermove',onDragMove,true);
      window.addEventListener('pointerup',onDragEnd,true);
      window.addEventListener('pointercancel',onDragEnd,true);
    });
  }
  function onDragMove(e){
    if(!drag||e.pointerId!==drag.id) return;
    drag.x=e.clientX; drag.y=e.clientY;
    const dist=Math.hypot(e.clientX-drag.x0, e.clientY-drag.y0);
    if(!drag.active){
      // Moving before the long press completes is a scroll, not a drag.
      if(drag.touch&&dist>MOVE_CANCEL_PX){ endDrag(); return; }
      if(!drag.touch&&dist>MOUSE_START_PX) startDrag(e.clientX,e.clientY);
      return;
    }
    e.preventDefault();
    moveDrag(e.clientX,e.clientY);
  }
  function onDragEnd(e){
    if(!drag||e.pointerId!==drag.id) return;
    if(drag.active) finishDrag(e.type==='pointercancel'); else endDrag();
  }
  function endDrag(){
    if(drag) clearTimeout(drag.timer);
    drag=null;
    window.removeEventListener('pointermove',onDragMove,true);
    window.removeEventListener('pointerup',onDragEnd,true);
    window.removeEventListener('pointercancel',onDragEnd,true);
  }
  function startDrag(x,y){
    if(!drag||drag.active) return;
    clearTimeout(drag.timer);
    drag.active=true; drag.order=pm.photos.slice();
    const r=drag.el.getBoundingClientRect(); drag.dx=x-r.left; drag.dy=y-r.top;
    // Positioned inside the dialog (it is in the top layer; anything outside
    // it would be under the backdrop), relative to the dialog's own box.
    drag.box=pm.el.getBoundingClientRect();
    const ghost=drag.el.cloneNode(true); ghost.classList.add('pm-ghost'); ghost.removeAttribute('role'); ghost.setAttribute('aria-hidden','true');
    ghost.style.width=r.width+'px'; ghost.style.height=r.height+'px';
    pm.el.append(ghost); drag.ghost=ghost; drag.el.classList.add('pm-placeholder'); pm.el.classList.add('pm-dragging');
    if(navigator.vibrate) navigator.vibrate(12);
    moveDrag(x,y);
  }
  function moveDrag(x,y){
    drag.ghost.style.left=(x-drag.dx-drag.box.left)+'px'; drag.ghost.style.top=(y-drag.dy-drag.box.top)+'px';
    // Carry the photo past the visible part of a long grid.
    const box=pm.body.getBoundingClientRect();
    if(y<box.top+56) pm.body.scrollBy(0,-12); else if(y>box.bottom-56) pm.body.scrollBy(0,12);
    // Layout positions, not getBoundingClientRect: a neighbour still gliding
    // (FLIP) reports where it WAS, and the photo swapped straight back.
    const tiles=[...pm.grid.querySelectorAll('.pm-tile:not(.pm-add)')];
    const g=pm.grid.getBoundingClientRect();
    const best=tiles.find(n=>{ const l=g.left+n.offsetLeft, t=g.top+n.offsetTop; return x>=l&&x<=l+n.offsetWidth&&y>=t&&y<=t+n.offsetHeight; });
    if(!best||best===drag.el) return;
    const to=tiles.indexOf(best), from=tiles.indexOf(drag.el);
    // Neighbours glide into their new places (FLIP), so the destination is visible.
    const before=new Map(tiles.map(n=>[n,n.getBoundingClientRect()]));
    if(to>from) best.after(drag.el); else best.before(drag.el);
    for(const n of tiles){ if(n===drag.el) continue; const a=before.get(n), b=n.getBoundingClientRect(); const dx=a.left-b.left, dy=a.top-b.top; if(dx||dy){ n.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'none'}],{duration:180,easing:'cubic-bezier(.2,.7,.3,1)'}); } }
  }
  function finishDrag(cancelled){
    const d=drag; endDrag(); if(!d) return;
    d.ghost.remove(); d.el.classList.remove('pm-placeholder'); pm.el.classList.remove('pm-dragging');
    if(cancelled){ pm.photos=d.order; renderGrid(); return; }
    const keys=[...pm.grid.querySelectorAll('.pm-tile:not(.pm-add)')].map(n=>n.dataset.key);
    pm.photos=keys.map(k=>pm.photos.find(x=>x.key===k)).filter(Boolean);
    renderGrid();
  }
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'&&drag&&drag.active){ e.preventDefault(); e.stopPropagation(); finishDrag(true); } },true);

  /* ── The single-photo editor: framing, replace, words, visibility ────── */
  function openPhotoEditor(p){
    const work={ status:p.status, alt:{...p.alt}, caption:p.caption?{...p.caption}:{he:'',ar:'',en:''}, frame:{...frameOf(p)}, category:p.category, image:p.image?{...p.image}:null };
    const sheet=document.createElement('div'); sheet.className='pe'; sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-modal','true'); sheet.setAttribute('aria-labelledby','pe-title');
    const head=add(sheet,'div'); head.className='pe-head';
    const cancel=button(t('peCancel'),()=>{ sheet.remove(); },'pe-cancel');
    add(head,'h3',t('peTitle')).id='pe-title';
    const done=button(t('peDone'),()=>{
      // Edited: the last save's complaint about this photo no longer applies.
      p.status=work.status; p.alt=work.alt; p.category=work.category; p.error='';
      if(isWork()){
        // A title is all three languages or none; the Worker says which is missing.
        const c=work.caption; p.caption=(c.he||c.ar||c.en)?{he:c.he,ar:c.ar,en:c.en}:null; p.frame=null;
      } else {
        const f=work.frame; p.frame=(f.x===50&&f.y===50&&f.zoom===1)?null:{x:round2(f.x),y:round2(f.y),zoom:round2(f.zoom)};
      }
      p.image=work.image;
      sheet.remove(); renderGrid();
      const again=pm.grid.querySelector('[data-key="'+p.key+'"] .pm-edit'); if(again) again.focus();
    },'pe-done');
    head.prepend(cancel); head.append(done);
    const bodyEl=add(sheet,'div'); bodyEl.className='pe-body';

    // Clinic photography: framing, where the frame IS the preview. The
    // doctor's work: the whole image, always — so a preview and no framing.
    let img, smallImg, paint=()=>{}, crop=null;
    if(isWork()){
      const col=add(bodyEl,'div'); col.className='pe-crop-col';
      const whole=add(col,'div'); whole.className='pe-whole';
      img=document.createElement('img'); img.alt=''; img.draggable=false; img.src=work.image&&work.image.url?work.image.url:thumbSrc(p); whole.append(img);
      add(col,'p',t('peWholeImage')).className='pm-hint';
      smallImg=img;
    } else {
      // Framing: the frame IS the preview — the same 4:3 the gallery uses.
      const cropCol=add(bodyEl,'div'); cropCol.className='pe-crop-col';
      add(cropCol,'h4',t('peFraming'));
      add(cropCol,'p',t('peFramingHint')).className='pm-hint';
      crop=add(cropCol,'div'); crop.className='pe-crop'; crop.tabIndex=0; crop.setAttribute('role','application'); crop.setAttribute('aria-label',t('peFraming'));
      img=document.createElement('img'); img.alt=''; img.draggable=false; img.src=work.image&&work.image.url?work.image.url:thumbSrc(p); crop.append(img);
      const pos=add(cropCol,'p'); pos.className='pe-pos'; pos.setAttribute('aria-live','polite');
      const zoomRow=add(cropCol,'div'); zoomRow.className='pe-zoom';
      const zoomOut=iconButton(t('peZoomOut'),['M5 12h14'],'pe-zoom-btn',()=>setZoom(work.frame.zoom-0.1));
      const slider=document.createElement('input'); slider.type='range'; slider.min='1'; slider.max='3'; slider.step='0.01'; slider.setAttribute('aria-label',t('peZoom'));
      const zoomIn=iconButton(t('peZoomIn'),ICON_PLUS,'pe-zoom-btn',()=>setZoom(work.frame.zoom+0.1));
      zoomRow.append(zoomOut,slider,zoomIn);
      const reset=button(t('peReset'),()=>{ work.frame={x:50,y:50,zoom:1}; paint(); },'pm-mini');
      cropCol.append(reset);
      const small=add(cropCol,'div'); small.className='pe-small'; add(small,'span',t('pePreview'));
      const smallFrame=add(small,'div'); smallFrame.className='pe-small-frame'; smallImg=document.createElement('img'); smallImg.alt=''; smallImg.src=img.src; smallFrame.append(smallImg);
      paint=function(){ applyFrame(img,work.frame); applyFrame(smallImg,work.frame); slider.value=String(work.frame.zoom); pos.textContent=t('peFramePos',{x:Math.round(work.frame.x),y:Math.round(work.frame.y),z:work.frame.zoom.toFixed(2)}); }
      function setZoom(z){ work.frame.zoom=Math.min(3,Math.max(1,round2(z))); paint(); }
      slider.addEventListener('input',()=>setZoom(Number(slider.value)));
      // Drag to reposition: the point under the finger stays under the finger.
      let pan=null;
      crop.addEventListener('pointerdown',(e)=>{ pan={x:e.clientX,y:e.clientY,f:{...work.frame}}; crop.setPointerCapture(e.pointerId); e.preventDefault(); });
      crop.addEventListener('pointermove',(e)=>{
        if(!pan) return;
        const r=crop.getBoundingClientRect(), nw=img.naturalWidth||1, nh=img.naturalHeight||1;
        const cover=Math.max(r.width/nw, r.height/nh), w=nw*cover*work.frame.zoom, h=nh*cover*work.frame.zoom;
        const dx=r.width-w, dy=r.height-h;
        if(dx<0) work.frame.x=Math.min(100,Math.max(0,pan.f.x+(e.clientX-pan.x)/dx*100));
        if(dy<0) work.frame.y=Math.min(100,Math.max(0,pan.f.y+(e.clientY-pan.y)/dy*100));
        paint();
      });
      const endPan=()=>{ pan=null; }; crop.addEventListener('pointerup',endPan); crop.addEventListener('pointercancel',endPan);
      crop.addEventListener('keydown',(e)=>{
        const step=e.shiftKey?10:2; let used=true;
        if(e.key==='ArrowLeft') work.frame.x=Math.max(0,work.frame.x+(DIR==='rtl'?-step:step)); else if(e.key==='ArrowRight') work.frame.x=Math.min(100,work.frame.x+(DIR==='rtl'?step:-step));
        else if(e.key==='ArrowUp') work.frame.y=Math.min(100,work.frame.y+step); else if(e.key==='ArrowDown') work.frame.y=Math.max(0,work.frame.y-step);
        else if(e.key==='+'||e.key==='=') setZoom(work.frame.zoom+0.1); else if(e.key==='-') setZoom(work.frame.zoom-0.1); else used=false;
        if(used){ e.preventDefault(); paint(); }
      });
      img.addEventListener('load',paint); paint();
    }

    // Details.
    const form=add(bodyEl,'div'); form.className='pe-form';
    const vis=add(form,'label'); vis.className='visual-check pe-visibility';
    const visBox=document.createElement('input'); visBox.type='checkbox'; visBox.checked=work.status==='published'; visBox.addEventListener('change',()=>{ work.status=visBox.checked?'published':'unpublished'; });
    vis.append(visBox,document.createTextNode(t('peVisibility')));
    const replaceInput=document.createElement('input'); replaceInput.type='file'; replaceInput.accept='image/jpeg,image/png'; replaceInput.hidden=true;
    const replaceBtn=button(t('peReplace'),()=>replaceInput.click(),'pm-mini'); form.append(replaceBtn,replaceInput);
    const replaceNote=add(form,'p'); replaceNote.className='pm-hint';
    replaceInput.addEventListener('change',async()=>{
      const file=replaceInput.files&&replaceInput.files[0]; replaceInput.value=''; if(!file) return;
      replaceNote.textContent=t('checkingImage');
      try{
        const target=p.file?(p.file.toLowerCase().endsWith('.png')?'image/png':'image/jpeg'):null;
        const ready=await prepare(file,target||undefined);
        // Kept in the browser; uploaded on Save, after the confirmation.
        work.image={ local:ready.blob, width:ready.width, height:ready.height, url:URL.createObjectURL(ready.blob) };
        img.src=work.image.url; smallImg.src=work.image.url; work.frame={x:50,y:50,zoom:1}; paint(); replaceNote.textContent=t('peReplaced');
      }catch(error){ replaceNote.textContent=error.message; }
    });
    if(isWork()){
      // The title: optional, shown under the photo; all three or none.
      const tfs=add(form,'fieldset'); tfs.className='pe-title-group'; add(tfs,'legend',t('peTitleGroup'));
      add(tfs,'p',t('peTitleHint')).className='pm-hint';
      for(const lang of LANGS){ const wrap=add(tfs,'label',names[lang]); const input=document.createElement('input'); input.type='text'; input.lang=lang; input.dir=lang==='en'?'ltr':'rtl'; input.value=work.caption[lang]||''; input.setAttribute('data-caption',lang); input.addEventListener('input',()=>{ work.caption[lang]=input.value; }); wrap.append(input); }
    }
    if(!p.file && !isWork()){ const wrap=add(form,'label',t('peCategory')); const sel=add(wrap,'select'); for(const k of Object.keys(CATEGORY_LABELS)){ const o=add(sel,'option',CATEGORY_LABELS[k]); o.value=k; } sel.value=work.category; sel.addEventListener('change',()=>{ work.category=sel.value; }); }
    const fs=add(form,'fieldset'); add(fs,'legend',t('peDescriptions'));
    for(const lang of LANGS){ const wrap=add(fs,'label',names[lang]); const ta=document.createElement('textarea'); ta.lang=lang; ta.dir=lang==='en'?'ltr':'rtl'; ta.value=work.alt[lang]||''; ta.setAttribute('data-alt',lang); ta.addEventListener('input',()=>{ work.alt[lang]=ta.value; }); wrap.append(ta); }
    const moves=add(form,'div'); moves.className='visual-row';
    moves.append(button(t('pmMoveEarlier'),()=>{ movePhoto(p,-1); },'pm-mini'),button(t('pmMoveLater'),()=>{ movePhoto(p,1); },'pm-mini'));
    form.append(button(t('pmDeletePhoto'),()=>{ sheet.remove(); deletePhoto(p); },'pm-mini pm-danger'));
    sheet.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); sheet.remove(); const back=pm.grid.querySelector('[data-key="'+p.key+'"] .pm-edit'); if(back) back.focus(); } });
    pm.el.append(sheet);
    const first=crop||sheet.querySelector('[data-caption],textarea'); if(first) first.focus();
  }

  /* ── Save: one commit, then the truth about where it has reached ────── */
  function payload(){
    return pm.photos.map(p=>{
      const out={ status:p.status, alt:p.alt };
      if(isWork()){ out.caption=p.caption||{he:'',ar:'',en:''}; if(p.file) out.file=p.file; }
      else { if(p.frame) out.frame=p.frame; if(p.file) out.file=p.file; else out.category=p.category; }
      if(p.image&&p.image.blob) out.image={ blob:p.image.blob };
      return out;
    });
  }
  function pmFail(error, retry){
    const code=error instanceof ApiError?error.code:'SERVER_ERROR';
    pmTell(t('pmFailed')+' — '+(ERRORS[code]||ERRORS.SERVER_ERROR),'failed',retry!==false&&code!=='INVALID');
    pm.issues.replaceChildren(); pm.issues.hidden=true;
    if(code==='INVALID'&&error.issues&&error.issues.length){
      const list=add(pm.issues,'ul');
      for(const issue of error.issues){
        let m=/^photo_(\d+):(.*)$/.exec(issue), text;
        if(m){ const inner=m[2]; text=t('issuePhotoN',{n:Number(m[1])+1,text:inner==='frame_invalid'?t('issueFrame'):describeIssue(inner)}); const p=pm.photos[Number(m[1])]; if(p){ p.error=inner==='frame_invalid'?t('issueFrame'):describeIssue(inner); } }
        else if((m=/^delete:.*:published_photo_delete$/.exec(issue))) text=t('issuePublishedDelete');
        else if(issue==='too_many_images') text=t('issueTooMany');
        else text=describeIssue(issue);
        add(list,'li',text);
      }
      pm.issues.hidden=false; renderGrid();
    }
    if(code==='CONFLICT'){ pm.issues.replaceChildren(button(t('reloadLatest'),()=>{ pm.original=''; void openPhotoManager(); },'pm-mini')); pm.issues.hidden=false; }
  }
  async function savePhotos(){
    if(pm.busy||changeCount()===0) return;
    for(const p of pm.photos) if(!p.invalid) p.error='';
    const needsConfirm=pm.photos.some(hasNewImage);
    if(needsConfirm&&!pm.confirmBox.checked){ pmTell(ISSUES.confirmation_required,'failed',false); pm.confirmBox.focus(); return; }
    pm.busy=true; pm.lastSave=null; ++pm.saveToken; updateSummary(); pm.issues.hidden=true;
    // First the photographs, one at a time — only now, with the confirmation.
    const queue=pm.photos.filter(p=>p.image&&p.image.local&&!p.image.blob);
    for(const [i,p] of queue.entries()){
      pmTell(t('pmUploadingN',{n:i+1,m:queue.length}),'working'); p.uploading=true; renderGrid();
      try{ await stageImage(p); p.uploading=false; }
      catch(error){
        p.uploading=false;
        p.error=error instanceof ApiError?(error.issues.length?error.issues.map(describeIssue).join(' '):(ERRORS[error.code]||ERRORS.SERVER_ERROR)):t('pmFailedUpload');
        pm.busy=false; renderGrid(); pmFail(error); return;
      }
    }
    if(queue.length) renderGrid();
    pmTell(t('pmSaving'),'working');
    try{
      const data=await api('/api/photos/save','POST',{ gallery:pm.gallery, sha:pm.sha, photos:payload(), confirmed:needsConfirm?true:undefined });
      if(data.unchanged){ pmTell(t('nothingToSave'),'info'); pm.busy=false; updateSummary(); return; }
      pm.lastSave={ commit:data.sha };
      // Saved: this is now the state to compare against.
      const fresh=await api('/api/photos?gallery='+pm.gallery,'GET').catch(()=>null);
      if(fresh) loadInto(fresh);
      pm.busy=false; updateSummary();
      void trackPhotos(data.sha);
    }catch(error){ pm.busy=false; updateSummary(); pmFail(error); }
  }
  /*
   * "Live" only when the official site is serving a build that contains this
   * exact commit (production), or — on the test branch — when the Edit Mode
   * build does ("updated in the test view"). A finished workflow is not proof.
   */
  async function trackPhotos(commit){
    const token=++pm.saveToken;
    pmTell(publishing==='production'?t('pmPublishing'):t('pmUpdating'),'working');
    for(let attempt=0; attempt<150; attempt++){
      await sleep(attempt<6?4000:6000);
      if(token!==pm.saveToken) return;
      let data; try{ data=await api('/api/status?sha='+encodeURIComponent(commit),'GET'); }catch{ continue; }
      if(token!==pm.saveToken) return;
      if(publishing==='production'){
        if(data.state==='failed'){ pmTell(t('pmFailed')+' — '+t('publishFailed'),'failed',true); return; }
        if(data.live===true){ pmTell(t('pmLive'),'published'); offerView(); return; }
        pmTell(data.state==='published'?t('pmUpdating'):t('pmPublishing'),'working');
      } else {
        if(data.preview==='ready'){ pmTell(t('pmUpdatedTest'),'published'); offerView(); return; }
        if(data.preview==='failed'){ pmTell(t('pmFailed')+' — '+t('updateFailed'),'failed',true); return; }
        pmTell(t('pmUpdating'),'working');
      }
      if(attempt===60) pmTell(t('pmSlow'),'working');
    }
    pmTell(t('pmSlow'),'info',true);
  }
  function offerView(){
    pm.reloadOnClose=true;
    if(!pm.viewBtn){ pm.viewBtn=button(t('pmViewPage'),()=>{ pm.el.close(); try{ sessionStorage.setItem('visual-updated','1'); }catch{} location.reload(); },'pm-view'); }
    pm.status.append(pm.viewBtn);
    if(!pm.el.open){ try{ sessionStorage.setItem('visual-updated','1'); }catch{} location.reload(); }
  }
`;
