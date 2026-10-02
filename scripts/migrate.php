<?php
require __DIR__ . "/../backend/bootstrap.php";
foreach (
    explode(";", file_get_contents(ROOT . "/backend/schema.sql"))
    as $sql
) {
    if (trim($sql)) {
        db()->exec($sql);
    }
}
if (!query("SELECT COUNT(*) FROM admins")->fetchColumn()) {
    $code = bin2hex(random_bytes(24));
    $hash = password_hash(
        $code,
        defined("PASSWORD_ARGON2ID") ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT,
    );
    query("INSERT INTO admins(username,password_hash) VALUES(?,?)", [
        "admin",
        $hash,
    ]);
    $path = ROOT . "/docs/ADMIN_CREDS.md";
    file_put_contents(
        $path,
        "# Administrator access\n\n- URL: https://strudel.xxc.dk/admin\n- Username: admin\n- Access code: `$code`\n- Generated: " .
            gmdate("c") .
            "\n\nRotate with `php scripts/rotate-admin.php`. This file is private and excluded from Git.\n",
    );
    chmod($path, 0600);
}
echo "Schema is current. Administrator credential stored privately.\n";
