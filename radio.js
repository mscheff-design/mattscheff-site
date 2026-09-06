// radio.js — persistent NTS radio widget, mounted into every page's nav.
//
// This is a multi-page site (real navigations, not an SPA) — a page's
// <audio> element and its connection to the live stream is destroyed on
// every navigation, there's no way around that in a normal browser tab.
// So instead of faking continuity, state (station/playing/volume) is
// persisted to localStorage and replayed on each page's own widget
// instance: on load, if the previous page left it "playing", this
// immediately reconnects to the live stream. That's a brief gap (a fresh
// connection into live radio, like retuning a real radio), not gapless
// audio — but the widget looks and behaves identically everywhere, and
// playback resumes without the user having to touch anything.
//
// Case-study links navigate in the same tab (an earlier version opened them
// in a new tab specifically to avoid interrupting playback — reversed since
// that left the tab you were actually looking at without a live visualizer,
// which defeated the point). Same-tab navigation still means a genuinely
// new page/widget instance every time, which is exactly the "playing" flag
// in localStorage this whole file is built around — see resumeIfNoOwner's
// optimistic UI below for how that reconnect is made to feel instant rather
// than a visible stop/restart.
//
// The one remaining multi-tab case is a visitor manually opening a second
// tab (a real new-tab click, or the back/forward cache reviving an old one)
// while the first is still playing — both would otherwise see "playing" in
// localStorage and start a second, out-of-phase stream alongside the first.
// A BroadcastChannel between same-origin tabs prevents that: before
// auto-resuming, a tab pings for a currently-playing owner and only takes
// over if nothing answers; whichever tab actually starts playback (auto
// or by click) announces itself so any other playing tab yields to it.

const STATIONS = [
  { id: 'nts1', label: 'NTS 1', channel: '1', stream: 'https://stream-relay-geo.ntslive.net/stream?client=direct' },
  { id: 'nts2', label: 'NTS 2', channel: '2', stream: 'https://stream-relay-geo.ntslive.net/stream2?client=direct' },
];

const STORAGE_KEY = 'nts-radio-state';
const NOW_PLAYING_POLL_MS = 60000;
const SYNC_CHANNEL_NAME = 'nts-radio-sync';
const OWNER_PING_TIMEOUT_MS = 200;
const TAB_ID = Math.random().toString(36).slice(2);

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      stationId: STATIONS.some(s => s.id === parsed.stationId) ? parsed.stationId : STATIONS[0].id,
      playing: !!parsed.playing,
      volume: typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1 ? parsed.volume : 0.8,
    };
  } catch {
    return { stationId: STATIONS[0].id, playing: false, volume: 0.8 };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private browsing, quota) — widget still
    // works within the page, it just won't survive a navigation.
  }
}

// NTS's API returns broadcast titles with literal HTML entities (e.g.
// "DEBT &amp; REFUGE") rather than decoded text — decode via a detached
// element rather than trusting/injecting the string as markup anywhere.
function decodeEntities(str) {
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

export function initRadioWidget(mountEl) {
  const state = loadState();
  let station = STATIONS.find(s => s.id === state.stationId);
  let isPlaying = false;
  let pollHandle = null;

  mountEl.innerHTML = `
    <button class="radio-toggle" type="button" aria-label="Play NTS radio">
      <svg class="icon-play" viewBox="0 0 10 10" width="9" height="9"><path d="M1 0.5 L9 5 L1 9.5 Z"/></svg>
      <svg class="icon-pause" viewBox="0 0 10 10" width="9" height="9"><rect x="1" y="0.5" width="3" height="9"/><rect x="6" y="0.5" width="3" height="9"/></svg>
    </button>
    <div class="radio-viz" aria-hidden="true"><span></span><span></span><span></span></div>
    <button class="radio-station" type="button"></button>
    <span class="radio-now"><span class="radio-now-track"></span></span>
    <input class="radio-volume" type="range" min="0" max="1" step="0.01" aria-label="Radio volume">
  `;

  const toggleBtn = mountEl.querySelector('.radio-toggle');
  const stationBtn = mountEl.querySelector('.radio-station');
  const nowEl = mountEl.querySelector('.radio-now');
  const nowTrack = mountEl.querySelector('.radio-now-track');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Plain text first; only duplicated + set scrolling if it actually
  // overflows the visible window (a short title just sits still — no need
  // to manufacture motion where a truncated ellipsis was never going to show
  // anyway). Speed is duration-per-pixel, not a fixed duration, so a longer
  // title doesn't zip past faster than a short one.
  function setNowPlaying(text) {
    nowEl.classList.remove('is-ticking');
    nowTrack.style.animationDuration = '';
    nowTrack.textContent = text || '';
    if (!text || prefersReducedMotion) return;
    requestAnimationFrame(() => {
      const overflow = nowTrack.scrollWidth - nowEl.clientWidth;
      if (overflow <= 0) return;
      nowTrack.textContent = `${text}     •     ${text}`;
      const PX_PER_SECOND = 34;
      nowTrack.style.animationDuration = `${(nowTrack.scrollWidth / 2 / PX_PER_SECOND).toFixed(2)}s`;
      nowEl.classList.add('is-ticking');
    });
  }
  const volumeInput = mountEl.querySelector('.radio-volume');
  // The NTS stream doesn't send Access-Control-Allow-Origin (confirmed via a
  // direct cross-origin fetch — it fails outright), so a MediaElementSource
  // from this <audio> would be a tainted node: Web Audio refuses to expose
  // real frequency data from it. This is a stylized stand-in, not a real
  // analyser — three bars on independent sine waves (different frequency
  // and phase each) so they never fall into an obviously repeating pattern.
  // Driven by transform:scaleY, not height, to stay a pure compositor
  // animation with no layout/paint cost per frame.
  const vizBars = Array.from(mountEl.querySelectorAll('.radio-viz span'));
  const VIZ_WAVES = [
    { freq: 1.6, phase: 0 },
    { freq: 2.3, phase: 1.4 },
    { freq: 1.9, phase: 3.1 },
  ];
  let vizRaf = null;
  function vizTick(t) {
    const seconds = t / 1000;
    vizBars.forEach((bar, i) => {
      const { freq, phase } = VIZ_WAVES[i];
      const wave = (Math.sin(seconds * freq + phase) + 1) / 2; // 0..1
      bar.style.transform = `scaleY(${(0.18 + wave * 0.82).toFixed(3)})`;
    });
    vizRaf = requestAnimationFrame(vizTick);
  }
  function startViz() {
    if (vizRaf) return;
    vizRaf = requestAnimationFrame(vizTick);
  }
  function stopViz() {
    if (vizRaf) cancelAnimationFrame(vizRaf);
    vizRaf = null;
    vizBars.forEach((bar) => { bar.style.transform = ''; });
  }
  volumeInput.value = state.volume;

  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = state.volume;

  const syncChannel = 'BroadcastChannel' in window ? new BroadcastChannel(SYNC_CHANNEL_NAME) : null;
  if (syncChannel) {
    syncChannel.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === 'ping') {
        if (isPlaying) syncChannel.postMessage({ type: 'pong' });
      } else if (msg.type === 'take-over' && msg.tabId !== TAB_ID) {
        if (isPlaying) pause();
      }
    });
  }

  // Only auto-resume if no other tab is currently playing — otherwise this
  // just syncs the UI (station/volume already reflect localStorage) and
  // leaves playback to whichever tab already owns it.
  //
  // Case-study links now navigate in the same tab (see index.html), so this
  // fires on essentially every page load where the visitor had it playing —
  // the UI goes optimistic immediately (is-playing + visualizer start right
  // away) rather than waiting on the real reconnect, so browsing to a case
  // study feels continuous instead of visibly stopping and restarting. If
  // the ownership ping comes back (another tab genuinely already owns
  // playback — a real multi-tab scenario), that assumption gets corrected;
  // if play() itself fails, its own .catch already reverts these same two
  // things, so no separate failure handling is needed here.
  function resumeIfNoOwner() {
    mountEl.classList.add('is-playing');
    startViz();
    if (!syncChannel) { play(); return; } // no cross-tab coordination available
    let settled = false;
    const onMessage = (e) => {
      if (settled || !e.data || e.data.type !== 'pong') return;
      settled = true;
      syncChannel.removeEventListener('message', onMessage);
      mountEl.classList.remove('is-playing');
      stopViz();
    };
    syncChannel.addEventListener('message', onMessage);
    syncChannel.postMessage({ type: 'ping' });
    setTimeout(() => {
      syncChannel.removeEventListener('message', onMessage);
      if (!settled) play();
    }, OWNER_PING_TIMEOUT_MS);
  }

  function applyStation(next, { autoplay }) {
    station = next;
    stationBtn.textContent = next.label;
    stationBtn.setAttribute('aria-label', `Switch station (currently ${next.label})`);
    audio.src = next.stream;
    state.stationId = next.id;
    saveState(state);
    setNowPlaying('');
    fetchNowPlaying();
    if (autoplay) play();
  }

  function play() {
    audio.play().then(() => {
      isPlaying = true;
      mountEl.classList.add('is-playing');
      state.playing = true;
      saveState(state);
      startViz();
      if (syncChannel) syncChannel.postMessage({ type: 'take-over', tabId: TAB_ID });
    }).catch(() => {
      // Autoplay blocked (or stream unreachable) — fall back to a paused,
      // click-to-play state rather than leaving stale UI or throwing.
      isPlaying = false;
      mountEl.classList.remove('is-playing');
      state.playing = false;
      saveState(state);
      stopViz();
    });
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    mountEl.classList.remove('is-playing');
    stopViz();
    state.playing = false;
    saveState(state);
  }

  async function fetchNowPlaying() {
    const forStation = station;
    try {
      const res = await fetch('https://www.nts.live/api/v2/live', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (forStation !== station) return; // station changed mid-fetch
      const result = (data.results || []).find(r => r.channel_name === forStation.channel);
      const title = result && result.now && result.now.broadcast_title;
      setNowPlaying(title ? decodeEntities(title) : '');
    } catch {
      // Offline / API hiccup — leave whatever now-playing text is already showing.
    }
  }

  toggleBtn.addEventListener('click', () => {
    if (isPlaying) pause();
    else play();
  });

  stationBtn.addEventListener('click', () => {
    const next = STATIONS[(STATIONS.indexOf(station) + 1) % STATIONS.length];
    applyStation(next, { autoplay: isPlaying });
  });

  volumeInput.addEventListener('input', () => {
    const v = parseFloat(volumeInput.value);
    audio.volume = v;
    state.volume = v;
    saveState(state);
  });

  applyStation(station, { autoplay: false });
  if (state.playing) resumeIfNoOwner();

  pollHandle = setInterval(fetchNowPlaying, NOW_PLAYING_POLL_MS);
  // pagehide fires both when a page is genuinely being destroyed AND when
  // it's merely being frozen into the back-forward cache (bfcache) for a
  // possible back/forward restore — event.persisted is what tells them
  // apart. Browsers auto-pause any playing <audio> the instant a page enters
  // bfcache, so without handling this, hitting back after visiting a case
  // study would restore the homepage exactly as frozen: audio silently
  // paused, poller dead, sync channel closed — with nothing having told it
  // to reconnect. Only fully tear down (closing the sync channel) when the
  // page is actually going away; pageshow's persisted branch below is what
  // undoes the rest on restore.
  window.addEventListener('pagehide', (e) => {
    clearInterval(pollHandle);
    stopViz();
    if (e.persisted) return;
    if (syncChannel) syncChannel.close();
  });
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return; // a normal load already went through the init above
    pollHandle = setInterval(fetchNowPlaying, NOW_PLAYING_POLL_MS);
    if (state.playing) resumeIfNoOwner();
  });
}
