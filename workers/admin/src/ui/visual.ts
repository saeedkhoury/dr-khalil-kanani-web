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
.visual-dialog{width:min(820px,calc(100vw - 24px));max-height:calc(100dvh - 24px);margin:auto;padding:0;border:1px solid #aac9d9;border-radius:14px;background:white;color:#183448;box-shadow:0 20px 60px #061f3d44}
.visual-dialog::backdrop{background:#071d2ab0}.visual-dialog-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:1rem;padding:1rem 1.2rem;background:white;border-bottom:1px solid #d5e1e7}.visual-dialog-head h2{font:700 1.25rem system-ui;margin:0;flex:1}.visual-dialog-main{flex:1 1 auto;min-height:0;padding:1.2rem;overflow-y:auto}.visual-dialog .visual-warning{padding:.7rem;background:#fff4d9;border-inline-start:4px solid #a36c00;font:500 .85rem/1.45 system-ui}
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

/* ── Dialog layout ────────────────────────────────────────────────────────
   Centred. The page's CSS reset sets margin:0 on every element, which pinned
   the dialog to a corner. The footer holds the result of the last action next
   to Save, so it is on screen however far down the doctor has scrolled. */
.visual-dialog[open]{display:flex;flex-direction:column}
.visual-dialog-foot{display:grid;gap:.4rem;padding:.7rem 1.2rem;border-top:1px solid #d5e1e7;background:#f7fbfd}
.visual-dialog-foot .visual-status{margin:0;min-height:1.4rem;color:#0c5283;font:600 .92rem/1.45 system-ui}
.visual-status[data-state=ok]{color:#0f6e3d}.visual-status[data-state=error]{color:#9c2a2a}.visual-status[data-state=info]{color:#26506b}
.visual-pub{margin:0;color:#26506b;font:500 .85rem/1.4 system-ui}.visual-pub[data-state=failed]{color:#9c2a2a}.visual-pub[data-state=published]{color:#0f6e3d}
.visual-errors ul{margin:0;padding-inline-start:1.2rem;max-height:9rem;overflow-y:auto}
.visual-errors li{margin:.15rem 0}
.visual-dialog button.visual-link{min-height:auto;margin:0;padding:.1rem 0;border:0;background:none;color:#9c2a2a;font:500 .88rem/1.4 system-ui;text-align:start;text-decoration:underline}
.visual-foot-actions{display:flex;justify-content:flex-end;gap:.4rem}
.visual-foot-actions button{margin:0!important;min-width:8rem}
.visual-dialog [aria-invalid=true]{border-color:#9c2a2a!important;outline:2px solid #f0c9c9;outline-offset:1px}
.visual-dialog button:focus-visible,.visual-dialog input:focus-visible,.visual-dialog textarea:focus-visible,.visual-dialog select:focus-visible{outline:3px solid #2195d2;outline-offset:2px}
.visual-dialog .visual-hint{margin:.4rem 0;color:#4a6274;font:500 .85rem/1.45 system-ui}
.visual-dialog .visual-inline-error{margin:.3rem 0;color:#9c2a2a;font:600 .85rem/1.45 system-ui}
.visual-dialog .visual-check{display:flex;align-items:flex-start;gap:.5rem;font-weight:600}
.visual-dialog .visual-check input{margin-top:.2rem!important}
.visual-dialog .visual-editor-heading{margin:1rem 0 .4rem;font:700 1.1rem system-ui}
.visual-dialog .visual-editor-heading:focus{outline:none}
.visual-badge{display:inline-block;margin-inline-start:.4rem;padding:.1rem .5rem;border-radius:999px;background:#eef2f5;color:#4a6274;font:600 .75rem system-ui;vertical-align:middle}
.visual-badge[data-state=published]{background:#e2f3ea;color:#0f6e3d}
.visual-tabs{display:flex;gap:.3rem;margin:1rem 0 .2rem;border-bottom:1px solid #d5e1e7}
.visual-dialog .visual-tabs button{margin:0 0 -1px;border-radius:6px 6px 0 0;border-bottom-color:transparent}
.visual-dialog .visual-tabs button[aria-selected=true]{background:#0c5283;color:white}
.visual-dialog .visual-pair{margin:.5rem 0;padding:.6rem;border:1px dashed #c9d9e3;border-radius:8px}
.visual-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:.8rem;margin:.6rem 0}
.visual-dialog .visual-photo-card{margin:0;padding:.7rem;border:1px solid #c9d9e3;border-radius:10px;background:white}
.visual-photo-top{display:flex;align-items:center;justify-content:space-between;gap:.4rem}
.visual-photo-frame{display:flex;align-items:center;justify-content:center;margin:.5rem 0;aspect-ratio:4/3;overflow:hidden;border-radius:8px;background:#eef4f8}
.visual-dialog .visual-photo-frame img{width:100%;height:100%;max-width:none;max-height:none;object-fit:cover}
.visual-photo-grid .visual-item.is-over,.visual-photo-grid .visual-item.is-over-after{box-shadow:none;outline:3px solid #0c5283}
.visual-dialog .visual-photo-alt{margin:.3rem 0;font:500 .88rem/1.4 system-ui;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.visual-dropzone{padding:1rem;border:2px dashed #7891a0;border-radius:10px;background:#f7fbfd;text-align:center}
.visual-dropzone.is-over{border-color:#0c5283;background:#e9f5fb}
.visual-dropzone p{margin:.3rem 0}
.visual-order-bar{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;padding:.5rem .7rem;border-radius:8px;background:#fff4d9;font:600 .9rem system-ui}
.visual-bar-reload button{background:white!important;color:#0c5283!important;font-weight:700!important}

/* ── On the page: the Edit tile at the end of a gallery, and per-card pencils ─ */
.visual-gallery-edit{display:flex}
.visual-gallery-edit .visual-edit-control{flex:1;flex-direction:column;justify-content:center;gap:.6rem;min-height:12rem;margin:0;border:2px dashed #0c5283;border-radius:var(--radius-media,16px);background:#f3f9fd;font-size:1rem}
.visual-gallery-edit .visual-edit-control svg{width:28px;height:28px}
.visual-gallery-empty{padding:1rem 0 0;color:#4a6274}
.visual-card-edit{position:relative;z-index:3;margin-top:.5rem}
.visual-work-note{align-self:center;max-width:14rem;padding:1rem;border:1px dashed #7891a0;border-radius:12px;color:#26506b;font:500 .9rem/1.5 system-ui}
html[data-visual-preview] .visual-gallery-edit,html[data-visual-preview] .visual-work-note,html[data-visual-preview] .visual-gallery-empty{display:none!important}

@media(max-width:600px){
  .visual-dialog{width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border:0;border-radius:0}
  .visual-dialog-head{padding:.6rem .8rem}
  .visual-dialog-foot{padding:.6rem .8rem calc(.6rem + env(safe-area-inset-bottom))}
  .visual-foot-actions button{flex:1}
  .visual-dialog button{min-height:44px}
  .visual-photo-grid{grid-template-columns:1fr}
}

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

export { VISUAL_CLIENT } from './visual-client.ts';
