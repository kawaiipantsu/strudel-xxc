<?php
// Public, read-only installed VJ media. Files are validated by the local importer.
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

function vj_error(int $status): never
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
    vj_error(405);
}
$name = $_GET["file"] ?? "";
if (
    !is_string($name) ||
    !preg_match('/^[a-f0-9]{64}\.(?:mp4|jpg)$/D', $name)
) {
    vj_error(404);
}
$root = realpath(__DIR__ . "/../storage/vjloops");
$kind = str_ends_with($name, ".mp4") ? "video" : "thumb";
$path = $root ? realpath($root . "/" . $kind . "/" . $name) : false;
if (!$path || !str_starts_with($path, $root . "/" . $kind . "/") || !is_file($path)) {
    vj_error(404);
}
$metadata = $root . "/metadata/" . $name . ".json";
if (!is_file($metadata) || !is_readable($metadata) || !is_readable($path)) {
    vj_error(404);
}
$raw = file_get_contents($metadata);
if ($raw === false) {
    vj_error(503);
}
$meta = json_decode($raw, true);
$allowed = ["video/mp4", "image/jpeg"];
if (
    !$meta ||
    !in_array($meta["mime"] ?? "", $allowed, true) ||
    filesize($path) !== ($meta["size"] ?? 0)
) {
    vj_error(404);
}
$size = $meta["size"];
$etag = '"' . $meta["etag"] . '"';
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
        vj_error(416);
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
        vj_error(416);
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
    vj_error(503);
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
