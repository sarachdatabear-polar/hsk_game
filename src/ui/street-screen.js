// src/ui/street-screen.js
// DOM/canvas controller for the Lucky Cat Street screen: the decoration
// editor, the buy/upgrade preview panel, the project retention card, the
// living-resident canvas loop, and the street-focused shop shelf opened from
// it. Untested by design (DOM wiring), like main.js.
//
// Pure code move (2026-07-23): the Street feature arc grew main.js by ~1,000
// lines of street-specific wiring. AGENTS.md freezes main.js at its current
// scope — each new/extracted feature gets its own src/ui/<feature>-screen.js
// that main.js only mounts (see src/ui/friend-screen.js for the pattern this
// follows). Every main.js seam the moved code still needs — wallet/xp/shop
// state, the DOM `$` helper, analytics, navigation, the general shop
// renderer, shared canvas primitives — arrives via the deps object below;
// nothing here reaches back into main.js module scope directly.
import { t } from "../i18n.js";
import { CATALOG, SKIN_PALETTES, buy, upgradePrice } from "../shop.js";
import { levelForXp, accessoriesFor } from "../growth.js";
import { drawCat } from "../cat.js";
import { sprite } from "../sprites.js";
import { CONTENT_H } from "../sprite-draw.js";
import {
  makeStreetProject, normalizeStreetProject, remainingBucket,
  streetProjectProgress,
} from "../street-project.js";
import {
  streetResidentPose, streetResidentRoute, streetResidentScale,
} from "../street-resident.js";
import {
  WELCOME_ID, STREET_PLOTS, streetPieces, streetProgress,
  streetWorldMetrics, DECO_SPRITE_SCALE, defaultStreetLayout,
  normalizeStreetLayout, compatibleStreetPlots, firstFreeStreetPlot,
  unplacedStreetItems,
  placeStreetItem, storeStreetItem, autoArrangeStreet, migrateLegacyStreet,
  streetMeta, streetClass, STREET_LAYOUT_VERSION,
} from "../street.js";
import { newlyCompletedSets, completedSets, collectionView } from "../street-collection.js";
import { makeKeepsake, addKeepsake } from "../street-keepsakes.js";

export function createStreetScreen({
  $, store, analytics, show, renderShop, pushEdge, updateWalletChip, todayStr, tOr,
  shopViewedProducts, REDUCED_MOTION, openDialog, closeDialog,
  getWallet, setWallet, getXp, getCurrentScreen, getShopState, setShopState,
  roundRectOn, drawCoverImage, drawStarMark,
}) {
  let streetEdit = null;       // draft-only editor state; committed on Done
  let streetPreview = null;    // temporary shop preview projected into the scene
  let streetShopMode = false;  // focused decoration catalog opened from Street
  let streetReaction = null;   // lightweight tap reaction, never persisted
  let streetBannerTimer = 0;   // one-shot "set complete" banner, never persisted
  // Mirrors main.js's own #toast-pop element/CSS (index.html .toast-pop) —
  // reused rather than duplicated so main.js stays untouched (its seam here
  // is the deps object, and a banner isn't part of it). Two independent
  // timers targeting the same element is fine: main.js's toast() and this
  // one behave the same way it already documents — a later call just
  // replaces whatever is showing.
  function streetToast(msg){
    clearTimeout(streetBannerTimer);
    let el = document.getElementById("toast-pop");
    if(!el){
      el = document.createElement("div");
      el.id = "toast-pop";
      el.className = "toast-pop";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add("show"));
    streetBannerTimer = setTimeout(() => { el.classList.remove("show"); }, 2600);
  }
  // Grants exactly one "set" keepsake per newly-completed collectible set,
  // persisted through the same store-save path placements use (setShopState
  // -> store.set("shop",...) -> pushEdge, which marks the "shop" sync key
  // dirty). Called after a successful deco purchase, with the post-purchase
  // owned list. The keepsake's optional `word` is intentionally omitted:
  // deps exposes no mastered-word accessor, and the brief forbids plumbing
  // new learning/SRS coupling into this cosmetic-only module just to get one.
  function grantCompletedSets(ownedAfterPurchase){
    const layout = ensureStreetLayout();
    const fresh = newlyCompletedSets(ownedAfterPurchase, layout.setsCompleted);
    if(!fresh.length) return;
    let keepsakes = layout.keepsakes, setsCompleted = layout.setsCompleted;
    for(const setId of fresh){
      keepsakes = addKeepsake(keepsakes, makeKeepsake("set", todayStr(), { set: setId }));
      setsCompleted = [...setsCompleted, setId];
    }
    const granted = normalizeStreetLayout({ ...layout, keepsakes, setsCompleted }, ownedAfterPurchase);
    setShopState({ ...getShopState(), streetLayout: granted });
    store.set("shop", getShopState());
    pushEdge("purchase");
    // An item belongs to exactly one collectible set (street.js DECO_META),
    // so a single purchase can complete at most one set: fresh.length is
    // always <= 1 here, hence no banner queue is needed.
    streetToast(t("street.setComplete", { set: t("street.set." + fresh[0]) }));
  }

  /* ============================== Lucky Cat Street (home) ============================== */
  // Construction moment (scene composer): the most recent deco purchase/upgrade
  // pops in with a bounce + dust the next time the street is actually seen.
  // In-memory only — losing it on refresh just skips one animation.
  let streetReveal = null; // { id, start } — start stamps on first visible frame
  let streetResidentRaf = 0;
  let streetResidentScene = null;
  function revealPopScale(id){
    if(REDUCED_MOTION) return 1;
    if(!streetReveal || streetReveal.id !== id || !streetReveal.start) return 1;
    const t = Math.min(1, (performance.now() - streetReveal.start) / 700);
    // easeOutBack: overshoot ~12% then settle
    const s = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
    return Math.max(0.01, s);
  }
  function drawRevealDust(sc, x, py, du){
    if(REDUCED_MOTION) return;
    const t = (performance.now() - streetReveal.start) / 900;
    if(t >= 1) return;
    sc.save();
    sc.globalAlpha = 0.5 * (1 - t);
    sc.fillStyle = "#FBF5E8";
    for(const [dx, r] of [[-0.4, 0.16], [0.05, 0.22], [0.45, 0.14]]){
      sc.beginPath();
      sc.ellipse(x + dx*du, py - 4, du*r*(0.6 + t), du*r*0.6*(0.6 + t), 0, 0, Math.PI*2);
      sc.fill();
    }
    sc.restore();
  }
  function hasStreetLearningProgress(){ return !!store.get("streetWelcomeEarned",false) || !!getShopState().streetLayout?.welcomeOwned; }
  function earnStreetWelcome(){
    if(store.get("streetWelcomeEarned",false)) return;
    // local-only by design — a redundant echo of the synced shop.streetLayout.welcomeOwned,
    // deliberately NOT in SYNC_KEYS (merge.js).
    store.set("streetWelcomeEarned",true);
    const layout=normalizeStreetLayout({...ensureStreetLayout(),welcomeOwned:true},getShopState().owned);
    setShopState({...getShopState(),streetLayout:layout}); store.set("shop",getShopState());
  }
  function sameStreetLayout(a, b){ return JSON.stringify(a || null) === JSON.stringify(b || null); }
  function ensureStreetLayout(){
    const prior = getShopState().streetLayout;
    const welcomeOwned = !!prior?.welcomeOwned || hasStreetLearningProgress();
    // Bug fix (found while wiring Task 8's persistence check): this compared
    // prior.v against a literal 2, stale since the v3 streetLayout bump
    // (keepsakes/setsCompleted/name/savedLayouts/lastVisitDay). Every already-
    // v3 layout (i.e. essentially every real session) tripped the `else`
    // and ran migrateLegacyStreet — which rebuilds placements from scratch
    // and drops keepsakes/setsCompleted/name/savedLayouts back to defaults —
    // on every call. Comparing against the live constant (as merge.js and
    // migrations.js already do) fixes it for this and any future bump.
    let next = prior?.v === STREET_LAYOUT_VERSION
      ? normalizeStreetLayout({ ...prior, welcomeOwned }, getShopState().owned)
      : migrateLegacyStreet(getShopState().owned, { welcomeOwned });
    if(!sameStreetLayout(prior, next)){
      setShopState({ ...getShopState(), streetLayout: next });
      store.set("shop", getShopState());
    }
    return next;
  }
  function liveStreetLayout(){
    return normalizeStreetLayout(streetEdit?.layout || getShopState().streetLayout || defaultStreetLayout(), getShopState().owned);
  }
  function announceStreet(key, vars){
    const message = t(key, vars);
    $("#street-sr-status").textContent = "";
    requestAnimationFrame(() => { $("#street-sr-status").textContent = message; });
  }
  function streetCountBucket(n){ return n===0?"0":n<4?"1-3":n<10?"4-9":"10+"; }
  function enterStreet(previousScreen=""){
    const layout = ensureStreetLayout();
    const owned=getShopState().owned.length+(layout.welcomeOwned?1:0),placed=Object.keys(layout.placements).length;
    analytics.track("street_open",{
      source:streetPreview?"shop_preview":previousScreen==="shop"?"shop":"navigation",
      owned_bucket:streetCountBucket(owned), placed_bucket:streetCountBucket(placed),
    });
    renderStreet();
    // The earn-only lantern waits in storage until the player chooses its first
    // home. Opening the coach on the next frame keeps the route transition fast.
    if(!streetPreview && !streetEdit && layout.welcomeOwned && !layout.coachDone
        && unplacedStreetItems(getShopState().owned, layout).includes(WELCOME_ID)){
      requestAnimationFrame(() => {
        if(getCurrentScreen() === "street" && !streetPreview && !streetEdit) openStreetEditor(WELCOME_ID, true);
      });
    }
  }
  function previewScene(){
    if(!streetPreview) return null;
    const owned = getShopState().owned.includes(streetPreview.itemId)
      ? [...getShopState().owned] : [...getShopState().owned, streetPreview.itemId];
    const base = normalizeStreetLayout(getShopState().streetLayout, owned);
    const placements = { ...base.placements };
    for(const [plotId, id] of Object.entries(placements)) if(id === streetPreview.itemId) delete placements[plotId];
    // Previewing over an occupied plot is non-destructive: the displaced item
    // simply returns when preview closes. Normally an empty compatible plot is
    // selected because the grid has two spare homes.
    if(streetPreview.plotId){
      delete placements[streetPreview.plotId];
      placements[streetPreview.plotId] = streetPreview.itemId;
    }
    const layout = normalizeStreetLayout({ ...base, placements }, owned);
    const tiers = { ...(getShopState().tiers || {}), [streetPreview.itemId]: streetPreview.tier || 1 };
    return { owned, layout, tiers };
  }
  function plotGroundY(plot, h, gy){
    const laneY = plot.lane === "back" ? .66 : plot.lane === "mid" ? .83 : 1;
    return gy - h * (1 - laneY);
  }
  function validStreetPlotIds(selected, layout, preview=false){
    if(!selected) return new Set();
    return new Set(compatibleStreetPlots(selected,layout).filter(plot => preview
      || !sameStreetLayout(placeStreetItem(layout,getShopState().owned,selected,plot.id),layout)).map(plot=>plot.id));
  }
  function drawStreetPlotGrid(c, w, h, gy, m, layout){
    const selected = streetEdit?.selected || streetPreview?.itemId || null;
    const valid = validStreetPlotIds(selected,layout,!!streetPreview);
    for(const plot of STREET_PLOTS){
      const x = plot.x * w, y = plotGroundY(plot, h, gy);
      const compatible = valid.has(plot.id);
      c.save();
      c.fillStyle = compatible ? "rgba(255,214,95,.26)" : "rgba(251,245,232,.16)";
      c.strokeStyle = compatible ? "rgba(46,102,86,.72)" : "rgba(132,96,67,.32)";
      c.lineWidth = compatible ? 2 : 1;
      c.setLineDash([5,4]);
      c.beginPath(); c.ellipse(x, y + 2, m.unit*.44, m.unit*.12, 0, 0, Math.PI*2); c.fill(); c.stroke();
      c.restore();
    }
  }
  function drawStreetProjectBlueprint(c, target, p, x, py, du){
    const stage=target.progress.stage;
    const alpha=[.20,.34,.52,.72][stage]||.20;
    c.save();
    // The object becomes more tangible as the wallet crosses each third of its
    // price. It stays visibly blueprint-like until purchase/placement.
    c.globalAlpha=alpha;
    c.filter=stage>=3?"sepia(.2) saturate(1.25)":"grayscale(1) sepia(.75) hue-rotate(110deg) saturate(1.4)";
    if(stage>=2){
      c.shadowColor=stage>=3?"rgba(242,188,87,.82)":"rgba(76,160,154,.66)";
      c.shadowBlur=stage>=3?18:10;
    }
    drawStreetDeco(c,p.spriteId||p.id,x,py,du);
    c.restore();

    c.save();
    c.strokeStyle=stage>=3?"rgba(132,96,67,.86)":"rgba(46,102,86,.78)";
    c.fillStyle=stage>=3?"rgba(255,214,95,.22)":"rgba(168,216,209,.18)";
    c.lineWidth=Math.max(1.5,du*.025);
    c.setLineDash(stage>=3?[]:[6,4]);
    const bw=du*(stage>=1?1.12:.96), top=py-du*(stage>=2?1.42:1.18);
    c.fillRect(x-bw/2,top,bw,py-top);
    c.strokeRect(x-bw/2,top,bw,py-top);
    if(stage>=1){
      c.setLineDash([]);
      for(const dx of [-.58,.58]){
        c.beginPath(); c.moveTo(x+du*dx,py); c.lineTo(x+du*dx,top-du*.12); c.stroke();
      }
      c.beginPath(); c.moveTo(x-du*.66,top+du*.12); c.lineTo(x+du*.66,top+du*.12); c.stroke();
    }
    if(stage>=2){
      c.beginPath(); c.moveTo(x-du*.52,py-du*.22); c.lineTo(x+du*.52,top+du*.2); c.stroke();
    }
    c.restore();
  }
  function drawStreetBehavior(c, p, x, py, du){
    const active = streetReaction?.id === p.id && streetReaction.until > performance.now();
    const boost = active ? 1.8 : 1;
    c.save(); c.globalAlpha = .42 * boost; c.lineWidth = Math.max(1, du*.025);
    if(p.behavior === "light"){
      const glow = c.createRadialGradient(x, py-du*.72, 1, x, py-du*.72, du*.48*boost);
      glow.addColorStop(0,"rgba(255,224,120,.68)"); glow.addColorStop(1,"rgba(255,224,120,0)");
      c.fillStyle = glow; c.beginPath(); c.arc(x, py-du*.72, du*.48*boost, 0, Math.PI*2); c.fill();
    }else if(p.behavior === "water"){
      c.strokeStyle = "#7fd7ff";
      for(const k of [.28,.46]){ c.beginPath(); c.ellipse(x,py-du*.08,du*k*boost,du*.07*boost,0,0,Math.PI*2); c.stroke(); }
    }else if(p.behavior === "flutter"){
      c.strokeStyle = "#FBF5E8";
      for(const dx of [-.35,.35]){ c.beginPath(); c.moveTo(x+du*dx,py-du*.9); c.quadraticCurveTo(x+du*(dx+.12),py-du*1.05,x+du*(dx+.25),py-du*.96); c.stroke(); }
    }else if(p.behavior === "food"){
      c.strokeStyle = "#FBF5E8";
      for(const dx of [-.14,.1]){ c.beginPath(); c.moveTo(x+du*dx,py-du*.75); c.quadraticCurveTo(x+du*(dx-.12),py-du, x+du*(dx+.05),py-du*1.18); c.stroke(); }
    }else if(p.behavior === "celebrate"){
      c.fillStyle = "#F2BC57";
      for(const [dx,dy] of [[-.38,-.9],[.35,-1.05],[0,-1.22]]) drawStarMark(c,x+du*dx,py+du*dy,du*.055*boost);
    }
    c.restore();
  }
  function drawWelcomeAccent(c, x, py, du){
    // Keep the earn-only lantern distinct without a face-level text rectangle
    // that can visually merge with the resident as the cat walks past it.
    c.save();
    const glow=c.createRadialGradient(x,py-du*.82,1,x,py-du*.82,du*.46);
    glow.addColorStop(0,"rgba(255,229,155,.68)");
    glow.addColorStop(1,"rgba(255,229,155,0)");
    c.fillStyle=glow;
    c.beginPath(); c.arc(x,py-du*.82,du*.46,0,Math.PI*2); c.fill();
    c.fillStyle="#F2BC57";
    for(const [dx,dy,size] of [[0,-1.2,.085],[-.27,-.98,.045],[.27,-.96,.05]])
      drawStarMark(c,x+du*dx,py+du*dy,du*size);
    c.restore();
  }
  function streetItemLabel(id){
    if(id === WELCOME_ID) return t("street.welcomeLantern");
    const item = CATALOG.find(i => i.id === id);
    return tOr("item." + id, item?.name || id);
  }
  function streetMetaLabel(id){
    const meta = streetMeta(id);
    return meta ? t("street.meta", { size: t("street.size."+streetClass(id)), set: t("street.set."+meta.set), behavior: t("street.behavior."+meta.behavior) }) : "";
  }
  function showStreetItemInfo(id){
    const info = $("#street-info");
    const desc = tOr("item."+id+".desc", id === WELCOME_ID ? t("street.welcomeDesc") : "");
    info.replaceChildren();
    const name = document.createElement("b"); name.textContent = streetItemLabel(id);
    info.append(name, document.createTextNode(desc ? " — " + desc : ""));
    const meta = document.createElement("div");
    meta.textContent = "★".repeat((getShopState().tiers||{})[id]||1) + " · " + streetMetaLabel(id);
    info.appendChild(meta);
    info.hidden = false;
    streetReaction = { id, until: performance.now() + (REDUCED_MOTION ? 250 : 700) };
    analytics.track("street_item_interact", { behavior:streetMeta(id)?.behavior||"none", tier:(getShopState().tiers||{})[id]||1 });
    renderStreet();
    setTimeout(() => { if(getCurrentScreen() === "street" && streetReaction?.id === id){ streetReaction = null; renderStreet(); } }, REDUCED_MOTION ? 260 : 710);
  }
  function renderStreetHitLayer(pieces, layout, w, h, gy, m){
    const layer = $("#street-hit-layer");
    layer.replaceChildren();
    const selected = streetEdit?.selected || streetPreview?.itemId || null;
    if(streetEdit || streetPreview){
      const compatible = validStreetPlotIds(selected,layout,!!streetPreview);
      for(const plot of STREET_PLOTS){
        const btn = document.createElement("button");
        btn.className = "street-hit plot-hit " + (selected ? (compatible.has(plot.id) ? "compatible" : "incompatible") : "");
        btn.style.left = (plot.x*w) + "px"; btn.style.top = plotGroundY(plot,h,gy) + "px";
        btn.style.width = Math.max(44,m.unit*.9) + "px"; btn.style.height = Math.max(44,m.unit*.42) + "px";
        const occupant = layout.placements[plot.id];
        btn.setAttribute("aria-label", t("street.plotLabel", { size:t("street.size."+plot.size), item:occupant ? streetItemLabel(occupant) : t("street.emptyPlot") }));
        btn.disabled = !selected || !compatible.has(plot.id);
        btn.onclick = () => streetPreview ? selectStreetPreviewPlot(plot.id) : placeSelectedStreetItem(plot.id);
        layer.appendChild(btn);
      }
      return;
    }
    for(const p of pieces.filter(p => p.kind === "deco")){
      const btn = document.createElement("button");
      btn.className = "street-hit item-hit";
      const x = p.slot*w, py = gy-h*(1-(p.laneY ?? 1)), du=m.unit*(p.scale||1);
      btn.style.left=x+"px"; btn.style.top=(py-du*.58)+"px";
      btn.style.width=Math.max(44,du*.9)+"px"; btn.style.height=Math.max(44,du*1.05)+"px";
      btn.setAttribute("aria-label", t("street.itemLabel", { name:streetItemLabel(p.id), stars:"★".repeat(p.tier||1) }));
      btn.onclick=()=>showStreetItemInfo(p.id);
      layer.appendChild(btn);
    }
  }
  function drawStreetSceneBackground(c,w,h){
    const selected=getShopState().backdrop ? sprite("bg-"+getShopState().backdrop) : null;
    const defaultName=h/w>=.95 ? "bg-street-portrait" : "bg-street";
    const img=selected||sprite(defaultName);
    if(img){
      // Default Street art has a portrait-safe 4:3 composition. Purchased
      // themes remain wide and are center-cropped into the same diorama window.
      drawCoverImage(c,img,0,0,w,h);
    }else{
      paintStreetBase(c,w,h);
    }
    const groundWash=c.createLinearGradient(0,h*.64,0,h);
    groundWash.addColorStop(0,"rgba(251,245,232,0)");
    groundWash.addColorStop(1,"rgba(251,245,232,.14)");
    c.fillStyle=groundWash; c.fillRect(0,h*.64,w,h*.36);
  }
  function residentActivityTargets(pieces){
    return pieces.filter(p=>p.kind==="deco").map(p=>({
      x:p.slot,
      activity:p.behavior==="food"?"food"
        :p.behavior==="water"?"water"
        :p.behavior==="light"?"light"
        :p.behavior==="flutter"?"flutter"
        :p.behavior==="celebrate"?"celebrate":"admire",
    }));
  }
  function drawStreetResidentActivity(c,activity,x,gy,s,now,facing){
    if(!activity) return;
    const sway=Math.sin(now/320);
    const floor=gy-2;
    const r=Math.max(3,s*.11);
    c.save();
    c.lineCap="round"; c.lineJoin="round";
    if(activity==="water"){
      c.globalAlpha=.72; c.strokeStyle="#5DAADD"; c.lineWidth=1.6;
      for(const k of [.18,.31]){
        c.beginPath(); c.ellipse(x,floor,s*k,s*.045,0,0,Math.PI*2); c.stroke();
      }
      c.restore(); return;
    }
    if(activity==="build"){
      // A tiny real prop at the blueprint's feet replaces the old face-level
      // thought bubble. The slow rocking reads as playful helping.
      c.save(); c.translate(x,floor-s*.08); c.rotate(facing*(-.62+sway*.08));
      c.strokeStyle="#846043"; c.lineWidth=Math.max(2,s*.045);
      c.beginPath(); c.moveTo(0,0); c.lineTo(0,-s*.28); c.stroke();
      c.fillStyle="#F2BC57";
      roundRectOn(c,-s*.12,-s*.36,s*.24,s*.12,s*.035); c.fill();
      c.restore();
      c.globalAlpha=.45; c.fillStyle="#FBF5E8";
      for(const dx of [-.18,.17]){
        c.beginPath(); c.arc(x+s*dx,floor,s*.055,0,Math.PI*2); c.fill();
      }
    }else if(activity==="food"){
      c.fillStyle="#E69777";
      c.beginPath(); c.ellipse(x,floor-s*.04,s*.18,s*.065,0,0,Math.PI*2); c.fill();
      c.strokeStyle="#846043"; c.lineWidth=1.2;
      c.beginPath(); c.moveTo(x-s*.18,floor-s*.05); c.quadraticCurveTo(x,floor+s*.11,x+s*.18,floor-s*.05); c.stroke();
      c.globalAlpha=.55;
      for(const dx of [-.07,.07]){
        c.beginPath(); c.moveTo(x+s*dx,floor-s*.14);
        c.quadraticCurveTo(x+s*(dx-.05),floor-s*(.26+sway*.015),x+s*dx,floor-s*.34); c.stroke();
      }
    }else if(activity==="rest"){
      // A small flower at home keeps the pause expressive without floating text.
      c.strokeStyle="#2E6656"; c.lineWidth=1.5;
      c.beginPath(); c.moveTo(x,floor); c.quadraticCurveTo(x+s*.03,floor-s*.16,x+s*.01,floor-s*.27); c.stroke();
      c.fillStyle="#F2BC57";
      for(let i=0;i<5;i++){
        const a=i*Math.PI*2/5;
        c.beginPath(); c.arc(x+Math.cos(a)*r*.7,floor-s*.29+Math.sin(a)*r*.7,r*.46,0,Math.PI*2); c.fill();
      }
      c.fillStyle="#846043"; c.beginPath(); c.arc(x,floor-s*.29,r*.35,0,Math.PI*2); c.fill();
    }else if(activity==="flutter"){
      c.fillStyle="#E69777";
      c.beginPath(); c.ellipse(x-s*.09,floor-s*(.18+sway*.025),r*.72,r*.34,-.55,0,Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(x+s*.10,floor-s*(.29-sway*.025),r*.68,r*.32,.5,0,Math.PI*2); c.fill();
    }else if(activity==="light"){
      const glow=c.createRadialGradient(x,floor,1,x,floor,s*.28);
      glow.addColorStop(0,"rgba(255,214,95,.96)"); glow.addColorStop(1,"rgba(255,214,95,0)");
      c.fillStyle=glow; c.beginPath(); c.ellipse(x,floor,s*.28,s*.08,0,0,Math.PI*2); c.fill();
      c.fillStyle="#F2BC57";
      drawStarMark(c,x+s*.12,floor-s*(.22+sway*.02),r*.55);
    }else{
      c.fillStyle=activity==="celebrate"?"#F2BC57":"#E69777";
      for(const [dx,dy,k] of [[0,-.25,.58],[-.16,-.12,.38],[.17,-.1,.4]])
        drawStarMark(c,x+s*dx,floor+s*dy,r*k);
    }
    c.restore();
  }
  function drawStreetResidentFrame(now,reducedMotion=false){
    const scene=streetResidentScene;
    if(!scene) return;
    const {canvas,w,h,dpr,gy,m,route}=scene;
    const c=canvas.getContext("2d");
    c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,w,h);
    const pose=streetResidentPose(now,route,reducedMotion);
    const x=pose.x*w, groundY=gy+4;
    const scale=streetResidentScale(m.unit);
    // The Street resident uses the same authored sheets as Battle, but plays
    // them more slowly so the walk reads as a small toddle rather than a run.
    const catTime=now*.68;
    const activityX=Number.isFinite(pose.activityX)?pose.activityX*w:x;
    drawStreetResidentActivity(c,pose.activity,activityX,groundY,CONTENT_H*scale,now,pose.facing);
    drawContactShadow(c,x,groundY,CONTENT_H*scale*.82);
    const hasKitten=accessoriesFor(levelForXp(getXp())).includes("kitten");
    c.save();
    if(pose.facing<0){ c.translate(x,0); c.scale(-1,1); c.translate(-x,0); }
    drawCat(c,x,groundY,catTime,pose.state,SKIN_PALETTES[getShopState().skin],scale,[],false);
    c.restore();
    if(hasKitten){
      const kittenX=x-pose.facing*CONTENT_H*scale*.64;
      c.save();
      if(pose.facing<0){ c.translate(kittenX,0); c.scale(-1,1); c.translate(-kittenX,0); }
      drawCat(c,kittenX,groundY+1,catTime+180,pose.state,SKIN_PALETTES[getShopState().skin],scale*.48,[],false);
      c.restore();
    }
  }
  function streetResidentLoop(now){
    streetResidentRaf=0;
    if(getCurrentScreen()!=="street"||!streetResidentScene||REDUCED_MOTION||streetEdit||streetPreview) return;
    drawStreetResidentFrame(now,false);
    streetResidentRaf=requestAnimationFrame(streetResidentLoop);
  }
  function renderStreetResidentLayer(w,h,gy,m,dpr,project,pieces){
    const canvas=$("#street-resident-cv");
    if(!canvas) return;
    canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
    canvas.style.width=w+"px"; canvas.style.height=h+"px";
    const projectPlot=project&&STREET_PLOTS.find(p=>p.id===project.plotId);
    streetResidentScene={
      canvas,w,h,dpr,gy,m,
      route:streetResidentRoute({
        project:projectPlot?{x:projectPlot.x,activity:"build"}:null,
        decorations:residentActivityTargets(pieces),
      }),
    };
    if(REDUCED_MOTION||streetEdit||streetPreview){
      if(streetResidentRaf){ cancelAnimationFrame(streetResidentRaf); streetResidentRaf=0; }
      drawStreetResidentFrame(0,true);
    }else{
      drawStreetResidentFrame(performance.now(),false);
      if(!streetResidentRaf) streetResidentRaf=requestAnimationFrame(streetResidentLoop);
    }
  }
  function renderStreet(){
    const scv = $("#street-cv"), world = $("#street-world"), scroll = $("#street-scroll");
    if(!scv || !world || !scroll || !world.clientHeight || !scroll.clientWidth) return;
    const h = world.clientHeight, m = streetWorldMetrics(scroll.clientWidth, h), w = m.worldW;
    world.style.width = w + "px";
    const dpr = Math.min(2, window.devicePixelRatio||1);
    scv.width = Math.round(w*dpr); scv.height = Math.round(h*dpr);
    scv.style.width=w+"px"; scv.style.height=h+"px";
    const sc = scv.getContext("2d");
    sc.setTransform(dpr,0,0,dpr,0,0); sc.clearRect(0,0,w,h);
    drawStreetSceneBackground(sc,w,h);
    // Keep the authored front ground comfortably inside the diorama so feet,
    // props, shadows, and the editor's 44px plot targets are never clipped.
    const gy=h-24, preview=previewScene();
    const owned=preview?.owned || getShopState().owned;
    const layout=preview?.layout || liveStreetLayout();
    const tiers=preview?.tiers || getShopState().tiers || {};
    const pieces=streetPieces(levelForXp(getXp()),owned,tiers,layout);
    const completeSetIds=new Set(completedSets(owned));
    const project=!streetEdit&&!streetPreview ? activeStreetProject(getWallet(),layout) : null;
    if(streetEdit || streetPreview) drawStreetPlotGrid(sc,w,h,gy,m,layout);
    if(streetReveal && !streetReveal.start && owned.includes(streetReveal.id)) streetReveal.start=performance.now();
    for(const p of pieces){
      const x=p.slot*w, py=gy-h*(1-(p.laneY??1));
      if(p.kind==="building"){
        const du=m.unit*(p.scale||3);
        drawStreetLandmark(sc,p.id,x,py,du);
      }else{
        const pop=revealPopScale(p.id), du=m.unit*(p.scale||1)*pop;
        drawStreetBehavior(sc,p,x,py,du);
        // Completed-set glow: layer the existing celebrate FX on top of a
        // piece's own behavior (never replace it — a lantern still glows
        // "light", it just also sparkles) when its set is fully owned. Reuses
        // drawStreetBehavior's own celebrate branch; no new draw code.
        if(streetMeta(p.id) && completeSetIds.has(streetMeta(p.id).set)) drawStreetBehavior(sc,{...p,behavior:"celebrate"},x,py,du);
        drawContactShadow(sc,x,py,du); drawTieredDeco(sc,p,x,py,du);
        if(p.id===WELCOME_ID) drawWelcomeAccent(sc,x,py,du);
        if(streetReveal?.id===p.id && streetReveal.start) drawRevealDust(sc,x,py,du);
      }
    }
    if(project){
      const p=streetProjectPiece(project,layout);
      if(p){
        const x=p.slot*w, py=gy-h*(1-(p.laneY??1)), du=m.unit*(p.scale||1);
        drawStreetProjectBlueprint(sc,project,p,x,py,du);
      }
    }
    renderStreetResidentLayer(w,h,gy,m,dpr,project,pieces);
    renderStreetHitLayer(pieces,layout,w,h,gy,m);
    renderStreetEditor(); renderStreetPreviewPanel();
    renderStreetProjectCard(project);
    $("#street-wallet").textContent=t("shop.coins",{coins:getWallet().toLocaleString()});
    const prog=streetProgress(levelForXp(getXp()));
    const placed=Object.keys(layout.placements).length;
    const stored=unplacedStreetItems(getShopState().owned,layout).length;
    $("#street-caption").textContent=streetPreview ? t("street.previewCaption")
      : streetEdit ? t("street.editCaption",{placed,stored})
      : placed===0 ? t("street.captionReady",{buildings:prog.unlocked})
      : t("street.captionSummary",{placed,stored,buildings:prog.unlocked});
    if(streetReveal && owned.includes(streetReveal.id)){
      $("#street-caption").textContent=t("street.captionNew",{name:streetItemLabel(streetReveal.id)});
      if(performance.now()-streetReveal.start>900) streetReveal=null;
      else requestAnimationFrame(()=>{ if(getCurrentScreen()==="street") renderStreet(); else streetReveal=null; });
    }
  }
  function streetDraftApply(next, messageKey, vars){
    if(!streetEdit || sameStreetLayout(next, streetEdit.layout)){
      if(messageKey) announceStreet("street.noMove");
      return false;
    }
    streetEdit.history.push(streetEdit.layout);
    if(streetEdit.history.length>10) streetEdit.history.shift();
    streetEdit.layout=next; streetEdit.actions++;
    if(messageKey) announceStreet(messageKey,vars);
    renderStreet();
    return true;
  }
  function openStreetEditor(selected="", coaching=false, initialPlot=null){
    const base=ensureStreetLayout();
    streetPreview=null;
    streetEdit={
      before:base, layout:base, history:[], selected:selected||null,
      filter:"all", coaching:!!coaching, actions:0, usedAuto:false,
    };
    if(initialPlot && selected){
      const placed=placeStreetItem(base,getShopState().owned,selected,initialPlot);
      if(!sameStreetLayout(placed,base)) streetEdit.layout=placed;
    }
    analytics.track("street_decorate_start", {
      owned_bucket:streetCountBucket(getShopState().owned.length+(base.welcomeOwned?1:0)),
      placed_bucket:streetCountBucket(Object.keys(base.placements).length),
    });
    renderStreet();
    if(selected){
      const plotId=Object.keys(streetEdit.layout.placements).find(id=>streetEdit.layout.placements[id]===selected);
      if(plotId) scrollStreetToPlot(plotId);
    }
  }
  function placeSelectedStreetItem(plotId){
    if(!streetEdit?.selected) return;
    const next=placeStreetItem(streetEdit.layout,getShopState().owned,streetEdit.selected,plotId);
    streetDraftApply(next,"street.placedAnnouncement",{name:streetItemLabel(streetEdit.selected)});
  }
  function storeSelectedStreetItem(){
    if(!streetEdit?.selected) return;
    const next=storeStreetItem(streetEdit.layout,getShopState().owned,streetEdit.selected);
    streetDraftApply(next,"street.storedAnnouncement",{name:streetItemLabel(streetEdit.selected)});
  }
  function undoStreetEdit(){
    if(!streetEdit?.history.length) return;
    streetEdit.layout=streetEdit.history.pop(); streetEdit.actions++;
    announceStreet("street.undoAnnouncement"); renderStreet();
  }
  function autoArrangeStreetEdit(){
    if(!streetEdit) return;
    streetEdit.usedAuto=true;
    streetDraftApply(autoArrangeStreet(getShopState().owned,streetEdit.layout),"street.autoAnnouncement");
  }
  function finishStreetEdit(){
    if(!streetEdit) return;
    const unplaced=unplacedStreetItems(getShopState().owned,streetEdit.layout);
    if(streetEdit.coaching && unplaced.includes(WELCOME_ID)) return;
    const actions=streetEdit.actions;
    const layout=normalizeStreetLayout({ ...streetEdit.layout, coachDone:streetEdit.layout.coachDone || streetEdit.coaching },getShopState().owned);
    setShopState({...getShopState(),streetLayout:layout}); store.set("shop",getShopState()); pushEdge("hide");
    analytics.track("street_decorate_complete",{ actions_bucket:actions===0?"0":actions<4?"1-3":"4+", used_auto_arrange:streetEdit.usedAuto });
    streetEdit=null; announceStreet("street.savedAnnouncement"); renderStreet();
  }
  function cancelStreetEdit(){
    if(!streetEdit) return;
    if(streetEdit.coaching){
      // Skip gives the gift a sensible home and permanently dismisses the coach.
      const arranged=autoArrangeStreet(getShopState().owned,streetEdit.layout);
      setShopState({...getShopState(),streetLayout:normalizeStreetLayout({...arranged,coachDone:true},getShopState().owned)});
      store.set("shop",getShopState()); pushEdge("hide");
    }
    streetEdit=null; renderStreet();
  }
  function renderStreetEditor(){
    const editor=$("#street-editor"), actions=$("#street-actions"), info=$("#street-info");
    editor.hidden=!streetEdit; actions.hidden=!!streetEdit||!!streetPreview;
    if(streetEdit||streetPreview) info.hidden=true;
    if(!streetEdit) return;
    const coach=$("#street-coach"); coach.hidden=!streetEdit.coaching;
    if(streetEdit.coaching) coach.textContent=streetEdit.selected
      ? t("street.coachPlace",{name:streetItemLabel(streetEdit.selected)}) : t("street.coachSelect");
    $("#street-undo").disabled=!streetEdit.history.length;
    const selectedPlot=streetEdit.selected && Object.keys(streetEdit.layout.placements).find(id=>streetEdit.layout.placements[id]===streetEdit.selected);
    $("#street-store").disabled=!selectedPlot;
    $("#street-cancel").textContent=t(streetEdit.coaching?"street.skip":"common.cancel");
    $("#street-done").disabled=streetEdit.coaching && unplacedStreetItems(getShopState().owned,streetEdit.layout).includes(WELCOME_ID);
    document.querySelectorAll("[data-street-filter]").forEach(btn=>{
      const on=btn.dataset.streetFilter===streetEdit.filter; btn.classList.toggle("on",on); btn.setAttribute("aria-pressed",String(on));
    });
    const box=$("#street-inventory"); box.replaceChildren();
    const all=[...getShopState().owned]; if(streetEdit.layout.welcomeOwned) all.push(WELCOME_ID);
    const placed=new Set(Object.values(streetEdit.layout.placements));
    const visible=all.filter(id=>streetEdit.filter==="all"||(streetEdit.filter==="placed")===placed.has(id));
    if(!visible.length){
      const empty=document.createElement("div"); empty.className="street-inventory-empty"; empty.textContent=t("street.inventoryEmpty"); box.appendChild(empty);
    }
    for(const id of visible){
      const btn=document.createElement("button"); btn.className="street-inventory-item"+(streetEdit.selected===id?" on":"");
      btn.setAttribute("role","listitem"); btn.setAttribute("aria-pressed",String(streetEdit.selected===id));
      const img=document.createElement("img"); img.src="assets/deco-"+(streetMeta(id)?.spriteId||id)+".png"; img.alt="";
      const label=document.createElement("span"); label.textContent=streetItemLabel(id);
      const status=document.createElement("small"); status.textContent=t(placed.has(id)?"street.placed":"street.stored");
      btn.append(img,label,status); btn.onclick=()=>{
        streetEdit.selected=id;
        const count=validStreetPlotIds(id,streetEdit.layout,false).size;
        announceStreet("street.selectedAnnouncement",{name:streetItemLabel(id),count}); renderStreet();
      };
      box.appendChild(btn);
    }
  }
  function firstPreviewPlot(itemId, layout){
    const existing=Object.keys(layout.placements).find(plotId=>layout.placements[plotId]===itemId);
    if(existing) return existing;
    const candidates=compatibleStreetPlots(itemId,layout);
    return candidates.find(p=>!layout.placements[p.id]&&p.size===streetClass(itemId))?.id
      || candidates.find(p=>!layout.placements[p.id])?.id || candidates[0]?.id || null;
  }
  function activeStreetProject(walletValue=getWallet(), layout=getShopState().streetLayout){
    const project=normalizeStreetProject(getShopState().streetProject,getShopState().owned);
    const item=CATALOG.find(i=>i.id===project.itemId&&i.type==="deco");
    if(!item) return null;
    const base=normalizeStreetLayout(layout,getShopState().owned);
    const candidates=compatibleStreetPlots(item.id,base);
    const plotId=candidates.some(p=>p.id===project.plotId)
      ? project.plotId : firstPreviewPlot(item.id,base);
    if(!plotId) return null;
    return {
      project:{...project,plotId},
      item,
      plotId,
      progress:streetProjectProgress(project,item,walletValue),
    };
  }
  function streetProjectPiece(target, layout){
    if(!target) return null;
    const owned=[...getShopState().owned,target.item.id];
    const base=normalizeStreetLayout(layout,owned);
    const placements={...base.placements};
    for(const [plotId,id] of Object.entries(placements)) if(id===target.item.id) delete placements[plotId];
    delete placements[target.plotId];
    placements[target.plotId]=target.item.id;
    const projectLayout=normalizeStreetLayout({...base,placements},owned);
    return streetPieces(levelForXp(getXp()),owned,{...(getShopState().tiers||{}),[target.item.id]:1},projectLayout)
      .find(p=>p.kind==="deco"&&p.id===target.item.id)||null;
  }
  function setProjectMeter(el, progress, label){
    if(!el) return;
    el.classList.toggle("ready",progress.ready);
    el.setAttribute("aria-valuenow",String(progress.pct));
    el.setAttribute("aria-valuetext",label);
    const fill=el.querySelector("i");
    if(fill) fill.style.width=progress.pct+"%";
  }
  function renderStreetProjectCard(target){
    const card=$("#street-project");
    card.hidden=!target;
    if(!target) return;
    const progress=target.progress;
    const primary=progress.ready
      ? t("street.projectReady")
      : t("street.projectProgress",{pct:progress.pct,coins:progress.remaining.toLocaleString()});
    const status=primary+" · "+t("street.projectReserved");
    $("#street-project-name").textContent=streetItemLabel(target.item.id);
    $("#street-project-status").textContent=status;
    const meter=$("#street-project-meter");
    setProjectMeter(meter,progress,t("street.projectBlueprintLabel",{
      name:streetItemLabel(target.item.id),pct:progress.pct,
    }));
    const build=$("#street-project-build");
    build.disabled=!progress.ready;
    build.onclick=()=>openStreetPreview(target.item.id,"street_project",target.plotId);
  }
  function selectStreetProjectFromPreview(){
    if(!streetPreview) return;
    const item=CATALOG.find(i=>i.id===streetPreview.itemId&&i.type==="deco");
    if(!item||getShopState().owned.includes(item.id)) return;
    const project=makeStreetProject(item.id,streetPreview.plotId||"");
    setShopState({...getShopState(),streetProject:project});
    store.set("shop",getShopState());
    pushEdge("hide");
    analytics.track("street_project_select",{
      item_id:item.id,source:streetPreview.source||"street_preview",
      reserved:!!(item.pool||item.season),
    });
    const plotId=project.plotId;
    streetPreview=null;
    announceStreet("street.projectSelectedAnnouncement",{name:streetItemLabel(item.id)});
    renderStreet();
    if(plotId) scrollStreetToPlot(plotId);
  }
  function renderStreetProjectResults(beforeWallet,afterWallet){
    const target=activeStreetProject(afterWallet,getShopState().streetLayout);
    const card=$("#r-project");
    card.hidden=!target;
    if(!target) return;
    const progress=streetProjectProgress(target.project,target.item,beforeWallet,afterWallet);
    const earned=progress.gained.toLocaleString();
    let status;
    if(progress.ready){
      status=progress.gained
        ? t("results.projectReadyEarned",{earned})
        : t("results.projectReady");
    }else{
      status=progress.gained
        ? t("results.projectProgress",{earned,remaining:progress.remaining.toLocaleString()})
        : t("results.projectNoGain",{remaining:progress.remaining.toLocaleString()});
    }
    $("#r-project-name").textContent=streetItemLabel(target.item.id);
    $("#r-project-status").textContent=status;
    const icon=$("#r-project-icon");
    icon.src="assets/deco-"+(streetMeta(target.item.id)?.spriteId||target.item.id)+".png";
    const meter=$("#r-project-meter");
    setProjectMeter(meter,progress,t("street.projectBlueprintLabel",{
      name:streetItemLabel(target.item.id),pct:progress.pct,
    }));
    const action=$("#r-project-action");
    action.textContent=t(progress.ready?"results.buildNow":"results.viewProject");
    action.onclick=()=>{
      if(progress.ready) openStreetPreview(target.item.id,"results_project",target.plotId);
      else { show("street"); scrollStreetToPlot(target.plotId); }
    };
    analytics.track("street_project_progress",{
      remaining_bucket:remainingBucket(progress.remaining),
      ready:progress.ready,
    });
  }
  function openStreetPreview(itemId,source="street_shop",initialPlot=null){
    const item=CATALOG.find(i=>i.id===itemId&&i.type==="deco"); if(!item) return;
    const layout=ensureStreetLayout();
    const requested=initialPlot&&compatibleStreetPlots(itemId,layout).some(p=>p.id===initialPlot)
      ? initialPlot : null;
    streetEdit=null;
    streetPreview={ itemId, plotId:requested||firstPreviewPlot(itemId,layout), tier:(getShopState().tiers||{})[itemId]||1, source };
    analytics.track("street_preview",{item_id:itemId,source});
    show("street");
    if(streetPreview.plotId) scrollStreetToPlot(streetPreview.plotId);
  }
  function selectStreetPreviewPlot(plotId){
    if(!streetPreview||!compatibleStreetPlots(streetPreview.itemId,liveStreetLayout()).some(p=>p.id===plotId)) return;
    streetPreview.plotId=plotId; renderStreet(); scrollStreetToPlot(plotId);
  }
  function closeStreetPreview(){
    const stayOnStreet=streetPreview?.source==="street_project"||streetPreview?.source==="results_project";
    streetPreview=null;
    if(stayOnStreet){ renderStreet(); return; }
    streetShopMode=true; renderShop(); show("shop");
  }
  function buyStreetPreview(){
    if(!streetPreview) return;
    const item=CATALOG.find(i=>i.id===streetPreview.itemId); if(!item) return;
    const wasOwned=getShopState().owned.includes(item.id);
    const wasProject=getShopState().streetProject?.itemId===item.id;
    const source=streetPreview.source||"street_preview";
    // Purchase is atomic (wallet + ownership together, below); placement is a
    // separate, best-effort follow-up. Honor the plot the player highlighted
    // in preview when it's actually free; otherwise fall back to the first
    // free compatible plot; otherwise place nothing (Buy to Inventory). Never
    // target an occupied plot.
    const layoutForPurchase=ensureStreetLayout();
    const chosenPlot=streetPreview.plotId;
    const freeCompatible=wasOwned ? [] : compatibleStreetPlots(item.id,layoutForPurchase,{includeOccupied:false});
    const plotId=wasOwned ? null
      : (chosenPlot && freeCompatible.some(p=>p.id===chosenPlot) ? chosenPlot : firstFreeStreetPlot(item.id,layoutForPurchase));
    const r=buy(getWallet(),getShopState(),item.id,todayStr());
    if(!r.ok){ announceStreet("street.notEnough"); return; }
    setWallet(r.wallet); setShopState(r.shop); store.set("wallet",getWallet()); store.set("shop",getShopState()); pushEdge("purchase"); updateWalletChip();
    analytics.track("street_purchase",{item_id:item.id,source,placed_immediately:!wasOwned&&!!plotId});
    if(wasProject&&!wasOwned) analytics.track("street_project_complete",{item_id:item.id,source});
    streetReveal={id:item.id,start:0};
    if(!wasOwned){
      grantCompletedSets(getShopState().owned);
      streetPreview=null; openStreetEditor(item.id,false,plotId);
      announceStreet("street.purchaseAnnouncement",{name:streetItemLabel(item.id)});
    }else{
      streetPreview.tier=(getShopState().tiers||{})[item.id]||1; renderStreet();
      announceStreet("street.upgradeAnnouncement",{name:streetItemLabel(item.id),stars:"★".repeat(streetPreview.tier)});
    }
  }
  function renderStreetPreviewPanel(){
    const panel=$("#street-preview-panel"); panel.hidden=!streetPreview;
    if(!streetPreview) return;
    const item=CATALOG.find(i=>i.id===streetPreview.itemId); if(!item) return;
    $("#street-preview-name").textContent=streetItemLabel(item.id);
    $("#street-preview-desc").textContent=tOr("item."+item.id+".desc","");
    $("#street-preview-meta").textContent=streetMetaLabel(item.id);
    const back=$("#street-preview-back");
    back.textContent=t(streetPreview.source==="street_project"||streetPreview.source==="results_project"
      ?"common.backStreet":"street.backToShop");
    document.querySelectorAll("[data-preview-tier]").forEach(btn=>{
      const n=+btn.dataset.previewTier,on=n===streetPreview.tier; btn.classList.toggle("on",on); btn.setAttribute("aria-pressed",String(on));
      btn.onclick=()=>{streetPreview.tier=n;renderStreet();};
    });
    const owned=getShopState().owned.includes(item.id), tier=(getShopState().tiers||{})[item.id]||1, buyBtn=$("#street-preview-buy");
    const projectBtn=$("#street-preview-project");
    const isProject=getShopState().streetProject?.itemId===item.id;
    projectBtn.hidden=owned;
    projectBtn.disabled=isProject;
    projectBtn.textContent=t(isProject?"street.currentProject":"street.makeProject");
    projectBtn.onclick=selectStreetProjectFromPreview;
    const hint=$("#street-preview-hint");
    hint.hidden=true;
    if(!owned){
      // Buy & Place vs. Buy to Inventory hinges on whether a compatible plot
      // is actually free right now — never the occupied fallback used for
      // preview positioning (that one just visualizes a swap-in-place).
      const hasFreePlot=!!firstFreeStreetPlot(item.id,liveStreetLayout());
      buyBtn.textContent=hasFreePlot
        ? t("street.buyAndPlace",{coins:item.price.toLocaleString()})
        : t("street.buyToInventory",{coins:item.price.toLocaleString()});
      buyBtn.disabled=getWallet()<item.price; buyBtn.onclick=buyStreetPreview;
      if(!hasFreePlot){ hint.hidden=false; hint.textContent=t("street.buyToInventoryHint"); }
    }else if(tier<item.maxTier){
      const price=upgradePrice(item,tier); buyBtn.textContent=t("shop.upgrade",{stars:"★".repeat(tier+1),coins:price.toLocaleString()}); buyBtn.disabled=getWallet()<price; buyBtn.onclick=buyStreetPreview;
    }else{
      buyBtn.textContent=t("street.placeIt"); buyBtn.disabled=false; buyBtn.onclick=()=>{const id=streetPreview.itemId,plot=streetPreview.plotId;streetPreview=null;openStreetEditor(id,false,plot);};
    }
  }
  function scrollStreetToPlot(plotId){
    const plot=STREET_PLOTS.find(p=>p.id===plotId); if(!plot) return;
    requestAnimationFrame(()=>{
      $("#street-stage")?.scrollIntoView({
        block:"nearest", behavior:REDUCED_MOTION?"auto":"smooth",
      });
    });
  }
  // Collection book (Task 9): a read-only view over collectionView() (pure,
  // src/street-collection.js). No purchases happen here — tapping an unowned
  // item closes the book and routes into the existing Street Shop preview
  // (openStreetPreview), the same buy/upgrade flow every other entry point
  // (project card, inventory, catalog) already uses.
  function closeStreetCollection(){ closeDialog($("#street-collection")); }
  function collectionItemEl(item){
    const spriteId = streetMeta(item.id)?.spriteId || item.id;
    const el = document.createElement(item.owned ? "div" : "button");
    el.className = "street-collection-item" + (item.owned ? "" : " locked");
    if(!item.owned){
      el.type = "button";
      el.setAttribute("aria-label", streetItemLabel(item.id) + " — " + t("street.collectionLocked"));
      el.onclick = () => { closeStreetCollection(); openStreetPreview(item.id, "street_collection"); };
    }
    const img = document.createElement("img");
    img.src = "assets/deco-" + spriteId + ".png"; img.alt = "";
    const name = document.createElement("span"); name.textContent = streetItemLabel(item.id);
    const status = document.createElement("small");
    status.textContent = item.owned ? "★".repeat(item.tier) : t("shop.coins", { coins: item.price.toLocaleString() });
    el.append(img, name, status);
    return el;
  }
  function renderStreetCollection(){
    const panel = $("#street-collection-panel");
    panel.replaceChildren();
    const sections = collectionView(getShopState().owned, getShopState().tiers || {});
    if(!sections.length || sections.every(s => !s.items.length)){
      const empty = document.createElement("div");
      empty.className = "street-inventory-empty";
      empty.textContent = t("street.collectionEmpty");
      panel.appendChild(empty);
      return;
    }
    for(const section of sections){
      const wrap = document.createElement("section");
      wrap.className = "street-collection-set";
      const head = document.createElement("div");
      head.className = "street-collection-head";
      const title = document.createElement("b");
      title.textContent = t("street.collectionSetHeader", {
        name: t("street.set." + section.set),
        owned: section.items.filter(i => i.owned).length,
        total: section.items.length,
      });
      head.appendChild(title);
      if(section.complete){
        const badge = document.createElement("span");
        badge.className = "street-collection-complete";
        badge.textContent = t("street.collectionComplete");
        head.appendChild(badge);
      }
      wrap.appendChild(head);
      const grid = document.createElement("div");
      grid.className = "street-collection-grid";
      if(!section.items.length){
        const empty = document.createElement("div");
        empty.className = "street-inventory-empty";
        empty.textContent = t("street.collectionEmpty");
        grid.appendChild(empty);
      }
      for(const item of section.items) grid.appendChild(collectionItemEl(item));
      wrap.appendChild(grid);
      panel.appendChild(wrap);
    }
  }
  function openStreetCollection(){
    renderStreetCollection();
    openDialog($("#street-collection"), $("#street-collection-close"), closeStreetCollection);
  }
  function openStreetShop(){
    streetShopMode=true; analytics.track("store_open"); shopViewedProducts.clear();
    const back=$("#shop-back"); back.dataset.go="street"; back.textContent=t("common.backStreet");
    renderShop(); show("shop");
  }
  $("#street-decorate-btn").onclick=()=>openStreetEditor();
  $("#street-shop-btn").onclick=openStreetShop;
  $("#street-collection-btn").onclick=openStreetCollection;
  $("#street-collection-close").onclick=closeStreetCollection;
  $("#street-collection").addEventListener("click", e=>{ if(e.target.id === "street-collection") closeStreetCollection(); });
  $("#street-project-change").onclick=openStreetShop;
  $("#shop-view-street").onclick=()=>{streetPreview=null;show("street");};
  $("#street-undo").onclick=undoStreetEdit;
  $("#street-store").onclick=storeSelectedStreetItem;
  $("#street-auto").onclick=autoArrangeStreetEdit;
  $("#street-cancel").onclick=cancelStreetEdit;
  $("#street-done").onclick=finishStreetEdit;
  $("#street-filters").onclick=e=>{const btn=e.target.closest("[data-street-filter]");if(btn&&streetEdit){streetEdit.filter=btn.dataset.streetFilter;renderStreet();}};
  $("#street-preview-close").onclick=closeStreetPreview;
  $("#street-preview-back").onclick=closeStreetPreview;
  $("#street-preview-project").onclick=selectStreetProjectFromPreview;
  window.addEventListener("resize",()=>{if(getCurrentScreen()==="street")requestAnimationFrame(renderStreet);});
  function paintStreetBase(c, w, h){
    // Warm-daylight village street: cream/sky gradient, soft green hills, sun
    // upper-left, sand road along the bottom fifth. Deterministic (fixed
    // positions, no Math.random) so it matches the bg-street.png art hook.
    const sky = c.createLinearGradient(0,0,0,h);
    sky.addColorStop(0, "#5DAADD"); sky.addColorStop(.55, "#BFE0F2"); sky.addColorStop(1, "#FBF5E8");
    c.fillStyle = sky; c.fillRect(0,0,w,h);

    // sun disc, upper-left (project light rule), with a soft outer glow
    c.fillStyle = "rgba(242,188,87,.32)";
    c.beginPath(); c.arc(w*.16, h*.2, h*.22, 0, Math.PI*2); c.fill();
    c.fillStyle = "rgba(242,188,87,.88)";
    c.beginPath(); c.arc(w*.16, h*.2, h*.13, 0, Math.PI*2); c.fill();

    // faint cream cloud blobs, fixed positions
    c.fillStyle = "rgba(251,245,232,.7)";
    for(const [fx,fy,rx,ry] of [[.42,.14,.055,.022],[.58,.09,.04,.017],[.8,.17,.05,.02],[.27,.26,.038,.016]]){
      c.beginPath(); c.ellipse(w*fx, h*fy, w*rx, h*ry, 0, 0, Math.PI*2); c.fill();
    }

    // two soft green hill bands, 55-70% alpha
    c.fillStyle = "rgba(50,119,94,.55)";
    c.beginPath();
    c.moveTo(0,h*.62); c.lineTo(w*.18,h*.5); c.lineTo(w*.38,h*.6); c.lineTo(w*.6,h*.46); c.lineTo(w*.82,h*.58); c.lineTo(w,h*.5);
    c.lineTo(w,h*.74); c.lineTo(0,h*.74); c.closePath(); c.fill();

    c.fillStyle = "rgba(50,119,94,.7)";
    c.beginPath();
    c.moveTo(0,h*.7); c.lineTo(w*.22,h*.6); c.lineTo(w*.44,h*.68); c.lineTo(w*.66,h*.58); c.lineTo(w*.88,h*.66); c.lineTo(w,h*.62);
    c.lineTo(w,h*.82); c.lineTo(0,h*.82); c.closePath(); c.fill();

    // sand road, bottom fifth, with a warm edge line
    const roadY = h*.8;
    c.fillStyle = "#EAC796";
    c.fillRect(0, roadY, w, h - roadY);
    c.strokeStyle = "#846043"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, roadY); c.lineTo(w, roadY); c.stroke();
  }
  // Soft contact-shadow ellipse under an occupied piece, at its row line.
  function drawContactShadow(c, x, y, basis){
    c.save();
    c.fillStyle = "rgba(46,42,36,.12)";
    c.beginPath(); c.ellipse(x, y + basis*.05, basis*.5, basis*.12, 0, 0, Math.PI*2); c.fill();
    c.restore();
  }
  function drawStreetLandmark(c, id, x, groundY, size){
    const img=sprite("landmark-"+id);
    if(!img) return false;
    // The transparent source files leave roughly 7% below their painted
    // silhouette. Lowering the image by that amount puts every object on the
    // shared lane instead of making it float.
    drawContactShadow(c,x,groundY,size*.76);
    c.drawImage(img,x-size/2,groundY-size+size*.07,size,size);
    return true;
  }
  function drawTieredDeco(c, p, x, gy, h){
    const tier = p.tier || 1;
    const spriteId = p.spriteId || p.id;
    if(tier >= 2){
      c.save();
      c.shadowColor = "rgba(255,214,95,.55)"; c.shadowBlur = 12;
      c.translate(x, gy); c.scale(1.15, 1.15); c.translate(-x, -gy);
      drawStreetDeco(c, spriteId, x, gy, h);
      c.restore();
    }else{
      drawStreetDeco(c, spriteId, x, gy, h);
    }
    if(tier >= 3) drawCrownAccent(c, spriteId, x, gy, h, !!sprite("deco-" + spriteId));
  }
  // Top of each deco shape in units of s (= basis*.32), from drawStreetDeco
  // geometry; used to plant the tier-3 crown at the piece's actual top.
  const DECO_TOPS = {
    "red-lantern": 1.6, "noodle-stall": .84, "tea-sign": 1.3, "foo-dog": .8,
    "golden-arch": 1.4, "mahjong-table": .72, "koi-pond": .39, "drum-tower": 1.5,
    "bubble-tea": 1.34, "paper-umbrella": 1.4, "goldfish-banner": 1.4,
    "neon-cat-sign": 1.1, "shaved-ice-cart": .94, "mooncake-stall": .78,
    "firecracker-arch": .82,
  };
  // Tier-3 crown: a small gold pennant on a wood pole planted above the piece's
  // top-left, plus three tiny star sparkles arced above. Deterministic (no
  // randomness) so it renders identically every frame.
  function drawCrownAccent(c, id, x, gy, basis, hasSprite=false){
    c.save(); c.translate(x, gy);
    // piece top: shape top in s-units, scaled by the tier-2 1.15x enlargement
    const top = hasSprite ? -basis*DECO_SPRITE_SCALE*1.15 : -(DECO_TOPS[id] || 1) * basis * .32 * 1.15;
    const poleX = -basis * .3;
    const poleBase = top - basis * .12;
    const poleTip = poleBase - basis * .36;
    c.strokeStyle = "#846043"; c.lineWidth = Math.max(1.4, basis * .045); c.lineCap = "round";
    c.beginPath(); c.moveTo(poleX, poleBase); c.lineTo(poleX, poleTip); c.stroke();
    c.fillStyle = "#F2BC57";
    c.beginPath();
    c.moveTo(poleX, poleTip);
    c.lineTo(poleX + basis*.18, poleTip + basis*.07);
    c.lineTo(poleX, poleTip + basis*.14);
    c.closePath(); c.fill();
    c.fillStyle = "#FFE08A";
    const sparkles = [
      [poleX + basis*.42, poleTip - basis*.06, basis*.06],
      [poleX + basis*.78, poleTip + basis*.04, basis*.055],
      [poleX + basis*.58, poleTip - basis*.26, basis*.05],
    ];
    for(const [sx, sy, r] of sparkles) drawStarMark(c, sx, sy, r);
    c.restore();
  }
  // DECO_SPRITE_SCALE lives in street.js; the PNG draw box is that constant
  // times the piece's scaled unit (h here), bottom-anchored. No-overlap is
  // governed by street.js's DECO_ANCHORS lanes and covered by the overlap
  // test in street.test.js, not by any coupling in this function.
  function drawStreetDeco(c, id, x, gy, h){
    // Prefer the PNG art when loaded; fall back to the vector shape otherwise
    // (manifest: decor + fallback "canvas:drawStreetDeco"). Any caller tier
    // enlargement / glow already in the ctx transform applies to the sprite too.
    const img = sprite("deco-" + id);
    if(img){
      const sz = h * DECO_SPRITE_SCALE;
      c.drawImage(img, x - sz/2, gy - sz, sz, sz);
      return;
    }
    const s = h*.32;
    c.save(); c.translate(x, gy);
    if(!c.shadowBlur){                       // keep caller-set glow (tiered decos)
      c.shadowColor = "rgba(245,197,24,.28)";
      c.shadowBlur = 5;
    }
    switch(id){
      case "red-lantern":
        c.strokeStyle = "#846043"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0,-s*1.6); c.lineTo(0,-s*1.1); c.stroke();
        c.fillStyle = "#c1272d"; c.beginPath(); c.ellipse(0,-s*.8,s*.32,s*.42,0,0,Math.PI*2); c.fill();
        c.fillStyle = "#F2BC57"; c.fillRect(-2,-s*.38,4,s*.12);
        break;
      case "noodle-stall":
        c.fillStyle = "#846043"; roundRectOn(c,-s*.48,-s*.62,s*.96,s*.62,3); c.fill();
        c.fillStyle = "#c1272d"; c.fillRect(-s*.56,-s*.84,s*1.12,s*.18);
        c.fillStyle = "#F2BC57"; c.fillRect(-s*.56,-s*.84,s*.18,s*.18); c.fillRect(-s*.1,-s*.84,s*.18,s*.18); c.fillRect(s*.36,-s*.84,s*.2,s*.18);
        break;
      case "tea-sign":
        c.strokeStyle = "#F2BC57"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0,-s*1.3); c.lineTo(0,-s*.9); c.stroke();
        c.fillStyle = "#846043"; roundRectOn(c,-s*.38,-s*1.3,s*.76,s*.32,3); c.fill();
        c.fillStyle = "#F2BC57"; c.font = `700 ${Math.round(s*.22)}px serif`; c.textAlign = "center";
        c.fillText("tea", 0, -s*1.06);
        break;
      case "foo-dog":
        c.fillStyle = "#846043"; c.beginPath(); c.ellipse(0,-s*.3,s*.32,s*.4,0,0,Math.PI*2); c.fill();
        c.fillStyle = "#F2BC57"; c.beginPath(); c.arc(0,-s*.62,s*.18,0,Math.PI*2); c.fill();
        c.fillStyle = "#2E2A24"; c.beginPath(); c.arc(-s*.05,-s*.65,s*.025,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(s*.05,-s*.65,s*.025,0,Math.PI*2); c.fill();
        break;
      case "golden-arch":
        c.strokeStyle = "#F2BC57"; c.lineWidth = 3;
        c.beginPath(); c.arc(0,-s*.5, s*.9, Math.PI, 0); c.stroke();
        c.beginPath(); c.moveTo(-s*.9,-s*.5); c.lineTo(-s*.9,0); c.moveTo(s*.9,-s*.5); c.lineTo(s*.9,0); c.stroke();
        c.fillStyle = "rgba(251,245,232,.35)"; c.beginPath(); c.arc(0,-s*.93,s*.13,0,Math.PI*2); c.fill();
        break;
      case "mahjong-table":
        c.fillStyle = "#2f7d4f"; c.fillRect(-s*.5,-s*.55,s,s*.16);
        c.fillStyle = "#8a5a2c"; c.fillRect(-s*.42,-s*.4,s*.1,s*.4); c.fillRect(s*.32,-s*.4,s*.1,s*.4);
        c.fillStyle = "#fdf6e3";
        for(const tx of [-s*.3,-s*.1,s*.1,s*.28]) c.fillRect(tx,-s*.72,s*.14,s*.14);
        break;
      case "koi-pond":
        c.fillStyle = "#3f8fb0"; c.beginPath(); c.ellipse(0,-s*.14,s*.55,s*.22,0,0,Math.PI*2); c.fill();
        c.fillStyle = "#e8734a"; c.beginPath(); c.ellipse(-s*.14,-s*.16,s*.16,s*.07,-.5,0,Math.PI*2); c.fill();
        c.fillStyle = "#fdf6e3"; c.beginPath(); c.ellipse(s*.16,-s*.1,s*.13,s*.06,.4,0,Math.PI*2); c.fill();
        c.strokeStyle = "#8a5a2c"; c.lineWidth = 2; c.beginPath(); c.ellipse(0,-s*.14,s*.58,s*.25,0,0,Math.PI*2); c.stroke();
        break;
      case "drum-tower":
        c.fillStyle = "#8a5a2c"; c.fillRect(-s*.34,-s*1.15,s*.68,s*1.15);
        c.fillStyle = "#c1272d"; c.beginPath(); c.moveTo(-s*.48,-s*1.15); c.lineTo(0,-s*1.5); c.lineTo(s*.48,-s*1.15); c.closePath(); c.fill();
        c.beginPath(); c.ellipse(0,-s*.62,s*.2,s*.24,0,0,Math.PI*2); c.fill();
        c.fillStyle = "#F2BC57"; c.beginPath(); c.arc(0,-s*.62,s*.07,0,Math.PI*2); c.fill();
        break;
      case "bubble-tea":
        c.fillStyle = "#8a5a2c"; c.fillRect(-s*.4,-s*.7,s*.8,s*.7);
        c.fillStyle = "#F2BC57"; c.fillRect(-s*.48,-s*.86,s*.96,s*.16);
        c.fillStyle = "#e8a9c9"; c.fillRect(-s*.12,-s*1.2,s*.24,s*.3);
        c.strokeStyle = "#5a3a1c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0,-s*1.2); c.lineTo(s*.06,-s*1.34); c.stroke();
        break;
      case "paper-umbrella":
        c.strokeStyle = "#8a5a2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0,0); c.lineTo(0,-s*.9); c.stroke();
        c.fillStyle = "#e8734a"; c.beginPath(); c.arc(0,-s*.9,s*.5,Math.PI,0); c.fill();
        c.strokeStyle = "#fdf6e3"; c.lineWidth = 1.5;
        for(const a of [-2.5,-1.9,-1.2,-.6]){ c.beginPath(); c.moveTo(0,-s*.9); c.lineTo(Math.cos(a)*s*.5,-s*.9+Math.sin(a)*s*.5); c.stroke(); }
        break;
      case "goldfish-banner":
        c.strokeStyle = "#8a5a2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0,0); c.lineTo(0,-s*1.4); c.stroke();
        c.fillStyle = "#e8734a"; c.beginPath(); c.ellipse(s*.2,-s*1.1,s*.3,s*.12,0,0,Math.PI*2); c.fill();
        c.fillStyle = "#F2BC57"; c.beginPath(); c.moveTo(s*.46,-s*1.1); c.lineTo(s*.62,-s*1.2); c.lineTo(s*.62,-s*1.0); c.closePath(); c.fill();
        break;
      case "neon-cat-sign":
        c.fillStyle = "#846043"; c.fillRect(-s*.36,-s*1.1,s*.72,s*.8);
        c.strokeStyle = "#7fd7ff"; c.lineWidth = 2; c.strokeRect(-s*.36,-s*1.1,s*.72,s*.8);
        c.strokeStyle = "#F2BC57"; c.beginPath(); c.arc(0,-s*.72,s*.18,0,Math.PI*2); c.stroke();
        c.beginPath(); c.moveTo(-s*.14,-s*.86); c.lineTo(-s*.06,-s*.98); c.moveTo(s*.14,-s*.86); c.lineTo(s*.06,-s*.98); c.stroke();
        break;
      case "shaved-ice-cart":
        c.fillStyle = "#fdf6e3"; c.fillRect(-s*.4,-s*.62,s*.8,s*.5);
        c.fillStyle = "#7fd7ff"; c.beginPath(); c.arc(0,-s*.72,s*.22,Math.PI,0); c.fill();
        c.fillStyle = "#e8734a"; c.fillRect(-s*.06,-s*.94,s*.12,s*.1);
        c.strokeStyle = "#8a5a2c"; c.lineWidth = 2;
        c.beginPath(); c.arc(-s*.22,-s*.04,s*.1,0,Math.PI*2); c.stroke();
        c.beginPath(); c.arc(s*.22,-s*.04,s*.1,0,Math.PI*2); c.stroke();
        break;
      case "mooncake-stall":
        c.fillStyle = "#8a5a2c"; c.fillRect(-s*.42,-s*.6,s*.84,s*.6);
        c.fillStyle = "#c1272d"; c.fillRect(-s*.5,-s*.78,s,s*.18);
        c.fillStyle = "#F2BC57";
        for(const tx of [-s*.26,-s*.02,s*.2]){ c.beginPath(); c.arc(tx+s*.06,-s*.42,s*.09,0,Math.PI*2); c.fill(); }
        break;
      case "firecracker-arch":
        c.strokeStyle = "#c1272d"; c.lineWidth = 3;
        c.beginPath(); c.arc(0,-s*.2,s*.62,Math.PI,0); c.stroke();
        c.fillStyle = "#c1272d";
        for(const [ax,ay] of [[-s*.62,-s*.2],[s*.62,-s*.2],[-s*.5,-s*.62],[s*.5,-s*.62],[0,-s*.82]]) c.fillRect(ax-2,ay,4,s*.18);
        c.fillStyle = "#F2BC57"; c.beginPath(); c.arc(0,-s*.82,s*.06,0,Math.PI*2); c.fill();
        break;
    }
    c.restore();
  }

  return {
    render: renderStreet,
    enter: enterStreet,
    earnWelcome: earnStreetWelcome,
    renderProjectResults: renderStreetProjectResults,
    openPreview: openStreetPreview,
    drawDeco: drawStreetDeco,
    markPurchaseReveal: id => { streetReveal = { id, start: 0 }; },
    isShopFocusMode: () => streetShopMode,
    setShopFocusMode: v => { streetShopMode = v; },
  };
}
