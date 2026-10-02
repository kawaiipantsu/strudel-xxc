<?php
require __DIR__ . "/../backend/bootstrap.php";
$code = bin2hex(random_bytes(24));
query("UPDATE admins SET password_hash=?", [
    password_hash($code, PASSWORD_ARGON2ID),
]);
file_put_contents(
    ROOT . "/docs/ADMIN_CREDS.md",
    "# Administrator access\n\nURL: https://strudel.xxc.dk/admin\nUsername: admin\nAccess code: `$code`\nGenerated: " .
        gmdate("c") .
        "\n\nRotate: `php scripts/rotate-admin.php`\n",
);
chmod(ROOT . "/docs/ADMIN_CREDS.md", 0600);
foreach (glob(ROOT . "/storage/sessions/sess_*") as $f) {
    unlink($f);
}
echo "Administrator credential rotated; sessions invalidated. Read docs/ADMIN_CREDS.md privately.\n";
