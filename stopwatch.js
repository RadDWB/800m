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

    this.init();
  }

  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.loadSettings();
    this.renderHistory();
  }

  cacheElements() {
    // Stopwatch display
    this.display = document.getElementById('stopwatchDisplay');
    this.startBtn = document.getElementById('stopwatchStart');
    this.stopBtn = document.getElementById('stopwatchStop');
    this.resetBtn = document.getElementById('stopwatchReset');

    // Distance selector
    this.distanceButtons = document.querySelectorAll('.distance-btn');
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
        this.distanceButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentSplitDistance = parseInt(e.target.dataset.distance);
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

    this.splits.forEach(split => {
      const row = document.createElement('tr');
      const tempoMs = split.cumulativeTime / (split.distance / 100);
      const tempo = this.formatTime(tempoMs);
      const pctTime = ((split.cumulativeTime / this.elapsedTime) * 100).toFixed(1);

      row.innerHTML = `
        <td>${split.number}</td>
        <td>${split.distance}m</td>
        <td>${this.formatTime(split.time)}</td>
        <td>${tempo}/100m</td>
        <td>${pctTime}%</td>
      `;

      this.splitsResultBody.appendChild(row);
    });
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

    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      totalTime: this.elapsedTime,
      splits: this.splits,
      laps: this.laps,
      numSplits: this.splits.length,
      bestSplit: this.splits.length > 0 ? Math.min(...this.splits.map(s => s.time)) : null
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
}

// ═════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═════════════════════════════════════════════════════════════════════

let stopwatch = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize stopwatch
  stopwatch = new StopwatchApp();

  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;

      // Update button states
      tabButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

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
