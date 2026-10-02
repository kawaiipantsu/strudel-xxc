<?php
declare(strict_types=1);
const ROOT = __DIR__ . "/..";
const BASE_URL = "https://strudel.xxc.dk";
ini_set("display_errors", "0");
ini_set("log_errors", "1");
ini_set("error_log", ROOT . "/storage/logs/php.log");
date_default_timezone_set("UTC");
function config(): array
{
    static $c;
    return $c ??= json_decode(
        file_get_contents(ROOT . "/config/secrets.json"),
        true,
        32,
        JSON_THROW_ON_ERROR,
    );
}
function db(): PDO
{
    static $db;
    if (!$db) {
        $c = config();
        $db = new PDO(
            "mysql:host={$c["host"]};port={$c["port"]};dbname={$c["name"]};charset=utf8mb4",
            $c["user"],
            $c["password"],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        );
    }
    return $db;
}
function query(string $sql, array $args = []): PDOStatement
{
    $s = db()->prepare($sql);
    $s->execute($args);
    return $s;
}
function redis(): ?Redis
{
    static $r = false;
    if ($r === false) {
        try {
            $r = new Redis();
            $r->connect("127.0.0.1", 6379, 0.3);
        } catch (Throwable $e) {
            $r = null;
        }
    }
    return $r;
}
function uid(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 15) | 64);
    $b[8] = chr((ord($b[8]) & 63) | 128);
    $h = bin2hex($b);
    return substr($h, 0, 8) .
        "-" .
        substr($h, 8, 4) .
        "-" .
        substr($h, 12, 4) .
        "-" .
        substr($h, 16, 4) .
        "-" .
        substr($h, 20);
}
function valid_id(string $id): bool
{
    return (bool) preg_match(
        '/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/D',
        $id,
    );
}
function esc(mixed $v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
}
function json_out(mixed $data = null, int $status = 200): never
{
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    header("Cache-Control: no-store");
    echo json_encode(
        ["ok" => true, "data" => $data, "error" => null],
        JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE,
    );
    exit();
}
function fail(string $code, string $message, int $status = 400): never
{
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    header("Cache-Control: no-store");
    echo json_encode([
        "ok" => false,
        "data" => null,
        "error" => ["code" => $code, "message" => $message],
    ]);
    exit();
}
function audit(string $event, array $data = []): void
{
    $allowed = array_intersect_key(
        $data,
        array_flip(["id", "status", "type", "count", "message"]),
    );
    $line = json_encode(
        ["at" => gmdate("c"), "event" => $event, "data" => $allowed],
        JSON_INVALID_UTF8_SUBSTITUTE,
    );
    file_put_contents(
        ROOT . "/storage/logs/app.log",
        $line . "\n",
        FILE_APPEND | LOCK_EX,
    );
}
set_exception_handler(function (Throwable $e) {
    $id = uid();
    audit("exception", ["id" => $id, "type" => get_class($e)]);
    fail(
        "INTERNAL_ERROR",
        "The request could not be completed. Reference " . $id,
        500,
    );
});
function session_init(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name("xxc_session");
    session_save_path(ROOT . "/storage/sessions");
    ini_set("session.use_strict_mode", "1");
    ini_set("session.gc_maxlifetime", "86400");
    session_set_cookie_params([
        "lifetime" => 0,
        "path" => "/",
        "secure" => true,
        "httponly" => true,
        "samesite" => "Strict",
    ]);
    session_start();
    $_SESSION["csrf"] ??= bin2hex(random_bytes(32));
}
function owner(): string
{
    static $o;
    if ($o) {
        return $o;
    }
    $token = $_COOKIE["xxc_owner"] ?? "";
    if (!preg_match('/^[a-f0-9]{64}$/D', $token)) {
        $token = bin2hex(random_bytes(32));
        setcookie("xxc_owner", $token, [
            "expires" => time() + 31536000,
            "path" => "/",
            "secure" => true,
            "httponly" => true,
            "samesite" => "Lax",
        ]);
    }
    return $o = hash("sha256", $token);
}
function admin(): bool
{
    session_init();
    return isset($_SESSION["admin"]) &&
        ($_SESSION["admin_until"] ?? 0) > time();
}
function require_admin(): void
{
    if (!admin()) {
        fail("UNAUTHORIZED", "Administrator sign-in required.", 401);
    }
}
function csrf(): void
{
    session_init();
    $origin = $_SERVER["HTTP_ORIGIN"] ?? "";
    if ($origin && $origin !== BASE_URL) {
        fail("CSRF", "Request origin rejected.", 403);
    }
    if (!hash_equals($_SESSION["csrf"], $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "")) {
        fail("CSRF", "Refresh the page and try again.", 403);
    }
}
function rate(
    string $scope,
    int $limit,
    int $window = 60,
    bool $byOwner = true,
): void {
    $identity = $_SERVER["REMOTE_ADDR"] ?? "cli";
    if ($byOwner) {
        $identity .= ":" . owner();
    }
    $key =
        "xxc:strudel:rate:" .
        $scope .
        ":" .
        hash("sha256", $identity) .
        ":" .
        intdiv(time(), $window);
    $r = redis();
    if ($r) {
        $n = $r->incr($key);
        if ($n === 1) {
            $r->expire($key, $window + 1);
        }
    } else {
        $path = ROOT . "/storage/cache/" . hash("sha256", $key) . ".rate";
        $f = fopen($path, "c+");
        flock($f, LOCK_EX);
        $n = (int) stream_get_contents($f) + 1;
        ftruncate($f, 0);
        rewind($f);
        fwrite($f, (string) $n);
        flock($f, LOCK_UN);
        fclose($f);
    }
    if ($n > $limit) {
        header("Retry-After: " . $window);
        fail(
            "RATE_LIMITED",
            "Too many requests. Please try again shortly.",
            429,
        );
    }
}
function body(): array
{
    $len = (int) ($_SERVER["CONTENT_LENGTH"] ?? 0);
    if ($len > 2097152) {
        fail("PAYLOAD_TOO_LARGE", "Project payload exceeds 2 MB.", 413);
    }
    $raw = file_get_contents("php://input", false, null, 0, 2097153);
    if (strlen($raw) > 2097152) {
        fail("PAYLOAD_TOO_LARGE", "Request too large.", 413);
    }
    $d = json_decode($raw, true);
    if (!is_array($d)) {
        fail("VALIDATION_ERROR", "Expected a JSON object.");
    }
    return $d;
}
function settings(): array
{
    $defaults = [
        "site_title" => "XXC / THUGS(red) - Strudel Sandbox",
        "subtitle" => "CODE / SOUND / SIGNAL",
        "announcement" => "",
        "maintenance" => false,
        "default_theme" => "dark",
        "accent" => "#ff3b47",
        "dark_bg" => "#080a0e",
        "light_bg" => "#f1efe7",
        "visual_preset" => "scope",
        "visual_intensity" => 0.3,
        "visual_quality" => "auto",
        "upload_mb" => 32,
        "recording_seconds" => 600,
        "publishing" => true,
        "anonymous_publishing" => true,
        "seo_description" =>
            "A live-coding workstation for code, sound and signal. Create, perform, record and remix with the real Strudel engine.",
        "default_project" => "",
        "hydra_enabled" => true,
        "midi_enabled" => true,
    ];
    foreach (query("SELECT name,value FROM settings")->fetchAll() as $s) {
        if (array_key_exists($s["name"], $defaults)) {
            $defaults[$s["name"]] = json_decode($s["value"], true);
        }
    }
    return $defaults;
}
function safe_path(string $path): bool
{
    return strlen($path) <= 180 &&
        (bool) preg_match('~^[a-zA-Z0-9_][a-zA-Z0-9_ ./-]*$~D', $path) &&
        !str_contains($path, "..") &&
        !str_contains($path, "//") &&
        !str_ends_with($path, "/");
}
function project(string $id, bool $write = false): array
{
    if (!valid_id($id)) {
        fail("NOT_FOUND", "Project not found.", 404);
    }
    $p = query("SELECT * FROM projects WHERE id=?", [$id])->fetch();
    if (!$p) {
        fail("NOT_FOUND", "Project not found.", 404);
    }
    $own = hash_equals($p["owner_hash"], owner()) || admin();
    if (($write && !$own) || (!$own && $p["visibility"] === "private")) {
        fail("NOT_FOUND", "Project not found.", 404);
    }
    return $p;
}
function project_data(array $p, bool $files = true): array
{
    $p["editable"] = hash_equals($p["owner_hash"], owner()) || admin();
    unset($p["owner_hash"]);
    if (!admin()) {
        unset($p["moderation_notes"]);
    }
    $p["metadata"] = json_decode($p["metadata"] ?? "{}", true);
    $p["tags"] = json_decode($p["tags"] ?? "[]", true);
    if ($files) {
        $p["files"] = query(
            "SELECT path,content,kind FROM project_files WHERE project_id=? ORDER BY path",
            [$p["id"]],
        )->fetchAll();
        $media = query(
            "SELECT id FROM media WHERE project_id=? AND kind='sample' AND approved=1",
            [$p["id"]],
        )->fetchAll();
        foreach ($media as $m) {
            $url = media_url($m["id"], $p["visibility"] !== "private");
            foreach ($p["files"] as &$f) {
                $f["content"] = preg_replace(
                    "~https://strudel\.xxc\.dk/media/" .
                        preg_quote($m["id"], "~") .
                        '(?:\?[^\"\s\x27)]+)?~',
                    $url,
                    $f["content"],
                );
            }
            unset($f);
        }
    }
    return $p;
}
function in_public_pack(string $id): bool
{
    return (bool) query(
        "SELECT 1 FROM sample_pack_items i JOIN sample_packs p ON p.id=i.pack_id WHERE i.media_id=? AND p.enabled=1 LIMIT 1",
        [$id],
    )->fetchColumn();
}
function media_url(string $id, bool $public = false): string
{
    if ($public) {
        return BASE_URL . "/media/" . $id;
    }
    $exp = time() + 86400;
    return BASE_URL .
        "/media/" .
        $id .
        "?expires=" .
        $exp .
        "&signature=" .
        hash_hmac("sha256", $id . ":" . $exp, config()["app_key"]);
}
function health(): array
{
    $database = false;
    try {
        $database = (bool) query("SELECT 1")->fetchColumn();
    } catch (Throwable $e) {
    }
    return [
        "status" => $database ? "ready" : "degraded",
        "database" => $database,
        "redis" => (bool) redis(),
        "storage" => is_writable(ROOT . "/storage/tmp"),
        "strudel" => "core 1.2.6 / codemirror 1.3.0 / superdough 1.3.0",
        "build" =>
            json_decode(
                @file_get_contents(ROOT . "/html/build.json") ?: "{}",
                true,
            )["build"] ?? "unbuilt",
        "cover_renderer" => is_executable("/usr/bin/rsvg-convert"),
        "ffmpeg" => is_executable("/usr/bin/ffmpeg"),
    ];
}
