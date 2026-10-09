'use client';

// Sound & Voiceover Synthesizer Engine for Remotion 9:16 Vertical Promo
export class PromoAudioEngine {
  private ctx: AudioContext | null = null;
  private musicPlaying = false;
  private musicInterval: any = null;
  private voiceSynthesizer: SpeechSynthesis | null = null;
  private isVoiceMuted = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voiceSynthesizer = window.speechSynthesis;
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Female Voiceover Narration Generator (Spanish)
  public speakVoiceover(text: string, rate = 0.95, pitch = 1.1) {
    if (typeof window === 'undefined') return;
    this.init();
    if (!this.voiceSynthesizer || this.isVoiceMuted) return;

    // Cancel ongoing speech to stay synchronized
    this.voiceSynthesizer.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = rate; // Natural pacing
    utterance.pitch = pitch; // Female voice tone preference

    // Attempt to pick a Spanish female voice if available in browser
    const voices = this.voiceSynthesizer.getVoices();
    const esVoice = voices.find(
      (v) => v.lang.startsWith('es') && (v.name.includes('Monica') || v.name.includes('Lucia') || v.name.includes('Paulina') || v.name.includes('Sabina') || v.name.includes('Female') || v.name.includes('Google español'))
    ) || voices.find((v) => v.lang.startsWith('es'));

    if (esVoice) {
      utterance.voice = esVoice;
    }

    this.voiceSynthesizer.speak(utterance);
  }

  // Upbeat background music rhythm (Modulates volume under voiceover)
  public startBackgroundMusic() {
    this.init();
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;

    let step = 0;
    // Upbeat baseline ~128 BPM (117ms per 16th note)
    const tempoMs = 117; 

    // Warm chords in Hz: Cmaj7, Am7, Fmaj7, G7
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23], // G7
    ];

    this.musicInterval = setInterval(() => {
      if (!this.ctx || !this.musicPlaying) return;

      const time = this.ctx.currentTime;
      const currentChordIndex = Math.floor(step / 8) % chords.length;
      const chord = chords[currentChordIndex];

      // Bass Kick on 0, 4, 8, 12
      if (step % 4 === 0) {
        this.playKick(time);
      }

      // Snare / Hi-Hat
      if (step % 4 === 2) {
        this.playHiHat(time);
      }

      // Synth Chord Stabs
      if (step % 2 === 0) {
        chord.forEach((freq) => {
          this.playTone(freq, time, 0.1, 'triangle', 0.05);
        });
      }

      // Arpeggio Melody
      const melNote = chord[step % chord.length] * 2;
      this.playTone(melNote, time, 0.08, 'sine', 0.03);

      step = (step + 1) % 32;
    }, tempoMs);
  }

  public stopBackgroundMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.voiceSynthesizer) {
      this.voiceSynthesizer.cancel();
    }
  }

  // --- Synchronized Sound Effects (SFX) ---
  public playWhoosh() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(900, time + 0.14);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.linearRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.14);
  }

  public playPop() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, time);
    osc.frequency.exponentialRampToValueAtTime(1100, time + 0.07);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.linearRampToValueAtTime(0.001, time + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.07);
  }

  public playTap() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, time);
    osc.frequency.exponentialRampToValueAtTime(1500, time + 0.05);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  public playConfirmation() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.05);

      gain.gain.setValueAtTime(0.18, time + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(time + idx * 0.05);
      osc.stop(time + idx * 0.05 + 0.25);
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

      gain.gain.setValueAtTime(0.22, time + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.04 + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(time + idx * 0.04);
      osc.stop(time + idx * 0.04 + 0.22);
    });
  }

  public playEngineZoom() {
    this.init();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.linearRampToValueAtTime(380, time + 0.25);
    osc.frequency.exponentialRampToValueAtTime(90, time + 0.45);

    gain.gain.setValueAtTime(0.1, time);
    gain.gain.linearRampToValueAtTime(0.001, time + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.45);
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
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.08);
  }

  private playHiHat(time: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.035;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    noise.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(time);
  }
}

export const promoAudioEngine = new PromoAudioEngine();
