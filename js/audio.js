export class AudioManager {
  constructor() {
    this.isEnabled = true;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.musicTimer = 0;
    this.musicStep = 0;
  }

  setEnabled(isEnabled) {
    this.isEnabled = isEnabled;

    if (!isEnabled) {
      this.stopMusic();
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0, this.context.currentTime, 0.03);
      }
      return;
    }

    this.ensureContext();
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0.18, this.context.currentTime, 0.05);
    }
  }

  ensureContext() {
    if (!this.isEnabled) {
      return null;
    }

    if (!this.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        this.isEnabled = false;
        return null;
      }

      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.18;
      this.masterGain.connect(this.context.destination);

      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.masterGain);
    }

    if (this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }

    return this.context;
  }

  pulse({ type = "sine", frequency = 440, duration = 0.16, volume = 0.18, attack = 0.01, release = 0.1, when = 0 }) {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    const startTime = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + release);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + release + 0.02);
  }

  playStart() {
    this.pulse({ type: "triangle", frequency: 392, duration: 0.08, volume: 0.14 });
    this.pulse({ type: "triangle", frequency: 523.25, duration: 0.12, volume: 0.16, when: 0.08 });
    this.pulse({ type: "triangle", frequency: 659.25, duration: 0.16, volume: 0.18, when: 0.16 });
  }

  playEat() {
    this.pulse({ type: "square", frequency: 740, duration: 0.04, volume: 0.12 });
    this.pulse({ type: "triangle", frequency: 880, duration: 0.08, volume: 0.16, when: 0.04 });
  }

  playGameOver() {
    this.pulse({ type: "sawtooth", frequency: 280, duration: 0.16, volume: 0.16 });
    this.pulse({ type: "sawtooth", frequency: 210, duration: 0.18, volume: 0.15, when: 0.12 });
    this.pulse({ type: "sawtooth", frequency: 160, duration: 0.24, volume: 0.14, when: 0.26 });
  }

  startMusic() {
    const context = this.ensureContext();
    if (!context || this.musicTimer) {
      return;
    }

    this.musicGain.gain.cancelScheduledValues(context.currentTime);
    this.musicGain.gain.setTargetAtTime(0.35, context.currentTime, 0.2);

    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
    const bass = [130.81, 146.83, 164.81, 146.83];

    const scheduleLoop = () => {
      if (!this.musicTimer || !this.isEnabled) {
        return;
      }

      const note = notes[this.musicStep % notes.length];
      const bassNote = bass[this.musicStep % bass.length];

      this.playMusicVoice(note, bassNote);
      this.musicStep += 1;
      this.musicTimer = window.setTimeout(scheduleLoop, 420);
    };

    this.musicTimer = window.setTimeout(scheduleLoop, 0);
  }

  playMusicVoice(note, bassNote) {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    const leadOscillator = context.createOscillator();
    const leadGain = context.createGain();
    leadOscillator.type = "sine";
    leadOscillator.frequency.setValueAtTime(note, context.currentTime);
    leadGain.gain.setValueAtTime(0.0001, context.currentTime);
    leadGain.gain.linearRampToValueAtTime(0.06, context.currentTime + 0.03);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34);
    leadOscillator.connect(leadGain);
    leadGain.connect(this.musicGain);
    leadOscillator.start();
    leadOscillator.stop(context.currentTime + 0.36);

    const bassOscillator = context.createOscillator();
    const bassGain = context.createGain();
    bassOscillator.type = "triangle";
    bassOscillator.frequency.setValueAtTime(bassNote, context.currentTime);
    bassGain.gain.setValueAtTime(0.0001, context.currentTime);
    bassGain.gain.linearRampToValueAtTime(0.04, context.currentTime + 0.02);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.38);
    bassOscillator.connect(bassGain);
    bassGain.connect(this.musicGain);
    bassOscillator.start();
    bassOscillator.stop(context.currentTime + 0.4);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = 0;
    }

    if (this.musicGain && this.context) {
      this.musicGain.gain.cancelScheduledValues(this.context.currentTime);
      this.musicGain.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.08);
    }
  }
}
