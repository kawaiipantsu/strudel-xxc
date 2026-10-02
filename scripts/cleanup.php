<?php
// Removes only transient work files and expired sessions. Never removes project assets.
require __DIR__ . "/../backend/bootstrap.php";
$now = time();
$removed = 0;
foreach (
    ["tmp" => 86400, "cache" => 172800, "sessions" => 86400]
    as $dir => $age
) {
    foreach (glob(ROOT . "/storage/" . $dir . "/*") as $file) {
        if (
            !is_file($file) ||
            is_link($file) ||
            filemtime($file) > $now - $age
        ) {
            continue;
        }
        if ($dir === "sessions" && !str_starts_with(basename($file), "sess_")) {
            continue;
        }
        if (unlink($file)) {
            $removed++;
        }
    }
}
if ($removed) {
    audit("cleanup", ["count" => $removed]);
}
echo "Removed $removed stale transient files.\n";
