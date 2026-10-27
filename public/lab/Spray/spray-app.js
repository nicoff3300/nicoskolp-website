/**
 * Spray AR — Simulatore di Bomboletta Spray per Realtà Aumentata Mobile
 * Realizzato per www.nicoskolp.com/lab/Spray/
 */

// ==========================================
// 1. GESTORE FOTOCAMERA (CameraManager)
// ==========================================
class CameraManager {
  constructor(videoElement, fallbackElement) {
    this.video = videoElement;
    this.fallback = fallbackElement;
    this.stream = null;
    this.active = false;
  }

  async init() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("MediaDevices API non supportata da questo browser.");
      this.showFallback();
      return false;
    }

    const constraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      this.active = true;
      if (this.fallback) this.fallback.style.display = "none";
      return true;
    } catch (err) {
      console.warn("Impossibile accedere alla fotocamera posteriore:", err);
      // Tentativo secondario generico
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.video.srcObject = this.stream;
        await this.video.play();
        this.active = true;
        if (this.fallback) this.fallback.style.display = "none";
        return true;
      } catch (err2) {
        console.error("Accesso fotocamera negato o non disponibile:", err2);
        this.showFallback();
        return false;
      }
    }
  }

  showFallback() {
    this.active = false;
    if (this.fallback) this.fallback.style.display = "block";
    const label = document.getElementById("tracking-mode-label");
    if (label) label.textContent = "MURO VIRTUALE";
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.active = false;
  }
}

// ==========================================
// 2. TRACCIAMENTO ORIENTAMENTO (OrientationTracker)
// ==========================================
class OrientationTracker {
  constructor() {
    this.hasPermission = false;
    this.calibrated = false;

    // Angoli base calibrati
    this.baseAlpha = null;
    this.baseBeta = null;
    this.baseGamma = null;

    // Angoli correnti
    this.curAlpha = 0;
    this.curBeta = 0;
    this.curGamma = 0;

    // Coordinate target e correnti a schermo
    this.targetX = window.innerWidth / 2;
    this.targetY = window.innerHeight / 2;
    this.currentX = this.targetX;
    this.currentY = this.targetY;

    // Parametri dinamici di risposta
    this.sensitivityX = 26; // pixel per grado
    this.sensitivityY = 28;
    this.smoothFactor = 0.35; // lerp smoothing

    this.onMoveCallback = null;
  }

  async requestPermission() {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === "granted") {
          this.hasPermission = true;
          this.bindEvents();
          return true;
        } else {
          console.warn("Permesso sensori orientamento negato su iOS.");
          this.bindFallbackMouse();
          return false;
        }
      } catch (e) {
        console.warn("Errore richiesta permessi orientamento:", e);
        this.bindFallbackMouse();
        return false;
      }
    } else if ("DeviceOrientationEvent" in window) {
      // Android o browser senza restrizione permission prompt
      this.hasPermission = true;
      this.bindEvents();
      return true;
    } else {
      this.bindFallbackMouse();
      return false;
    }
  }

  bindEvents() {
    window.addEventListener("deviceorientation", (e) => this.handleOrientation(e), true);
    // Supporto per calibrazione automatica al primo frame orientamento
    this.bindFallbackMouse();
  }

  bindFallbackMouse() {
    window.addEventListener("pointermove", (e) => {
      // Se non abbiamo ancora un orientamento mobile reale, consentiamo il mouse/touch move
      if (!this.calibrated) {
        this.targetX = e.clientX;
        this.targetY = e.clientY;
      }
    });
  }

  handleOrientation(e) {
    if (e.alpha === null || e.beta === null) return;

    this.curAlpha = e.alpha;
    this.curBeta = e.beta;
    this.curGamma = e.gamma || 0;

    if (!this.calibrated) {
      this.recenter();
      this.calibrated = true;
    }

    // Differenza angolare rispetto al centro
    let deltaAlpha = this.curAlpha - this.baseAlpha;
    // Normalizzazione delta tra -180 e +180 gradi
    if (deltaAlpha > 180) deltaAlpha -= 360;
    if (deltaAlpha < -180) deltaAlpha += 360;

    let deltaBeta = this.curBeta - this.baseBeta;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Mappatura angoli -> pixel schermo
    // Nota: ruotando il telefono verso sinistra alpha aumenta, per cui invertiamo l'asse X
    this.targetX = centerX - deltaAlpha * this.sensitivityX;
    this.targetY = centerY - deltaBeta * this.sensitivityY;

    // Limiti con margine
    const margin = 10;
    this.targetX = Math.max(margin, Math.min(window.innerWidth - margin, this.targetX));
    this.targetY = Math.max(margin, Math.min(window.innerHeight - margin, this.targetY));
  }

  recenter() {
    this.baseAlpha = this.curAlpha;
    this.baseBeta = this.curBeta;
    this.baseGamma = this.curGamma;

    this.targetX = window.innerWidth / 2;
    this.targetY = window.innerHeight / 2;
    this.currentX = this.targetX;
    this.currentY = this.targetY;

    if (this.onMoveCallback) {
      this.onMoveCallback(this.currentX, this.currentY);
    }
  }

  update() {
    // Interpolazione fluida anti-jitter
    this.currentX += (this.targetX - this.currentX) * this.smoothFactor;
    this.currentY += (this.targetY - this.currentY) * this.smoothFactor;

    if (this.onMoveCallback) {
      this.onMoveCallback(this.currentX, this.currentY);
    }
    return { x: this.currentX, y: this.currentY };
  }
}

// ==========================================
// 3. SINTETIZZATORE AUDIO (SoundEffects)
// ==========================================
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
    this.hissSource = null;
    this.hissGain = null;
    this.hissFilter = null;
    this.isHissing = false;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    // Genera 1 secondo di rumore bianco per il sibilo aerosol
    const bufferSize = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  startHiss() {
    if (!this.ctx) this.init();
    if (!this.ctx || this.isHissing) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.hissSource = this.ctx.createBufferSource();
    this.hissSource.buffer = this.noiseBuffer;
    this.hissSource.loop = true;

    // Filtro passa-banda per frequenze tipiche dell'aerografo/spray
    this.hissFilter = this.ctx.createBiquadFilter();
    this.hissFilter.type = "bandpass";
    this.hissFilter.frequency.value = 2600;
    this.hissFilter.Q.value = 1.3;

    // Filtro passa-alto per eliminare rimbombi
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 1400;

    this.hissGain = this.ctx.createGain();
    this.hissGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    // Attacco rapido e morbido
    this.hissGain.gain.exponentialRampToValueAtTime(0.35, this.ctx.currentTime + 0.05);

    this.hissSource.connect(this.hissFilter);
    this.hissFilter.connect(highpass);
    highpass.connect(this.hissGain);
    this.hissGain.connect(this.ctx.destination);

    this.hissSource.start();
    this.isHissing = true;
  }

  stopHiss() {
    if (!this.isHissing || !this.hissGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.hissGain.gain.setValueAtTime(this.hissGain.gain.value, now);
    this.hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    const src = this.hissSource;
    setTimeout(() => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    }, 90);

    this.isHissing = false;
  }

  playClack() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    // Rattle ball: breve impulso metallico
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(950, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.045);
  }
}

// ==========================================
// 4. MOTORE GRAFICO SPRAY (SprayEngine)
// ==========================================
class SprayEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: false });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    this.color = "#0a0a0a";
    this.capType = "fat"; // 'skinny' | 'fat'

    // Drips (colature)
    this.drips = [];
    this.dwellX = 0;
    this.dwellY = 0;
    this.dwellTimer = 0;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Crea un canvas temporaneo per preservare il disegno già fatto
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx && this.canvas.width > 0) {
      tempCtx.drawImage(this.canvas, 0, 0);
    }

    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);

    this.ctx.scale(this.dpr, this.dpr);

    // Ripristina il disegno scalato
    if (tempCanvas.width > 0) {
      this.ctx.drawImage(tempCanvas, 0, 0, width, height);
    }
  }

  setColor(hexColor) {
    this.color = hexColor;
    document.documentElement.style.setProperty("--current-color", hexColor);
  }

  setCap(capType) {
    this.capType = capType;
  }

  sprayAt(x, y) {
    const ctx = this.ctx;
    const isFat = this.capType === "fat";
    const baseRadius = isFat ? 54 : 18;
    const particleCount = isFat ? 28 : 12;

    // Calcolo dwell per colature (se insiste nello stesso punto per più frame)
    const distToDwell = Math.hypot(x - this.dwellX, y - this.dwellY);
    if (distToDwell < 15) {
      this.dwellTimer += 1;
      if (this.dwellTimer > 45 && Math.random() < 0.22) {
        this.addDrip(x + (Math.random() * 8 - 4), y + baseRadius * 0.4, this.color, isFat);
      }
    } else {
      this.dwellX = x;
      this.dwellY = y;
      this.dwellTimer = 0;
    }

    // 1. Spruzzo centrale a gradiente radiale
    const grad = ctx.createRadialGradient(x, y, 0, x, y, baseRadius);
    const rgb = this.hexToRgb(this.color);
    grad.addColorStop(0.0, `rgba(${rgb}, ${isFat ? 0.32 : 0.48})`);
    grad.addColorStop(0.4, `rgba(${rgb}, ${isFat ? 0.18 : 0.24})`);
    grad.addColorStop(0.75, `rgba(${rgb}, 0.05)`);
    grad.addColorStop(1.0, `rgba(${rgb}, 0)`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Nube di microparticelle polverizzate (Overspray)
    ctx.fillStyle = `rgba(${rgb}, 0.65)`;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Distribuzione esponenziale per addensare verso il centro
      const spread = Math.pow(Math.random(), 1.5) * (baseRadius * 1.25);
      const px = x + Math.cos(angle) * spread;
      const py = y + Math.sin(angle) * spread;
      const pRadius = 0.5 + Math.random() * (isFat ? 1.8 : 1.1);

      ctx.beginPath();
      ctx.arc(px, py, pRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  addDrip(x, y, color, isFat) {
    this.drips.push({
      x: x,
      y: y,
      curY: y,
      speed: 0.6 + Math.random() * 1.4,
      width: isFat ? (2.2 + Math.random() * 2.5) : (1.4 + Math.random() * 1.2),
      length: 25 + Math.random() * 90,
      color: color,
      alpha: 0.85
    });
  }

  updateDrips() {
    if (this.drips.length === 0) return;
    const ctx = this.ctx;

    for (let i = this.drips.length - 1; i >= 0; i--) {
      const d = this.drips[i];
      const prevY = d.curY;
      d.curY += d.speed;

      // Disegna segmento colatura
      const rgb = this.hexToRgb(d.color);
      ctx.save();
      ctx.strokeStyle = `rgba(${rgb}, ${d.alpha})`;
      ctx.lineWidth = d.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(d.x, prevY);
      ctx.lineTo(d.x, d.curY);
      ctx.stroke();

      // Goccia finale
      ctx.fillStyle = `rgba(${rgb}, ${d.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.curY, d.width * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Rallenta e termina
      d.speed *= 0.985;
      d.width *= 0.995;
      if (d.curY - d.y >= d.length || d.speed < 0.08) {
        this.drips.splice(i, 1);
      }
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    this.drips = [];
    this.dwellTimer = 0;
  }

  hexToRgb(hex) {
    let clean = hex.replace("#", "");
    if (clean.length === 3) {
      clean = clean.split("").map(c => c + c).join("");
    }
    const num = parseInt(clean, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }
}

// ==========================================
// 5. COORDINATORE APP PRINCIPALE (SprayApp)
// ==========================================
class SprayApp {
  constructor() {
    this.videoEl = document.getElementById("camera-video");
    this.fallbackEl = document.getElementById("camera-fallback");
    this.canvasEl = document.getElementById("spray-canvas");
    this.reticleEl = document.getElementById("reticle");
    this.triggerAreaEl = document.getElementById("spray-trigger-area");
    this.startOverlayEl = document.getElementById("start-overlay");
    this.startBtnEl = document.getElementById("start-btn");
    this.recenterBtnEl = document.getElementById("recenter-btn");
    this.clearBtnEl = document.getElementById("clear-btn");
    this.capSkinnyBtnEl = document.getElementById("cap-skinny");
    this.capFatBtnEl = document.getElementById("cap-fat");
    this.paletteBarEl = document.getElementById("palette-bar");

    this.camera = new CameraManager(this.videoEl, this.fallbackEl);
    this.tracker = new OrientationTracker();
    this.audio = new SoundEffects();
    this.engine = new SprayEngine(this.canvasEl);

    this.isSpraying = false;
    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    this.initListeners();
    this.startLoop();
  }

  initListeners() {
    // Sblocco iniziale con interazione utente (obbligatorio per Web Audio, fotocamera e sensori iOS)
    this.startBtnEl.addEventListener("click", () => this.unlockAndStart());

    // Recenter mirino
    this.recenterBtnEl.addEventListener("click", () => {
      this.tracker.recenter();
      if ("vibrate" in navigator) navigator.vibrate(30);
    });

    // Pulisci muro
    this.clearBtnEl.addEventListener("click", () => {
      if (confirm("Vuoi cancellare tutta la vernice dal muro?")) {
        this.engine.clear();
        if ("vibrate" in navigator) navigator.vibrate([20, 40, 20]);
      }
    });

    // Toggle Cap
    this.capSkinnyBtnEl.addEventListener("click", () => {
      this.engine.setCap("skinny");
      this.capSkinnyBtnEl.classList.add("active");
      this.capFatBtnEl.classList.remove("active");
    });

    this.capFatBtnEl.addEventListener("click", () => {
      this.engine.setCap("fat");
      this.capFatBtnEl.classList.add("active");
      this.capSkinnyBtnEl.classList.remove("active");
    });

    // Palette Colori
    this.paletteBarEl.addEventListener("click", (e) => {
      const chip = e.target.closest(".color-chip");
      if (!chip) return;
      this.paletteBarEl.querySelectorAll(".color-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const color = chip.dataset.color;
      this.engine.setColor(color);
      if ("vibrate" in navigator) navigator.vibrate(15);
    });

    // Grilletto Spray (touch & hold su trigger area o tocco continuo a schermo)
    const onTriggerStart = (e) => {
      e.preventDefault();
      this.isSpraying = true;
      document.body.classList.add("spraying");
      this.audio.startHiss();
      if ("vibrate" in navigator) navigator.vibrate(25);
    };

    const onTriggerEnd = (e) => {
      e.preventDefault();
      this.isSpraying = false;
      document.body.classList.remove("spraying");
      this.audio.stopHiss();
      this.engine.dwellTimer = 0;
    };

    this.triggerAreaEl.addEventListener("pointerdown", onTriggerStart);
    window.addEventListener("pointerup", onTriggerEnd);
    window.addEventListener("pointercancel", onTriggerEnd);

    // Supporto shake detector per il caratteristico rumore della biglia
    let lastShake = 0;
    window.addEventListener("devicemotion", (e) => {
      const acc = e.acceleration || e.accelerationIncludingGravity;
      if (!acc) return;
      const speed = Math.hypot(acc.x || 0, acc.y || 0, acc.z || 0);
      const now = performance.now();
      if (speed > 22 && now - lastShake > 260) {
        lastShake = now;
        this.audio.playClack();
        if ("vibrate" in navigator) navigator.vibrate(18);
      }
    });
  }

  async unlockAndStart() {
    this.startBtnEl.disabled = true;
    this.startBtnEl.textContent = "ATTIVAZIONE IN CORSO...";

    // 1. Inizializza Audio Context
    this.audio.init();

    // 2. Richiedi sensori orientamento
    await this.tracker.requestPermission();

    // 3. Avvia fotocamera
    await this.camera.init();

    // Nascondi overlay iniziale
    this.startOverlayEl.classList.add("hidden");
    this.tracker.recenter();
  }

  startLoop() {
    const loop = () => {
      // Aggiorna posizione dal tracker
      this.pos = this.tracker.update();

      // Posiziona il mirino
      this.reticleEl.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0) translate(-50%, -50%)`;

      // Eroga spray se il grilletto è tenuto premuto
      if (this.isSpraying) {
        this.engine.sprayAt(this.pos.x, this.pos.y);
      }

      // Aggiorna eventuali colature
      this.engine.updateDrips();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

// Avvio automatico al caricamento del DOM
window.addEventListener("DOMContentLoaded", () => {
  window.sprayApp = new SprayApp();
});
