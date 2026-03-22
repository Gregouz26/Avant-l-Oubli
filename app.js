/*
  ========================================================================
    _______  _  _                 ____  
   |__   __|(_)| |               / ___| 
      | |    _ | |__   ____ ___ | |  _  
      | |   | || '_ \ |_  // _ \| | |_ |
      | |   | || |_) | / /| (_) | |__| |
      |_|   |_||_.__/ /___|\___/ \____| 

    > Crafted with passion by TibzoG
    > Code is poetry.
  ========================================================================
*/

// --- Liste des audios ---
// ytId = l'ID de la vidéo YouTube (juste l'ID, pas l'URL complète)
const baseAudio = [
  {
    id: "a1",
    person: "Mme Dinh Van Chi",
    year: "",
    place: "",
    theme: "Fille d'un résistant",
    tags: ["résistance"],
    desc: "Enregistrement réalisé le 15 Mai 2026.",
    ytId: "nf6RZvzfUnY",    
    duration: "17:19"
  },
];

// --- Gestion du lecteur audio via YouTube ---
// On utilise l'API IFrame YouTube pour lire juste le son (player caché)
const audioState = {
  current: null,
  raf: null,
  timer: null
};

// on stocke le player YT globalement pour pouvoir le contrôler partout
let ytPlayer = null;
let ytApiReady = false;
// si on clique avant que l'API soit chargée, on retient l'id à jouer
let ytPendingId = null;

function ensureHiddenPlayerContainer() {
  let el = document.getElementById('yt-hidden-player');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'yt-hidden-player';
  el.setAttribute('aria-hidden', 'true');
  el.style.position = 'fixed';
  el.style.bottom = '0';
  el.style.right = '0';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '-1';
  document.body.appendChild(el);
  return el;
}

function loadYouTubeAPI() {
  ensureHiddenPlayerContainer();
  if (document.getElementById('yt-api-script')) return;
  const tag = document.createElement('script');
  tag.id = 'yt-api-script';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

// YouTube appelle cette fonction automatiquement quand l'API est prête
window.onYouTubeIframeAPIReady = function() {
  ensureHiddenPlayerContainer();
  ytApiReady = true;
  ytPlayer = new YT.Player('yt-hidden-player', {
    height: '1',
    width: '1',
    videoId: '',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0
    },
    events: {
      onStateChange: onYtStateChange,
      onError: onYtError,
      onReady: function() {
        // si quelqu'un avait cliqué play avant que le player soit prêt
        if (ytPendingId) {
          const pendingId = ytPendingId;
          ytPendingId = null;
          toggleAudio(pendingId);
        }
      }
    }
  });
};

// événements du player YouTube (pause, fin, etc.)
function onYtStateChange(event) {
  const id = audioState.current;
  if (!id) return;

  if (event.data === 1) {
    const card = document.querySelector('.audio-card[data-audio-id="' + id + '"]');
    if (card) card.classList.add('is-playing');
    setPlayIcon(id, false);
    startProgressLoop(id);
    return;
  }

  if (event.data === 2) {
    cancelAnimationFrame(audioState.raf);
    const card = document.querySelector('.audio-card[data-audio-id="' + id + '"]');
    if (card) card.classList.remove('is-playing');
    setPlayIcon(id, true);
    return;
  }

  // YT.PlayerState.ENDED = 0
  if (event.data === 0) {
    stopCurrentAudio();
    const fill = document.querySelector('[data-progress="' + id + '"]');
    const cur  = document.querySelector('[data-current="' + id + '"]');
    if (fill) fill.style.width = '0%';
    if (cur)  cur.textContent  = '0:00';
    updateWaveBars(id, 0);
  }
}

function onYtError() {
  const id = audioState.current;
  if (!id) return;
  stopCurrentAudio();
  const fill = document.querySelector('[data-progress="' + id + '"]');
  const cur  = document.querySelector('[data-current="' + id + '"]');
  if (fill) fill.style.width = '0%';
  if (cur)  cur.textContent  = '0:00';
  updateWaveBars(id, 0);
}

function makeWaveBars(id, count) {
  if (!count) count = 36;
  const bars = [];
  for (let i = 0; i < count; i++) {
    const base = Math.random();
    const envelope = 0.3 + 0.7 * Math.abs(Math.sin((i / count) * Math.PI));
    bars.push(Math.max(0.12, Math.min(1, base * envelope)));
  }
  return bars;
}

function fmtTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  // ajout d'un zero devant si besoin
  let secStr = seconds.toString();
  if (seconds < 10) secStr = '0' + seconds;
  return minutes + ':' + secStr;
}

function renderAudioCard(item) {
  const bars = makeWaveBars(item.id);
  let barsHtml = '';
  for (let i = 0; i < bars.length; i++) {
    const h    = bars[i];
    const minH = Math.max(0.1, h * 0.35);
    const dur  = (0.5 + Math.random() * 0.8).toFixed(2);
    const del  = (Math.random() * 0.5).toFixed(2);
    barsHtml += '<div class="audio-waveform-bar"';
    barsHtml += ' style="height:' + Math.round(h * 100) + '%;';
    barsHtml += ' --wave-min:' + minH.toFixed(2) + ';';
    barsHtml += ' --wave-max:' + h.toFixed(2) + ';';
    barsHtml += ' --wave-dur:' + dur + 's;';
    barsHtml += ' --wave-delay:' + del + 's"';
    barsHtml += ' data-idx="' + i + '"></div>';
  }

  let tagsHtml = '';
  const tags = item.tags || [];
  for (let i = 0; i < tags.length; i++) {
    tagsHtml += '<span class="tag">' + escapeHtml(tags[i]) + '</span>';
  }

  return `
    <article class="audio-card reveal" data-audio-id="${escapeHtml(item.id)}">
      <div class="audio-card-inner">
        <div class="audio-card-top">
          <div class="audio-card-meta">
            <strong>${escapeHtml(item.person)}</strong>
            <span>${escapeHtml(item.place)} · ${escapeHtml(item.year)} · ${escapeHtml(item.theme)}</span>
          </div>
          <span class="audio-duration-badge" data-duration="${escapeHtml(item.id)}">${escapeHtml(item.duration)}</span>
        </div>
        <p class="audio-card-desc">${escapeHtml(item.desc)}</p>
        <div class="audio-player">
          <button class="audio-play-btn" type="button"
            aria-label="Lire ${escapeHtml(item.person)}"
            data-play="${escapeHtml(item.id)}">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-icon="play">
              <path d="M8 5.14v13.72L19 12 8 5.14z"/>
            </svg>
          </button>
          <div class="audio-track">
            <div class="audio-waveform" data-waveform="${escapeHtml(item.id)}" role="slider"
              aria-label="Avancer dans l'enregistrement" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              ${barsHtml}
            </div>
            <div class="audio-progress-wrap" data-progress-wrap="${escapeHtml(item.id)}">
              <div class="audio-progress-fill" data-progress="${escapeHtml(item.id)}" style="width:0%"></div>
            </div>
            <div class="audio-time">
              <span class="current" data-current="${escapeHtml(item.id)}">0:00</span>
              <span class="total"   data-total="${escapeHtml(item.id)}">${escapeHtml(item.duration)}</span>
            </div>
          </div>
        </div>
        <div class="audio-card-tags">${tagsHtml}</div>
      </div>
    </article>`;
}

// Rendu de la grille audio
function renderAudioGrid() {
  const grid = document.getElementById('audioGrid');
  if (!grid) return;
  if (baseAudio.length === 0) {
    grid.innerHTML = '<div class="audio-empty">Aucun enregistrement disponible pour le moment.</div>';
    return;
  }
  grid.innerHTML = baseAudio.map(renderAudioCard).join('');
}

// Coupe le son proprement
function stopCurrentAudio() {
  if (ytPlayer && ytApiReady) {
    try { ytPlayer.stopVideo(); } catch(e) {}
  }
  cancelAnimationFrame(audioState.raf);
  clearTimeout(audioState.timer);
  audioState.raf = null;
  audioState.timer = null;

  const prevCard = document.querySelector('.audio-card[data-audio-id="' + audioState.current + '"]');
  if (prevCard) {
    prevCard.classList.remove('is-playing');
    const btn = prevCard.querySelector('[data-play]');
    if (btn) btn.querySelector('svg').innerHTML = '<path d="M8 5.14v13.72L19 12 8 5.14z"/>';
  }
  audioState.current = null;
}

function toggleAudio(id) {
  const item = baseAudio.find(function(a) { return a.id === id; });
  if (!item) return;

  // si l'API n'est pas encore chargée, on retient l'id et on attend
  if (!ytApiReady || !ytPlayer) {
    ytPendingId = id;
    return;
  }

  // même carte -> pause/reprise
  if (audioState.current === id) {
    const state = ytPlayer.getPlayerState();
    // YT.PlayerState.PLAYING = 1
    if (state === 1) {
      ytPlayer.pauseVideo();
      cancelAnimationFrame(audioState.raf);
      document.querySelector('.audio-card[data-audio-id="' + id + '"]')?.classList.remove('is-playing');
      setPlayIcon(id, true);
    } else {
      ytPlayer.playVideo();
    }
    return;
  }

  // nouvelle carte -> on arrête l'ancienne
  stopCurrentAudio();
  audioState.current = id;

  const ytId = extractYoutubeId(item.ytId || '');
  if (!ytId) {
    // pas d'ID YouTube renseigné -> simulation visuelle
    simulatePlayback(id, item.duration);
    return;
  }

  ytPlayer.loadVideoById(ytId);
  ytPlayer.playVideo();

  // petite attente pour que getDuration() soit dispo
  setTimeout(function() {
    const dur = ytPlayer.getDuration ? ytPlayer.getDuration() : 0;
    const total = document.querySelector('[data-total="' + id + '"]');
    const badge = document.querySelector('[data-duration="' + id + '"]');
    if (dur > 0) {
      if (total) total.textContent = fmtTime(dur);
      if (badge) badge.textContent = fmtTime(dur);
    }
  }, 1200);

  setPlayIcon(id, true);
}

// Mode simulation visuelle quand pas d'ytId renseigné
function simulatePlayback(id, durationStr) {
  const card = document.querySelector('.audio-card[data-audio-id="' + id + '"]');
  if (card) card.classList.add('is-playing');
  setPlayIcon(id, false);

  const parts = (durationStr || '1:00').split(':');
  const totalSec = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  let elapsed = 0;
  const step = 0.1;

  const tick = function() {
    elapsed += step;
    const pct = Math.min(1, elapsed / totalSec);
    const fill = document.querySelector('[data-progress="' + id + '"]');
    const cur  = document.querySelector('[data-current="' + id + '"]');
    if (fill) fill.style.width = (pct * 100).toFixed(1) + '%';
    if (cur)  cur.textContent  = fmtTime(elapsed);
    updateWaveBars(id, pct);

    if (elapsed < totalSec && audioState.current === id) {
      audioState.timer = setTimeout(tick, step * 1000);
    } else if (elapsed >= totalSec) {
      stopCurrentAudio();
    }
  };

  audioState.timer = setTimeout(tick, step * 1000);
}

// Boucle de mise à jour de la barre de progression (son YouTube réel)
function startProgressLoop(id) {
  cancelAnimationFrame(audioState.raf);
  const loop = function() {
    if (!ytPlayer || audioState.current !== id) return;
    let current = 0;
    let total = 0;
    try {
      current = ytPlayer.getCurrentTime() || 0;
      total   = ytPlayer.getDuration()    || 0;
    } catch(e) {}

    const pct  = total > 0 ? current / total : 0;
    const fill = document.querySelector('[data-progress="' + id + '"]');
    const cur  = document.querySelector('[data-current="' + id + '"]');
    if (fill) fill.style.width = (pct * 100).toFixed(1) + '%';
    if (cur)  cur.textContent  = fmtTime(current);
    updateWaveBars(id, pct);
    audioState.raf = requestAnimationFrame(loop);
  };
  audioState.raf = requestAnimationFrame(loop);
}

// Met à jour la couleur des barres selon l'avancement
function updateWaveBars(id, pct) {
  const waveform = document.querySelector('[data-waveform="' + id + '"]');
  if (!waveform) return;
  const bars = waveform.querySelectorAll('.audio-waveform-bar');
  const threshold = Math.floor(pct * bars.length);
  for (let i = 0; i < bars.length; i++) {
    if (i < threshold) {
      bars[i].classList.add('played');
    } else {
      bars[i].classList.remove('played');
    }
  }
}

function setPlayIcon(id, isPlay) {
  const btn = document.querySelector('[data-play="' + id + '"]');
  if (!btn) return;
  const svg = btn.querySelector('svg');
  if (!svg) return;
  if (isPlay) {
    svg.innerHTML = '<path d="M8 5.14v13.72L19 12 8 5.14z"/>';
  } else {
    svg.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  }
}

function setupAudioSeek() {
  const grid = document.getElementById('audioGrid');
  if (!grid) return;

  const seek = function(id, pct) {
    if (audioState.current !== id) return;
    if (!ytPlayer || !ytApiReady) return;
    try {
      const total = ytPlayer.getDuration() || 0;
      if (total > 0) ytPlayer.seekTo(pct * total, true);
    } catch(e) {}
  };

  grid.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-play]');
    if (btn) { toggleAudio(btn.dataset.play); return; }

    const wf = e.target.closest('[data-waveform]');
    if (wf) {
      const rect = wf.getBoundingClientRect();
      seek(wf.dataset.waveform, (e.clientX - rect.left) / rect.width);
      return;
    }

    const pw = e.target.closest('[data-progress-wrap]');
    if (pw) {
      const rect = pw.getBoundingClientRect();
      seek(pw.dataset.progressWrap, (e.clientX - rect.left) / rect.width);
    }
  });
}


const addForm = document.getElementById("addForm");

const state = {
  activeId: null,
  activeAudio: null, 
  activeVideo: null
};

// Sécuriser les chaines de caracteres (trouvé sur stackoverflow)
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openSuccessModal() {
  const m = document.getElementById("successModal");
  if (!m) return;
  m.classList.add("open");
  document.body.style.overflow = "hidden";
  animateSuccessModal(true);
}

function closeSuccessModal() {
  const m = document.getElementById("successModal");
  if (!m || !m.classList.contains("open")) return;
  animateSuccessModal(false);
  setTimeout(() => {
    m.classList.remove("open");
    document.body.style.overflow = "";
  }, 250);
}

function animateSuccessModal(opening) {
  const m = document.getElementById("successModal");
  if (!m) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  
  const dialog = m.querySelector(".dialog");
  const backdrop = m.querySelector(".backdrop");
  
  if (window.gsap) {
    if (opening) {
      gsap.set(dialog, { y: 14, opacity: 0, scale: 0.96 });
      gsap.set(backdrop, { opacity: 0 });
      gsap.to(backdrop, { opacity: 1, duration: 0.2 });
      gsap.to(dialog, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.2)" });
    } else {
      gsap.to(dialog, { y: 10, opacity: 0, scale: 0.96, duration: 0.2 });
      gsap.to(backdrop, { opacity: 0, duration: 0.2 });
    }
  }
}

function setupSuccessModal() {
  const m = document.getElementById("successModal");
  const closeBtn = document.getElementById("successClose");
  if (!m) return;
  
  closeBtn?.addEventListener("click", closeSuccessModal);
  m.addEventListener("click", (e) => {
    if (e.target.dataset.closeSuccess) closeSuccessModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && m.classList.contains("open")) closeSuccessModal();
  });
}

function setupEvents() {
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("fName").value.trim();
    const text = document.getElementById("fText").value.trim();
    if (!name || !text) return;

    openSuccessModal();
    addForm.reset();
  });
}

function animateHeaderSeal() {
  const seal = document.querySelector(".seal");
  if (!seal) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.gsap) {
    gsap.to(seal, { rotation: 360, duration: 18, ease: "none", repeat: -1 });
    gsap.to(seal, { y: -2, duration: 2.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.to(seal, {
      boxShadow: "0 16px 28px rgba(0,0,0,0.38)",
      duration: 2.2,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  } else {
    seal.animate([{ transform: "translateY(0px)" }, { transform: "translateY(-2px)" }], {
      duration: 2200,
      direction: "alternate",
      iterations: Infinity,
      easing: "ease-in-out"
    });
  }
}

function animateReveals() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll(".reveal");
  if (targets.length === 0) return;

  if (reduce) {
    for (const el of targets) {
      el.style.opacity = "1";
      el.style.transform = "none";
    }
    return;
  }

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    targets.forEach((el) => {
      if (el.dataset._reveal === "1") return;
      el.dataset._reveal = "1";
      gsap.fromTo(
        el,
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" }
        }
      );
    });
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        el.style.transition = "transform 520ms ease, opacity 520ms ease";
        el.style.transform = "translateY(0px)";
        el.style.opacity = "1";
        io.unobserve(el);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
  );

  for (const el of targets) {
    if (el.dataset._reveal === "1") continue;
    el.dataset._reveal = "1";
    el.style.opacity = "0";
    el.style.transform = "translateY(14px)";
    io.observe(el);
  }
}

function animateIntro() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  const hero = document.querySelector(".hero");
  const cards = document.querySelectorAll(".hero .btn, .heroCard, .hero h2, .hero p");
  if (!hero || cards.length === 0) return;
  if (window.gsap) {
    gsap.fromTo(hero, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out" });
    gsap.fromTo(
      cards,
      { y: 14, opacity: 0, filter: "blur(3px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, stagger: 0.06, ease: "power2.out" }
    );
  }
}

function init() {
  loadYouTubeAPI();
  renderAudioGrid();
  renderVideoGrid();
  setupEvents();
  setupSuccessModal();
  setupAudioSeek();
  setupVideoModal();
  animateHeaderSeal();
  animateIntro();
  animateReveals();
}

// --- Données des vidéos ---
const baseVideos = [
  {
    id: "v1",
    person: "Marcel D.",
    year: "1942",
    place: "Toulouse",
    theme: "Vie quotidienne",
    tags: ["rationnement", "occupation"],
    desc: "Marcel raconte les files devant les boulangeries et la vie sous l'Occupation à Toulouse.",
    type: "youtube",
    src: "JyMIWCjOS8U",           
    thumb: "https://i3.ytimg.com/vi/JyMIWCjOS8U/maxresdefault.jpg", 
    duration: "9:59"
  },
];

// creation de la pellicule
function makeFilmStrip(count = 10) {
  let html = "";
  for(let i = 0; i < count; i++) {
    html += '<div class="video-strip-hole"></div>';
  }
  return html;
}

// affichage des cartes videos
function renderVideoCard(item) {
  const tagsHtml = (item.tags || []).slice(0, 3)
    .map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

  const typeBadge = item.type === 'youtube'
    ? `<span class="video-type-badge youtube">▶ YouTube</span>`
    : `<span class="video-type-badge local">⬛ Fichier local</span>`;

  let thumbContent = '';
  if (item.thumb) {
    thumbContent = `<img src="${escapeHtml(item.thumb)}" alt="" loading="lazy" />`;
  } else if (item.type === 'youtube' && item.src) {
    const ytId = extractYoutubeId(item.src);
    thumbContent = `<img src="https://img.youtube.com/vi/${escapeHtml(ytId)}/maxresdefault.jpg" alt="" loading="lazy" />`;
  }

  return `
    <article class="video-card reveal" data-video-id="${escapeHtml(item.id)}" tabindex="0"
      role="button" aria-label="Visionner : ${escapeHtml(item.person)}">
      <div class="video-thumb">
        <div class="video-thumb-bg"></div>
        ${thumbContent}
        <div class="video-thumb-vignette"></div>

        <!-- Pellicule haut -->
        <div class="video-thumb-strips top">${makeFilmStrip()}</div>

        <!-- Bouton play -->
        <div class="video-play-overlay" aria-hidden="true">
          <div class="video-play-ring">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5.14v13.72L19 12 8 5.14z"/>
            </svg>
          </div>
        </div>

        <!-- Pellicule bas -->
        <div class="video-thumb-strips bottom">${makeFilmStrip()}</div>

        ${item.duration ? `<span class="video-duration">${escapeHtml(item.duration)}</span>` : ''}
      </div>

      <div class="video-card-body">
        <div class="video-card-header">
          <div class="video-card-title">${escapeHtml(item.person)}</div>
          ${typeBadge}
        </div>
        <div class="video-card-meta">${escapeHtml(item.place)} · ${escapeHtml(item.year)} · ${escapeHtml(item.theme)}</div>
        <p class="video-card-desc">${escapeHtml(item.desc)}</p>
        <div class="video-card-footer">
          <div class="tags">${tagsHtml}</div>
          <span class="btn" style="font-size:10px; padding:7px 14px; pointer-events:none">▶ Visionner</span>
        </div>
      </div>
    </article>`;
}

function renderVideoGrid() {
  const grid = document.getElementById('videoGrid');
  if (!grid) return;
  if (!baseVideos.length) {
    grid.innerHTML = `<div class="video-empty">Aucune vidéo disponible pour le moment.</div>`;
    return;
  }
  grid.innerHTML = baseVideos.map(renderVideoCard).join('');
}

function extractYoutubeId(raw) {
  if (!raw) return '';
  const fromUrl = raw.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (fromUrl) return fromUrl[1];
  const fromParams = raw.match(/^([A-Za-z0-9_-]{11})/);
  if (fromParams) return fromParams[1];
  return raw;
}

// Affichage de la lightbox
function openVideoModal(item) {
  const modal   = document.getElementById('videoModal');
  const player  = document.getElementById('videoPlayer');
  const title   = document.getElementById('videoModalTitle');
  const meta    = document.getElementById('videoModalMeta');
  const desc    = document.getElementById('videoModalDesc');
  if (!modal || !player) return;

  title.textContent = item.person;
  meta.textContent  = `${item.place} · ${item.year} · ${item.theme}`;
  desc.textContent  = item.desc;

  player.innerHTML = '';

  if (item.type === 'youtube' && item.src) {
    const ytId = extractYoutubeId(item.src);
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    player.appendChild(iframe);
  } else if (item.type === 'local' && item.src) {
    const video = document.createElement('video');
    video.src = item.src;
    video.controls = true;
    video.autoplay = true;
    video.style.cssText = 'width:100%;height:100%;background:#000;';
    player.appendChild(video);
  } else {
    player.innerHTML = `
      <div style="
        position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:14px;
        background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,168,76,.09), transparent 65%), #080709;
      ">
        <span style="font-size:44px;opacity:.35;animation:quill-float 3s ease-in-out infinite">🎞</span>
        <span style="font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;color:rgba(201,168,76,.65);">
          Vidéo bientôt disponible
        </span>
        <span style="font-family:'Crimson Pro',serif;font-size:13px;font-style:italic;color:rgba(240,234,224,.38);">
          EZZZZ <code dans <code style="color:rgba(201,168,76,.5);">video</code>
        </span>
      </div>`;
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.gsap) {
    const dialog   = modal.querySelector('.video-modal-dialog');
    const backdrop = modal.querySelector('.backdrop');
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(dialog, { y: 20, opacity: 0, scale: 0.98 });
    gsap.to(backdrop, { opacity: 1, duration: 0.22, ease: 'power2.out' });
    gsap.to(dialog,   { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out', delay: 0.02 });
  }
}

// fermeture lightbox
function closeVideoModal() {
  const modal  = document.getElementById('videoModal');
  const player = document.getElementById('videoPlayer');
  if (!modal || !modal.classList.contains('open')) return;

  const done = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    player.innerHTML = '';
  };

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.gsap) {
    const dialog   = modal.querySelector('.video-modal-dialog');
    const backdrop = modal.querySelector('.backdrop');
    const tl = gsap.timeline({ onComplete: done });
    tl.to(dialog,   { y: 14, opacity: 0, scale: 0.99, duration: 0.2, ease: 'power2.in' }, 0);
    tl.to(backdrop, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
  } else { done(); }
}

// configuration des clics
function setupVideoModal() {
  const closeBtn = document.getElementById('videoModalClose');
  const modal    = document.getElementById('videoModal');
  if (!modal) return;

  closeBtn?.addEventListener('click', closeVideoModal);

  modal.addEventListener('click', e => {
    if (e.target.dataset.closeVideo) closeVideoModal();
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeVideoModal();
  });

  const grid = document.getElementById('videoGrid');
  if (!grid) return;

  const open = e => {
    const card = e.target.closest('.video-card');
    if (!card) return;
    if (e.target.closest('a, button') && !e.target.closest('.video-card > *')) return;
    const id   = card.dataset.videoId;
    const item = baseVideos.find(v => v.id === id);
    if (item) openVideoModal(item);
  };

  grid.addEventListener('click', open);
  grid.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); }
  });
}

init();

const memorial = document.querySelector('.memorialMattio');
memorial.addEventListener("click", () => {
  Swal.fire({
    html: "<h1 class='mattio'>À Pascaline Mattio</h1><p class='ornament'>C'est à cette dame que nous devons ce site.<br/>1931-2026</p>",
    background: "#080709",
    showConfirmButton: false,
    willClose: () => {
      document.querySelector('.swal2-shown').style.cursor = "auto";
    }
  });
  document.querySelector('.swal2-shown').style.cursor = "pointer";
})
