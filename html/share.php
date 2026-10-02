<?php
require __DIR__ . "/../backend/bootstrap.php";
require ROOT . "/backend/pages.php";
$slug = $_GET["slug"] ?? "";
$p = query(
    "SELECT * FROM projects WHERE slug=? AND visibility IN ('public','unlisted')",
    [$slug],
)->fetch();
if (!$p) {
    http_response_code(404);
    page_head(
        "Score not found",
        "This score is private or no longer available.",
        BASE_URL . "/library",
    );
    echo '<main><h1>[ SCORE NOT FOUND ]</h1><p>Explore the public library to find another signal.</p><a class="button" href="/library">Browse library</a></main>';
    page_footer();
    exit();
}
if ($p["visibility"] === "unlisted") {
    header("X-Robots-Tag: noindex, nofollow");
}
$url = BASE_URL . "/p/" . $p["slug"];
$image = $p["cover_id"]
    ? BASE_URL . "/media/" . $p["cover_id"]
    : BASE_URL . "/brand/social-studio.png";
$files = query(
    "SELECT path,content,kind FROM project_files WHERE project_id=? ORDER BY path",
    [$p["id"]],
)->fetchAll();
$meta = json_decode($p["metadata"], true);
$tags = json_decode($p["tags"], true);
page_head($p["title"], $p["description"], $url, $image);
echo '<main class="share-main"><div class="score-heading"><div class="cover"><img src="' .
    esc($image) .
    '" alt="Code album cover for ' .
    esc($p["title"]) .
    '"/></div><section><p class="eyebrow">[ ' .
    ($p["builtin"] ? "ORIGINAL EXAMPLE / CC0" : "COMMUNITY SCORE") .
    " ]</p><h1>" .
    esc($p["title"]) .
    '</h1><p class="author">BY ' .
    esc($p["author"] ?: "Anonymous") .
    '</p><p class="description">' .
    nl2br(esc($p["description"])) .
    '</p><div class="tags">';
foreach ($tags as $tag) {
    echo '<a href="/library?tag=' .
        urlencode($tag) .
        '">#' .
        esc($tag) .
        "</a>";
}
echo '</div><p class="details">' .
    esc($meta["bpm"] ?? "—") .
    " BPM · VERSION " .
    (int) $p["version"] .
    " · UPDATED " .
    esc(substr($p["updated_at"], 0, 10)) .
    "</p>";
if ($p["remix_of"]) {
    $original = query(
        "SELECT title,slug FROM projects WHERE id=? AND visibility<>'private'",
        [$p["remix_of"]],
    )->fetch();
    if ($original) {
        echo '<p>Remixed from <a href="/p/' .
            esc($original["slug"]) .
            '">' .
            esc($original["title"]) .
            "</a></p>";
    }
}
if ($p["preview_id"]) {
    echo '<audio controls preload="none" src="/media/' .
        esc($p["preview_id"]) .
        '">Audio preview</audio>';
}
echo '<div class="actions"><span id="share-play-action"></span><a class="button" href="/?project=' .
    esc($p["id"]) .
    '">OPEN IN SANDBOX ↗</a><a class="button" href="/?project=' .
    esc($p["id"]) .
    '&amp;fork=1">FORK / REMIX</a><a class="button" href="/api/projects/' .
    esc($p["id"]) .
    '/bundle">DOWNLOAD ZIP ↓</a></div><p class="hint">Press Play to listen with VJ loops, or open the studio to edit. Playback runs the selected entry file. Nothing runs until you press Play.</p></section></div><div id="share-player-root" data-project-id="' .
    esc($p["id"]) .
    '" data-title="' .
    esc($p["title"]) .
    '" data-entry="' .
    esc($p["entry_file"]) .
    '" data-player-url="' .
    esc($url . "/play") .
    '"></div><section class="source-section"><h2>╭─ SOURCE / ' .
    count($files) .
    " FILES</h2>";
foreach ($files as $f) {
    if ($f["kind"] === "folder") {
        continue;
    }
    echo "<details><summary>" .
        esc($f["path"]) .
        '</summary><button class="copy-code" data-copy-target="code-' .
        md5($f["path"]) .
        '">Copy code</button><pre id="code-' .
        md5($f["path"]) .
        '"><code>' .
        esc($f["content"]) .
        "</code></pre></details>";
}
$shareText = urlencode($p["title"] . " — XXC / THUGS(red)");
$u = urlencode($url);
echo '</section><section class="social"><h2>SHARE THIS SIGNAL</h2><div class="actions"><button data-copy-url="' .
    esc($url) .
    '">Copy link</button><button data-native-share="' .
    esc($url) .
    '">Share…</button><a target="_blank" rel="noopener noreferrer" href="https://bsky.app/intent/compose?text=' .
    $shareText .
    "%20" .
    $u .
    '">Bluesky ↗</a><a target="_blank" rel="noopener noreferrer" href="https://twitter.com/intent/tweet?text=' .
    $shareText .
    "&amp;url=" .
    $u .
    '">X ↗</a><a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=' .
    $u .
    '">Facebook ↗</a><a target="_blank" rel="noopener noreferrer" href="https://www.reddit.com/submit?url=' .
    $u .
    "&amp;title=" .
    $shareText .
    '">Reddit ↗</a><a href="mailto:?subject=' .
    $shareText .
    "&amp;body=" .
    $u .
    '">Email ↗</a></div><p id="share-status" role="status"></p></section></main>';
$ld = [
    "@context" => "https://schema.org",
    "@type" => "MusicComposition",
    "name" => $p["title"],
    "description" => $p["description"],
    "url" => $url,
    "image" => $image,
    "dateModified" => gmdate("c", strtotime($p["updated_at"])),
    "composer" => ["@type" => "Person", "name" => $p["author"] ?: "Anonymous"],
];
echo '<script type="application/ld+json">' .
    json_encode(
        $ld,
        JSON_HEX_TAG |
            JSON_HEX_AMP |
            JSON_HEX_APOS |
            JSON_HEX_QUOT |
            JSON_UNESCAPED_SLASHES,
    ) .
    "</script>";
// Only immutable local build tags are included; no project source is executable HTML.
$playerShell = file_get_contents(__DIR__ . "/share-player/index.html");
preg_match_all(
    '~<(?:script\b[^>]*\bsrc="/assets/[^">]+"[^>]*></script|link\b[^>]*\bhref="/assets/[^">]+"[^>]*>)~',
    $playerShell,
    $playerAssets,
);
echo implode("\n", $playerAssets[0]);
page_footer();
