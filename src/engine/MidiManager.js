export class MidiManager {
  constructor(onNoteOn, onNoteOff) {
    this.onNoteOn = onNoteOn;
    this.onNoteOff = onNoteOff;
    this.access = null;
    this.inputs = [];
  }

  async initialize() {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser.');
      return false;
    }

    try {
      this.access = await navigator.requestMIDIAccess();
      this.access.onstatechange = (e) => this.handleStateChange(e);
      this.updateInputs();
      return true;
    } catch (err) {
      console.error('Failed to get MIDI access:', err);
      return false;
    }
  }

  updateInputs() {
    this.inputs = Array.from(this.access.inputs.values());
    this.inputs.forEach(input => {
      input.onmidimessage = (msg) => this.handleMidiMessage(msg);
    });
  }

  handleStateChange(e) {
    console.log('MIDI State Change:', e.port.name, e.port.state);
    this.updateInputs();
  }

  handleMidiMessage(msg) {
    const [status, data1, data2] = msg.data;
    const type = status & 0xf0;
    const channel = status & 0x0f;

    if (type === 0x90 && data2 > 0) {
      // Note On
      this.onNoteOn({
        pitch: data1,
        velocity: data2,
        channel,
        timestamp: performance.now()
      });
    } else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
      // Note Off
      this.onNoteOff({
        pitch: data1,
        velocity: data2,
        channel,
        timestamp: performance.now()
      });
    }
  }

  getAvailableInputs() {
    return this.inputs.map(input => input.name);
  }
}
