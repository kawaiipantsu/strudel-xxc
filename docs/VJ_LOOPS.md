# VJ loop video packs

Open **VISUALIZER → VJ Loops**. The studio includes the operator's three packs: **146 clips** (66 in Pack 1, 8 in Pack 2, 72 in Pack 3). The videos replace the generated scene background. Strudel remains the only audible source: both video layers are always muted.

## Watch and perform

1. Play a Strudel score.
2. Select VJ Loops, choose a pack, and click a clip thumbnail. The selected clip loops continuously.
3. Add optional Spider, Spark Dust, Waveform Halo or Code Fragments overlays.
4. Choose **Fullscreen**, or **Watch Music Video** to enable automatic clip changes.

Automatic mode switches clips from the selected pack every 4, 8, 16 or 32 audible Strudel cycles. It avoids selecting the same clip twice in a row and crossfades after the incoming video is ready. **Next scene** changes clips manually. Clip selection and the playback position carry between the preview and fullscreen presentation.

**Playback speed** adjusts the clip independently of the music. **Follow audio energy** varies this speed gently with the measured master energy. This is an expressive response, not optical beat detection or guaranteed synchronization of movement within a prerecorded clip. **Fill screen** crops to fill the display; **Show full clip** preserves the full frame with letterboxing.

Hush, paused visuals, hidden/offscreen views and reduced motion pause video playback. Closing the VJ tab releases its media sources. Switching back resumes the selected composition. **Use as studio background** also works with video. Only selected/incoming clips load; browsing uses small, lazy-loaded JPEG thumbnails. Fullscreen removes the studio preview/background renderers. With preview and studio background both enabled, each visible surface has its own decoder.

**Save visual frame** composites the actual video frame, overlays and title into a PNG. The feature does not export an encoded music-video file. Videos do not enter project ZIPs or recordings.

## Local import and updates

The original packs are in `assets/vjloops/pack1`, `pack2` and `pack3`, outside the web root. They are explicitly ignored by Git. Keep these originals in a separate media backup.

```bash
python3 scripts/install-vjloops.py
./scripts/build.sh
python3 tests/vjloops-http.py
npx playwright test tests/e2e/vjloops.spec.ts
```

The importer hashes and inspects local `.mp4` and `.mov` files with FFprobe. It accepts bounded video durations and prepares 8-bit 4:2:0 H.264 MP4s (retaining full-range color where present) at no more than 1920 pixels wide. Compatible MP4s are hard-linked into private storage. MOV, MJPEG and oversized sources are transcoded with FFmpeg to at most 1280 pixels wide, using CRF 24 and a 3 Mb/s video-rate cap. Compatible MP4 originals retain their original resolution (up to 1920 pixels wide). Converted files omit audio. Original MP4 soundtracks may remain in their files but are always muted by the player.

This installation reuses **88 original MP4s** and prepares **58 converted files**. Conversions add **196,457,380 bytes**. Original files total approximately 4.6 GB; there is no second full copy. New conversions preserve a 2 GiB application reserve plus temporary working space. Re-encoding an existing derived copy can use a 1 GiB temporary reserve to recover disk space. The host had approximately 2.3 GiB free after optimization; sample uploads and recording exports were checked again against the application’s unchanged 2 GiB reserve. Check available disk space before adding more packs.

Because compatible originals and installed files share an inode, replace source files instead of editing their bytes in place. Run the importer after changing packs. Hashes and the prepared-format recipe determine media identifiers. Originals stay on disk. Existing project uploads are untouched.

The normal build runs `python3 scripts/install-vjloops.py --check`: it verifies every installed video hash and regenerates public metadata. It does not transcode or download media. A checkout without supplied packs builds with an empty VJ catalogue. The deployment's VJ tests expect all three supplied packs.

## Delivery and privacy

- `storage/vjloops/video/`: approved MP4 files, outside `html/`.
- `storage/vjloops/thumb/`: generated JPEG thumbnails.
- `storage/vjloops/metadata/`: MIME, size and ETag allowlist.
- `storage/vjloops/installed.json`: private import inventory and original filenames.
- `public/vjloops/catalog.json` → `html/vjloops/catalog.json`: public display names and opaque media URLs.
- `/vjloops/video/{id}.mp4` and `/vjloops/thumb/{id}.jpg`: read-only PHP delivery with byte ranges and immutable caching. URLs include the prepared-byte hash as a version query, so refreshed encodings do not reuse a stale browser cache entry.

PHP can read the root-owned media but cannot modify it. The endpoint accepts only hashed filenames and approved formats; it never accepts arbitrary paths or downloads remote URLs. Clips are publicly streamable like the site's system sample banks. No administrator or session data is included in their URLs. The service worker does not cache VJ videos or thumbnails. Browser HTTP caching applies to selected resources.

Both original and generated media are ignored by Git. Only the importer, delivery endpoint, UI, tests and documentation enter the repository. No daemon, job queue, Apache vhost replacement or additional cron entry is needed. Existing cleanup does not delete legitimate VJ assets; pack removal is an operator action.

## Attribution

Pack 1 is credited to **Beeple**. Its supplied README permits commercial and noncommercial reuse and invites attribution. That original notice remains beside the private source files. [Beeple's VJ channel](https://vimeo.com/channels/beeple) and [artist website](https://www.beeple-crap.com/) identify the source; contact details are not copied into the repository.

Packs 2 and 3 were supplied by the operator without accompanying license notices. They are documented as operator-supplied collections; the application does not assign them an AGPL or Creative Commons license. The media itself is excluded from the public source repository.
