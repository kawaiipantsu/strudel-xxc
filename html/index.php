<?php
// Server-render the public shell metadata while keeping the compiled application immutable.
require __DIR__ . "/../backend/bootstrap.php";
try {
    $s = settings();
} catch (Throwable $e) {
    $s = [
        "site_title" => "XXC / THUGS(red) - Strudel Sandbox",
        "seo_description" =>
            "Live code, sound and signal with the real Strudel engine.",
    ];
}
$html = file_get_contents(__DIR__ . "/index.html");
$title = esc($s["site_title"]);
$description = esc($s["seo_description"]);
$html = preg_replace_callback(
    "~<title>.*?</title>~s",
    fn() => "<title>" . $title . "</title>",
    $html,
    1,
);
$html = preg_replace_callback(
    '~<meta\s+name="description"\s+content="[^"]*"\s*/?>~',
    fn() => '<meta name="description" content="' . $description . '">',
    $html,
    1,
);
$html = preg_replace_callback(
    '~<meta\s+property="og:title"\s+content="[^"]*"\s*/?>~',
    fn() => '<meta property="og:title" content="' . $title . '">',
    $html,
    1,
);
$html = preg_replace_callback(
    '~<meta\s+property="og:description"\s+content="[^"]*"\s*/?>~',
    fn() => '<meta property="og:description" content="' . $description . '">',
    $html,
    1,
);
$html = preg_replace_callback(
    '~<meta\s+property="og:site_name"\s+content="[^"]*"\s*/?>~',
    fn() => '<meta property="og:site_name" content="' . $title . '">',
    $html,
    1,
);
$ld = [
    "@context" => "https://schema.org",
    "@type" => "SoftwareApplication",
    "name" => $s["site_title"],
    "description" => $s["seo_description"],
    "url" => BASE_URL . "/",
    "applicationCategory" => "MultimediaApplication",
    "operatingSystem" => "Web",
    "isAccessibleForFree" => true,
    "license" => "https://www.gnu.org/licenses/agpl-3.0.html",
    "codeRepository" => "https://github.com/kawaiipantsu/strudel-xxc",
];
$html = str_replace(
    "</head>",
    '<script type="application/ld+json">' .
        json_encode(
            $ld,
            JSON_HEX_TAG |
                JSON_HEX_AMP |
                JSON_HEX_QUOT |
                JSON_HEX_APOS |
                JSON_UNESCAPED_SLASHES,
        ) .
        "</script></head>",
    $html,
);
header("Content-Type: text/html; charset=utf-8");
header("Cache-Control: no-cache");
echo $html;
