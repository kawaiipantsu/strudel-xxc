<?php
require __DIR__ . "/../../backend/bootstrap.php";
require ROOT . "/backend/projects.php";
require ROOT . "/backend/media.php";
require ROOT . "/backend/covers.php";
header("Cache-Control: no-store");
$route = trim($_GET["route"] ?? "", "/");
$parts = explode("/", $route);
$method = $_SERVER["REQUEST_METHOD"];
if ($method === "OPTIONS") {
    fail("CORS", "Cross-origin API access is not allowed.", 403);
}
if ($route === "health" && $method === "GET") {
    json_out(health());
}
session_init();
owner();
if (!in_array($method, ["GET", "HEAD"], true)) {
    csrf();
    rate("write", 100);
    rate("write-ip", 300, 60, false);
    if (
        settings()["maintenance"] &&
        !admin() &&
        !str_starts_with($route, "admin")
    ) {
        fail(
            "MAINTENANCE",
            "The studio is temporarily read-only. Local drafts are preserved.",
            503,
        );
    }
} else {
    rate("read", 300);
}
if ($route === "session" && $method === "GET") {
    json_out(["csrf" => $_SESSION["csrf"], "admin" => admin()]);
}
if ($route === "settings/public" && $method === "GET") {
    json_out(settings());
}
if ($route === "projects" && $method === "GET") {
    json_out(
        array_map(
            fn($p) => project_data($p, false),
            query(
                "SELECT * FROM projects WHERE owner_hash=? ORDER BY updated_at DESC LIMIT 200",
                [owner()],
            )->fetchAll(),
        ),
    );
}
if ($route === "projects" && $method === "POST") {
    rate("create", 20, 3600);
    rate("create-ip", 120, 3600, false);
    if (
        query("SELECT COUNT(*) FROM projects WHERE owner_hash=?", [
            owner(),
        ])->fetchColumn() >= 200
    ) {
        fail("QUOTA", "Project limit reached.", 413);
    }
    json_out(save_project(body()), 201);
}
if ($route === "projects/import" && $method === "POST") {
    json_out(import_bundle(), 201);
}
if ($parts[0] === "projects" && isset($parts[1])) {
    $p = project(
        $parts[1],
        in_array($method, ["PUT", "PATCH", "DELETE"], true),
    );
    $sub = $parts[2] ?? "";
    if (!$sub && $method === "GET") {
        json_out(project_data($p));
    }
    if (!$sub && $method === "PUT") {
        json_out(save_project(body(), $p["id"]));
    }
    if (!$sub && $method === "DELETE") {
        query("DELETE FROM projects WHERE id=?", [$p["id"]]);
        json_out(["deleted" => true]);
    }
    if ($sub === "fork" && $method === "POST") {
        json_out(fork_project($p, body()), 201);
    }
    if ($sub === "bundle" && $method === "GET") {
        export_bundle($p);
    }
    if ($sub === "revisions") {
        project($p["id"], true);
        if ($method === "GET") {
            json_out(
                query(
                    "SELECT id,reason,created_at FROM project_revisions WHERE project_id=? ORDER BY created_at DESC LIMIT 100",
                    [$p["id"]],
                )->fetchAll(),
            );
        }
        if ($method === "POST") {
            $d = body();
            $rev = query(
                "SELECT * FROM project_revisions WHERE id=? AND project_id=?",
                [$d["id"] ?? "", $p["id"]],
            )->fetch();
            if (!$rev) {
                fail("NOT_FOUND", "Revision not found.", 404);
            }
            $snapshot = json_decode($rev["snapshot"], true);
            if (($d["action"] ?? "") === "restore") {
                $snapshot["version"] = $p["version"];
                json_out(save_project($snapshot, $p["id"], "before restore"));
            }
            json_out($snapshot);
        }
    }
    if ($sub === "cover" && $method === "POST") {
        project($p["id"], true);
        rate("covers", 12);
        $d = body();
        $wave = array_slice(
            is_array($d["wave"] ?? null) ? $d["wave"] : [],
            0,
            512,
        );
        json_out(
            make_cover($p, $d["style"] ?? "terminal", ["wave" => $wave]),
            201,
        );
    }
    if ($sub === "sample-map" && $method === "GET") {
        $map = [];
        foreach (
            query(
                "SELECT * FROM media WHERE project_id=? AND kind='sample' AND approved=1",
                [$p["id"]],
            )->fetchAll()
            as $m
        ) {
            $meta = json_decode($m["metadata"], true);
            $map[$meta["sample_name"] ?? $m["id"]] = [media_data($m)["url"]];
        }
        json_out($map);
    }
    if ($sub === "preview" && $method === "POST") {
        project($p["id"], true);
        $id = body()["id"] ?? "";
        $m = query(
            "SELECT * FROM media WHERE id=? AND project_id=? AND kind IN ('recording','export')",
            [$id, $p["id"]],
        )->fetch();
        if (!$m) {
            fail("VALIDATION_ERROR", "Preview must belong to this project.");
        }
        query("UPDATE projects SET preview_id=? WHERE id=?", [$id, $p["id"]]);
        json_out(project_data(project($p["id"])));
    }
}
if ($route === "library" && $method === "GET") {
    $s = mb_substr($_GET["search"] ?? "", 0, 100);
    $tag = mb_substr($_GET["tag"] ?? "", 0, 30);
    $sort =
        ($_GET["sort"] ?? "newest") === "updated" ? "updated_at" : "created_at";
    $args = ["%" . $s . "%", "%" . $s . "%", "%" . $s . "%"];
    $where =
        "visibility='public' AND (title LIKE ? OR description LIKE ? OR author LIKE ?)";
    if ($tag) {
        $where .= " AND tags LIKE ?";
        $args[] = '%"' . $tag . '"%';
    }
    $rows = query(
        "SELECT * FROM projects WHERE $where ORDER BY featured DESC,$sort DESC LIMIT 100",
        $args,
    )->fetchAll();
    json_out(array_map(fn($p) => project_data($p, false), $rows));
}
if (in_array($route, ["samples", "recordings", "exports"], true)) {
    $kind = [
        "samples" => "sample",
        "recordings" => "recording",
        "exports" => "export",
    ][$route];
    if ($method === "GET") {
        json_out(
            array_map(
                "media_data",
                query(
                    "SELECT * FROM media WHERE owner_hash=? AND kind=? ORDER BY created_at DESC LIMIT 200",
                    [owner(), $kind],
                )->fetchAll(),
            ),
        );
    }
    if ($method === "POST") {
        if ($route === "exports") {
            rate("exports", 8, 300);
            rate("exports-ip", 30, 300, false);
            json_out(convert_audio(body()), 201);
        }
        json_out(upload_audio($kind), 201);
    }
}
if (
    in_array($parts[0], ["samples", "recordings", "exports", "covers"], true) &&
    isset($parts[1]) &&
    $method === "DELETE"
) {
    $m = query("SELECT * FROM media WHERE id=?", [$parts[1]])->fetch();
    if (!$m || ($m["owner_hash"] !== owner() && !admin())) {
        fail("NOT_FOUND", "Sample not found.", 404);
    }
    query("UPDATE projects SET cover_id=NULL WHERE cover_id=?", [$m["id"]]);
    query("UPDATE projects SET preview_id=NULL WHERE preview_id=?", [$m["id"]]);
    query("DELETE FROM media WHERE id=?", [$m["id"]]);
    if (is_file(media_path($m))) {
        unlink(media_path($m));
    }
    $svg = ROOT . "/storage/covers/" . $m["id"] . ".svg";
    if ($m["kind"] === "cover" && is_file($svg)) {
        unlink($svg);
    }
    json_out(["deleted" => true]);
}
if ($route === "sample-packs" && $method === "GET") {
    $packs = query("SELECT * FROM sample_packs WHERE enabled=1")->fetchAll();
    foreach ($packs as &$pack) {
        $pack["items"] = query(
            "SELECT sample_name,media_id FROM sample_pack_items WHERE pack_id=?",
            [$pack["id"]],
        )->fetchAll();
        $pack["map"] = [];
        foreach ($pack["items"] as $item) {
            $pack["map"][$item["sample_name"]] = [
                media_url($item["media_id"], true),
            ];
        }
    }
    json_out($packs);
}
if ($parts[0] === "admin") {
    if ($route === "admin/login" && $method === "POST") {
        rate("login", 8, 900, false);
        $d = body();
        $a = query("SELECT * FROM admins WHERE username=?", [
            (string) ($d["username"] ?? "admin"),
        ])->fetch();
        if (
            !$a ||
            !password_verify(
                (string) ($d["password"] ?? ""),
                $a["password_hash"],
            )
        ) {
            audit("login.failed");
            fail(
                "INVALID_CREDENTIALS",
                "Invalid administrator credentials.",
                401,
            );
        }
        session_regenerate_id(true);
        $_SESSION["admin"] = $a["id"];
        $_SESSION["admin_until"] = time() + 3600 * 8;
        $_SESSION["csrf"] = bin2hex(random_bytes(32));
        audit("login.success");
        json_out(["csrf" => $_SESSION["csrf"], "admin" => true]);
    }
    require_admin();
    if ($route === "admin/logout" && $method === "POST") {
        unset($_SESSION["admin"], $_SESSION["admin_until"]);
        session_regenerate_id(true);
        json_out(["signed_out" => true]);
    }
    if ($route === "admin/dashboard" && $method === "GET") {
        $counts = [];
        foreach (
            ["projects", "project_revisions", "media", "sample_packs"]
            as $table
        ) {
            $counts[$table] = (int) query(
                "SELECT COUNT(*) FROM $table",
            )->fetchColumn();
        }
        $counts["public_projects"] = (int) query(
            "SELECT COUNT(*) FROM projects WHERE visibility='public'",
        )->fetchColumn();
        $counts["samples"] = (int) query(
            "SELECT COUNT(*) FROM media WHERE kind='sample'",
        )->fetchColumn();
        $counts["storage_bytes"] = (int) query(
            "SELECT COALESCE(SUM(size),0) FROM media",
        )->fetchColumn();
        json_out([
            "health" => health(),
            "counts" => $counts,
            "php" => PHP_VERSION,
            "disk_free" => disk_free_space(ROOT . "/storage"),
            "modules" => get_loaded_extensions(),
            "activity" => query(
                "SELECT event,entity_id,created_at FROM activity_log ORDER BY id DESC LIMIT 30",
            )->fetchAll(),
        ]);
    }
    if ($route === "admin/settings") {
        if ($method === "GET") {
            json_out(settings());
        }
        if ($method === "PUT") {
            $d = body();
            $known = settings();
            foreach ($d as $k => $v) {
                if (!array_key_exists($k, $known)) {
                    fail("VALIDATION_ERROR", "Unknown setting.");
                }
                if (is_bool($known[$k]) && !is_bool($v)) {
                    fail("VALIDATION_ERROR", "Boolean setting expected.");
                }
                if (
                    is_string($known[$k]) &&
                    (!is_string($v) || mb_strlen($v) > 3000)
                ) {
                    fail(
                        "VALIDATION_ERROR",
                        "Expected text of at most 3000 characters.",
                    );
                }
                if (
                    in_array($k, ["accent", "dark_bg", "light_bg"], true) &&
                    !preg_match('/^#[a-fA-F0-9]{6}$/D', $v)
                ) {
                    fail("VALIDATION_ERROR", "Use a six-digit hex color.");
                }
                $enums = [
                    "default_theme" => ["dark", "light", "system"],
                    "visual_quality" => ["auto", "low", "balanced", "high"],
                    "visual_preset" => [
                        "scope",
                        "spectrum",
                        "spectrogram",
                        "pianoroll",
                        "punchcard",
                        "spiral",
                        "phase",
                        "orbits",
                        "geometry",
                    ],
                ];
                if (isset($enums[$k]) && !in_array($v, $enums[$k], true)) {
                    fail("VALIDATION_ERROR", "Unsupported " . $k . ".");
                }
                if ($k === "upload_mb" && (!is_int($v) || $v < 1 || $v > 128)) {
                    fail("VALIDATION_ERROR", "Upload limit must be 1–128 MB.");
                }
                if (
                    $k === "recording_seconds" &&
                    (!is_int($v) || $v < 10 || $v > 1800)
                ) {
                    fail(
                        "VALIDATION_ERROR",
                        "Recording limit must be 10–1800 seconds.",
                    );
                }
                if (
                    $k === "visual_intensity" &&
                    (!is_numeric($v) || $v < 0 || $v > 1)
                ) {
                    fail(
                        "VALIDATION_ERROR",
                        "Visual intensity must be between 0 and 1.",
                    );
                }
                if (
                    $k === "default_project" &&
                    $v !== "" &&
                    (!valid_id($v) ||
                        !query(
                            "SELECT 1 FROM projects WHERE id=? AND visibility='public'",
                            [$v],
                        )->fetchColumn())
                ) {
                    fail(
                        "VALIDATION_ERROR",
                        "Default project must be a public project UUID, or blank.",
                    );
                }
            }
            db()->beginTransaction();
            try {
                foreach ($d as $k => $v) {
                    query(
                        "INSERT INTO settings(name,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)",
                        [$k, json_encode($v)],
                    );
                }
                db()->commit();
            } catch (Throwable $e) {
                db()->rollBack();
                throw $e;
            }
            audit("admin.settings");
            json_out(settings());
        }
    }
    if ($route === "admin/projects" && $method === "GET") {
        json_out(
            array_map(
                fn($p) => project_data($p, false),
                query(
                    "SELECT * FROM projects ORDER BY updated_at DESC LIMIT 500",
                )->fetchAll(),
            ),
        );
    }
    if ($route === "admin/projects" && $method === "PATCH") {
        $d = body();
        $p = project($d["id"] ?? "", true);
        if (
            isset($d["visibility"]) &&
            !in_array($d["visibility"], ["private", "unlisted", "public"], true)
        ) {
            fail("VALIDATION_ERROR", "Invalid visibility.");
        }
        query(
            "UPDATE projects SET visibility=?,featured=?,moderation_notes=? WHERE id=?",
            [
                $d["visibility"] ?? $p["visibility"],
                (int) ($d["featured"] ?? $p["featured"]),
                mb_substr(
                    $d["moderation_notes"] ?? ($p["moderation_notes"] ?? ""),
                    0,
                    3000,
                ),
                $p["id"],
            ],
        );
        audit("admin.project", ["id" => $p["id"]]);
        json_out(project_data(project($p["id"])));
    }
    if ($route === "admin/media" && $method === "GET") {
        json_out(
            array_map(
                "media_data",
                query(
                    "SELECT * FROM media ORDER BY created_at DESC LIMIT 500",
                )->fetchAll(),
            ),
        );
    }
    if ($route === "admin/media" && $method === "PATCH") {
        $d = body();
        $m = query("SELECT * FROM media WHERE id=?", [$d["id"] ?? ""])->fetch();
        if (!$m) {
            fail("NOT_FOUND", "Media not found.", 404);
        }
        query("UPDATE media SET approved=? WHERE id=?", [
            (int) (bool) ($d["approved"] ?? true),
            $m["id"],
        ]);
        audit("admin.media", ["id" => $m["id"]]);
        json_out(["updated" => true]);
    }
    if ($route === "admin/media" && $method === "DELETE") {
        $d = body();
        $m = query("SELECT * FROM media WHERE id=?", [$d["id"] ?? ""])->fetch();
        if (!$m) {
            fail("NOT_FOUND", "Media not found.", 404);
        }
        query("UPDATE projects SET cover_id=NULL WHERE cover_id=?", [$m["id"]]);
        query("UPDATE projects SET preview_id=NULL WHERE preview_id=?", [
            $m["id"],
        ]);
        query("DELETE FROM media WHERE id=?", [$m["id"]]);
        if (is_file(media_path($m))) {
            unlink(media_path($m));
        }
        $svg = ROOT . "/storage/covers/" . $m["id"] . ".svg";
        if ($m["kind"] === "cover" && is_file($svg)) {
            unlink($svg);
        }
        audit("admin.media.deleted", ["id" => $m["id"]]);
        json_out(["deleted" => true]);
    }
    if ($route === "admin/sample-packs") {
        if ($method === "GET") {
            $packs = query(
                "SELECT * FROM sample_packs ORDER BY created_at DESC",
            )->fetchAll();
            foreach ($packs as &$pack) {
                $pack["items"] = query(
                    "SELECT media_id,sample_name FROM sample_pack_items WHERE pack_id=?",
                    [$pack["id"]],
                )->fetchAll();
            }
            json_out($packs);
        }
        if ($method === "POST") {
            $d = body();
            $id = $d["id"] ?? uid();
            if (!valid_id($id)) {
                fail("VALIDATION_ERROR", "Invalid pack ID.");
            }
            query(
                "INSERT INTO sample_packs(id,name,description,license,enabled) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),license=VALUES(license),enabled=VALUES(enabled)",
                [
                    $id,
                    mb_substr($d["name"] ?? "Pack", 0, 120),
                    mb_substr($d["description"] ?? "", 0, 3000),
                    mb_substr($d["license"] ?? "", 0, 3000),
                    (int) ($d["enabled"] ?? true),
                ],
            );
            query("DELETE FROM sample_pack_items WHERE pack_id=?", [$id]);
            foreach (array_slice($d["items"] ?? [], 0, 100) as $item) {
                $m = query(
                    "SELECT id FROM media WHERE id=? AND kind='sample'",
                    [$item["media_id"] ?? ""],
                )->fetch();
                if ($m) {
                    query(
                        "INSERT INTO sample_pack_items(pack_id,media_id,sample_name) VALUES(?,?,?)",
                        [
                            $id,
                            $m["id"],
                            preg_replace(
                                "/[^a-z0-9_]/",
                                "_",
                                strtolower($item["sample_name"] ?? "sample"),
                            ),
                        ],
                    );
                }
            }
            json_out(["id" => $id]);
        }
    }
    if ($route === "admin/logs" && $method === "GET") {
        $path = ROOT . "/storage/logs/app.log";
        $lines = is_file($path)
            ? array_slice(file($path, FILE_IGNORE_NEW_LINES), -100)
            : [];
        json_out(array_map(fn($l) => json_decode($l, true), $lines));
    }
}
fail("NOT_FOUND", "API endpoint not found.", 404);
