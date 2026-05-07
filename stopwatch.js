/* ─────────────────────────────────────────────────────────────────────
   800m TRAINER – Stopwatch & Split Tracking
   ───────────────────────────────────────────────────────────────────── */

class StopwatchApp {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.elapsedTime = 0; // milliseconds
    this.startTime = null;
    this.pauseTime = null;
    this.animationId = null;

    // Split tracking
    this.splits = [];
    this.currentSplitDistance = 100; // meters
    this.laps = [];

    // History
    this.history = this.loadHistory();

    // Settings
    this.audioFeedback = true;
    this.vibrationFeedback = true;
    this.keepScreenOn = true;
    this.screenWakeLock = null;

    // Calculator reference
    this.calculator = null;

    // Target from calculator tab
    this.calculatorTarget = null;

    this.init();
  }

  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.loadSettings();
    this.renderHistory();
    this.injectAuswertungButton();
    this.decodeSharedRun();
    this.loadCalculatorTarget();
    window.onCalculatorTargetUpdate = (target) => {
      this.calculatorTarget = target;
      this.updateTargetBanner();
    };
  }

  cacheElements() {
    // Stopwatch display
    this.display = document.getElementById('stopwatchDisplay');
    this.startBtn = document.getElementById('stopwatchStart');
    this.stopBtn = document.getElementById('stopwatchStop');
    this.resetBtn = document.getElementById('stopwatchReset');

    // Distance selector
    this.distanceButtons = document.querySelectorAll('.sw-dist-btn');
    this.splitBtn = document.getElementById('splitBtn');
    this.lapBtn = document.getElementById('lapBtn');

    // Results table
    this.splitsResultBody = document.getElementById('splitsResultBody');

    // Current progress
    this.totalTimeDisplay = document.getElementById('totalTime');
    this.currentLapDisplay = document.getElementById('currentLap');
    this.splitsCountDisplay = document.getElementById('splitsCount');
    this.avgTempoDisplay = document.getElementById('avgTempo');

    // Settings
    this.audioCheckbox = document.getElementById('audioFeedback');
    this.vibrationCheckbox = document.getElementById('vibration');
    this.keepScreenCheckbox = document.getElementById('keepScreen');

    // Data buttons
    this.exportBtn = document.getElementById('exportData');
    this.clearBtn = document.getElementById('clearData');

    // History table
    this.historyBody = document.getElementById('historyBody');
  }

  attachEventListeners() {
    this.startBtn.addEventListener('click', () => this.start());
    this.stopBtn.addEventListener('click', () => this.stop());
    this.resetBtn.addEventListener('click', () => this.reset());

    this.distanceButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selectedButton = e.currentTarget;
        this.distanceButtons.forEach(b => b.classList.remove('active'));
        selectedButton.classList.add('active');
        this.currentSplitDistance = parseInt(selectedButton.dataset.distance, 10);
        this.updateSplitProgress();
      });
    });

    this.splitBtn.addEventListener('click', () => this.recordSplit());
    this.lapBtn.addEventListener('click', () => this.recordLap());

    this.audioCheckbox.addEventListener('change', (e) => {
      this.audioFeedback = e.target.checked;
      this.saveSettings();
    });

    this.vibrationCheckbox.addEventListener('change', (e) => {
      this.vibrationFeedback = e.target.checked;
      this.saveSettings();
    });

    this.keepScreenCheckbox.addEventListener('change', (e) => {
      this.keepScreenOn = e.target.checked;
      this.saveSettings();
      if (this.keepScreenOn && this.isRunning) {
        this.requestScreenWakeLock();
      } else {
        this.releaseScreenWakeLock();
      }
    });

    this.exportBtn.addEventListener('click', () => this.exportData());
    this.clearBtn.addEventListener('click', () => this.clearHistory());
  }

  start() {
    if (!this.isRunning) {
      if (this.isPaused) {
        // Resume from pause
        this.startTime = Date.now() - this.elapsedTime;
        this.pauseTime = null;
      } else {
        // Start fresh
        this.elapsedTime = 0;
        this.splits = [];
        this.laps = [];
        this.startTime = Date.now();
      }

      this.isRunning = true;
      this.isPaused = false;

      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
      this.resetBtn.disabled = true;
      this.splitBtn.disabled = false;
      this.lapBtn.disabled = false;
      this.distanceButtons.forEach(btn => btn.disabled = true);

      if (this.keepScreenOn) {
        this.requestScreenWakeLock();
      }

      this.animate();
    }
  }

  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      this.isPaused = true;

      this.startBtn.disabled = false;
      this.stopBtn.disabled = true;
      this.resetBtn.disabled = false;
      this.splitBtn.disabled = true;
      this.lapBtn.disabled = true;
      this.distanceButtons.forEach(btn => btn.disabled = false);

      this.releaseScreenWakeLock();

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      if (this.elapsedTime > 5000 && this.splits.length > 0) {
        setTimeout(() => this.showResults(), 400);
      }
    }
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.elapsedTime = 0;
    this.startTime = null;
    this.pauseTime = null;
    this.splits = [];
    this.laps = [];

    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.resetBtn.disabled = false;
    this.splitBtn.disabled = true;
    this.lapBtn.disabled = true;

    this.display.textContent = '0:00.00';
    this.totalTimeDisplay.textContent = '0:00.00';
    this.currentLapDisplay.textContent = '0:00.00';
    this.splitsCountDisplay.textContent = '0';
    this.avgTempoDisplay.textContent = '-:--';
    this.splitsResultBody.innerHTML = '';

    this.releaseScreenWakeLock();

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    const devEl = document.getElementById('swDeviation');
    if (devEl) devEl.style.display = 'none';
    const progEl = document.getElementById('swSplitProgress');
    if (progEl) progEl.textContent = '';
  }

  animate() {
    const now = Date.now();
    this.elapsedTime = now - this.startTime;

    this.display.textContent = this.formatTime(this.elapsedTime);
    this.totalTimeDisplay.textContent = this.formatTime(this.elapsedTime);

    if (this.laps.length === 0) {
      this.currentLapDisplay.textContent = this.formatTime(this.elapsedTime);
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  recordSplit() {
    if (!this.isRunning) return;

    const split = {
      number: this.splits.length + 1,
      distance: this.currentSplitDistance,
      time: this.elapsedTime,
      cumulativeTime: this.elapsedTime
    };

    this.splits.push(split);
    this.updateSplitTable();
    this.showSplitDeviation(this.splits.length - 1);
    this.updateSplitProgress();
    this.provideFeedback();
    this.updateStats();
  }

  recordLap() {
    if (!this.isRunning) return;

    const lapTime = this.elapsedTime - (this.laps.length === 0 ? 0 : this.laps[this.laps.length - 1].endTime);

    const lap = {
      number: this.laps.length + 1,
      startTime: this.laps.length === 0 ? 0 : this.laps[this.laps.length - 1].endTime,
      endTime: this.elapsedTime,
      duration: lapTime
    };

    this.laps.push(lap);
    this.currentLapDisplay.textContent = this.formatTime(lapTime);
    this.provideFeedback();
    this.updateStats();
  }

  updateSplitTable() {
    this.splitsResultBody.innerHTML = '';

    this.splits.forEach((split, i) => {
      const row = document.createElement('tr');
      const cumTime = split.cumulativeTime;
      const prevCum = i === 0 ? 0 : this.splits[i - 1].cumulativeTime;
      const splitDuration = cumTime - prevCum;

      let deviationCell = '—';
      const targetSplits = this.getTargetSplitsForCurrentDistance();
      if (targetSplits && i < targetSplits.length) {
        const targetMs = targetSplits[i];
        const diffMs = splitDuration - targetMs;
        const diffSec = (diffMs / 1000).toFixed(2);
        const cls = Math.abs(diffMs) < 200 ? 'sw-split-exact' : (diffMs > 0 ? 'sw-split-behind' : 'sw-split-ahead');
        const sign = diffMs > 0 ? '+' : '';
        deviationCell = `<span class="${cls}">${sign}${diffSec}s</span>`;
      }

      row.innerHTML = `
        <td>${split.number}</td>
        <td>${split.distance}m</td>
        <td>${this.formatTime(splitDuration)}</td>
        <td>${this.formatTime(cumTime)}</td>
        <td>${deviationCell}</td>
      `;

      this.splitsResultBody.appendChild(row);
    });
  }

  loadCalculatorTarget() {
    if (window.calculatorTarget) {
      this.calculatorTarget = window.calculatorTarget;
      this.updateTargetBanner();
    }
  }

  updateTargetBanner() {
    const bar = document.getElementById('swTargetBar');
    if (!bar) return;

    if (!this.calculatorTarget) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';

    const timeEl = document.getElementById('swTargetTime');
    if (timeEl) timeEl.textContent = this.formatTime(this.calculatorTarget.totalTimeMs);

    const stratEl = document.getElementById('swTargetStrategy');
    if (stratEl) stratEl.textContent = this.calculatorTarget.strategyName;

    const clearBtn = document.getElementById('swTargetClear');
    if (clearBtn) {
      // Remove old listener by replacing with clone
      const newClear = clearBtn.cloneNode(true);
      clearBtn.parentNode.replaceChild(newClear, clearBtn);
      newClear.addEventListener('click', () => {
        this.calculatorTarget = null;
        this.updateTargetBanner();
        this.updateSplitTable();
      });
    }
  }

  getTargetSplitsForCurrentDistance() {
    if (!this.calculatorTarget || !Array.isArray(this.calculatorTarget.splits)) return null;

    const groupSize = Math.max(1, Math.round(this.currentSplitDistance / 100));
    if (groupSize === 1) return this.calculatorTarget.splits;

    const groupedSplits = [];
    for (let i = 0; i < this.calculatorTarget.splits.length; i += groupSize) {
      const group = this.calculatorTarget.splits.slice(i, i + groupSize);
      if (group.length === groupSize) {
        groupedSplits.push(group.reduce((sum, value) => sum + value, 0));
      }
    }
    return groupedSplits;
  }

  showSplitDeviation(splitIndex) {
    const devEl = document.getElementById('swDeviation');
    const numEl = document.getElementById('swDevSplitNum');
    const valEl = document.getElementById('swDevValue');
    const hintEl = document.getElementById('swDevHint');
    if (!devEl) return;

    const targetSplits = this.getTargetSplitsForCurrentDistance();
    if (!targetSplits || splitIndex >= targetSplits.length) {
      devEl.style.display = 'none';
      return;
    }

    const targetMs = targetSplits[splitIndex];
    const actualMs = splitIndex === 0
      ? this.splits[0].cumulativeTime
      : this.splits[splitIndex].cumulativeTime - this.splits[splitIndex - 1].cumulativeTime;
    const diffMs = actualMs - targetMs;
    const diffSec = (diffMs / 1000).toFixed(2);
    const absDiffSec = Math.abs(diffSec);

    numEl.textContent = splitIndex + 1;

    if (Math.abs(diffMs) < 200) {
      valEl.textContent = '±' + absDiffSec + 's';
      hintEl.textContent = 'perfekt';
      devEl.className = 'sw-deviation exact';
    } else if (diffMs > 0) {
      valEl.textContent = '+' + absDiffSec + 's';
      hintEl.textContent = 'zu langsam';
      devEl.className = 'sw-deviation behind';
    } else {
      valEl.textContent = '-' + absDiffSec + 's';
      hintEl.textContent = 'zu schnell';
      devEl.className = 'sw-deviation ahead';
    }
    devEl.style.display = 'flex';
  }

  updateSplitProgress() {
    const el = document.getElementById('swSplitProgress');
    if (!el) return;
    const nextIdx = this.splits.length;
    if (!this.calculatorTarget || nextIdx >= this.calculatorTarget.splits.length) {
      el.textContent = this.calculatorTarget ? `${nextIdx}/${this.calculatorTarget.splits.length} Splits` : '';
      return;
    }
    const targetMs = this.calculatorTarget.splits[nextIdx];
    el.textContent = `Split ${nextIdx + 1}/${this.calculatorTarget.splits.length}  ▸  Ziel: ${this.formatTime(targetMs)}`;
  }

  updateStats() {
    this.splitsCountDisplay.textContent = this.splits.length;

    if (this.splits.length > 0) {
      const avgTime = this.elapsedTime / this.splits.length;
      this.avgTempoDisplay.textContent = this.formatTime(avgTime) + '/split';
    }
  }

  provideFeedback() {
    if (this.audioFeedback) {
      this.playBeep();
    }

    if (this.vibrationFeedback && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  playBeep() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      oscillator.start(now);
      oscillator.stop(now + 0.1);
    } catch (e) {
      // Audio context not supported
    }
  }

  async requestScreenWakeLock() {
    if (!navigator.wakeLock) return;

    try {
      this.screenWakeLock = await navigator.wakeLock.request('screen');
      this.screenWakeLock.addEventListener('release', () => {
        this.screenWakeLock = null;
      });
    } catch (e) {
      console.log('Screen wake lock request failed:', e);
    }
  }

  releaseScreenWakeLock() {
    if (this.screenWakeLock) {
      this.screenWakeLock.release().catch(() => {});
      this.screenWakeLock = null;
    }
  }

  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  saveSettings() {
    const settings = {
      audioFeedback: this.audioFeedback,
      vibrationFeedback: this.vibrationFeedback,
      keepScreenOn: this.keepScreenOn
    };
    localStorage.setItem('stopwatch-settings', JSON.stringify(settings));
  }

  loadSettings() {
    const saved = localStorage.getItem('stopwatch-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      this.audioFeedback = settings.audioFeedback ?? true;
      this.vibrationFeedback = settings.vibrationFeedback ?? true;
      this.keepScreenOn = settings.keepScreenOn ?? true;

      this.audioCheckbox.checked = this.audioFeedback;
      this.vibrationCheckbox.checked = this.vibrationFeedback;
      this.keepScreenCheckbox.checked = this.keepScreenOn;
    }
  }

  saveToHistory() {
    if (this.splits.length === 0 && this.laps.length === 0) return;

    const splitDurations = this.splits.map((split, index) => {
      const previous = index === 0 ? 0 : this.splits[index - 1].cumulativeTime;
      return split.cumulativeTime - previous;
    });

    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      totalTime: this.elapsedTime,
      splits: this.splits,
      laps: this.laps,
      numSplits: this.splits.length,
      bestSplit: splitDurations.length > 0 ? Math.min(...splitDurations) : null
    };

    this.history.unshift(session);
    if (this.history.length > 50) {
      this.history.pop(); // Keep last 50 sessions
    }

    localStorage.setItem('stopwatch-history', JSON.stringify(this.history));
  }

  loadHistory() {
    const saved = localStorage.getItem('stopwatch-history');
    return saved ? JSON.parse(saved) : [];
  }

  renderHistory() {
    this.historyBody.innerHTML = '';

    if (this.history.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="4" style="text-align: center; color: var(--text-muted);">Noch keine Trainings-Sessions</td>';
      this.historyBody.appendChild(row);
      return;
    }

    this.history.slice(0, 20).forEach(session => {
      const date = new Date(session.date);
      const dateStr = date.toLocaleDateString('de-DE');
      const bestSplit = session.bestSplit ? this.formatTime(session.bestSplit) : '-';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${dateStr}</td>
        <td>${this.formatTime(session.totalTime)}</td>
        <td>${session.numSplits}</td>
        <td>${bestSplit}</td>
      `;
      this.historyBody.appendChild(row);
    });
  }

  exportData() {
    if (this.splits.length === 0 && this.laps.length === 0) {
      alert('Keine Daten zum Exportieren');
      return;
    }

    const data = {
      timestamp: new Date().toISOString(),
      totalTime: this.elapsedTime,
      formattedTime: this.formatTime(this.elapsedTime),
      splits: this.splits.map(s => ({
        ...s,
        formattedTime: this.formatTime(s.time),
        formattedCumulative: this.formatTime(s.cumulativeTime)
      })),
      laps: this.laps.map(l => ({
        ...l,
        formattedDuration: this.formatTime(l.duration)
      }))
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `800m-training-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearHistory() {
    if (confirm('Alle Trainings-Daten löschen? Das kann nicht rückgängig gemacht werden.')) {
      this.history = [];
      localStorage.removeItem('stopwatch-history');
      this.renderHistory();
    }
  }

  // ─── FEATURE 1: Post-Run Results Engine ──────────────────────────────

  injectAuswertungButton() {
    // If button already exists in HTML, just wire the click event
    const existing = document.getElementById('auswertungBtn');
    if (existing) {
      existing.addEventListener('click', () => this.showResults());
      return;
    }
    // Fallback: insert button next to Reset in the DOM
    const resetBtn = document.getElementById('stopwatchReset');
    if (!resetBtn) return;
    const btn = document.createElement('button');
    btn.id = 'auswertungBtn';
    btn.className = 'stopwatch-btn auswertung-btn';
    btn.title = 'Lauf-Auswertung anzeigen';
    btn.textContent = '📊 Auswertung';
    btn.disabled = true;
    btn.addEventListener('click', () => this.showResults());
    resetBtn.insertAdjacentElement('afterend', btn);
  }

  calculateMetrics(data) {
    // data can be passed (for shared runs) or fall back to live session
    const splits   = data ? data.splits   : this.splits;
    const totalMs  = data ? data.totalTime : this.elapsedTime;
    const splitDist = data ? (data.splitDistance || this.currentSplitDistance) : this.currentSplitDistance;

    const numSplits = splits.length;
    if (numSplits === 0) return null;

    // Individual split durations
    const splitTimes = splits.map((s, i) => {
      if (i === 0) return s.cumulativeTime;
      return s.cumulativeTime - splits[i - 1].cumulativeTime;
    });

    const avgSplitTime = splitTimes.reduce((a, b) => a + b, 0) / numSplits;

    const bestIdx  = splitTimes.reduce((bi, t, i) => t < splitTimes[bi] ? i : bi, 0);
    const worstIdx = splitTimes.reduce((wi, t, i) => t > splitTimes[wi] ? i : wi, 0);

    const variance = splitTimes.reduce((acc, t) => acc + Math.pow(t - avgSplitTime, 2), 0) / numSplits;
    const stdDev   = Math.sqrt(variance);
    const cv       = (stdDev / avgSplitTime) * 100;

    const recordedDistanceMeters = numSplits * splitDist;

    // Half comparison by recorded distance.
    let firstHalfMs = null, secondHalfMs = null, fatigueIndex = null;
    if (numSplits >= 2 && numSplits % 2 === 0) {
      const half = numSplits / 2;
      firstHalfMs  = splits[half - 1].cumulativeTime;
      secondHalfMs = totalMs - firstHalfMs;
      fatigueIndex = ((secondHalfMs - firstHalfMs) / firstHalfMs) * 100;
    }

    // Pace per km based on the recorded distance.
    const recordedKm = Math.max(recordedDistanceMeters / 1000, 0.1);
    const paceMs    = totalMs / recordedKm;
    const paceSecs  = Math.floor(paceMs / 1000);
    const paceMin   = Math.floor(paceSecs / 60);
    const paceSec   = paceSecs % 60;
    const pacePerKm = `${paceMin}:${paceSec.toString().padStart(2, '0')}/km`;

    const cumulativeTimes = splits.map(s => s.cumulativeTime);

    return {
      totalTime:    totalMs,
      numSplits,
      splitTimes,
      cumulativeTimes,
      avgSplitTime,
      bestSplit:    { time: splitTimes[bestIdx],  index: bestIdx  },
      worstSplit:   { time: splitTimes[worstIdx], index: worstIdx },
      stdDev,
      cv,
      firstHalfMs,
      secondHalfMs,
      fatigueIndex,
      pacePerKm,
      splitDistance: splitDist,
      recordedDistanceMeters
    };
  }

  evaluateRun(metrics) {
    const { cv, fatigueIndex } = metrics;
    const fi = fatigueIndex ?? 0;

    let grade, gradeLabel;
    if (cv < 2 && fi < 3) {
      grade = 'A'; gradeLabel = 'Hervorragend';
    } else if (cv < 4 && fi < 6) {
      grade = 'B'; gradeLabel = 'Gut';
    } else if (cv < 7 && fi < 10) {
      grade = 'C'; gradeLabel = 'Solide';
    } else {
      grade = 'D'; gradeLabel = 'Verbesserungsbedarf';
    }

    let consistencyRating;
    if (cv < 2)       consistencyRating = 'Sehr gleichmäßiges Lauftempo – exzellente Schrittfrequenz-Kontrolle.';
    else if (cv < 4)  consistencyRating = 'Gutes Gleichgewicht – leichte Temposchwankungen, aber unter Kontrollgrenze.';
    else if (cv < 7)  consistencyRating = 'Merkliche Tempounregelmäßigkeiten – Arbeit an der anaeroben Kapazität empfohlen.';
    else              consistencyRating = 'Starke Temposchwankungen – Grundlagenausdauer und Laktat-Pufferung priorisieren.';

    let fatigueRating;
    if (fatigueIndex === null) {
      fatigueRating = 'Zu wenige Splits für Ermüdungsanalyse.';
    } else if (fi < 0) {
      fatigueRating = 'Negativer Split – starke zweite Hälfte, ideale Rennverteilung!';
    } else if (fi < 3) {
      fatigueRating = 'Minimale Ermüdung – sehr kontrollierte Rennverteilung.';
    } else if (fi < 6) {
      fatigueRating = 'Leichte Ermüdung in der zweiten Hälfte, typisch für 800m.';
    } else if (fi < 10) {
      fatigueRating = 'Deutliche Ermüdung – Start möglicherweise zu schnell gewählt.';
    } else {
      fatigueRating = 'Starker Leistungseinbruch – anaerobe Kapazität ist der limitierende Faktor.';
    }

    // Build coaching comment based on actual data
    const avgSec   = (metrics.avgSplitTime / 1000).toFixed(1);
    const cvFixed  = cv.toFixed(1);
    const fiFixed  = fi.toFixed(1);
    const halfInfo = (metrics.firstHalfMs !== null)
      ? ` Die erste Hälfte dauerte ${this.formatTime(metrics.firstHalfMs)}, die zweite ${this.formatTime(metrics.secondHalfMs)}.`
      : '';

    let paceChar;
    if (fi < 0)       paceChar = 'Der negative Split zeigt eine ausgezeichnete Rennverteilung – das deutet auf gut trainierte aerobe Basis und effiziente Laktat-Clearance hin.';
    else if (fi < 5)  paceChar = 'Die Rennverteilung ist nahezu ideal für 800m – die Energiesysteme wurden effizient eingesetzt.';
    else if (fi < 10) paceChar = 'Die zweite Hälfte war langsamer als die erste, was auf beginnende Laktat-Akkumulation über der anaeroben Schwelle hinweist.';
    else              paceChar = 'Der deutliche Leistungsabfall in der zweiten Hälfte signalisiert, dass der Start die Laktat-Toleranz überschritten hat – typisches Zeichen für zu schnellen Beginn.';

    const coachComment =
      `Variationskoeffizient von ${cvFixed}% (Ø ${avgSec}s/Split) – ${consistencyRating} ` +
      `${halfInfo} ${paceChar} ` +
      `Für 800m-Läufer ist eine Laktat-Konzentration von 12–20 mmol/L am Ende normal; ` +
      `ein CV unter 3% deutet auf optimale anaerobe Kapazitätsauslastung hin.`;

    const recommendations = [];
    if (cv >= 4) recommendations.push('Tempol\u00e4ufe: 6\u20138 x 200m mit exakter Zielvorgabe und Stoppuhr zur Gleichm\u00e4\u00dfigkeits-Schulung.');
    if (fi > 6)  recommendations.push('Laktattoleranz-Training: 3 x 600m @ 800m-Renntempo mit vollst\u00e4ndiger Erholung, Fokus auf zweite H\u00e4lfte halten.');
    if (grade === 'A' || grade === 'B') recommendations.push('Wettkampfsimulation: 1 x 800m als Testwettkampf mit Taktik-Analyse (Positionierung, Spurwechsel).');
    else recommendations.push('Grundlagenausdauer: 2\u20133 x 1000m @ 70% VO\u2082max zur Verbesserung der aeroben Basis und Laktat-Pufferung.');
    if (recommendations.length < 2) recommendations.push('Reaktionskraft: Stufenspr\u00fcnge und kurze Steigerungsl\u00e4ufe zur Verbesserung der neuromuskul\u00e4ren Koordination.');

    return { grade, gradeLabel, consistencyRating, fatigueRating, coachComment, recommendations };
  }

  showResults(sharedData) {
    // Remove any existing modal
    const existing = document.getElementById('resultsModal');
    if (existing) existing.remove();

    // Enable Auswertung button for future re-opens
    const auswBtn = document.getElementById('auswertungBtn');
    if (auswBtn) auswBtn.disabled = false;

    const metrics = this.calculateMetrics(sharedData || null);
    if (!metrics) {
      alert('Keine Lauf-Daten vorhanden.');
      return;
    }
    const evaluation = this.evaluateRun(metrics);

    const now   = new Date();
    const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    const gradeColors = { A: '#22c55e', B: '#3b82f6', C: '#f97316', D: '#ef4444' };
    const gradeColor  = gradeColors[evaluation.grade];

    // ── Build modal element ──────────────────────────────────────────────
    const modal = document.createElement('div');
    modal.id = 'resultsModal';
    modal.className = 'results-modal';
    modal.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'background:rgba(0,0,0,0.85)',
      'display:flex', 'align-items:flex-start', 'justify-content:center',
      'overflow:hidden', 'padding:1rem'
    ].join(';');

    // Build split table rows using cumulativeTimes from metrics
    const avgMs = metrics.avgSplitTime;
    const splitRowsFinal = metrics.splitTimes.map((t, i) => {
      const cum        = metrics.cumulativeTimes[i] || 0;
      const delta      = t - avgMs;
      const deltaStr   = (delta >= 0 ? '+' : '') + (delta / 1000).toFixed(2) + 's';
      const deltaColor = delta < 0 ? '#22c55e' : delta > 0 ? '#ef4444' : 'inherit';
      return `<tr>
        <td>${i + 1}</td>
        <td>${metrics.splitDistance}m</td>
        <td>${this.formatTime(t)}</td>
        <td>${this.formatTime(cum)}</td>
        <td style="color:${deltaColor};font-weight:600">${deltaStr}</td>
      </tr>`;
    }).join('');

    const halfHtml = (metrics.firstHalfMs !== null) ? `
      <div class="metric-card">
        <div class="metric-label">1. Hälfte</div>
        <div class="metric-value">${this.formatTime(metrics.firstHalfMs)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">2. Hälfte</div>
        <div class="metric-value">${this.formatTime(metrics.secondHalfMs)}</div>
      </div>` : '';

    const recHtml = evaluation.recommendations.map(r => `<li>${r}</li>`).join('');

    modal.innerHTML = `
      <div class="results-container" style="
        background:var(--bg-card,#1e2533);
        border:1px solid var(--border,#2d3748);
        border-radius:16px;
        max-width:680px;
        width:100%;
        max-height:calc(100dvh - 2rem);
        margin:0 auto;
        overflow-y:auto;
        overflow-x:hidden;
        -webkit-overflow-scrolling:touch;
        font-family:inherit;
      ">
        <!-- Header -->
        <div style="
          background:linear-gradient(135deg,#1a1f2e 0%,#0f172a 100%);
          padding:1.5rem;
          display:flex;
          align-items:center;
          justify-content:space-between;
          border-bottom:1px solid var(--border,#2d3748);
        ">
          <div>
            <h2 style="margin:0;font-size:1.4rem;color:#f1f5f9;">🏁 Lauf-Auswertung</h2>
            <p style="margin:0.25rem 0 0;color:#94a3b8;font-size:0.85rem;">${dateStr} · ${timeStr}</p>
          </div>
          <button id="closeResultsBtn" style="
            background:transparent;border:1px solid #475569;
            color:#94a3b8;border-radius:8px;padding:0.4rem 0.8rem;
            cursor:pointer;font-size:0.9rem;
          ">✕ Schließen</button>
        </div>

        <!-- Hero -->
        <div class="results-hero" style="
          padding:2rem 1.5rem;
          text-align:center;
          border-bottom:1px solid var(--border,#2d3748);
        ">
          <div class="results-time" style="font-size:3rem;font-weight:700;color:#f1f5f9;letter-spacing:-1px;">
            ${this.formatTime(metrics.totalTime)}
          </div>
          <div style="margin-top:0.5rem;color:#94a3b8;font-size:0.9rem;">
            ${metrics.numSplits} Split${metrics.numSplits !== 1 ? 's' : ''} · ${metrics.pacePerKm}
          </div>
          <div class="results-grade" style="
            display:inline-block;
            margin-top:1rem;
            padding:0.5rem 1.5rem;
            border-radius:999px;
            background:${gradeColor}22;
            border:2px solid ${gradeColor};
            color:${gradeColor};
            font-size:1.1rem;
            font-weight:700;
          ">
            ${evaluation.grade} – ${evaluation.gradeLabel}
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="metrics-grid" style="
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:1px;
          background:var(--border,#2d3748);
          border-bottom:1px solid var(--border,#2d3748);
        ">
          <div class="metric-card" style="background:var(--bg-card,#1e2533);padding:1rem;text-align:center;">
            <div class="metric-label" style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Gleichmäßigkeit (CV)</div>
            <div class="metric-value" style="font-size:1.6rem;font-weight:700;color:#f1f5f9;margin-top:0.25rem;">${metrics.cv.toFixed(1)}%</div>
          </div>
          <div class="metric-card" style="background:var(--bg-card,#1e2533);padding:1rem;text-align:center;">
            <div class="metric-label" style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Ermüdungsindex</div>
            <div class="metric-value" style="font-size:1.6rem;font-weight:700;color:#f1f5f9;margin-top:0.25rem;">${metrics.fatigueIndex !== null ? metrics.fatigueIndex.toFixed(1) + '%' : '–'}</div>
          </div>
          ${halfHtml.replace(/class="metric-card"/g, 'class="metric-card" style="background:var(--bg-card,#1e2533);padding:1rem;text-align:center;"')
            .replace(/class="metric-label"/g, 'class="metric-label" style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;"')
            .replace(/class="metric-value"/g, 'class="metric-value" style="font-size:1.6rem;font-weight:700;color:#f1f5f9;margin-top:0.25rem;"')}
        </div>

        <!-- Split Table -->
        <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border,#2d3748);">
          <h3 style="margin:0 0 0.75rem;color:#f1f5f9;font-size:1rem;">Split-Übersicht</h3>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.875rem;color:#cbd5e1;">
              <thead>
                <tr style="border-bottom:1px solid #2d3748;color:#94a3b8;font-size:0.75rem;text-transform:uppercase;">
                  <th style="padding:0.5rem 0.5rem;text-align:left;">#</th>
                  <th style="padding:0.5rem 0.5rem;text-align:left;">Distanz</th>
                  <th style="padding:0.5rem 0.5rem;text-align:left;">Zeit</th>
                  <th style="padding:0.5rem 0.5rem;text-align:left;">Kumuliert</th>
                  <th style="padding:0.5rem 0.5rem;text-align:left;">Δ Mittel</th>
                </tr>
              </thead>
              <tbody>${splitRowsFinal}</tbody>
            </table>
          </div>
        </div>

        <!-- Coach Evaluation -->
        <div class="results-evaluation" style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border,#2d3748);background:#111827;">
          <h3 style="margin:0 0 0.75rem;color:#ffffff;font-size:1rem;">🎯 Trainer-Bewertung</h3>
          <div class="coach-comment" style="
            background:#020617;
            border:1px solid #334155;
            border-left:4px solid ${gradeColor};
            border-radius:8px;
            padding:1rem;
            color:#f8fafc;
            font-size:0.95rem;
            line-height:1.6;
          ">${evaluation.coachComment}</div>
          <h4 style="margin:1rem 0 0.5rem;color:#ffffff;font-size:0.95rem;">Trainingsempfehlungen</h4>
          <ul class="recommendations-list" style="margin:0;padding-left:1.25rem;color:#e5e7eb;font-size:0.92rem;line-height:1.75;">
            ${recHtml}
          </ul>
        </div>

        <!-- QR Code -->
        <div class="results-qr" style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border,#2d3748);text-align:center;">
          <h3 style="margin:0 0 0.75rem;color:#f1f5f9;font-size:1rem;">📱 Ergebnis teilen</h3>
          <div id="qrCodeDisplay" style="display:inline-block;background:#fff;padding:8px;border-radius:8px;"></div>
          <p style="margin:0.5rem 0 0;color:#64748b;font-size:0.8rem;">QR-Code scannen → Ergebnis auf dem Smartphone öffnen</p>
        </div>

        <!-- Footer Buttons -->
        <div class="results-actions" style="
          padding:1rem 1.5rem;
          display:flex;gap:0.75rem;flex-wrap:wrap;justify-content:flex-end;
        ">
          <button id="exportResultsBtn" style="
            padding:0.6rem 1.2rem;
            background:#1e3a5f;border:1px solid #3b82f6;
            color:#93c5fd;border-radius:8px;cursor:pointer;font-size:0.875rem;
          ">📥 Exportieren</button>
          <button id="closeResultsBtn2" style="
            padding:0.6rem 1.2rem;
            background:#2d1515;border:1px solid #ef4444;
            color:#fca5a5;border-radius:8px;cursor:pointer;font-size:0.875rem;
          ">✕ Schließen</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Wire close buttons
    const closeModal = () => modal.remove();
    modal.querySelector('#closeResultsBtn').addEventListener('click', closeModal);
    modal.querySelector('#closeResultsBtn2').addEventListener('click', closeModal);
    modal.querySelector('#exportResultsBtn').addEventListener('click', () => this.exportData());
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Generate QR code
    this.generateQRCode(metrics);
  }

  generateQRCode(metrics) {
    const payload = {
      t:  metrics.totalTime,
      d:  new Date().toISOString().slice(0, 10),
      sp: metrics.splitTimes.map(Math.round),
      sd: metrics.splitDistance
    };

    const json    = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const url     = `https://800m.vercel.app/#run=${encoded}`;

    const display = document.getElementById('qrCodeDisplay');
    if (!display) return;
    display.innerHTML = '';

    if (typeof qrcode === 'undefined') {
      display.textContent = url;
      display.style.wordBreak = 'break-all';
      display.style.fontSize  = '0.75rem';
      display.style.color     = '#000';
      return;
    }

    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      display.innerHTML = qr.createImgTag(4, 0);
    } catch (e) {
      // URL too long for type 0 — try lower type
      try {
        const qr = qrcode(4, 'M');
        qr.addData(url);
        qr.make();
        display.innerHTML = qr.createImgTag(3, 0);
      } catch (e2) {
        display.textContent = url;
        display.style.wordBreak = 'break-all';
        display.style.fontSize  = '0.75rem';
        display.style.color     = '#000';
      }
    }
  }

  decodeSharedRun() {
    const hash = window.location.hash;
    if (!hash.startsWith('#run=')) return;

    try {
      const encoded = hash.slice(5);
      // base64url → base64
      const b64  = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const pad  = b64.length % 4 === 0 ? '' : '='.repeat(4 - b64.length % 4);
      const json = decodeURIComponent(escape(atob(b64 + pad)));
      const data = JSON.parse(json);

      // Reconstruct splits array compatible with calculateMetrics
      const reconstructed = {
        totalTime:     data.t,
        splitDistance: data.sd || 100,
        splits:        data.sp.map((ms, i) => ({
          number:         i + 1,
          distance:       data.sd || 100,
          cumulativeTime: data.sp.slice(0, i + 1).reduce((a, b) => a + b, 0),
          time:           ms
        }))
      };

      // Override instance splits so showResults() can reference them
      this.elapsedTime = reconstructed.totalTime;
      this.splits      = reconstructed.splits;

      // Show after DOM settles
      setTimeout(() => this.showResults(reconstructed), 300);
    } catch (e) {
      console.warn('Shared run decode failed:', e);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═════════════════════════════════════════════════════════════════════

StopwatchApp.prototype.updateSplitProgress = function() {
  const el = document.getElementById('swSplitProgress');
  if (!el) return;

  const nextIdx = this.splits.length;
  const targetSplits = this.getTargetSplitsForCurrentDistance();
  if (!targetSplits || nextIdx >= targetSplits.length) {
    el.textContent = targetSplits ? `${nextIdx}/${targetSplits.length} Splits` : '';
    return;
  }

  const targetMs = targetSplits[nextIdx];
  el.textContent = `Split ${nextIdx + 1}/${targetSplits.length} - Ziel: ${this.formatTime(targetMs)}`;
};

let stopwatch = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize stopwatch
  stopwatch = new StopwatchApp();

  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.currentTarget.dataset.tab;
      if (!tabName) return;

      // Update button states
      tabButtons.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      // Update content visibility
      tabContents.forEach(tc => tc.classList.remove('active'));
      document.getElementById(`${tabName}-tab`).classList.add('active');

      // Save active tab
      localStorage.setItem('active-tab', tabName);
    });
  });

  // Restore last active tab
  const lastTab = localStorage.getItem('active-tab') || 'calculator';
  const lastTabBtn = document.querySelector(`[data-tab="${lastTab}"]`);
  if (lastTabBtn) {
    lastTabBtn.click();
  }

  // Save session on page unload
  window.addEventListener('beforeunload', () => {
    if (stopwatch.elapsedTime > 0) {
      stopwatch.saveToHistory();
    }
  });
});
