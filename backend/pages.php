<?php
function page_head(
    string $title,
    string $description,
    string $url,
    string $image = "",
): void {
    $image = $image ?: BASE_URL . "/brand/social-studio.png";
    $siteName = settings()["site_title"];
    header("Content-Type: text/html; charset=utf-8");
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' .
        esc($title) .
        ' · XXC / THUGS(red)</title><meta name="description" content="' .
        esc($description) .
        '"><link rel="canonical" href="' .
        esc($url) .
        '"><meta property="og:site_name" content="' .
        esc($siteName) .
        '"><meta property="og:type" content="music.song"><meta property="og:title" content="' .
        esc($title) .
        '"><meta property="og:description" content="' .
        esc($description) .
        '"><meta property="og:url" content="' .
        esc($url) .
        '"><meta property="og:image" content="' .
        esc($image) .
        '"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#080a0e"><link rel="icon" href="/brand/mark.svg"><link rel="stylesheet" href="/pages.css"></head><body><header class="page-header"><a class="brand" href="/"><img src="/brand/mark.svg" alt=""/><span>XXC / THUGS<span class="red">(red)</span><small>STRUDEL SANDBOX</small></span></a><nav><a href="/library">[ LIBRARY ]</a><a href="/">[ OPEN STUDIO ]</a></nav></header>';
}
function page_footer(): void
{
    echo '<footer>CODE / SOUND / SIGNAL <span>Built with <a href="https://strudel.cc">Strudel</a> · <a href="https://github.com/kawaiipantsu/strudel-xxc">AGPL source</a> · <a href="/source.tar.gz">Source archive</a> · <a href="/admin/">Admin</a></span></footer><script src="/share.js" defer></script></body></html>';
}
