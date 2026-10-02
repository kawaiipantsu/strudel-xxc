<?php
require __DIR__ . "/../backend/bootstrap.php";
header("Content-Type: application/xml; charset=utf-8");
header("Cache-Control: public, max-age=300");
echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' .
    BASE_URL .
    "/</loc></url><url><loc>" .
    BASE_URL .
    "/library</loc></url>";
foreach (
    query(
        "SELECT slug,updated_at FROM projects WHERE visibility='public'",
    )->fetchAll()
    as $p
) {
    echo "<url><loc>" .
        BASE_URL .
        "/p/" .
        esc($p["slug"]) .
        "</loc><lastmod>" .
        gmdate("c", strtotime($p["updated_at"])) .
        "</lastmod></url>";
}
echo "</urlset>";
