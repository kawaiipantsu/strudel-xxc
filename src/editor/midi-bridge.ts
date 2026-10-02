// A Web MIDI facade for the official Strudel MIDI package. Permissions live in the host UI.
export function createMidiBridge(send: (type: string, data: any) => void) {
  const inputs = new Map<string, any>(),
    outputs = new Map<string, any>();
  const access: any = {
    inputs,
    outputs,
    sysexEnabled: false,
    onstatechange: null,
  };
  function port(p: any, type: string) {
    const value: any = {
      ...p,
      type,
      state: "connected",
      connection: "open",
      version: "1",
      onmidimessage: null,
      onstatechange: null,
    };
    value.open = async () => value;
    value.close = async () => value;
    value.send = (bytes: any, time: number) =>
      send("midi-send", {
        id: p.id,
        bytes: Array.from(bytes),
        time: Number.isFinite(time) ? time + performance.timeOrigin : undefined,
      });
    value.clear = () => {};
    return value;
  }
  return {
    async ports(data: any) {
      inputs.clear();
      outputs.clear();
      data.inputs.forEach((p: any) => inputs.set(p.id, port(p, "input")));
      data.outputs.forEach((p: any) => outputs.set(p.id, port(p, "output")));
      Object.defineProperty(navigator, "requestMIDIAccess", {
        configurable: true,
        value: async () => access,
      });
      const midi = await import("@strudel/midi");
      const core = await import("@strudel/core");
      await core.evalScope(midi);
      await midi.enableWebMidi();
      send("log", {
        message:
          "Official Strudel MIDI input, output and clock connected through permission bridge.",
      });
    },
    input(data: any) {
      for (const p of inputs.values()) {
        if (data.device === p.name)
          p.onmidimessage?.({
            data: new Uint8Array(data.data),
            receivedTime: performance.now(),
            timeStamp: performance.now(),
            target: p,
          });
      }
    },
  };
}
