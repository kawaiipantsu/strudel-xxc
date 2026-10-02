class SchedulerClock extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.interval = Math.max(
      128,
      Math.round((options.processorOptions.milliseconds * sampleRate) / 1000),
    );
    this.nextFrame = currentFrame + this.interval;
    this.stopped = false;
    this.port.onmessage = () => {
      this.stopped = true;
    };
  }
  process() {
    if (this.stopped) return false;
    if (currentFrame >= this.nextFrame) {
      this.nextFrame += this.interval;
      this.port.postMessage(null);
    }
    return true;
  }
}
registerProcessor("xxc-scheduler-clock", SchedulerClock);
