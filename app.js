/* Haven Toronto — TV display
 * - Spotify "currently playing" via Authorization Code + PKCE (no server, no client secret)
 * - Background + animated mascot, configurable in config.js or the settings panel (S)
 */
(() => {
  "use strict";

  // Spotify only allows http redirect URIs on loopback IPs, so always run on 127.0.0.1.
  if (location.hostname === "localhost") {
    location.replace(location.href.replace("//localhost", "//127.0.0.1"));
    return;
  }

  const DEFAULTS = {
    spotifyClientId: "", title: "Haven Toronto", subtitle: "Free Game Jam",
    idleTitle: "Ambient vibes", idleSubtitle: "Make something cozy.",
    background: "", backgroundDim: 0.35,
    mascot: "assets/mascot.svg", mascotAnimation: "float", mascotPosition: "bottom-right",
    mascotSize: 30, mascotFlip: false, mascotReact: true,
    links: [], linkQr: true, showLinks: true,
    sponsors: [], sponsorColumns: "auto", sponsorCardSize: 100,
    showClock: true, pollSeconds: 5,
  };
  const BASE = Object.assign({}, DEFAULTS, window.HAVEN_CONFIG || {});

  const $ = (s) => document.querySelector(s);
  const body = document.body;

  // ---------- storage helpers ----------
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const K_SETTINGS = "haven.settings", K_TOKEN = "haven.spotify.token", K_VERIFIER = "haven.spotify.verifier";

  // Uploaded images/videos live in IndexedDB (too big for localStorage).
  const files = (() => {
    let dbp;
    const db = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open("haven", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("files");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const run = async (mode, fn) => {
      const d = await db();
      return new Promise((res, rej) => {
        const t = d.transaction("files", mode);
        const req = fn(t.objectStore("files"));
        t.oncomplete = () => res(req.result);
        t.onerror = () => rej(t.error);
      });
    };
    return {
      get: (k) => run("readonly", (s) => s.get(k)).catch(() => null),
      set: (k, v) => run("readwrite", (s) => s.put(v, k)),
      del: (k) => run("readwrite", (s) => s.delete(k)).catch(() => {}),
    };
  })();

  let overrides = store.get(K_SETTINGS, {});
  let S = Object.assign({}, BASE, overrides);
  function saveSettings(patch) {
    overrides = Object.assign({}, overrides, patch);
    store.set(K_SETTINGS, overrides);
    S = Object.assign({}, BASE, overrides);
  }

  // ---------- toast ----------
  let toastT;
  function toast(msg, ms = 4000) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove("show"), ms);
  }

  // ---------- look: text, background, mascot ----------
  const objectUrls = {};
  async function resolveMedia(key) {
    const blob = await files.get(key);
    if (blob) {
      if (objectUrls[key]) URL.revokeObjectURL(objectUrls[key]);
      objectUrls[key] = URL.createObjectURL(blob);
      return { url: objectUrls[key], video: (blob.type || "").startsWith("video") };
    }
    const path = (S[key] || "").trim();
    return path ? { url: path, video: /\.(mp4|webm|mov|m4v)(\?|$)/i.test(path) } : null;
  }

  async function applyBackground() {
    const img = $("#bgImg"), vid = $("#bgVid");
    const m = await resolveMedia("background");
    img.hidden = vid.hidden = true;
    vid.pause();
    body.classList.toggle("has-bg", !!m);
    if (!m) { img.removeAttribute("src"); vid.removeAttribute("src"); return; }
    const fail = () => { body.classList.remove("has-bg"); console.warn("Background failed to load:", m.url); };
    if (m.video) {
      vid.onerror = fail;
      vid.src = m.url; vid.hidden = false;
      vid.play().catch(() => {});
    } else {
      img.onerror = fail;
      img.src = m.url; img.hidden = false;
    }
  }

  async function applyMascot() {
    const wrap = $("#mascot"), img = $("#mascotImg");
    const m = await resolveMedia("mascot");
    wrap.classList.toggle("hidden", !m);
    if (!m) { img.removeAttribute("src"); return; }
    img.onerror = () => { wrap.classList.add("hidden"); console.warn("Mascot failed to load:", m.url); };
    img.onload = () => wrap.classList.remove("hidden");
    img.src = m.url;
  }

  function applyLook() {
    const grid = $("#sponsorList");
    const columns = Number(S.sponsorColumns);
    const scale = Math.min(150, Math.max(60, Number(S.sponsorCardSize) || 100)) / 100;
    const fixedColumns = Number.isInteger(columns) && columns >= 1 && columns <= 8;
    grid.style.setProperty("--sponsor-columns", fixedColumns ? columns : "auto-fit");
    grid.style.setProperty("--sponsor-card-width", fixedColumns ? "0px" : (12 * scale) + "rem");
    grid.style.setProperty("--sponsor-grid-width", (75 * scale) + "rem");
    grid.style.setProperty("--sponsor-logo-height", (11 * scale) + "vh");
    $("#sponsorSizeOut").textContent = Math.round(scale * 100) + "%";
    $("#title").textContent = S.title;
    $("#subtitle").textContent = S.subtitle;
    $("#subtitle").hidden = !S.subtitle;
    document.title = S.title || "Haven Toronto";
    $("#labelText").textContent = S.title || "Haven";
    body.classList.toggle("no-clock", !S.showClock);
    body.dataset.mascot = S.mascotPosition;
    renderLinks();
    document.documentElement.style.setProperty("--dim", S.backgroundDim);
    document.documentElement.style.setProperty("--mascot-size", S.mascotSize + "vh");
    const m = $("#mascot");
    const hidden = m.classList.contains("hidden");
    m.className = `mascot anim-${S.mascotAnimation} pos-${S.mascotPosition}` +
      (S.mascotFlip ? " flip" : "") + (S.mascotReact ? " react" : "") + (hidden ? " hidden" : "");
    if (!np) showIdle();
  }

  // ---------- quick links ----------
  const fullUrl = (u) => { u = (u || "").trim(); return !u ? "" : /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : "https://" + u; };
  const prettyUrl = (u) => (u || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

  function qrSvg(url) {
    if (typeof window.qrcode !== "function") return null; // offline: links still show as text
    try {
      const q = window.qrcode(0, "M");
      q.addData(url);
      q.make();
      const wrap = document.createElement("div");
      wrap.innerHTML = q.createSvgTag(4, 0);
      const svg = wrap.querySelector("svg");
      const n = q.getModuleCount() * 4;
      svg.setAttribute("viewBox", `0 0 ${n} ${n}`);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      return svg;
    } catch { return null; }
  }

  function renderLinks() {
    const bar = $("#links");
    const links = (Array.isArray(S.links) ? S.links : []).filter((l) => l && (l.url || "").trim());
    bar.replaceChildren();
    bar.hidden = !links.length || !S.showLinks;
    for (const l of links) {
      const item = document.createElement("div");
      item.className = "qlink";
      const svg = S.linkQr ? qrSvg(fullUrl(l.url)) : null;
      if (svg) {
        const box = document.createElement("div");
        box.className = "qr";
        box.appendChild(svg);
        item.appendChild(box);
      }
      const text = document.createElement("div");
      text.className = "ql-text";
      const label = document.createElement("div");
      label.className = "ql-label";
      label.textContent = (l.label || "").trim() || prettyUrl(l.url);
      const url = document.createElement("div");
      url.className = "ql-url";
      url.textContent = prettyUrl(l.url);
      text.append(label, url);
      item.appendChild(text);
      bar.appendChild(item);
    }
  }

  // ---------- clock ----------
  function tickClock() {
    $("#clock").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  tickClock();
  setInterval(tickClock, 5000);

  // ---------- Spotify auth (PKCE) ----------
  const SCOPES = "user-read-currently-playing user-read-playback-state";
  const redirectUri = () => location.origin + location.pathname;
  const clientId = () => (S.spotifyClientId || "").trim();

  const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  function randomVerifier() {
    const a = new Uint8Array(64);
    crypto.getRandomValues(a);
    return b64url(a).slice(0, 96);
  }

  async function login() {
    if (!clientId()) { toast("Add your Spotify Client ID first"); openSettings(); $("[data-key=spotifyClientId]").focus(); return; }
    const verifier = randomVerifier();
    store.set(K_VERIFIER, verifier);
    const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const q = new URLSearchParams({
      client_id: clientId(), response_type: "code", redirect_uri: redirectUri(),
      scope: SCOPES, code_challenge_method: "S256", code_challenge: challenge,
    });
    location.href = "https://accounts.spotify.com/authorize?" + q;
  }

  function logout() {
    store.del(K_TOKEN);
    update(null);
    renderConnection();
    toast("Spotify disconnected");
  }

  async function tokenRequest(params) {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(j.error_description || j.error || "HTTP " + r.status);
      e.code = j.error; e.status = r.status;
      throw e;
    }
    return j;
  }

  function saveToken(j, prev) {
    const t = {
      access_token: j.access_token,
      refresh_token: j.refresh_token || (prev && prev.refresh_token),
      expires_at: Date.now() + (j.expires_in - 60) * 1000,
    };
    store.set(K_TOKEN, t);
    return t;
  }

  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    const code = q.get("code"), err = q.get("error");
    if (!code && !err) return;
    history.replaceState(null, "", location.pathname);
    if (err) { toast("Spotify sign-in cancelled (" + err + ")"); return; }
    const verifier = store.get(K_VERIFIER);
    store.del(K_VERIFIER);
    try {
      saveToken(await tokenRequest({
        grant_type: "authorization_code", code, redirect_uri: redirectUri(),
        client_id: clientId(), code_verifier: verifier,
      }));
      toast("Spotify connected ♪");
    } catch (e) {
      toast("Spotify sign-in failed: " + e.message, 8000);
    }
  }

  let refreshing = null;
  async function getAccessToken(force) {
    const t = store.get(K_TOKEN);
    if (!t) return null;
    if (!force && Date.now() < t.expires_at) return t.access_token;
    if (!t.refresh_token) return null;
    if (!refreshing) {
      refreshing = tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: clientId() })
        .then((j) => saveToken(j, t))
        .finally(() => { refreshing = null; });
    }
    try {
      return (await refreshing).access_token;
    } catch (e) {
      if (e.code === "invalid_grant" || e.code === "invalid_client") {
        store.del(K_TOKEN);
        renderConnection();
        toast("Spotify session expired — press S to reconnect", 8000);
      }
      throw e;
    }
  }

  const isConnected = () => !!store.get(K_TOKEN);

  function renderConnection() {
    const ok = isConnected();
    $("#connectBtn").textContent = ok ? "Disconnect" : "Connect Spotify";
    $("#connectBtn").classList.toggle("primary", !ok);
    const st = $("#spotifyStatus");
    st.textContent = ok ? "Connected ✓" : (clientId() ? "Not connected" : "Needs a Client ID");
    st.classList.toggle("ok", ok);
    if (!np) showIdle();
  }

  // ---------- now playing ----------
  let np = null;          // current track state
  let pollTimer = null;
  let demo = false;
  let endNudge = false;   // re-poll once when a track runs out

  function parseTrack(j) {
    const it = j && j.item;
    if (!it) return null;
    const ep = it.type === "episode";
    const imgs = ep ? (it.images || (it.show && it.show.images) || []) : ((it.album && it.album.images) || []);
    return {
      id: it.id || it.uri,
      title: it.name,
      artist: ep ? ((it.show && it.show.name) || "") : (it.artists || []).map((a) => a.name).join(", "),
      album: ep ? "" : ((it.album && it.album.name) || ""),
      art: (imgs[0] && imgs[0].url) || "",
      artSmall: (imgs.length && imgs[imgs.length - 1].url) || "",
      duration: it.duration_ms || 0,
      progress: j.progress_ms || 0,
      at: Date.now(),
      playing: !!j.is_playing,
    };
  }

  async function poll() {
    clearTimeout(pollTimer);
    let delay = Math.max(2, S.pollSeconds) * 1000;
    try {
      if (demo) return;
      const tok = await getAccessToken();
      if (!tok) { if (np) update(null); return; }
      const url = "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode";
      let r = await fetch(url, { headers: { Authorization: "Bearer " + tok } });
      if (r.status === 401) {
        const t2 = await getAccessToken(true);
        r = await fetch(url, { headers: { Authorization: "Bearer " + t2 } });
      }
      if (r.status === 204 || r.status === 202) update(null);
      else if (r.status === 429) delay = Math.max(delay, (Number(r.headers.get("Retry-After")) || 30) * 1000);
      else if (r.ok) {
        update(parseTrack(await r.json()));
        if (np && Date.now() - lastQueueAt > 20000) fetchQueue(); // catch queue edits mid-song
      }
      else console.warn("Spotify responded", r.status);
    } catch (e) {
      console.warn("Poll failed:", e);
      delay = Math.max(delay, 10000); // network hiccup: keep the last track up, retry soon
    } finally {
      pollTimer = setTimeout(poll, delay);
    }
  }

  // Manual refresh: new access token, then re-read the current song and queue right away.
  let manualRefresh = false;
  async function refreshSpotify() {
    if (manualRefresh) return;
    if (demo) { toast("Demo track is on — press D to turn it off first"); return; }
    if (!isConnected()) { toast("Spotify isn't connected — press S to connect"); return; }
    manualRefresh = true;
    const btn = $("#refreshBtn");
    btn.classList.add("spinning");
    try {
      await getAccessToken(true);
      np = null;          // force the track, art and colours to redraw
      nextKey = null;     // and the up-next row
      await poll();
      await fetchQueue();
      toast(np ? "Spotify refreshed ♪" : "Spotify refreshed — nothing playing right now");
    } catch (e) {
      toast("Couldn't refresh Spotify: " + e.message, 6000);
    } finally {
      btn.classList.remove("spinning");
      manualRefresh = false;
    }
  }

  // ---------- up next (Spotify queue) ----------
  let lastQueueAt = 0, nextKey = null;
  async function fetchQueue() {
    lastQueueAt = Date.now();
    try {
      const tok = await getAccessToken();
      if (!tok) return;
      const r = await fetch("https://api.spotify.com/v1/me/player/queue", { headers: { Authorization: "Bearer " + tok } });
      if (!r.ok) return;
      const j = await r.json();
      const it = (j.queue || [])[0];
      if (!demo) setNext(it ? parseTrack({ item: it }) : null);
    } catch (e) {
      console.warn("Queue fetch failed:", e);
    }
  }

  function setNext(t) {
    const box = $("#upnext");
    const key = t ? t.id : null;
    if (key === nextKey) return;
    nextKey = key;
    if (!t) { box.hidden = true; return; }
    $("#unTitle").textContent = t.title;
    $("#unArtist").textContent = t.artist || "";
    const img = $("#unArt");
    img.hidden = !t.artSmall;
    if (t.artSmall) img.src = t.artSmall; else img.removeAttribute("src");
    box.hidden = true;
    void box.offsetWidth; // replay fade-in
    box.hidden = false;
  }

  let swapSeq = 0;
  function update(next) {
    const prevId = np && np.id;
    np = next;
    endNudge = false;
    const playing = !!(np && np.playing);
    body.classList.toggle("playing", playing);
    body.classList.toggle("has-track", !!np);
    if (!np) { setNext(null); if (prevId !== undefined && prevId !== null) swapTo(null); else showIdle(); return; }
    $("#npState").textContent = playing ? "Now playing" : "Paused";
    if (np.id !== prevId) { swapTo(np); if (!demo) fetchQueue(); }
    tickProgress();
  }

  function setText(title, artist, album) {
    $("#npTitle").textContent = title;
    $("#npArtist").textContent = artist;
    $("#npAlbum").textContent = album;
    $("#npArtist").hidden = !artist;
    $("#npAlbum").hidden = !album;
  }

  function showIdle() {
    if (np) return;
    if (!isConnected()) {
      $("#npState").textContent = "Spotify not connected";
      setText(S.idleTitle, clientId() ? "Press S to connect Spotify" : "Press S to set up Spotify", "");
    } else {
      $("#npState").textContent = "Nothing playing";
      setText(S.idleTitle, S.idleSubtitle, "");
    }
    setArt("");
  }

  async function swapTo(t) {
    const seq = ++swapSeq;
    const info = $("#info");
    info.classList.add("swap");
    const loaded = t && t.art ? loadImage(t.art) : Promise.resolve(null);
    await Promise.all([loaded, new Promise((r) => setTimeout(r, 500))]);
    if (seq !== swapSeq) return;
    if (!t) showIdle();
    else setText(t.title, t.artist, t.album);
    const img = await loaded;
    setArt(img ? img.src : "");
    setWash(img ? img.src : "");
    if (img) { const c = accentFrom(img); if (c) setAccent(c); }
    else if (!t) setAccent("#d9c7a8");
    info.classList.remove("swap");
  }

  function setArt(src) {
    const art = $("#art");
    if (!src) { art.hidden = true; art.removeAttribute("src"); return; }
    if (art.getAttribute("src") === src) return;
    art.hidden = true;
    art.src = src;
    void art.offsetWidth; // restart fade-in
    art.hidden = false;
  }

  // Try CORS first so we can read colours; fall back to a plain load.
  function loadImage(src) {
    const attempt = (cors) => new Promise((res, rej) => {
      const i = new Image();
      if (cors) i.crossOrigin = "anonymous";
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    return attempt(true).catch(() => attempt(false)).catch(() => null);
  }

  // Pick a vivid colour from the album art for the glow, label and progress bar.
  function accentFrom(img) {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 24;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const R = d[i], G = d[i + 1], B = d[i + 2];
        const max = Math.max(R, G, B), min = Math.min(R, G, B);
        const wt = Math.pow((max - min) / 255, 2) * (max / 255) + 0.002;
        r += R * wt; g += G * wt; b += B * wt; w += wt;
      }
      const [h, s] = rgbToHsl(r / w, g / w, b / w);
      return `hsl(${Math.round(h)} ${Math.round(Math.max(s, 0.45) * 100)}% 64%)`;
    } catch { return null; } // CORS-tainted canvas
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  // Blurred album-art wash behind everything (two layers so songs crossfade)
  let washFront = "washA";
  function setWash(src) {
    const front = $("#" + washFront);
    if (!src) { front.classList.remove("on"); return; }
    if (front.dataset.src === src && front.classList.contains("on")) return;
    washFront = washFront === "washA" ? "washB" : "washA";
    const back = $("#" + washFront);
    back.dataset.src = src;
    back.style.backgroundImage = `url("${src}")`;
    back.classList.add("on");
    front.classList.remove("on");
  }

  const setAccent = (c) => document.documentElement.style.setProperty("--accent", c);

  const fmt = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  function tickProgress() {
    const arm = $("#tonearm");
    if (!np || !np.duration) {
      arm.style.setProperty("--arm", "0deg");
      return;
    }
    const pos = Math.min(np.duration, np.progress + (np.playing ? Date.now() - np.at : 0));
    const frac = pos / np.duration;
    $("#npBar").style.setProperty("--p", frac.toFixed(4));
    $("#npPos").textContent = fmt(pos);
    $("#npDur").textContent = "−" + fmt(np.duration - pos);
    // Needle drifts from the outer groove toward the label as the song plays.
    arm.style.setProperty("--arm", np.playing ? (15 + 9 * frac).toFixed(2) + "deg" : "0deg");
    if (np.playing && pos >= np.duration && !endNudge && !demo) {
      endNudge = true;
      clearTimeout(pollTimer);
      pollTimer = setTimeout(poll, 1200);
    }
  }
  setInterval(tickProgress, 300);

  // ---------- demo track (preview the look without Spotify) ----------
  function toggleDemo() {
    demo = !demo;
    if (demo) {
      update({
        id: "demo", title: "Lo-fi Lanterns", artist: "Haven Toronto Sound System", album: "Jam Session Vol. 1",
        art: "assets/demo-cover.svg", duration: 194000, progress: 42000, at: Date.now(), playing: true,
      });
      setNext({ id: "demo-next", title: "Pixel Rain", artist: "Night Bus Collective", artSmall: "" });
      toast("Demo track on — press D again to turn off");
    } else {
      update(null);
      toast("Demo off");
      poll();
    }
  }

  // ---------- headline / announcement ----------
  // H opens an inline text box right where the headline shows; Enter puts it up, Esc cancels.
  const K_HEADLINE = "haven.headline";
  let headline = store.get(K_HEADLINE, "");
  let editingHeadline = false;
  const hlBox = $("#headline"), hlText = $("#hlText"), hlInput = $("#hlInput");

  function renderHeadline(flash) {
    hlText.textContent = headline;
    hlBox.hidden = !headline && !editingHeadline;
    hlBox.classList.remove("flash");
    if (flash && headline) { void hlBox.offsetWidth; hlBox.classList.add("flash"); }
  }

  function editHeadline() {
    editingHeadline = true;
    hlInput.value = headline;
    hlText.hidden = true;
    hlInput.hidden = false;
    renderHeadline();
    hlInput.focus();
    hlInput.select();
  }

  function finishHeadline(save) {
    if (!editingHeadline) return;
    editingHeadline = false;
    const changed = save && hlInput.value.trim() !== headline;
    if (save) {
      headline = hlInput.value.trim();
      store.set(K_HEADLINE, headline);
    }
    hlInput.hidden = true;
    hlText.hidden = false;
    hlInput.blur();
    renderHeadline(changed);
  }

  function clearHeadline() {
    finishHeadline(false);
    headline = "";
    store.set(K_HEADLINE, "");
    renderHeadline();
  }

  hlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finishHeadline(true); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finishHeadline(false); }
  });
  hlInput.addEventListener("blur", () => finishHeadline(false));

  // ---------- settings panel ----------
  const panel = $("#settings");
  const openSettings = () => { panel.classList.add("open"); body.classList.remove("idle"); fillSettings(); updateSponsorPage(); };
  const closeSettings = () => { panel.classList.remove("open"); document.activeElement && document.activeElement.blur(); updateSponsorPage(); };
  const toggleSettings = () => (panel.classList.contains("open") ? closeSettings() : openSettings());

  function renderLinkRows() {
    const box = $("#linkRows");
    box.replaceChildren();
    (S.links || []).forEach((l, i) => {
      const row = document.createElement("div");
      row.className = "link-row";
      const label = Object.assign(document.createElement("input"), { type: "text", placeholder: "Label", value: l.label || "" });
      const url = Object.assign(document.createElement("input"), { type: "text", placeholder: "itch.io/jam/…", value: l.url || "", spellcheck: false });
      const del = Object.assign(document.createElement("button"), { type: "button", textContent: "✕", title: "Remove link" });
      label.dataset.link = i; label.dataset.field = "label";
      url.dataset.link = i; url.dataset.field = "url";
      del.addEventListener("click", () => {
        const links = (S.links || []).slice();
        links.splice(i, 1);
        saveSettings({ links });
        renderLinks(); renderLinkRows();
      });
      row.append(label, url, del);
      box.appendChild(row);
    });
  }
  $("#addLink").addEventListener("click", () => {
    saveSettings({ links: (S.links || []).concat([{ label: "", url: "" }]) });
    renderLinkRows();
    const inputs = $("#linkRows").querySelectorAll("input");
    inputs[inputs.length - 2].focus();
  });

  const sponsorPage = $("#sponsorPage");
  const sponsorList = $("#sponsorList");
  let sponsorCycleStart = performance.now();
  let sponsorTimer;

  function updateSponsorPage() {
    clearTimeout(sponsorTimer);
    const phase = (performance.now() - sponsorCycleStart) % 60000;
    sponsorPage.hidden = phase < 50000 || !sponsorList.children.length || panel.classList.contains("open");
    sponsorTimer = setTimeout(updateSponsorPage, (phase < 50000 ? 50000 : 60000) - phase);
  }

  function renderSponsors() {
    sponsorList.replaceChildren();
    for (const sponsor of S.sponsors) {
      const name = (sponsor.name || "").trim();
      if (!name) continue;
      const item = document.createElement("li");
      const logo = (sponsor.logo || "").trim();
      if (logo) {
        const image = document.createElement("img");
        image.alt = "";
        image.addEventListener("error", () => image.remove(), { once: true });
        image.src = logo;
        item.append(image);
      }
      const label = document.createElement("span");
      label.textContent = name;
      item.append(label);
      sponsorList.append(item);
    }
    updateSponsorPage();
  }

  function renderSponsorRows() {
    const box = $("#sponsorRows");
    box.replaceChildren();
    S.sponsors.forEach((sponsor, index) => {
      const row = document.createElement("div");
      row.className = "link-row";
      for (const [field, label] of [["name", "Sponsor name"], ["logo", "Logo URL or path"]]) {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = label;
        input.setAttribute("aria-label", label);
        input.value = sponsor[field] || "";
        input.addEventListener("input", () => {
          const sponsors = S.sponsors.slice();
          sponsors[index] = { ...sponsors[index], [field]: input.value };
          saveSettings({ sponsors });
          renderSponsors();
        });
        row.append(input);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", "Remove sponsor");
      remove.addEventListener("click", () => {
        saveSettings({ sponsors: S.sponsors.filter((_, i) => i !== index) });
        renderSponsors();
        renderSponsorRows();
      });
      const actions = document.createElement("div");
      actions.className = "sponsor-actions";
      for (const [offset, arrow, direction] of [[-1, "↑", "up"], [1, "↓", "down"]]) {
        const move = document.createElement("button");
        const destination = index + offset;
        move.type = "button";
        move.textContent = arrow;
        move.setAttribute("aria-label", "Move " + (sponsor.name || "sponsor") + " " + direction);
        move.disabled = destination < 0 || destination >= S.sponsors.length;
        move.addEventListener("click", () => {
          const sponsors = S.sponsors.slice();
          sponsors.splice(index, 1);
          sponsors.splice(destination, 0, sponsor);
          saveSettings({ sponsors });
          renderSponsors();
          renderSponsorRows();
          const buttons = box.children[destination].querySelectorAll("button");
          const sameDirection = buttons[offset === -1 ? 0 : 1];
          (sameDirection.disabled ? buttons[offset === -1 ? 1 : 0] : sameDirection).focus();
        });
        actions.append(move);
      }
      actions.append(remove);
      row.append(actions);
      box.append(row);
    });
  }

  $("#addSponsor").addEventListener("click", () => {
    saveSettings({ sponsors: [...S.sponsors, { name: "", logo: "" }] });
    renderSponsorRows();
    $("#sponsorRows").lastElementChild.querySelector("input").focus();
  });

  function fillSettings() {
    renderSponsorRows();
    renderLinkRows();
    panel.querySelectorAll("[data-key]").forEach((el) => {
      const v = S[el.dataset.key];
      if (el.type === "checkbox") el.checked = !!v;
      else el.value = v == null ? "" : v;
    });
    $("#redirectUri").value = redirectUri();
    $("#dimOut").textContent = Math.round(S.backgroundDim * 100) + "%";
    $("#sizeOut").textContent = S.mascotSize + "%";
    renderConnection();
  }

  panel.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.link !== undefined) {
      const links = (S.links || []).map((l) => Object.assign({}, l));
      links[+el.dataset.link][el.dataset.field] = el.value;
      saveSettings({ links });
      renderLinks();
      return;
    }
    const key = el.dataset && el.dataset.key;
    if (!key) return;
    const v = el.type === "checkbox" ? el.checked : ("num" in el.dataset ? Number(el.value) : el.value);
    saveSettings({ [key]: v });
    applyLook();
    if (key === "spotifyClientId") renderConnection();
    $("#dimOut").textContent = Math.round(S.backgroundDim * 100) + "%";
    $("#sizeOut").textContent = S.mascotSize + "%";
  });

  async function setUpload(key, file, apply) {
    if (!file) return;
    try {
      await files.set(key, file);
      await apply();
      toast((key === "mascot" ? "Mascot" : "Background") + " updated");
    } catch (e) {
      toast("Couldn't save that file: " + e.message);
    }
  }
  $("#bgFile").addEventListener("change", (e) => { setUpload("background", e.target.files[0], applyBackground); e.target.value = ""; });
  $("#mascotFile").addEventListener("change", (e) => { setUpload("mascot", e.target.files[0], applyMascot); e.target.value = ""; });
  $("#bgClear").addEventListener("click", async () => { await files.del("background"); saveSettings({ background: "" }); applyBackground(); });
  $("#mascotClear").addEventListener("click", async () => { await files.del("mascot"); saveSettings({ mascot: "" }); applyMascot(); });

  $("#resetAll").addEventListener("click", async () => {
    if (!confirm("Reset all display settings and remove uploaded images? (Spotify stays connected.)")) return;
    await files.del("background");
    await files.del("mascot");
    overrides = {};
    store.del(K_SETTINGS);
    S = Object.assign({}, BASE);
    applyLook(); applyBackground(); applyMascot(); fillSettings();
    renderSponsors();
    toast("Settings reset");
  });

  $("#connectBtn").addEventListener("click", () => (isConnected() ? logout() : login()));
  $("#copyRedirect").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(redirectUri()); toast("Redirect URI copied"); }
    catch { $("#redirectUri").select(); }
  });
  $("#gear").addEventListener("click", openSettings);
  $("#refreshBtn").addEventListener("click", refreshSpotify);
  $("#refreshSettingsBtn").addEventListener("click", refreshSpotify);
  $("#closeSettings").addEventListener("click", closeSettings);

  // ---------- keyboard, cursor, fullscreen, wake lock ----------
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, select, textarea")) {
      if (e.key === "Escape") closeSettings();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "h") { e.preventDefault(); e.shiftKey ? clearHeadline() : editHeadline(); }
    else if (k === "s") toggleSettings();
    else if (k === "l") {
      saveSettings({ showLinks: !S.showLinks });
      renderLinks();
      if (!(S.links || []).some((l) => l && l.url)) toast("No quick links yet — add them in settings (S)");
    }
    else if (k === "f") toggleFullscreen();
    else if (k === "p" && !e.repeat && sponsorList.children.length && !panel.classList.contains("open")) {
      sponsorCycleStart = performance.now() - 50000;
      updateSponsorPage();
    }
    else if (k === "d") toggleDemo();
    else if (k === "r") refreshSpotify();
    else if (k === "escape") closeSettings();
  });

  let idleT;
  function wake() {
    body.classList.remove("idle");
    clearTimeout(idleT);
    idleT = setTimeout(() => { if (!panel.classList.contains("open")) body.classList.add("idle"); }, 3000);
  }
  ["mousemove", "mousedown", "touchstart"].forEach((ev) => addEventListener(ev, wake, { passive: true }));
  wake();

  async function keepAwake() {
    try { if ("wakeLock" in navigator && document.visibilityState === "visible") await navigator.wakeLock.request("screen"); } catch {}
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { keepAwake(); poll(); }
  });
  keepAwake();

  // ---------- boot ----------
  (async () => {
    applyLook();
    applyBackground();
    applyMascot();
    renderHeadline();
    renderSponsors();
    await handleRedirect();
    renderConnection();
    poll();
  })();

  window.haven = { toggleDemo, settings: () => S };
})();
