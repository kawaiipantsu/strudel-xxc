<?php
// Public, read-only system samples. No sessions, arbitrary paths, or remote fetching.
declare(strict_types=1);
ini_set("display_errors", "0");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, HEAD, OPTIONS");
header("Access-Control-Allow-Headers: Range");
header(
    "Access-Control-Expose-Headers: Accept-Ranges, Content-Range, Content-Length",
);
header("Cross-Origin-Resource-Policy: cross-origin");
header("X-Content-Type-Options: nosniff");

function sample_error(int $status): never
{
    http_response_code($status);
    header("Cache-Control: no-store");
    header("Content-Type: text/plain; charset=utf-8");
    exit();
}

$method = $_SERVER["REQUEST_METHOD"];
if ($method === "OPTIONS") {
    http_response_code(204);
    exit();
}
if (!in_array($method, ["GET", "HEAD"], true)) {
    header("Allow: GET, HEAD, OPTIONS");
    sample_error(405);
}
$name = $_GET["file"] ?? "";
if (
    !is_string($name) ||
    !preg_match('/^[a-f0-9]{64}\.(?:wav|mp3|ogg|flac|aiff?)$/D', $name)
) {
    sample_error(404);
}
$root = realpath(__DIR__ . "/../storage/sample-banks");
$path = $root ? realpath($root . "/audio/" . $name) : false;
if (!$path || !str_starts_with($path, $root . "/audio/") || !is_file($path)) {
    sample_error(404);
}
$metadata = $root . "/metadata/" . $name . ".json";
if (!is_file($metadata) || !is_readable($metadata) || !is_readable($path)) {
    sample_error(404);
}
$raw = file_get_contents($metadata);
if ($raw === false) {
    sample_error(503);
}
$meta = json_decode($raw, true);
$allowed = ["audio/wav", "audio/mpeg", "audio/ogg", "audio/flac", "audio/aiff"];
if (
    !$meta ||
    !in_array($meta["mime"] ?? "", $allowed, true) ||
    filesize($path) !== ($meta["size"] ?? 0)
) {
    sample_error(404);
}
$size = $meta["size"];
$etag = '"' . substr($name, 0, 64) . '"';
header("Content-Type: " . $meta["mime"]);
header("Cache-Control: public, max-age=31536000, immutable");
header("ETag: " . $etag);
header("Accept-Ranges: bytes");
if (($_SERVER["HTTP_IF_NONE_MATCH"] ?? "") === $etag) {
    http_response_code(304);
    exit();
}
$start = 0;
$end = $size - 1;
$range = $_SERVER["HTTP_RANGE"] ?? "";
if (isset($_SERVER["HTTP_IF_RANGE"]) && $_SERVER["HTTP_IF_RANGE"] !== $etag) {
    $range = "";
}
if ($range !== "") {
    if (
        !preg_match('/^bytes=(\d*)-(\d*)$/D', $range, $m) ||
        ($m[1] === "" && $m[2] === "")
    ) {
        header("Content-Range: bytes */" . $size);
        sample_error(416);
    }
    if ($m[1] === "") {
        $start = max(0, $size - (int) $m[2]);
    } else {
        $start = (int) $m[1];
        if ($m[2] !== "") {
            $end = min($end, (int) $m[2]);
        }
    }
    if ($start > $end || $start >= $size) {
        header("Content-Range: bytes */" . $size);
        sample_error(416);
    }
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
}
header("Content-Length: " . ($end - $start + 1));
if ($method === "HEAD") {
    exit();
}
$stream = fopen($path, "rb");
if (!$stream) {
    sample_error(503);
}
fseek($stream, $start);
$remaining = $end - $start + 1;
while ($remaining > 0 && !feof($stream) && !connection_aborted()) {
    $buffer = fread($stream, min(65536, $remaining));
    if ($buffer === false || $buffer === "") {
        break;
    }
    echo $buffer;
    $remaining -= strlen($buffer);
}
fclose($stream);
