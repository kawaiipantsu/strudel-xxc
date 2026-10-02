# VJ loop video packs

Open **VISUALIZER → VJ Loops**. The studio includes the operator's three packs: **146 clips** (66 in Pack 1, 8 in Pack 2, 72 in Pack 3). The videos replace the generated scene background. Strudel remains the only audible source: both video layers are always muted.

## Watch and perform

1. Play a Strudel score.
2. Select VJ Loops, choose a pack, and click a clip thumbnail. The selected clip loops continuously.
3. Add optional Spider, Spark Dust, Waveform Halo or Code Fragments overlays.
4. Choose **Fullscreen**, or **Watch Music Video** to enable automatic clip changes.

Automatic mode switches clips from the selected pack every **1, 2, 4, 8, 16 or 32** audible Strudel cycles. Shorter settings work well for slow tempos. Each starting clip and subsequent change uses fresh browser randomness, avoids immediately repeating a clip, and crossfades after the incoming video is ready. **Next scene** also picks randomly. Clicking a thumbnail still selects that exact clip. Reloading starts a fresh sequence while keeping the chosen pack and timing.

The director shares each random choice across preview, background and fullscreen. Changing views preserves the selected clip and playback position instead of drawing another random clip.

**Playback speed** adjusts the clip independently of the music. **Follow audio energy** varies this speed gently with the measured master energy. This is an expressive response, not optical beat detection or guaranteed synchronization of movement within a prerecorded clip. **Fill screen** crops to fill the display; **Show full clip** preserves the full frame with letterboxing.

Hush, paused visuals, hidden/offscreen views and reduced motion pause video playback. Closing the VJ tab releases its media sources. Switching back resumes the selected composition. **Use as studio background** also works with video. Only selected/incoming clips load; browsing uses small, lazy-loaded JPEG thumbnails. Fullscreen removes the studio preview/background renderers. With preview and studio background both enabled, each visible surface has its own decoder.

**Save visual frame** composites the actual video frame, overlays and title into a PNG. The feature does not export an encoded music-video file. Videos do not enter project ZIPs or recordings.

## Play from a project link

Public and unlisted `/p/{slug}` pages have a **Play** button. It plays the project's selected entry file in a **1280×720** VJ window that scales down on smaller screens. Other source files remain available for inspection and start collapsed. The page does not run any score or fetch video clips until Play is clicked.

Link directly to **`/p/{slug}/play?cycle=1`** to open at the player. The `cycle` parameter accepts `1`, `2`, `4`, `8`, `16` or `32`; omitted or invalid values use eight. `/p/{slug}?cycle=2#play` also works. **Copy player link** includes the timing selected in the player. These links reveal the controls without starting audio; the listener presses Play. Canonical/social URLs remain the main project page, and private projects remain inaccessible.

Use **Fullscreen** / **Exit**, **Next loop**, **Pause visuals**, **Volume** and **Stop** inside the player. **Change every** selects 1, 2, 4, 8, 16 or 32 Strudel cycles (eight by default). Fullscreen preserves playback; browsers without element fullscreen use a window-filling view that also closes with Escape. VJ clips are silent, respond to measured audio energy and change randomly on the selected timing. Reduced motion freezes the video frame while allowing music to play. Some Safari configurations require **Enable audio** inside the player after Play.

During playback, video controls fade after 2.5 seconds of pointer inactivity or when the pointer leaves. Move the pointer, tap, or focus a control with the keyboard to reveal them. Keyboard-focused controls stay visible. Controls remain visible while stopped or waiting for audio activation. The studio's fullscreen visualizer uses the same behavior.

The page background uses the same original hexagonal particle renderer as the studio header, inspired by [towc's particle study](https://codepen.io/towc/pen/mJzOWJ). It uses red trails, bounded resolution, a frame-rate cap and a **Pause background** control. Hidden tabs suspend decoration; system reduced-motion preferences show static trails.

Play does not save or alter the project. Stop destroys its isolated runtime; Play starts the entry file again. Audio can continue in another tab while the browser allows it. See the [security model](SECURITY.md) for executable scores and the [audio guide](AUDIO_ENGINE.md) for background-playback limits.

## Local import and updates

The original packs are in `assets/vjloops/pack1`, `pack2` and `pack3`, outside the web root. They are explicitly ignored by Git. Keep these originals in a separate media backup.

```bash
python3 scripts/install-vjloops.py
./scripts/build.sh
python3 tests/vjloops-http.py
npx playwright test tests/e2e/vjloops.spec.ts
```

The importer hashes and inspects local `.mp4` and `.mov` files with FFprobe. Every clip is normalized to 8-bit 4:2:0 H.264 MP4 at no more than 1280 pixels wide, using FFmpeg, CRF 24 and a 3 Mb/s video-rate cap. Prepared clips have fast-start metadata and no audio track. Full-range color is retained where present.

The first import reused 88 original MP4s, but some stalled near the first frame in WebKit despite valid codec metadata. A bare video element reproduced the problem, and normalization fixed playback. All **146 clips** now use the same browser encoding. Original files total approximately 4.6 GB and remain intact; the browser copies are much smaller.

The installed browser copies total **302,776,942 bytes**. The host has approximately 2.1 GiB free after normalization, including the protected 2 GiB reserve. Adding larger packs or long recordings will require more disk space.

Conversions preserve a 2 GiB application reserve plus the estimated bounded output size and temporary overhead. Check disk space before adding more packs. Run the importer after changing packs. Hashes and the prepared-format recipe determine media identifiers. The byte-hash query in each public URL changes when an encoding is replaced, so browsers request the new copy. Existing project uploads are untouched.

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
