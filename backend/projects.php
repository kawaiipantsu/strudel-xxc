<?php
function validate_project(array $d): array
{
    $title = trim((string) ($d["title"] ?? "Untitled session"));
    if (!$title || mb_strlen($title) > 160) {
        fail("VALIDATION_ERROR", "Title must be 1–160 characters.");
    }
    $files = $d["files"] ?? [];
    if (!is_array($files) || !count($files) || count($files) > 100) {
        fail("VALIDATION_ERROR", "A project needs 1–100 files.");
    }
    $seen = [];
    $total = 0;
    foreach ($files as &$f) {
        if (
            !is_array($f) ||
            !isset($f["path"]) ||
            !safe_path($f["path"]) ||
            isset($seen[$f["path"]])
        ) {
            fail("VALIDATION_ERROR", "Invalid or duplicate file path.");
        }
        $seen[$f["path"]] = true;
        $f["kind"] = ($f["kind"] ?? "file") === "folder" ? "folder" : "file";
        $f["content"] = (string) ($f["content"] ?? "");
        $total += strlen($f["content"]);
    }
    unset($f);
    if ($total > 1000000) {
        fail("VALIDATION_ERROR", "Source files exceed 1 MB.");
    }
    $entry = (string) ($d["entry_file"] ?? ($d["entryFile"] ?? "main.strudel"));
    if (!isset($seen[$entry])) {
        fail("VALIDATION_ERROR", "Entry file must exist in the project.");
    }
    $visibility = $d["visibility"] ?? "private";
    if (!in_array($visibility, ["private", "unlisted", "public"], true)) {
        fail("VALIDATION_ERROR", "Invalid visibility.");
    }
    if (
        $visibility !== "private" &&
        !admin() &&
        (!settings()["publishing"] || !settings()["anonymous_publishing"])
    ) {
        fail("PUBLISHING_DISABLED", "Publishing is currently disabled.", 403);
    }
    $tags = array_values(
        array_unique(
            array_filter(
                array_map(
                    fn($t) => mb_substr(trim((string) $t), 0, 30),
                    array_slice((array) ($d["tags"] ?? []), 0, 12),
                ),
            ),
        ),
    );
    $meta = $d["metadata"] ?? [];
    if (!is_array($meta) || strlen(json_encode($meta)) > 50000) {
        fail("VALIDATION_ERROR", "Metadata too large.");
    }
    return [
        "title" => $title,
        "description" => mb_substr((string) ($d["description"] ?? ""), 0, 5000),
        "author" => mb_substr((string) ($d["author"] ?? ""), 0, 100),
        "visibility" => $visibility,
        "entry_file" => $entry,
        "tags" => $tags,
        "metadata" => $meta,
        "files" => $files,
    ];
}
function checkpoint(array $p, string $reason = "save"): void
{
    $data = project_data($p);
    unset($data["editable"]);
    $snap = json_encode($data);
    $last = query(
        "SELECT snapshot,created_at FROM project_revisions WHERE project_id=? ORDER BY created_at DESC LIMIT 1",
        [$p["id"]],
    )->fetch();
    if ($last && $last["snapshot"] === $snap) {
        return;
    }
    query(
        "INSERT INTO project_revisions(id,project_id,snapshot,reason) VALUES(?,?,?,?)",
        [uid(), $p["id"], $snap, substr($reason, 0, 80)],
    );
    // Retain the latest 100 meaningful revisions per project.
    $ids = query(
        "SELECT id FROM project_revisions WHERE project_id=? ORDER BY created_at DESC LIMIT 100,10000",
        [$p["id"]],
    )->fetchAll(PDO::FETCH_COLUMN);
    foreach ($ids as $id) {
        query("DELETE FROM project_revisions WHERE id=?", [$id]);
    }
}
function save_project(
    array $d,
    ?string $id = null,
    string $reason = "save",
): array {
    $v = validate_project($d);
    $isNew = $id === null;
    if (
        $isNew &&
        query("SELECT COUNT(*) FROM projects WHERE owner_hash=?", [
            owner(),
        ])->fetchColumn() >= 200
    ) {
        fail("QUOTA", "Project limit reached.", 413);
    }
    $p = $isNew ? null : project($id, true);
    if ($p && $p["builtin"] && !admin()) {
        fail("READ_ONLY", "Fork this example before editing.", 403);
    }
    db()->beginTransaction();
    try {
        if ($p) {
            $locked = query("SELECT * FROM projects WHERE id=? FOR UPDATE", [
                $id,
            ])->fetch();
            if (
                !isset($d["version"]) ||
                (int) $locked["version"] !== (int) $d["version"]
            ) {
                db()->rollBack();
                fail(
                    "VERSION_CONFLICT",
                    "This project changed in another tab. Reload it or save a fork.",
                    409,
                );
            }
            checkpoint($locked, $reason);
        } else {
            $id = uid();
            $slug = strtolower(
                trim(
                    preg_replace(
                        "/[^a-zA-Z0-9]+/",
                        "-",
                        iconv("UTF-8", "ASCII//TRANSLIT//IGNORE", $v["title"]),
                    ),
                    "-",
                ),
            );
            $slug =
                substr($slug ?: "session", 0, 100) .
                "-" .
                substr(str_replace("-", "", $id), 0, 10);
            query(
                "INSERT INTO projects(id,owner_hash,title,description,author,slug,metadata,tags,remix_of) VALUES(?,?,?,?,?,?,?,?,?)",
                [
                    $id,
                    owner(),
                    $v["title"],
                    $v["description"],
                    $v["author"],
                    $slug,
                    "{}",
                    "[]",
                    $d["remix_of"] ?? null,
                ],
            );
        }
        query(
            "UPDATE projects SET title=?,description=?,author=?,visibility=?,entry_file=?,tags=?,metadata=?,version=version+? WHERE id=?",
            [
                $v["title"],
                $v["description"],
                $v["author"],
                $v["visibility"],
                $v["entry_file"],
                json_encode($v["tags"]),
                json_encode($v["metadata"]),
                $isNew ? 0 : 1,
                $id,
            ],
        );
        query("DELETE FROM project_files WHERE project_id=?", [$id]);
        foreach ($v["files"] as $f) {
            query(
                "INSERT INTO project_files(project_id,path,content,kind) VALUES(?,?,?,?)",
                [$id, $f["path"], $f["content"], $f["kind"]],
            );
        }
        query("INSERT INTO activity_log(event,entity_id) VALUES(?,?)", [
            $isNew ? "project.created" : "project.saved",
            $id,
        ]);
        db()->commit();
    } catch (Throwable $e) {
        if (db()->inTransaction()) {
            db()->rollBack();
        }
        throw $e;
    }
    return project_data(project($id));
}
function export_bundle(array $p): never
{
    $data = project_data($p);
    $path = ROOT . "/storage/tmp/" . uid() . ".zip";
    $z = new ZipArchive();
    if ($z->open($path, ZipArchive::CREATE) !== true) {
        fail("EXPORT_ERROR", "Could not create archive.", 500);
    }
    $manifest = [
        "format" => "xxc-strudel-project",
        "version" => 1,
        "title" => $p["title"],
        "entryFile" => $p["entry_file"],
        "project" => $data,
        "samples" => [],
    ];
    foreach ($data["files"] as $f) {
        if ($f["kind"] === "folder") {
            $z->addEmptyDir("source/" . $f["path"]);
        } else {
            $z->addFromString("source/" . $f["path"], $f["content"]);
        }
    }
    foreach (
        query(
            "SELECT * FROM media WHERE project_id=? AND kind='sample' AND approved=1",
            [$p["id"]],
        )->fetchAll()
        as $m
    ) {
        $ext = pathinfo($m["filename"], PATHINFO_EXTENSION);
        $pathIn = "samples/" . $m["id"] . "." . $ext;
        $z->addFile(media_path($m), $pathIn);
        $manifest["samples"][] = [
            "path" => $pathIn,
            "name" => $m["original_name"],
            "id" => $m["id"],
            "metadata" => json_decode($m["metadata"], true),
        ];
    }
    if ($p["cover_id"]) {
        $m = query("SELECT * FROM media WHERE id=?", [$p["cover_id"]])->fetch();
        if ($m) {
            $z->addFile(media_path($m), "cover.png");
            $svg = ROOT . "/storage/covers/" . $m["id"] . ".svg";
            if (is_file($svg)) {
                $z->addFile($svg, "cover.svg");
            }
        }
    }
    $z->addFromString(
        "manifest.json",
        json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
    );
    $z->close();
    header("Content-Type: application/zip");
    header(
        'Content-Disposition: attachment; filename="' . $p["slug"] . '.zip"',
    );
    header("Content-Length: " . filesize($path));
    header("Cache-Control: no-store");
    readfile($path);
    unlink($path);
    exit();
}
function import_bundle(): array
{
    rate("import", 5, 3600);
    rate("create-ip", 120, 3600, false);
    $u = $_FILES["file"] ?? null;
    if (!$u || $u["error"] !== UPLOAD_ERR_OK || $u["size"] > 67108864) {
        fail("VALIDATION_ERROR", "Upload a project ZIP of at most 64 MB.");
    }
    $z = new ZipArchive();
    if ($z->open($u["tmp_name"]) !== true) {
        fail("VALIDATION_ERROR", "Invalid ZIP archive.");
    }
    $total = 0;
    if ($z->numFiles > 200) {
        fail("VALIDATION_ERROR", "Too many archive entries.");
    }
    for ($i = 0; $i < $z->numFiles; $i++) {
        $s = $z->statIndex($i);
        if (!safe_path(rtrim($s["name"], "/"))) {
            fail("VALIDATION_ERROR", "Unsafe archive path.");
        }
        $total += $s["size"];
        if ($s["size"] > 33554432 || $total > 134217728) {
            fail("VALIDATION_ERROR", "Expanded archive exceeds limits.");
        }
        $ops = 0;
        $attr = 0;
        $z->getExternalAttributesIndex($i, $ops, $attr);
        if ((($attr >> 16) & 0170000) === 0120000) {
            fail("VALIDATION_ERROR", "Archive links are not permitted.");
        }
    }
    $m = json_decode($z->getFromName("manifest.json") ?: "", true);
    if (
        ($m["format"] ?? "") !== "xxc-strudel-project" ||
        ($m["version"] ?? 0) !== 1
    ) {
        fail("VALIDATION_ERROR", "Unsupported project manifest.");
    }
    $d = $m["project"] ?? $m;
    $d["visibility"] = "private";
    unset($d["id"], $d["remix_of"]);
    $d["entry_file"] = $m["entryFile"] ?? "main.strudel";
    if (!isset($d["files"])) {
        $d["files"] = [];
        for ($i = 0; $i < $z->numFiles; $i++) {
            $s = $z->statIndex($i);
            if (
                str_starts_with($s["name"], "source/") &&
                !str_ends_with($s["name"], "/")
            ) {
                $d["files"][] = [
                    "path" => substr($s["name"], 7),
                    "content" => $z->getFromIndex($i),
                ];
            }
        }
    }
    ensure_storage_capacity($total);
    $d = validate_project($d);
    $staged = [];
    try {
        foreach (array_slice($m["samples"] ?? [], 0, 50) as $sample) {
            $path = $sample["path"] ?? "";
            if (!safe_path($path) || !str_starts_with($path, "samples/")) {
                throw new RuntimeException("Invalid sample path");
            }
            $bytes = $z->getFromName($path);
            if ($bytes === false) {
                throw new RuntimeException("Missing sample");
            }
            $tmp = ROOT . "/storage/tmp/" . uid();
            file_put_contents($tmp, $bytes);
            $info = inspect_audio($tmp);
            $staged[] = [$sample, $tmp, $info];
        }
        $p = save_project($d);
        foreach ($staged as [$s, $tmp, $info]) {
            $media = store_audio(
                $tmp,
                $s["name"] ?? "sample.wav",
                "sample",
                $p["id"],
                $info,
                (array) ($s["metadata"] ?? []),
            );
            foreach ($d["files"] as &$f) {
                $f["content"] = preg_replace(
                    "~https://strudel\.xxc\.dk/media/" .
                        preg_quote($s["id"] ?? "NONE", "~") .
                        '(?:\?[^"\s\x27)]+)?~',
                    $media["url"],
                    $f["content"],
                );
            }
            unset($f);
        }
        $d["version"] = $p["version"];
        if ($staged) {
            $p = save_project($d, $p["id"], "import samples");
        }
        return $p;
    } finally {
        foreach ($staged as [, $tmp]) {
            if (is_file($tmp)) {
                unlink($tmp);
            }
        }
        $z->close();
    }
}

function fork_project(array $source, array $changes = []): array
{
    rate("create", 20, 3600);
    rate("create-ip", 120, 3600, false);
    $d = $changes ?: project_data($source);
    if (!$changes) {
        $d["title"] .= " / remix";
    }
    unset($d["id"], $d["version"]);
    $d["visibility"] = "private";
    $d["remix_of"] = $source["id"];
    $samples = query(
        "SELECT * FROM media WHERE project_id=? AND kind='sample' AND approved=1",
        [$source["id"]],
    )->fetchAll();
    ensure_storage_capacity(array_sum(array_column($samples, "size")));
    $fork = save_project($d);
    foreach ($samples as $m) {
        $tmp = ROOT . "/storage/tmp/" . uid();
        if (!copy(media_path($m), $tmp)) {
            throw new RuntimeException("Sample copy failed");
        }
        try {
            $copy = store_audio(
                $tmp,
                $m["original_name"],
                "sample",
                $fork["id"],
                [
                    "ext" => pathinfo($m["filename"], PATHINFO_EXTENSION),
                    "mime" => $m["mime"],
                    "duration" => $m["duration"],
                ],
                json_decode($m["metadata"], true),
            );
            foreach ($d["files"] as &$f) {
                $f["content"] = preg_replace(
                    "~https://strudel\.xxc\.dk/media/" .
                        preg_quote($m["id"], "~") .
                        '(?:\?[^"\s\x27)]+)?~',
                    $copy["url"],
                    $f["content"],
                );
            }
            unset($f);
        } finally {
            if (is_file($tmp)) {
                unlink($tmp);
            }
        }
    }
    if ($samples) {
        $d["version"] = $fork["version"];
        $fork = save_project($d, $fork["id"], "fork media");
    }
    return $fork;
}
