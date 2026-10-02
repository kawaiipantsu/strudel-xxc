<?php
function ensure_storage_capacity(int $bytes): void
{
    if (disk_free_space(ROOT . "/storage") < 2147483648 + $bytes) {
        fail("STORAGE_FULL", "Media storage is temporarily full.", 507);
    }
    if (
        (int) query(
            "SELECT COALESCE(SUM(size),0) FROM media WHERE owner_hash=?",
            [owner()],
        )->fetchColumn() +
            $bytes >
        536870912
    ) {
        fail("QUOTA", "Your media quota is 512 MB.", 413);
    }
}

function media_path(array $m): string
{
    $dirs = [
        "sample" => "samples",
        "recording" => "recordings",
        "export" => "exports",
        "cover" => "covers",
    ];
    if (
        !isset($dirs[$m["kind"]]) ||
        !preg_match('/^[a-f0-9-]+\.[a-z0-9]+$/D', $m["filename"])
    ) {
        throw new RuntimeException("Invalid media record");
    }
    return ROOT . "/storage/" . $dirs[$m["kind"]] . "/" . $m["filename"];
}
function process(
    array $args,
    int $timeout = 45,
    array $environment = [],
): string {
    $pipes = [];
    $p = proc_open(
        array_merge(["/usr/bin/timeout", (string) $timeout], $args),
        [0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]],
        $pipes,
        null,
        array_merge(["PATH" => "/usr/bin:/bin"], $environment),
    );
    if (!is_resource($p)) {
        throw new RuntimeException("Media tool unavailable");
    }
    fclose($pipes[0]);
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exit = proc_close($p);
    if ($exit !== 0) {
        audit("media.failed", ["status" => $exit]);
        throw new RuntimeException("Media processing failed.");
    }
    return $out;
}
function inspect_audio(string $path): array
{
    $mime = new finfo(FILEINFO_MIME_TYPE)->file($path);
    $allowed = [
        "audio/wav",
        "audio/x-wav",
        "audio/vnd.wave",
        "audio/mpeg",
        "audio/flac",
        "audio/x-flac",
        "audio/ogg",
        "application/ogg",
        "audio/mp4",
        "video/mp4",
        "audio/webm",
        "video/webm",
        "video/x-matroska",
        "audio/aac",
        "application/octet-stream",
    ];
    if (!in_array($mime, $allowed, true)) {
        fail("INVALID_MEDIA", "Unsupported audio file.", 415);
    }
    try {
        $d = json_decode(
            process(
                [
                    "/usr/bin/ffprobe",
                    "-v",
                    "error",
                    "-protocol_whitelist",
                    "file",
                    "-show_format",
                    "-show_streams",
                    "-of",
                    "json",
                    $path,
                ],
                10,
            ),
            true,
        );
    } catch (Throwable $e) {
        fail("INVALID_MEDIA", "The file could not be decoded as audio.", 415);
    }
    $streams = $d["streams"] ?? [];
    if (
        !count($streams) ||
        count($streams) > 8 ||
        !count(array_filter($streams, fn($s) => $s["codec_type"] === "audio"))
    ) {
        fail("INVALID_MEDIA", "No audio stream found.", 415);
    }
    foreach ($streams as $s) {
        if ($s["codec_type"] !== "audio") {
            fail("INVALID_MEDIA", "Only audio streams are accepted.", 415);
        }
    }
    $duration = (float) ($d["format"]["duration"] ?? 0);
    if (
        $duration > max(600, (int) settings()["recording_seconds"]) ||
        $duration < 0
    ) {
        fail("INVALID_MEDIA", "Audio duration exceeds configured limits.", 413);
    }
    $format = $d["format"]["format_name"] ?? "";
    $ext = str_contains($format, "wav")
        ? "wav"
        : (str_contains($format, "mp3")
            ? "mp3"
            : (str_contains($format, "flac")
                ? "flac"
                : (str_contains($format, "ogg")
                    ? "ogg"
                    : (str_contains($format, "matroska")
                        ? "webm"
                        : "m4a"))));
    $mime = [
        "wav" => "audio/wav",
        "mp3" => "audio/mpeg",
        "flac" => "audio/flac",
        "ogg" => "audio/ogg",
        "webm" => "audio/webm",
        "m4a" => "audio/mp4",
    ][$ext];
    return ["ext" => $ext, "mime" => $mime, "duration" => $duration];
}
function media_data(array $m): array
{
    unset($m["owner_hash"], $m["filename"]);
    $m["metadata"] = json_decode($m["metadata"], true);
    $public = false;
    if ($m["project_id"]) {
        $p = query("SELECT visibility FROM projects WHERE id=?", [
            $m["project_id"],
        ])->fetch();
        $public = $p && $p["visibility"] !== "private";
    }
    $public = $public || in_public_pack($m["id"]);
    $m["url"] = media_url($m["id"], $public);
    return $m;
}
function store_audio(
    string $path,
    string $name,
    string $kind,
    ?string $projectId,
    array $info,
    array $meta = [],
): array {
    ensure_storage_capacity((int) filesize($path));
    $id = uid();
    $name = mb_substr(basename(str_replace("\\", "/", $name)), 0, 180);
    $safeMeta = array_intersect_key(
        $meta,
        array_flip([
            "license",
            "source",
            "author",
            "sample_name",
            "title",
            "artist",
            "comment",
        ]),
    );
    $dest =
        ROOT .
        "/storage/" .
        ($kind === "sample" ? "samples" : "recordings") .
        "/" .
        $id .
        "." .
        $info["ext"];
    if (!rename($path, $dest)) {
        throw new RuntimeException("Could not store media");
    }
    chmod($dest, 0640);
    query(
        "INSERT INTO media(id,owner_hash,project_id,kind,filename,original_name,mime,size,duration,metadata) VALUES(?,?,?,?,?,?,?,?,?,?)",
        [
            $id,
            owner(),
            $projectId,
            $kind,
            basename($dest),
            $name,
            $info["mime"],
            filesize($dest),
            $info["duration"],
            json_encode($safeMeta),
        ],
    );
    return media_data(query("SELECT * FROM media WHERE id=?", [$id])->fetch());
}
function upload_audio(string $kind): array
{
    rate("upload", 12, 60);
    rate("upload-ip", 120, 3600, false);
    if (disk_free_space(ROOT . "/storage") < 2147483648) {
        fail("STORAGE_FULL", "Media storage is temporarily full.", 507);
    }
    $u = $_FILES["file"] ?? null;
    $max = (int) settings()["upload_mb"] * 1048576;
    if (!$u || $u["error"] !== UPLOAD_ERR_OK) {
        fail(
            "UPLOAD_FAILED",
            "Upload did not complete or exceeds the server limit.",
            413,
        );
    }
    if ($u["size"] > $max) {
        fail("UPLOAD_LIMIT", "Upload exceeds configured limit.", 413);
    }
    if (
        query("SELECT COALESCE(SUM(size),0) FROM media WHERE owner_hash=?", [
            owner(),
        ])->fetchColumn() > 536870912
    ) {
        fail("QUOTA", "Your media quota is 512 MB.", 413);
    }
    $projectId = $_POST["project_id"] ?? null;
    if ($projectId) {
        project($projectId, true);
    }
    $info = inspect_audio($u["tmp_name"]);
    return store_audio($u["tmp_name"], $u["name"], $kind, $projectId, $info, [
        "license" => mb_substr($_POST["license"] ?? "", 0, 200),
        "author" => mb_substr($_POST["author"] ?? "", 0, 100),
        "source" => mb_substr($_POST["source"] ?? "", 0, 1000),
        "sample_name" => preg_replace(
            "/[^a-z0-9_]/",
            "_",
            strtolower(pathinfo($u["name"], PATHINFO_FILENAME)),
        ),
    ]);
}
function convert_audio(array $d): array
{
    $m = query("SELECT * FROM media WHERE id=?", [
        $d["recording_id"] ?? "",
    ])->fetch();
    if (!$m || ($m["owner_hash"] !== owner() && !admin())) {
        fail("NOT_FOUND", "Recording not found.", 404);
    }
    if (!in_array($m["kind"], ["recording", "sample"], true)) {
        fail("VALIDATION_ERROR", "Choose a recording or sample.");
    }
    $format = $d["format"] ?? "wav";
    if (!in_array($format, ["wav", "mp3", "m4a"], true)) {
        fail("VALIDATION_ERROR", "Unsupported export format.");
    }
    $r = redis();
    $key = "xxc:strudel:export:" . $m["id"];
    $token = bin2hex(random_bytes(16));
    if ($r && !$r->set($key, $token, ["nx", "ex" => 100])) {
        fail("BUSY", "This recording is already being converted.", 409);
    }
    ensure_storage_capacity((int) ($m["duration"] * 288000 + 2000000));
    $id = uid();
    $dest = ROOT . "/storage/exports/" . $id . "." . $format;
    try {
        $args = [
            "/usr/bin/ffmpeg",
            "-nostdin",
            "-v",
            "error",
            "-y",
            "-protocol_whitelist",
            "file",
            "-i",
            media_path($m),
        ];
        $p = $m["project_id"] ? project($m["project_id"]) : null;
        $cover =
            $p && $p["cover_id"]
                ? query("SELECT * FROM media WHERE id=?", [
                    $p["cover_id"],
                ])->fetch()
                : null;
        if ($cover && $format !== "wav") {
            array_push(
                $args,
                "-i",
                media_path($cover),
                "-map",
                "0:a:0",
                "-map",
                "1:v:0",
                "-c:v",
                "png",
                "-disposition:v",
                "attached_pic",
            );
        } else {
            array_push($args, "-map", "0:a:0");
        }
        $codec = [
            "wav" => ["-c:a", "pcm_s24le"],
            "mp3" => [
                "-c:a",
                "libmp3lame",
                "-b:a",
                "320k",
                "-id3v2_version",
                "3",
            ],
            "m4a" => ["-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart"],
        ][$format];
        array_push($args, ...$codec);
        array_push(
            $args,
            "-threads",
            "2",
            "-t",
            (string) min(1800, (int) settings()["recording_seconds"]),
        );
        foreach (
            [
                "title" => mb_substr(
                    (string) ($d["title"] ?? ($p["title"] ?? "Session")),
                    0,
                    160,
                ),
                "artist" => mb_substr(
                    (string) ($d["artist"] ?? ($p["author"] ?? "XXC")),
                    0,
                    100,
                ),
                "album" => $p["title"] ?? "Strudel Sandbox",
                "comment" =>
                    mb_substr((string) ($d["comment"] ?? ""), 0, 1000) .
                    " · XXC / THUGS(red)" .
                    ($p && $p["visibility"] !== "private"
                        ? " · " . BASE_URL . "/p/" . $p["slug"]
                        : ""),
            ]
            as $k => $v
        ) {
            array_push($args, "-metadata", $k . "=" . $v);
        }
        array_push($args, $dest);
        process($args, 75);
        query(
            "INSERT INTO media(id,owner_hash,project_id,kind,filename,original_name,mime,size,duration,metadata) VALUES(?,?,?,?,?,?,?,?,?,?)",
            [
                $id,
                owner(),
                $m["project_id"],
                "export",
                basename($dest),
                ($p["slug"] ?? "session") . "." . $format,
                [
                    "wav" => "audio/wav",
                    "mp3" => "audio/mpeg",
                    "m4a" => "audio/mp4",
                ][$format],
                filesize($dest),
                $m["duration"],
                json_encode(["format" => $format, "source" => $m["id"]]),
            ],
        );
        chmod($dest, 0640);
        return media_data(
            query("SELECT * FROM media WHERE id=?", [$id])->fetch(),
        );
    } catch (Throwable $e) {
        if (is_file($dest)) {
            unlink($dest);
        }
        throw $e;
    } finally {
        if ($r && $r->get($key) === $token) {
            $r->del($key);
        }
    }
}
