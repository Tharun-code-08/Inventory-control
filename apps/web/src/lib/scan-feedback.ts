let ctx: AudioContext | null = null;

function tone(freq: number, durationMs: number, startDelayMs = 0) {
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.04;
    osc.connect(gain).connect(ctx.destination);
    const start = ctx.currentTime + startDelayMs / 1000;
    osc.start(start);
    osc.stop(start + durationMs / 1000);
  } catch {
    // Audio is best-effort; never break the scan flow.
  }
}

/** Short high beep — product found. */
export function playScanSuccess() {
  tone(1568, 80);
}

/** Double low buzz — scan failed or product unknown. */
export function playScanError() {
  tone(220, 140);
  tone(220, 140, 200);
}
