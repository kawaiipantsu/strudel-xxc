// Supply Strudel's official timer hooks with wakeups from the audio thread.
// Pattern queries still belong to Strudel; this only replaces browser intervals.
export function createSchedulerClock(getContext: () => AudioContext) {
  let initialized: Promise<void> | undefined;
  return {
    initialize() {
      return (initialized ??= getContext()
        .audioWorklet.addModule(
          new URL("./clock-worklet.js", import.meta.url).href,
        )
        .catch((error) => {
          initialized = undefined;
          throw error;
        }));
    },
    setInterval(callback: () => void, milliseconds: number) {
      const context = getContext();
      const node = new AudioWorkletNode(context, "xxc-scheduler-clock", {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { milliseconds },
      });
      node.port.onmessage = callback;
      // A rendered output keeps the timing processor active during real playback.
      // Its output is zero; SuperDough remains the only audible signal path.
      node.connect(context.destination);
      return node;
    },
    clearInterval(node: AudioWorkletNode) {
      node.port.onmessage = null;
      node.port.postMessage("stop");
      node.disconnect();
      node.port.close();
    },
  };
}
