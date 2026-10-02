<?php
require __DIR__ . "/../backend/bootstrap.php";
require ROOT . "/backend/media.php";
$id = $_GET["id"] ?? "";
if (!valid_id($id)) {
    fail("NOT_FOUND", "Media not found.", 404);
}
$m = query("SELECT * FROM media WHERE id=?", [$id])->fetch();
if (!$m || !$m["approved"]) {
    fail("NOT_FOUND", "Media not found.", 404);
}
$p = $m["project_id"]
    ? query("SELECT visibility FROM projects WHERE id=?", [
        $m["project_id"],
    ])->fetch()
    : null;
$public = ($p && $p["visibility"] !== "private") || in_public_pack($id);
$exp = (int) ($_GET["expires"] ?? 0);
$signed =
    $exp >= time() &&
    $exp < time() + 86401 &&
    hash_equals(
        hash_hmac("sha256", $id . ":" . $exp, config()["app_key"]),
        $_GET["signature"] ?? "",
    );
if (!$public && !$signed && $m["owner_hash"] !== owner() && !admin()) {
    fail("NOT_FOUND", "Media not found.", 404);
}
$path = media_path($m);
$svg = $m["kind"] === "cover" && ($_GET["format"] ?? "") === "svg";
if ($svg) {
    $path = ROOT . "/storage/covers/" . $m["id"] . ".svg";
}
if (!is_file($path)) {
    fail("NOT_FOUND", "Media is no longer available.", 404);
}
header("Access-Control-Allow-Origin: *");
header(
    "Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox",
);
header("Cross-Origin-Resource-Policy: cross-origin");
header("Content-Type: " . ($svg ? "image/svg+xml" : $m["mime"]));
header("Accept-Ranges: bytes");
header(
    "Cache-Control: " .
        ($public ? "public, max-age=3600" : "private, no-store"),
);
if (isset($_GET["download"])) {
    header(
        'Content-Disposition: attachment; filename="' .
            preg_replace(
                "/[^a-zA-Z0-9._-]/",
                "_",
                $svg ? "cover.svg" : $m["original_name"],
            ) .
            '"',
    );
}
$size = filesize($path);
$start = 0;
$end = $size - 1;
$range = $_SERVER["HTTP_RANGE"] ?? "";
if ($range) {
    if (
        !preg_match('/^bytes=(\d*)-(\d*)$/D', $range, $matches) ||
        ($matches[1] === "" && $matches[2] === "")
    ) {
        header("Content-Range: bytes */$size");
        http_response_code(416);
        exit();
    }
    if ($matches[1] === "") {
        $start = max(0, $size - (int) $matches[2]);
    } else {
        $start = (int) $matches[1];
        if ($matches[2] !== "") {
            $end = min($end, (int) $matches[2]);
        }
    }
    if ($start > $end || $start >= $size) {
        header("Content-Range: bytes */$size");
        http_response_code(416);
        exit();
    }
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
}
header("Content-Length: " . ($end - $start + 1));
if ($_SERVER["REQUEST_METHOD"] === "HEAD") {
    exit();
}
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}
$f = fopen($path, "rb");
fseek($f, $start);
$remaining = $end - $start + 1;
while ($remaining > 0 && !feof($f) && !connection_aborted()) {
    $buf = fread($f, min(65536, $remaining));
    echo $buf;
    $remaining -= strlen($buf);
}
fclose($f);
