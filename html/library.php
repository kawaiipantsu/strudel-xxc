<?php
require __DIR__ . "/../backend/bootstrap.php";
require ROOT . "/backend/pages.php";
$s = mb_substr($_GET["search"] ?? "", 0, 100);
$tag = mb_substr($_GET["tag"] ?? "", 0, 30);
$args = ["%" . $s . "%", "%" . $s . "%"];
$where = "visibility='public' AND (title LIKE ? OR description LIKE ?)";
if ($tag) {
    $where .= " AND tags LIKE ?";
    $args[] = '%"' . $tag . '"%';
}
$sort = ($_GET["sort"] ?? "") === "updated" ? "updated_at" : "created_at";
$rows = query(
    "SELECT * FROM projects WHERE $where ORDER BY featured DESC,$sort DESC LIMIT 100",
    $args,
)->fetchAll();
page_head(
    "XXC Strudel Library",
    "Original scores and community remixes. Read the code, hear a preview and open a new session.",
    BASE_URL . "/library",
);
echo '<main><p class="eyebrow">[ XXC STRUDEL LIBRARY ]</p><h1>Patterns are meant to travel.</h1><p>Live code. Share a score. Make it your own.</p><form class="library-search"><input name="search" aria-label="Search library" placeholder="Search scores…" value="' .
    esc($s) .
    '"><input name="tag" aria-label="Filter tag" placeholder="tag" value="' .
    esc($tag) .
    '"><select name="sort" aria-label="Sort"><option value="newest">Newest</option><option value="updated"' .
    ($sort === "updated_at" ? " selected" : "") .
    '>Updated</option></select><button>Search</button></form><div class="library-grid">';
foreach ($rows as $p) {
    echo '<article><a href="/p/' .
        esc($p["slug"]) .
        '"><img src="' .
        ($p["cover_id"]
            ? "/media/" . esc($p["cover_id"])
            : "/brand/default-cover.svg") .
        '" alt="' .
        esc($p["title"]) .
        ' code cover"><div><small>' .
        ($p["builtin"] ? "ORIGINAL / CC0" : "COMMUNITY") .
        "</small><h2>" .
        esc($p["title"]) .
        "</h2><p>" .
        esc($p["description"]) .
        "</p><small>" .
        esc($p["author"] ?: "Anonymous") .
        " / VIEW SCORE ↗</small></div></a></article>";
}
echo "</div></main>";
page_footer();
