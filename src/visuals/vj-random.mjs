// Fresh entropy per choice, shared by every surface using the same director.
// No persisted seed means each new listening session gets a different sequence.
export function nextVJClip(clips, previous = "") {
  const pool = clips.filter((clip) => clip.id !== previous);
  if (!pool.length) return clips[0];
  const word = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / pool.length) * pool.length;
  do {
    crypto.getRandomValues(word);
  } while (word[0] >= limit);
  return pool[word[0] % pool.length];
}
export function sharedVJClip(director, clips, selection, shot, manual = "") {
  const key = selection + ":" + shot;
  if (director.vjChoiceKey === key) {
    const existing = clips.find((clip) => clip.id === director.vjChoiceId);
    if (existing) return existing;
  }
  const clip =
    clips.find((clip) => clip.id === manual) ||
    nextVJClip(clips, director.vjChoiceId || director.vjCurrent);
  director.vjChoiceKey = key;
  director.vjChoiceId = clip?.id || "";
  return clip;
}
