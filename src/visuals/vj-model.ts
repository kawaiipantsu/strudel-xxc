import { useEffect, useState } from "react";
export type VJClip = {
  id: string;
  title: string;
  pack: string;
  duration: number;
  width: number;
  height: number;
  url: string;
  poster: string;
};
export type VJCatalogue = {
  version: string;
  packs: { id: string; name: string; count: number; credit: string }[];
  clips: VJClip[];
};
let request: Promise<VJCatalogue> | undefined;
export function useVJCatalogue() {
  const [data, setData] = useState<VJCatalogue>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request ||= fetch("/vjloops/catalog.json", { cache: "no-cache" })
      .then((r) => {
        if (!r.ok)
          throw new Error("VJ loop catalogue unavailable. Reload to retry.");
        return r.json();
      })
      .catch((e) => {
        request = undefined;
        throw e;
      });
    request
      .then((data) => {
        if (active) setData(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return { data, error };
}
