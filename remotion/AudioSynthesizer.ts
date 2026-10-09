// Audio Synthesizer for Remotion Video (Dynamic BG Music & SFX sync)
export class PromoAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private musicInterval: any = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play energetic background rhythm synth beat
  public startBackgroundMusic() {
    this.init();
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;

    let step = 0;
    // Energetic upbeat baseline (128 BPM = ~234ms per 16th note)
    const tempoMs = 120; 

    // Chord progression notes (in Hz): C, G, Am, F
    const chords = [
      [261.63, 329.63, 392.00], // C major
      [196.00, 246.94, 293.66], // G major
      [220.00, 261.63, 329.63], // A minor
      [174.61, 220.00, 261.63], // F major
    ];

    this.musicInterval = setInterval(() => {
      if (!this.ctx || !this.isPlaying) return;

      const time = this.ctx.currentTime;
      const currentChordIndex = Math.floor(step / 8) % chords.length;
      const chord = chords[currentChordIndex];

      // Kick drum on 0, 4, 8, 12
      if (step % 4 === 0) {
        this.playKick(time);
      }

      // Snare / Hi-hat on alternate steps
      if (step % 4 === 2) {
        this.playHiHat(time);
      }

      // Synth Chord Pulse
      if (step % 2 === 0) {
        chord.forEach((freq) => {
          this.playTone(freq, time, 0.12, 'triangle', 0.08);
        });
      }

      // Arpeggio Melody Accent
      const melNote = chord[step % chord.length] * 2;
      this.playTone(melNote, time, 0.08, 'sine', 0.04);

      step = (step + 1) % 32;
    }, tempoMs);
  }

  public stopBackgroundMusic() {
    this.isPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // Sound Effects (SFX)
  public playWhoosh() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.15);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.linearRampToValueAtTime(0.01, time + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  public playPop() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, time);
    osc.frequency.exponentialRampToValueAtTime(1200, time + 0.08);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.linearRampToValueAtTime(0.01, time + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.08);
  }

  public playCoinChime() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    [987.77, 1318.51].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + i * 0.06);

      gain.gain.setValueAtTime(0.2, time + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(time + i * 0.06);
      osc.stop(time + i * 0.06 + 0.3);
    });
  }

  public playCashRegister() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const freqs = [1046.50, 1318.51, 1567.98, 2093.00];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + idx * 0.04);

      gain.gain.setValueAtTime(0.25, time + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.04 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(time + idx * 0.04);
      osc.stop(time + idx * 0.04 + 0.25);
    });
  }

  public playEngineZoom() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.linearRampToValueAtTime(350, time + 0.2);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.4);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.linearRampToValueAtTime(0.01, time + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  public playSuccessChime() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const arpeggio = [523.25, 659.25, 783.99, 1046.50];
    arpeggio.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.07);

      gain.gain.setValueAtTime(0.2, time + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(time + idx * 0.07);
      osc.stop(time + idx * 0.07 + 0.4);
    });
  }

  private playTone(freq: number, time: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  }

  private playKick(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.09);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.09);
  }

  private playHiHat(time: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(time);
  }
}

export const promoAudio = new PromoAudioSynthesizer();
