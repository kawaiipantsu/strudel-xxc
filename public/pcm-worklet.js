class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.active = true;
    this.size = 0;
    this.buffers = [new Float32Array(4096), new Float32Array(4096)];
    this.port.onmessage = (e) => {
      if (e.data === "stop") {
        this.flush();
        this.port.postMessage({ done: true });
        this.active = false;
      } else this.active = e.data === "resume";
    };
  }
  flush() {
    if (this.size) {
      this.port.postMessage({
        channels: this.buffers.map((b) => b.slice(0, this.size)),
      });
      this.size = 0;
    }
  }
  process(inputs, outputs) {
    const input = inputs[0];
    if (!this.active || !input?.length) return true;
    for (let i = 0; i < input[0].length; i++) {
      for (let c = 0; c < 2; c++)
        this.buffers[c][this.size] = input[c]?.[i] ?? input[0][i];
      this.size++;
      if (this.size === 4096) this.flush();
    }
    return true;
  }
}
registerProcessor("xxc-capture", Capture);
