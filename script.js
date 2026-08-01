/* ==========================================================================
   Girlfriend's Day Interactive Experience - Script Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  const confettiCanvas = document.getElementById('confetti-canvas');
  const confettiCtx = confettiCanvas.getContext('2d');

  // Audio Controls
  const mainAudio = document.getElementById('main-audio');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const playIcon = document.getElementById('play-icon');
  const vinylRecord = document.getElementById('vinyl-record');
  const tonearm = document.getElementById('tonearm');
  const progressBar = document.getElementById('progress-bar');
  const progressHandle = document.getElementById('progress-handle');
  const progressContainer = document.getElementById('progress-container');
  const currentTimeEl = document.getElementById('current-time');
  const totalDurationEl = document.getElementById('total-duration');
  const restartBtn = document.getElementById('restart-btn');
  const muteBtn = document.getElementById('mute-btn');
  const volumeIcon = document.getElementById('volume-icon');

  // Envelope & Letter
  const envelope = document.getElementById('envelope');
  const waxSeal = document.getElementById('wax-seal');
  const sealIcon = document.getElementById('seal-icon');
  const envelopeSubtitle = document.getElementById('envelope-subtitle');

  // Love Meter
  const loveSlider = document.getElementById('love-slider');
  const meterValue = document.getElementById('meter-value');
  const meterStatus = document.getElementById('meter-status');
  const boostLoveBtn = document.getElementById('boost-love-btn');

  // Modals
  const wishModal = document.getElementById('wish-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalReplayBtn = document.getElementById('modal-replay-btn');
  const modalLetterBtn = document.getElementById('modal-letter-btn');
  const toastNotification = document.getElementById('toast-notification');

  // State Variables
  let isPlaying = false;
  let isSynthPlaying = false;
  let isCustomAudioLoaded = mainAudio.hasAttribute('src') && mainAudio.getAttribute('src').length > 0;
  let hasPlayedAudioOnce = false; // Audio Lock Flag for Love Letter
  let audioContext = null;
  let synthTimer = null;
  let synthCurrentTime = 0;
  const synthTotalDuration = 45; // 45 seconds synthesized melody fallback

  if (isCustomAudioLoaded) {
    mainAudio.addEventListener('loadedmetadata', () => {
      if (mainAudio.duration) {
        totalDurationEl.textContent = formatTime(mainAudio.duration);
      }
    });
  }

  /* ==========================================================================
     1. Cursor & Touch Rose Petal Particle Engine
     ========================================================================== */
  let particles = [];
  const petalSymbols = ['🌹', '🌸', '🥀', '🌺', '💖', '✨'];

  function resizeCanvases() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  class PetalParticle {
    constructor(x, y, isTrail = false) {
      this.x = x || Math.random() * bgCanvas.width;
      this.y = y || bgCanvas.height + Math.random() * 40;
      this.isTrail = isTrail;
      this.size = isTrail ? Math.random() * 16 + 14 : Math.random() * 20 + 12;
      this.speedY = isTrail ? Math.random() * 2 + 1 : -(Math.random() * 1.5 + 0.5);
      this.speedX = (Math.random() - 0.5) * 2;
      this.symbol = petalSymbols[Math.floor(Math.random() * petalSymbols.length)];
      this.opacity = isTrail ? 1.0 : Math.random() * 0.7 + 0.3;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 3;
      this.swaySpeed = Math.random() * 0.05 + 0.02;
    }

    update() {
      this.y += this.speedY;
      this.x += Math.sin(this.y * this.swaySpeed) * 1.5 + this.speedX;
      this.rotation += this.rotationSpeed;
      if (this.isTrail) {
        this.opacity -= 0.015;
      }
    }

    draw() {
      bgCtx.save();
      bgCtx.translate(this.x, this.y);
      bgCtx.rotate((this.rotation * Math.PI) / 180);
      bgCtx.globalAlpha = Math.max(0, this.opacity);

      bgCtx.font = `${this.size}px sans-serif`;
      bgCtx.textAlign = 'center';
      bgCtx.textBaseline = 'middle';
      bgCtx.fillText(this.symbol, 0, 0);

      bgCtx.restore();
    }
  }

  // Initial Background Floating Petals
  for (let i = 0; i < 35; i++) {
    particles.push(new PetalParticle());
  }

  function animateParticles() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();

      if (particles[i].y > bgCanvas.height + 40 || particles[i].y < -40 || particles[i].opacity <= 0) {
        particles.splice(i, 1);
        if (particles.length < 40) {
          particles.push(new PetalParticle());
        }
      }
    }
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // Mouse / Touch Trail
  function spawnRosePetalTrail(x, y) {
    for (let i = 0; i < 2; i++) {
      particles.push(new PetalParticle(x, y, true));
    }
  }

  window.addEventListener('mousemove', (e) => {
    if (Math.random() < 0.6) {
      spawnRosePetalTrail(e.clientX, e.clientY);
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      spawnRosePetalTrail(e.touches[0].clientX, e.touches[0].clientY);
    }
  });

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      spawnRosePetalTrail(e.touches[0].clientX, e.touches[0].clientY);
    }
  });

  /* ==========================================================================
     2. Toast Notification Helper
     ========================================================================== */
  function showToast(msg, duration = 3500) {
    toastNotification.innerHTML = msg;
    toastNotification.classList.add('show');
    setTimeout(() => {
      toastNotification.classList.remove('show');
    }, duration);
  }

  /* ==========================================================================
     3. Web Audio API Synthesizer (Romantic Soundscape Fallback)
     ========================================================================== */
  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function playHeartChime() {
    try {
      const ctx = getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.1);
        osc.stop(ctx.currentTime + index * 0.1 + 0.8);
      });
    } catch (e) {}
  }

  let synthNodes = [];
  function startSynthMelody() {
    const ctx = getAudioContext();
    isSynthPlaying = true;
    synthCurrentTime = 0;

    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];

    let step = 0;
    function playChord() {
      if (!isSynthPlaying) return;
      
      const currentChord = chords[step % chords.length];
      currentChord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.05);
        osc.stop(ctx.currentTime + idx * 0.05 + 1.8);
        synthNodes.push(osc);
      });

      step++;
    }

    playChord();
    const intervalId = setInterval(() => {
      if (!isSynthPlaying) {
        clearInterval(intervalId);
        return;
      }
      playChord();
    }, 2000);

    totalDurationEl.textContent = formatTime(synthTotalDuration);
    synthTimer = setInterval(() => {
      if (!isSynthPlaying) return;
      synthCurrentTime++;
      currentTimeEl.textContent = formatTime(synthCurrentTime);
      const percent = (synthCurrentTime / synthTotalDuration) * 100;
      progressBar.style.width = `${percent}%`;
      progressHandle.style.left = `${percent}%`;

      if (synthCurrentTime >= synthTotalDuration) {
        stopAudioPlayback();
        triggerWishModal();
      }
    }, 1000);
  }

  function stopSynthMelody() {
    isSynthPlaying = false;
    if (synthTimer) clearInterval(synthTimer);
    synthNodes.forEach(node => {
      try { node.stop(); } catch(e){}
    });
    synthNodes = [];
  }

  /* ==========================================================================
     4. Audio Player Logic & Audio-Gated Envelope Unlocking
     ========================================================================== */
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  function unlockEnvelope() {
    if (!hasPlayedAudioOnce) {
      hasPlayedAudioOnce = true;
      envelope.classList.remove('locked');
      sealIcon.className = 'fa-solid fa-heart';
      envelopeSubtitle.textContent = 'Wax seal unsealed! Tap to open your handwritten letter 💌';
      showToast('💖 Love letter unsealed! You can now open it below.', 4000);
    }
  }

  function togglePlayPause() {
    if (isPlaying) {
      pauseAudioPlayback();
    } else {
      startAudioPlayback();
    }
  }

  function startAudioPlayback() {
    isPlaying = true;
    playIcon.className = 'fa-solid fa-pause';
    vinylRecord.classList.add('spinning');
    tonearm.classList.add('playing');

    unlockEnvelope();

    if (isCustomAudioLoaded) {
      mainAudio.play().catch(err => console.log('Audio autoplay prevented:', err));
    } else {
      startSynthMelody();
    }
    playHeartChime();
  }

  function pauseAudioPlayback() {
    isPlaying = false;
    playIcon.className = 'fa-solid fa-play';
    vinylRecord.classList.remove('spinning');
    tonearm.classList.remove('playing');

    if (isCustomAudioLoaded) {
      mainAudio.pause();
    } else {
      stopSynthMelody();
    }
  }

  function stopAudioPlayback() {
    pauseAudioPlayback();
    if (isCustomAudioLoaded) {
      mainAudio.currentTime = 0;
    } else {
      synthCurrentTime = 0;
      progressBar.style.width = '0%';
      progressHandle.style.left = '0%';
      currentTimeEl.textContent = '0:00';
    }
  }

  mainAudio.addEventListener('timeupdate', () => {
    if (isCustomAudioLoaded && mainAudio.duration) {
      currentTimeEl.textContent = formatTime(mainAudio.currentTime);
      totalDurationEl.textContent = formatTime(mainAudio.duration);
      const percent = (mainAudio.currentTime / mainAudio.duration) * 100;
      progressBar.style.width = `${percent}%`;
      progressHandle.style.left = `${percent}%`;
    }
  });

  mainAudio.addEventListener('ended', () => {
    stopAudioPlayback();
    triggerWishModal();
  });

  // Controls Event Listeners
  playPauseBtn.addEventListener('click', togglePlayPause);
  restartBtn.addEventListener('click', () => {
    if (isCustomAudioLoaded) {
      mainAudio.currentTime = 0;
    } else {
      synthCurrentTime = 0;
    }
    startAudioPlayback();
  });

  muteBtn.addEventListener('click', () => {
    if (mainAudio.muted) {
      mainAudio.muted = false;
      volumeIcon.className = 'fa-solid fa-volume-high';
    } else {
      mainAudio.muted = true;
      volumeIcon.className = 'fa-solid fa-volume-xmark';
    }
  });

  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (isCustomAudioLoaded && mainAudio.duration) {
      mainAudio.currentTime = pos * mainAudio.duration;
    } else {
      synthCurrentTime = Math.floor(pos * synthTotalDuration);
      currentTimeEl.textContent = formatTime(synthCurrentTime);
      progressBar.style.width = `${pos * 100}%`;
      progressHandle.style.left = `${pos * 100}%`;
    }
  });

  /* ==========================================================================
     5. Audio-Gated Love Letter Opening Logic
     ========================================================================== */
  function handleEnvelopeClick(e) {
    e.stopPropagation();
    
    if (!hasPlayedAudioOnce) {
      envelope.classList.add('shake');
      setTimeout(() => envelope.classList.remove('shake'), 500);
      showToast('🎵 Please press play on the audio player once to unseal your love letter!', 4000);
      return;
    }

    envelope.classList.toggle('open');
    playHeartChime();
  }

  waxSeal.addEventListener('click', handleEnvelopeClick);
  envelope.addEventListener('click', handleEnvelopeClick);

  /* ==========================================================================
     6. Love Meter Engine
     ========================================================================== */
  function updateLoveMeter(val) {
    const num = parseInt(val);
    let formattedVal = num.toLocaleString() + '%';
    let statusText = '';

    if (num < 1000) {
      statusText = 'Maximum Love Level Reached! 💕';
    } else if (num < 50000) {
      statusText = 'To the Moon and Back! 🌙✨';
    } else if (num < 500000) {
      statusText = 'Beyond the Edge of the Known Universe! 🌌💖';
    } else {
      formattedVal = '∞ INFINITY %';
      statusText = 'My Love For You Has No Limits! 👑❤️';
    }

    meterValue.textContent = formattedVal;
    meterStatus.textContent = statusText;
  }

  loveSlider.addEventListener('input', (e) => {
    updateLoveMeter(e.target.value);
  });

  boostLoveBtn.addEventListener('click', () => {
    loveSlider.value = 1000000;
    updateLoveMeter(1000000);
    launchConfetti();
    playHeartChime();
  });

  /* ==========================================================================
     7. SILENT Email Notification to rvch752@gmail.com
     ========================================================================== */
  function sendEmailNotification(couponName) {
    const recipientEmail = "rvch752@gmail.com";
    const herName = document.getElementById('her-name-display').textContent || "Your Girlfriend";
    
    const formData = new FormData();
    formData.append("_subject", `🎟️ Girlfriend's Day Coupon Redeemed: ${couponName}`);
    formData.append("Her Name", herName);
    formData.append("Redeemed Coupon", couponName);
    formData.append("Redemption Date", new Date().toLocaleString());
    formData.append("Message", `Congratulations! ${herName} has just redeemed the coupon "${couponName}" on your Girlfriend's Day webpage!`);

    fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
      method: "POST",
      body: formData
    })
    .then(res => res.json())
    .catch(() => {});
  }

  document.querySelectorAll('.coupon-card').forEach(card => {
    const couponName = card.dataset.coupon || card.querySelector('h3').textContent;
    const btn = card.querySelector('.redeem-btn');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.textContent = 'Redeemed! 💖';
      btn.classList.add('redeemed');
      
      // Silent Background Email Notification
      sendEmailNotification(couponName);

      showToast(`🎟️ Coupon "${couponName}" Redeemed! Your promise is saved 💖`, 3500);
      launchConfetti();
      playHeartChime();
    });
  });

  /* ==========================================================================
     8. Canvas Confetti System
     ========================================================================== */
  let confettiParticles = [];
  function launchConfetti() {
    confettiParticles = [];
    const colors = ['#ff4d6d', '#ff8fa3', '#ffb703', '#ffffff', '#9d4edd', '#ff758c'];
    
    for (let i = 0; i < 120; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: -20,
        size: Math.random() * 10 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: Math.random() * 3 + 2,
        speedX: (Math.random() - 0.5) * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
        opacity: 1,
        isHeart: Math.random() < 0.5
      });
    }

    animateConfetti();
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let activeParticles = 0;

    confettiParticles.forEach(p => {
      if (p.opacity > 0) {
        activeParticles++;
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.005;

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.globalAlpha = Math.max(0, p.opacity);

        if (p.isHeart) {
          confettiCtx.font = `${p.size * 1.5}px sans-serif`;
          confettiCtx.fillText('❤️', 0, 0);
        } else {
          confettiCtx.fillStyle = p.color;
          confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        confettiCtx.restore();
      }
    });

    if (activeParticles > 0) {
      requestAnimationFrame(animateConfetti);
    }
  }

  /* ==========================================================================
     9. Wish Modal
     ========================================================================== */
  function triggerWishModal() {
    wishModal.classList.add('active');
    launchConfetti();
    playHeartChime();
  }

  modalCloseBtn.addEventListener('click', () => {
    wishModal.classList.remove('active');
  });

  modalReplayBtn.addEventListener('click', () => {
    wishModal.classList.remove('active');
    startAudioPlayback();
  });

  modalLetterBtn.addEventListener('click', () => {
    wishModal.classList.remove('active');
    envelope.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      if (!envelope.classList.contains('locked')) {
        envelope.classList.add('open');
      }
    }, 600);
  });
});
