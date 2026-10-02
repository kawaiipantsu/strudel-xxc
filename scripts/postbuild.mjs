import fs from "node:fs";
import crypto from "node:crypto";
fs.mkdirSync("html/assets", { recursive: true });
fs.writeFileSync("html/assets/hydra-loader.js", "export {};\n");
const assets = fs
  .readdirSync("html/assets")
  .filter((n) => /\.(js|css|woff2)$/.test(n));
const active = new Set();
for (const page of [
  "html/index.html",
  "html/sandbox/index.html",
  "html/admin/index.html",
  "html/share-player/index.html",
]) {
  const data = fs.readFileSync(page, "utf8");
  for (const m of data.matchAll(/\/assets\/[^"']+/g)) active.add(m[0]);
}
// Include all referenced chunks transitively, excluding obsolete hashed output from previous deploys.
const queue = [...active];
for (let i = 0; i < queue.length; i++) {
  const file = "html" + queue[i];
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(
    /(?:\.\/|\/assets\/)([A-Za-z0-9_@.-]+\.(?:js|css|woff2))/g,
  )) {
    const a = "/assets/" + m[1];
    if (!active.has(a) && fs.existsSync("html" + a)) {
      active.add(a);
      queue.push(a);
    }
  }
}
const version = crypto
  .createHash("sha256")
  .update([...active].sort().join("\n"))
  .digest("hex")
  .slice(0, 12);
const precache = [
  "/",
  "/sandbox/",
  "/pcm-worklet.js",
  "/brand/mark.svg",
  "/brand/loading.svg",
  "/sample-banks/runtime.json",
  "/sample-banks/catalog.json",
  ...active,
].filter((x) => !x.includes("/admin"));
fs.writeFileSync(
  "html/sw.js",
  `const CACHE='xxc-studio-${version}';const FILES=${JSON.stringify(precache)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('xxc-studio-')&&k!==CACHE).map(k=>caches.delete(k))))));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/media/')||u.pathname.startsWith('/admin')||u.pathname.startsWith('/p/')||u.pathname.startsWith('/library'))return;const safe=u.pathname==='/'||u.pathname==='/sandbox/'||u.pathname==='/pcm-worklet.js'||u.pathname.startsWith('/assets/')||u.pathname.startsWith('/brand/')||u.pathname.startsWith('/samples/')||u.pathname==='/sample-banks/runtime.json'||u.pathname==='/sample-banks/catalog.json';if(!safe)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request).then(r=>r||new Response('Offline: asset unavailable',{status:503}))));});\n`,
);
fs.writeFileSync(
  "html/build.json",
  JSON.stringify(
    {
      version: "1.0.0",
      build: version,
      strudel: { core: "1.2.6", codemirror: "1.3.0", superdough: "1.3.0" },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Static shell build " + version + "; " + active.size + " active assets.",
);
