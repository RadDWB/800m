/* ─────────────────────────────────────────────────────────────────────
   800m PACING CALCULATOR – Core Application Logic
   ───────────────────────────────────────────────────────────────────── */

// ═════════════════════════════════════════════════════════════════════
// CONFIGURATION & CONSTANTS
// ═════════════════════════════════════════════════════════════════════

const STRATEGY_CONFIG = {
  1: {
    name: 'Aggressiv',
    emoji: '⚡',
    target: 'Sprinter mit guter anaerober Basis',
    effect: 'Maximales ATP-PC & Glykolyse Training, frühe Laktat-Übersäuerung',
    risk: 'Deutlicher Einbruch nach 300m durch Laktat',
    energy: { anaerob: 45, glykolyse: 40, aerob: 15 },
    splitFactors: [0.95, 0.98, 0.95, 0.85, 0.72, 0.68, 0.70, 0.75]
  },
  2: {
    name: 'Abwartend',
    emoji: '🎯',
    target: 'Langstrecken-Läufer mit hoher aerober Basis',
    effect: 'Intelligente Laktat-Clearing, frische Beine für Finish (Negative Split)',
    risk: 'Schlechter Start-Druck, mentale Anforderung',
    energy: { anaerob: 30, glykolyse: 35, aerob: 35 },
    splitFactors: [0.82, 0.85, 0.88, 0.92, 0.95, 0.98, 0.96, 1.02]
  },
  3: {
    name: 'Gleichmäßig',
    emoji: '➡️',
    target: 'Anfänger & Technik-Training',
    effect: 'Maximale Effizienz, lineare Laktat-Ansammlung, VO₂max-Training',
    risk: 'Wenig Taktik-Training, schwaches Finish',
    energy: { anaerob: 35, glykolyse: 38, aerob: 27 },
    splitFactors: [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00]
  },
  4: {
    name: 'Taktisch',
    emoji: '🎲',
    target: 'Erfahrene Läufer mit variabler Fähigkeit',
    effect: 'Taktische Kicks (200m & 500m), hohe Laktattolerance',
    risk: 'Höchste Laktat-Last, hohe technische Anforderung',
    energy: { anaerob: 38, glykolyse: 42, aerob: 20 },
    splitFactors: [0.88, 1.00, 0.92, 0.96, 0.98, 0.90, 0.94, 1.05]
  },
  5: {
    name: 'Dynamic',
    emoji: '📈',
    target: 'Mitteldistanz-Spezialisten',
    effect: 'Stetiger Anstieg mit optimalem Finish-Verhältnis',
    risk: 'Mittleres Trainingslevel erforderlich',
    energy: { anaerob: 32, glykolyse: 40, aerob: 28 },
    splitFactors: [0.85, 0.88, 0.90, 0.93, 0.96, 0.99, 0.98, 1.04]
  }
};

// Wissenschaftliche Alters-Faktoren (nach Gastin 2001, Wingate-Tests)
// Peak anaerobe Power: Frauen ~16-18J, Männer ~18-22J
const AGE_FACTORS = {
  male: {   // Männer
    10: 0.70,
    11: 0.78,
    12: 0.85,
    13: 0.92,
    14: 0.96,
    15: 0.98,
    16: 0.99,
    17: 0.995,
    18: 1.00, // PEAK
    20: 1.00,
    25: 1.00, // Plateau
    30: 1.00
  },
  female: { // Frauen (reizen früher)
    10: 0.75,
    11: 0.82,
    12: 0.88,
    13: 0.94,
    14: 0.97,
    15: 0.99,
    16: 1.00,  // PEAK
    17: 1.00,
    18: 0.99,  // Leicht abnehmend nach Peak
    20: 0.98,
    25: 0.98,
    30: 0.97
  }
};

// Laktat-Baseline Unterschiede (m/w haben unterschiedliche Glykolyse-Aktivität)
const LACTATE_BASELINE = {
  male: (finishTime) => Math.max(1, Math.min(24, 18 - (finishTime / 12))),     // Standard
  female: (finishTime) => Math.max(1, Math.min(24, 17.5 - (finishTime / 12.5))) // ~3-5% höhere Schwelle
};

// ═════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═════════════════════════════════════════════════════════════════════

let appState = {
  finishTime: 150,      // seconds (2:30 default)
  strategyId: 3,        // Gleichmäßig default
  ageInYears: 14,       // Baseline age
  gender: 'male',       // m, w, d
  currentSplits: []     // calculated splits
};

// ═════════════════════════════════════════════════════════════════════
// PACING CALCULATOR CLASS
// ═════════════════════════════════════════════════════════════════════

class PacingCalculator {
  constructor() {}

  /**
   * Main calculation method
   * @param {number} finishTime - Target 800m time in seconds
   * @param {number} strategyId - Strategy ID (1-5)
   * @param {number} ageInYears - Age in years
   * @param {string} gender - 'male', 'female', or 'divers'
   * @returns {object} - Calculated splits and metadata
   */
  calculateSplits(finishTime, strategyId, ageInYears, gender = 'male') {
    // 1. Base velocity (m/s for entire race)
    const velocity = 800 / finishTime;
    const baseSplit100m = 100 / velocity;

    // 2. Age correction factor (gender-specific)
    const ageFactor = this.getAgeFactor(ageInYears, gender);

    // 3. Strategy-specific split factors
    const splitFactors = this.getStrategyFactors(strategyId, ageFactor);

    // 4. Calculate each 100m split
    const splits = splitFactors.map(factor => baseSplit100m / factor);

    // 5. Normalize to finish time (crucial!)
    const totalCalculated = splits.reduce((a, b) => a + b, 0);
    const correctionFactor = finishTime / totalCalculated;
    const normalizedSplits = splits.map(s => s * correctionFactor);

    return {
      splits: normalizedSplits,           // [100m, 200m, ..., 800m]
      cumulativeSplits: this.getCumulative(normalizedSplits),
      strategy: strategyId,
      age: ageInYears,
      gender: gender,
      finishTime: finishTime,
      ageFactor: ageFactor,
      energy: STRATEGY_CONFIG[strategyId].energy,
      lactate: this.calculateLactate(finishTime, gender),
      splitFactors: splitFactors
    };
  }

  /**
   * Get cumulative splits
   */
  getCumulative(splits) {
    const cumulative = [];
    let sum = 0;
    for (const split of splits) {
      sum += split;
      cumulative.push(sum);
    }
    return cumulative;
  }

  /**
   * Get age correction factor (gender-specific)
   */
  getAgeFactor(ageInYears, gender = 'male') {
    const genderFactors = AGE_FACTORS[gender] || AGE_FACTORS.male;
    return genderFactors[Math.min(ageInYears, 30)] || 1.0;
  }

  /**
   * Get strategy-specific split factors
   * Younger athletes: reduced variation (less lactate tolerance)
   */
  getStrategyFactors(strategyId, ageFactor) {
    const baseFactors = STRATEGY_CONFIG[strategyId].splitFactors;

    // Adjust for younger athletes: reduce variation
    if (ageFactor < 0.95) {
      return baseFactors.map(f => 1 - (1 - f) * ageFactor);
    }

    return baseFactors;
  }

  /**
   * Calculate blood lactate level (mmol/L)
   * Gender-specific baseline (female ~3-5% höher)
   */
  calculateLactate(finishTime, gender = 'male') {
    const lactateFunc = LACTATE_BASELINE[gender] || LACTATE_BASELINE.male;
    return lactateFunc(finishTime);
  }

  /**
   * Calculate energy profile over splits
   */
  calculateEnergyProfile(splits, finishTime, strategyId) {
    const baseEnergy = STRATEGY_CONFIG[strategyId].energy;
    const profile = [];

    // Energy system contribution over time
    for (let i = 0; i < splits.length; i++) {
      const timeElapsed = splits[i];
      const progressPercent = (i + 1) / 8;

      // ATP-PC: dominates first 10s, then decreases
      const atp = Math.max(0, baseEnergy.anaerob * (1 - timeElapsed / 20));

      // Glykolyse: peaks around 60-120s, then decreases
      const glyko = baseEnergy.glykolyse * Math.exp(-Math.pow(timeElapsed - 90, 2) / 4000);

      // Aerobic: increases over time
      const aerob = baseEnergy.aerob + (20 - baseEnergy.aerob) * progressPercent;

      profile.push({
        split: i + 1,
        atp: Math.max(0, atp),
        glyko: Math.max(0, glyko),
        aerob: Math.max(0, aerob)
      });
    }

    return profile;
  }
}

// ═════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════

/**
 * Format seconds to mm:ss.ss
 */
function formatTime(seconds, showMs = false) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (showMs) {
    return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
  }

  return `${mins}:${Math.floor(secs).toString().padStart(2, '0')}`;
}

/**
 * Format seconds to mm:ss for display
 */
function formatTimeDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate split tempo (per 100m)
 */
function calculateTempo(split100mTime) {
  // Convert to full 800m equivalent time
  const fullTime = split100mTime * 8;
  const mins = Math.floor(fullTime / 60);
  const secs = fullTime % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Calculate percentage of target (for color coding)
 */
function calculateSplitPercent(splitTime, targetTime, totalSplits = 8) {
  const targetSplit = targetTime / totalSplits;
  return (splitTime / targetSplit) * 100;
}

// ═════════════════════════════════════════════════════════════════════
// UI UPDATE FUNCTIONS
// ═════════════════════════════════════════════════════════════════════

/**
 * Update splits table
 */
function updateSplitsTable(result) {
  const tbody = document.getElementById('splitsTableBody');
  tbody.innerHTML = '';

  result.splits.forEach((split, index) => {
    const cumulative = result.cumulativeSplits[index];
    const tempo = calculateTempo(split);
    const percent = calculateSplitPercent(split, result.finishTime);
    const percentStr = percent.toFixed(0);

    const row = document.createElement('tr');
    const splitNum = (index + 1) * 100;

    // Color coding
    let splitClass = '';
    if (percent < 95) {
      splitClass = 'split-fast';
    } else if (percent > 105) {
      splitClass = 'split-slow';
    }

    row.innerHTML = `
      <td><span class="split-num">${splitNum}m</span></td>
      <td>${formatTime(split, true)}</td>
      <td>${formatTime(cumulative, true)}</td>
      <td>${tempo}</td>
      <td><span class="${splitClass}">${percentStr}%</span></td>
    `;

    tbody.appendChild(row);
  });
}

/**
 * Update milestone times (400m & 800m)
 */
function updateMilestones(result) {
  const first400m = result.cumulativeSplits[3];
  const full800m = result.cumulativeSplits[7];

  document.getElementById('milestone400').textContent = formatTimeDisplay(first400m);
  document.getElementById('milestone400Target').textContent = `vs. ${formatTimeDisplay(result.finishTime / 2)} (Gleichmäßig)`;
  document.getElementById('milestone800').textContent = formatTimeDisplay(full800m);
}

/**
 * Update 400m split comparison
 */
function updateComparison(result) {
  const first400m = result.cumulativeSplits[3];
  const second400m = result.finishTime - first400m;
  const diff = Math.abs(first400m - second400m);
  const diffSeconds = Math.abs(second400m - first400m);

  document.getElementById('firstHalf').textContent = formatTimeDisplay(first400m);
  document.getElementById('secondHalf').textContent = formatTimeDisplay(second400m);
  document.getElementById('splitDiff').textContent = formatTimeDisplay(diff);

  const hint = document.getElementById('splitDiffHint');
  if (diffSeconds < 2) {
    hint.textContent = 'gleich (even-paced)';
  } else if (second400m < first400m) {
    hint.textContent = `negative split (schneller Finish)`;
  } else {
    hint.textContent = `positive split (schwächerer Finish)`;
  }
}

/**
 * Update strategy info panel
 */
function updateStrategyInfo(strategyId) {
  const config = STRATEGY_CONFIG[strategyId];
  const colors = ['', '--strategy-1', '--strategy-2', '--strategy-3', '--strategy-4', '--strategy-5'];

  document.getElementById('strategyTitle').textContent = config.name;
  document.getElementById('infoTarget').textContent = config.target;
  document.getElementById('infoEffect').textContent = config.effect;
  document.getElementById('infoRisk').textContent = config.risk;

  // Update energy bar
  const energyAnaerob = document.getElementById('energyAnaerob');
  const energyGlyko = document.getElementById('energyGlyko');
  const energyAerob = document.getElementById('energyAerob');

  energyAnaerob.style.width = `${config.energy.anaerob}%`;
  energyGlyko.style.width = `${config.energy.glykolyse}%`;
  energyAerob.style.width = `${config.energy.aerob}%`;

  // Update energy labels
  document.querySelectorAll('.energy-labels span').forEach((el, i) => {
    const values = [config.energy.anaerob, config.energy.glykolyse, config.energy.aerob];
    const labels = ['Anaerob', 'Glykolyse', 'Aerob'];
    el.textContent = `${values[i]}% ${labels[i]}`;
  });

  // Update time display color
  document.querySelector('.time-big').style.color = `var(${colors[strategyId]})`;
}

/**
 * Calculate lactate values for each split
 */
function calculateLactateValues(result) {
  const baseLactate = result.lactate;
  const lactateValues = [];

  result.splits.forEach((split, index) => {
    const timeRatio = (index + 1) / 8;
    // Laktat steigt exponentiell
    const lactate = baseLactate * (0.5 + timeRatio * 1.5);
    const clipped = Math.min(lactate, 24);

    let zone = 'aerob';
    if (clipped > 4) zone = 'anaerob';
    else if (clipped > 2) zone = 'transition';

    lactateValues.push({
      split: index + 1,
      splitDistance: (index + 1) * 100,
      splitTime: split,
      cumulativeTime: result.cumulativeSplits[index],
      lactate: clipped,
      zone: zone
    });
  });

  return lactateValues;
}

/**
 * Update lactate values table
 */
function updateLactateTable(result) {
  const tbody = document.getElementById('lactateTableBody');
  tbody.innerHTML = '';

  const lactateValues = calculateLactateValues(result);

  lactateValues.forEach((data) => {
    const row = document.createElement('tr');
    const raceTime = formatTimeDisplay(data.cumulativeTime);

    row.innerHTML = `
      <td><strong>${data.splitDistance}m</strong></td>
      <td>${data.splitTime.toFixed(2)}s</td>
      <td>${raceTime}</td>
      <td><span class="lactate-value ${data.zone}">${data.lactate.toFixed(1)}</span></td>
      <td><span class="lactate-zone ${data.zone}">${data.zone === 'aerob' ? 'Aerob' : data.zone === 'transition' ? 'Transition' : 'Anaerob'}</span></td>
    `;

    tbody.appendChild(row);
  });
}

/**
 * Update all UI elements
 */
function updateDisplay() {
  const calc = new PacingCalculator();
  const result = calc.calculateSplits(
    appState.finishTime,
    appState.strategyId,
    appState.ageInYears,
    appState.gender
  );

  appState.currentSplits = result;

  // Export target splits for stopwatch deviation display
  window.calculatorTarget = {
    totalTime: appState.finishTime,
    totalTimeMs: appState.finishTime * 1000,
    splits: result.splits.map(s => s * 1000), // seconds → ms, array of 8 values
    strategy: appState.strategyId,
    strategyName: STRATEGY_CONFIG[appState.strategyId].name,
    splitDistance: 100
  };

  // Notify stopwatch if it's listening
  if (typeof window.onCalculatorTargetUpdate === 'function') {
    window.onCalculatorTargetUpdate(window.calculatorTarget);
  }

  // Update all UI components
  document.getElementById('finishTimeLabel').textContent = formatTimeDisplay(appState.finishTime);
  updateSplitsTable(result);
  updateMilestones(result);
  updateComparison(result);
  updateStrategyInfo(appState.strategyId);
  updateLactateTable(result);

  // Draw charts
  drawSplitChart(result);
  drawEnergyChart(result);
  drawLactateChart(result);
}

// ═════════════════════════════════════════════════════════════════════
// CANVAS CHART FUNCTIONS
// ═════════════════════════════════════════════════════════════════════

/**
 * Draw split bar chart (time per 100m)
 */
function drawSplitChart(result) {
  const canvas = document.getElementById('splitChart');
  const ctx = canvas.getContext('2d');

  // Set canvas size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const padding = 40;
  const chartWidth = canvas.width - 2 * padding;
  const chartHeight = canvas.height - 2 * padding;
  const barWidth = chartWidth / result.splits.length;

  // Find min/max for scaling
  const maxSplit = Math.max(...result.splits) * 1.1;
  const minSplit = Math.min(...result.splits) * 0.9;
  const range = maxSplit - minSplit;

  const getColor = (split) => {
    const targetSplit = result.finishTime / 8;
    const percent = (split / targetSplit) * 100;
    if (percent < 95) return '#22c55e';    // green - faster
    if (percent > 105) return '#ef4444';   // red - slower
    return '#06b6d4';                      // cyan - target
  };

  // Draw background grid
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#27272a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  // Draw bars
  result.splits.forEach((split, index) => {
    const x = padding + index * barWidth + barWidth / 4;
    const barHeight = ((split - minSplit) / range) * chartHeight;
    const y = canvas.height - padding - barHeight;

    ctx.fillStyle = getColor(split);
    ctx.fillRect(x, y, barWidth / 2, barHeight);

    // Draw label
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e4e4e7';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`${((index + 1) * 100)}m`, x + barWidth / 4, canvas.height - padding + 20);

    // Draw time value on bar
    ctx.fillStyle = 'white';
    ctx.font = 'bold 11px Inter';
    ctx.fillText(split.toFixed(1) + 's', x + barWidth / 4, y + 15);
  });

  // Draw axes
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e4e4e7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  // Y-axis labels
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#a1a1a6';
  ctx.textAlign = 'right';
  ctx.font = '11px Inter';
  for (let i = 0; i <= 5; i++) {
    const value = minSplit + (range / 5) * i;
    const y = canvas.height - padding - (chartHeight / 5) * i;
    ctx.fillText(value.toFixed(1) + 's', padding - 10, y + 4);
  }
}

/**
 * Draw energy system stacked area chart
 */
function drawEnergyChart(result) {
  const canvas = document.getElementById('energyChart');
  const ctx = canvas.getContext('2d');

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const padding = 40;
  const chartWidth = canvas.width - 2 * padding;
  const chartHeight = canvas.height - 2 * padding;
  const barWidth = chartWidth / 8;

  const calc = new PacingCalculator();
  const energyProfile = calc.calculateEnergyProfile(result.splits, result.finishTime, result.strategy);

  // Colors
  const colors = {
    atp: '#f59e0b',    // orange
    glyko: '#ef4444',  // red
    aerob: '#22c55e'   // green
  };

  // Draw background grid
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#27272a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  // Draw stacked bars
  energyProfile.forEach((energy, index) => {
    const x = padding + index * barWidth;
    let y = canvas.height - padding;
    const total = energy.atp + energy.glyko + energy.aerob || 100;

    // ATP-PC
    const atpHeight = (energy.atp / total) * chartHeight;
    ctx.fillStyle = colors.atp;
    ctx.fillRect(x + 5, y - atpHeight, barWidth - 10, atpHeight);
    y -= atpHeight;

    // Glykolyse
    const gykoHeight = (energy.glyko / total) * chartHeight;
    ctx.fillStyle = colors.glyko;
    ctx.fillRect(x + 5, y - gykoHeight, barWidth - 10, gykoHeight);
    y -= gykoHeight;

    // Aerobic
    const aerobHeight = (energy.aerob / total) * chartHeight;
    ctx.fillStyle = colors.aerob;
    ctx.fillRect(x + 5, y - aerobHeight, barWidth - 10, aerobHeight);

    // Split label
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e4e4e7';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`${(index + 1) * 100}m`, x + barWidth / 2, canvas.height - padding + 20);
  });

  // Draw axes
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e4e4e7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  // Y-axis label
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#a1a1a6';
  ctx.textAlign = 'right';
  ctx.font = '11px Inter';
  for (let i = 0; i <= 5; i++) {
    const value = (i / 5) * 100;
    const y = canvas.height - padding - (chartHeight / 5) * i;
    ctx.fillText(value.toFixed(0) + '%', padding - 10, y + 4);
  }

  // Legend
  ctx.font = 'bold 11px Inter';
  ctx.textAlign = 'left';
  const legendY = padding + 10;
  let legendX = padding + chartWidth - 200;

  ctx.fillStyle = colors.atp;
  ctx.fillRect(legendX, legendY, 10, 10);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e4e4e7';
  ctx.fillText('ATP-PC', legendX + 15, legendY + 9);

  ctx.fillStyle = colors.glyko;
  ctx.fillRect(legendX, legendY + 20, 10, 10);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e4e4e7';
  ctx.fillText('Glykolyse', legendX + 15, legendY + 29);

  ctx.fillStyle = colors.aerob;
  ctx.fillRect(legendX, legendY + 40, 10, 10);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e4e4e7';
  ctx.fillText('Aerob', legendX + 15, legendY + 49);
}

/**
 * Draw lactate curve
 */
function drawLactateChart(result) {
  const canvas = document.getElementById('lactateChart');
  const ctx = canvas.getContext('2d');

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const padding = 40;
  const chartWidth = canvas.width - 2 * padding;
  const chartHeight = canvas.height - 2 * padding;

  const baseLactate = result.lactate;
  const maxLactate = 25;

  // Draw background grid
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#27272a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  // Draw threshold lines
  const lt1Y = canvas.height - padding - (2 / maxLactate) * chartHeight;
  const lt2Y = canvas.height - padding - (4 / maxLactate) * chartHeight;

  ctx.strokeStyle = 'rgba(163, 230, 53, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(padding, lt1Y);
  ctx.lineTo(canvas.width - padding, lt1Y);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(padding, lt2Y);
  ctx.lineTo(canvas.width - padding, lt2Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw lactate curve (simplified)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  result.splits.forEach((split, index) => {
    const x = padding + (index / 8) * chartWidth;
    // Lactate increases exponentially during race
    const timeRatio = (index + 1) / 8;
    const lactate = baseLactate * (0.5 + timeRatio * 1.5);
    const y = canvas.height - padding - (lactate / maxLactate) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw points on curve
  ctx.fillStyle = '#ef4444';
  result.splits.forEach((split, index) => {
    const x = padding + (index / 8) * chartWidth;
    const timeRatio = (index + 1) / 8;
    const lactate = baseLactate * (0.5 + timeRatio * 1.5);
    const y = canvas.height - padding - (lactate / maxLactate) * chartHeight;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw axes
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e4e4e7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  // X-axis labels
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e4e4e7';
  ctx.font = '12px Inter';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 8; i++) {
    const x = padding + (i / 8) * chartWidth;
    const label = `${i * 100}m`;
    ctx.fillText(label, x, canvas.height - padding + 20);
  }

  // Y-axis labels
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#a1a1a6';
  ctx.textAlign = 'right';
  ctx.font = '11px Inter';
  for (let i = 0; i <= 5; i++) {
    const value = (i / 5) * maxLactate;
    const y = canvas.height - padding - (chartHeight / 5) * i;
    ctx.fillText(value.toFixed(1) + ' mmol/L', padding - 10, y + 4);
  }
}

// ═════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═════════════════════════════════════════════════════════════════════

/**
 * Slider change event
 */
document.getElementById('timeSlider').addEventListener('input', (e) => {
  appState.finishTime = Number(e.target.value);
  updateDisplay();
});

/**
 * Strategy button click events
 */
document.querySelectorAll('.strategy-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Remove active class from all buttons
    document.querySelectorAll('.strategy-btn').forEach(b => b.classList.remove('active'));

    // Add active class to clicked button
    btn.classList.add('active');

    // Update state
    appState.strategyId = Number(btn.dataset.strategy);
    updateDisplay();
  });
});

/**
 * Gender button click events
 */
document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Remove active class from all buttons
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));

    // Add active class to clicked button
    btn.classList.add('active');

    // Update state - convert m/w to male/female
    const genderMap = { 'm': 'male', 'w': 'female' };
    appState.gender = genderMap[btn.dataset.gender] || 'male';
    updateDisplay();
  });
});

/**
 * Age selector change event
 */
document.getElementById('ageSelect').addEventListener('change', (e) => {
  appState.ageInYears = Number(e.target.value);
  updateDisplay();
});

/**
 * Theme toggle
 */
document.getElementById('themeToggle').addEventListener('click', () => {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  // Update toggle button
  const btn = document.getElementById('themeToggle');
  btn.setAttribute('aria-label', newTheme === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren');
  btn.title = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
});

/**
 * Generate printable content
 */
function generatePrintContent() {
  const result = appState.currentSplits;
  const config = STRATEGY_CONFIG[result.strategy];
  const lactateValues = calculateLactateValues(result);

  // Gender label mapping
  const genderLabels = {
    'male': 'Männlich',
    'female': 'Weiblich'
  };

  let html = `
    <h1>800m Pacing Calculator – Trainingsplan</h1>

    <h2>Zieleinstellung</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;"><strong>Zielzeit:</strong></td>
        <td style="border: 1px solid #ccc; padding: 8px;">${formatTimeDisplay(result.finishTime)}</td>
        <td style="border: 1px solid #ccc; padding: 8px;"><strong>Strategie:</strong></td>
        <td style="border: 1px solid #ccc; padding: 8px;">${config.name}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;"><strong>Alter:</strong></td>
        <td style="border: 1px solid #ccc; padding: 8px;">${result.age} Jahre</td>
        <td style="border: 1px solid #ccc; padding: 8px;"><strong>Geschlecht:</strong></td>
        <td style="border: 1px solid #ccc; padding: 8px;">${genderLabels[result.gender] || result.gender}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;"><strong>Alters-Faktor:</strong></td>
        <td style="border: 1px solid #ccc; padding: 8px;">${result.ageFactor.toFixed(2)}</td>
        <td style="border: 1px solid #ccc; padding: 8px;"><strong>Blutlaktat-Baseline:</strong></td>
        <td style="border: 1px solid #ccc; padding: 8px;">${result.lactate.toFixed(1)} mmol/L</td>
      </tr>
    </table>

    <h2>100m-Splits & Zwischenzeiteneiten</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Split</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Zeit</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Kumuliert</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Tempo</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">% Zielzeit</th>
        </tr>
      </thead>
      <tbody>
  `;

  result.splits.forEach((split, index) => {
    const cumulative = result.cumulativeSplits[index];
    const tempo = calculateTempo(split);
    const percent = calculateSplitPercent(split, result.finishTime);
    const splitNum = (index + 1) * 100;

    html += `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;">${splitNum}m</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${formatTimeDisplay(split)}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${formatTimeDisplay(cumulative)}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${tempo}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${percent.toFixed(0)}%</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <h2>Blutlaktat-Werte (mmol/L)</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Split</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Zeit (sec)</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Rennzeit</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Laktat (mmol/L)</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Zone</th>
        </tr>
      </thead>
      <tbody>
  `;

  lactateValues.forEach((data) => {
    const raceTime = formatTimeDisplay(data.cumulativeTime);
    html += `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;">${data.splitDistance}m</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${data.splitTime.toFixed(2)}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${raceTime}</td>
        <td style="border: 1px solid #ccc; padding: 8px;"><strong>${data.lactate.toFixed(1)}</strong></td>
        <td style="border: 1px solid #ccc; padding: 8px;">${data.zone === 'aerob' ? 'Aerob' : data.zone === 'transition' ? 'Transition' : 'Anaerob'}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <h2>Strategie-Informationen</h2>
    <p><strong>Strategie:</strong> ${config.name}</p>
    <p><strong>Für:</strong> ${config.target}</p>
    <p><strong>Effekt:</strong> ${config.effect}</p>
    <p><strong>Energiemix:</strong> ${config.energy.anaerob}% Anaerob, ${config.energy.glykolyse}% Glykolyse, ${config.energy.aerob}% Aerob</p>

    <h2>Laktat-Schwellen Erklärung</h2>
    <ul>
      <li><strong>Aerob (&lt; 2 mmol/L):</strong> Leichte Intensität, gut für Grundlagentraining</li>
      <li><strong>LT1 (2 mmol/L):</strong> Aerobe Schwelle, Übergang zu höherer Intensität</li>
      <li><strong>Transition (2-4 mmol/L):</strong> Mittlere Intensität, Laktat-Clearing noch möglich</li>
      <li><strong>LT2 (4 mmol/L):</strong> Anaerobe Schwelle, Laktat-Ansammlung überwiegt Clearing</li>
      <li><strong>Anaerob (&gt; 4 mmol/L):</strong> Hohe Intensität, maximale Leistung</li>
    </ul>

    <p style="margin-top: 30px; font-size: 12px; color: #666;">
      <em>Erstellt mit 800m Pacing Calculator – trainingswissenschaftlich fundiert</em>
    </p>
  `;

  return html;
}

/**
 * Print the content
 */
function printContent() {
  const html = generatePrintContent();
  const printWindow = window.open('', '', 'height=800,width=900');
  printWindow.document.write('<html><head><title>800m Pacing Calculator</title>');
  printWindow.document.write('<style>body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }');
  printWindow.document.write('h1 { font-size: 24px; margin-bottom: 20px; }');
  printWindow.document.write('h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }');
  printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }');
  printWindow.document.write('th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }');
  printWindow.document.write('th { background: #f0f0f0; font-weight: bold; }');
  printWindow.document.write('ul { margin: 10px 0; padding-left: 30px; }');
  printWindow.document.write('</style></head><body>');
  printWindow.document.write(html);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}

/**
 * Export as PDF (using browser's print-to-PDF)
 */
function exportPDF() {
  const html = generatePrintContent();
  const printWindow = window.open('', '', 'height=800,width=900');
  printWindow.document.write('<html><head><title>800m-Pacing-Calculator.pdf</title>');
  printWindow.document.write('<style>body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }');
  printWindow.document.write('h1 { font-size: 24px; margin-bottom: 20px; }');
  printWindow.document.write('h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }');
  printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }');
  printWindow.document.write('th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }');
  printWindow.document.write('th { background: #f0f0f0; font-weight: bold; }');
  printWindow.document.write('ul { margin: 10px 0; padding-left: 30px; }');
  printWindow.document.write('@media print { body { margin: 0; } }');
  printWindow.document.write('</style></head><body>');
  printWindow.document.write(html);
  printWindow.document.write('</body></html>');
  printWindow.document.close();

  // Automatic PDF export
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Load saved theme preference
 */
function loadTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  const html = document.documentElement;
  html.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeToggle');
  btn.setAttribute('aria-label', saved === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren');
  btn.title = saved === 'dark' ? 'Light Mode' : 'Dark Mode';
}

/**
 * Print button click event
 */
document.getElementById('printBtn').addEventListener('click', printContent);

/**
 * PDF button click event
 */
document.getElementById('pdfBtn').addEventListener('click', exportPDF);

/**
 * Resize canvas on window resize
 */
window.addEventListener('resize', () => {
  if (appState.currentSplits.splits) {
    updateDisplay();
  }
});

// ═════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  updateDisplay();
  console.log('800m Pacing Calculator initialized');
});
