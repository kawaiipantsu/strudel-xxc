export function bankIndex(sounds, runtimeNames = []) {
  const banks = new Map(),
    aliases = new Map();
  const split = (name) => {
    const at = name.indexOf("_");
    return at < 0 ? ["", name] : [name.slice(0, at), name.slice(at + 1)];
  };
  for (const sound of sounds)
    if (sound.alias) {
      const [bank] = split(sound.name),
        [alias] = split(sound.alias);
      if (bank && alias && alias.toLowerCase() !== bank.toLowerCase())
        aliases.set(alias.toLowerCase(), bank);
    }
  const add = (name, collection = "Runtime / custom") => {
    if (typeof name !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(name))
      return;
    let [bank, voice] = split(name);
    bank = aliases.get(bank.toLowerCase()) || bank;
    const key = bank.toLowerCase();
    if (!banks.has(key))
      banks.set(key, {
        name: bank,
        aliases: [],
        voices: new Map(),
        collections: new Set(),
      });
    const group = banks.get(key);
    if (!group.voices.has(voice.toLowerCase()))
      group.voices.set(voice.toLowerCase(), voice);
    if (collection !== "Runtime / custom" || !group.collections.size)
      group.collections.add(collection);
  };
  for (const sound of sounds) add(sound.name, sound.collection);
  for (const name of runtimeNames) add(name);
  for (const [alias, name] of aliases) {
    const group = banks.get(name.toLowerCase());
    const display = sounds
      .find((s) => s.alias?.split("_")[0].toLowerCase() === alias)
      ?.alias.split("_")[0];
    if (group) group.aliases.push(display || alias);
  }
  return [...banks.values()]
    .map((group) => ({
      ...group,
      voices: [...group.voices.values()].sort(),
      collections: [...group.collections],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export const bankCode = (name) => `.bank(${JSON.stringify(name)})`;
export const bankVoiceCode = (name, voice) =>
  (name === "gm" || name === "wt" ? 'note("c3").' : "") +
  `s(${JSON.stringify(voice)})` +
  (name ? bankCode(name) : "");
