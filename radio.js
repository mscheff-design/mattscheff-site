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
// Case-study links open in a new tab specifically so the tab you were
// listening in never gets interrupted (see index.html) — but that means
// the new tab's own widget instance would otherwise also see "playing"
// in localStorage and start a second, out-of-phase stream alongside the
// first. A BroadcastChannel between same-origin tabs prevents that: before
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
    <button class="radio-station" type="button"></button>
    <span class="radio-now"></span>
    <input class="radio-volume" type="range" min="0" max="1" step="0.01" aria-label="Radio volume">
  `;

  const toggleBtn = mountEl.querySelector('.radio-toggle');
  const stationBtn = mountEl.querySelector('.radio-station');
  const nowEl = mountEl.querySelector('.radio-now');
  const volumeInput = mountEl.querySelector('.radio-volume');
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
  function resumeIfNoOwner() {
    if (!syncChannel) { play(); return; } // no cross-tab coordination available
    let settled = false;
    const onMessage = (e) => {
      if (settled || !e.data || e.data.type !== 'pong') return;
      settled = true;
      syncChannel.removeEventListener('message', onMessage);
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
    nowEl.textContent = '';
    fetchNowPlaying();
    if (autoplay) play();
  }

  function play() {
    audio.play().then(() => {
      isPlaying = true;
      mountEl.classList.add('is-playing');
      state.playing = true;
      saveState(state);
      if (syncChannel) syncChannel.postMessage({ type: 'take-over', tabId: TAB_ID });
    }).catch(() => {
      // Autoplay blocked (or stream unreachable) — fall back to a paused,
      // click-to-play state rather than leaving stale UI or throwing.
      isPlaying = false;
      mountEl.classList.remove('is-playing');
      state.playing = false;
      saveState(state);
    });
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    mountEl.classList.remove('is-playing');
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
      nowEl.textContent = title ? decodeEntities(title) : '';
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
  window.addEventListener('pagehide', () => {
    clearInterval(pollHandle);
    if (syncChannel) syncChannel.close();
  });
}
