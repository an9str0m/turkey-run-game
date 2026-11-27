// All sound is synthesised with WebAudio: no audio files, nothing to load.
// A small helper plays short blips and jingles; a gentle two-bar loop hums
// along while the turkey runs. Everything is created lazily on the first
// user gesture, as browsers require.

class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
  }

  tone({ type = 'sine', from = 440, to = null, at = 0, length = 0.15, volume = 0.2 }) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + at;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + length);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  noise({ at = 0, length = 0.18, volume = 0.25 }) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + at;
    const size = Math.max(1, Math.floor(this.context.sampleRate * length));
    const buffer = this.context.createBuffer(1, size, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.master);
    source.start(start);
  }

  jump() {
    this.tone({ type: 'square', from: 320, to: 640, length: 0.14, volume: 0.12 });
  }

  doubleJump() {
    this.tone({ type: 'square', from: 520, to: 940, length: 0.14, volume: 0.12 });
    this.noise({ length: 0.08, volume: 0.06 });
  }

  corn() {
    this.tone({ type: 'sine', from: 880, length: 0.09, volume: 0.16 });
    this.tone({ type: 'sine', from: 1318, at: 0.06, length: 0.12, volume: 0.16 });
  }

  golden() {
    const notes = [784, 988, 1175, 1568];
    notes.forEach((note, i) => this.tone({ type: 'triangle', from: note, at: i * 0.07, length: 0.16, volume: 0.16 }));
  }

  hit() {
    this.noise({ length: 0.22, volume: 0.3 });
    this.tone({ type: 'sawtooth', from: 160, to: 60, length: 0.25, volume: 0.2 });
  }

  splash() {
    this.noise({ length: 0.3, volume: 0.2 });
    this.tone({ type: 'sine', from: 300, to: 90, length: 0.25, volume: 0.12 });
  }

  gobble() {
    for (let i = 0; i < 5; i += 1) {
      this.tone({ type: 'sawtooth', from: 620 + (i % 2) * 160, to: 300, at: i * 0.055, length: 0.06, volume: 0.1 });
    }
  }

  caught() {
    const notes = [392, 370, 349, 311];
    notes.forEach((note, i) => this.tone({ type: 'triangle', from: note, at: i * 0.16, length: 0.2, volume: 0.18 }));
    this.gobble();
  }

  escaped() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((note, i) => this.tone({ type: 'triangle', from: note, at: i * 0.11, length: 0.18, volume: 0.18 }));
  }

  startMusic() {
    if (!this.context || this.musicTimer) return;
    const melody = [523, 587, 659, 587, 784, 659, 587, 523, 440, 523, 587, 659, 587, 523, 440, 392];
    const bass = [131, 98, 110, 98];
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      const step = this.musicStep;
      this.tone({ type: 'triangle', from: melody[step % melody.length], length: 0.16, volume: 0.045 });
      if (step % 4 === 0) this.tone({ type: 'sine', from: bass[(step / 4) % bass.length], length: 0.3, volume: 0.06 });
      this.musicStep += 1;
    }, 150);
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

export const sound = new SoundBank();
