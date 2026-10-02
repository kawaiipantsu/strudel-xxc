<?php
/** Original artwork built from score tokens, source hash and an optional live waveform. */
function make_cover(
    array $p,
    string $style = "terminal",
    array $signal = [],
): array {
    $styles = [
        "terminal",
        "oscilloscope",
        "spectral",
        "piano-roll",
        "glitch",
        "minimal",
        "thugs-red",
    ];
    if (!in_array($style, $styles, true)) {
        fail("VALIDATION_ERROR", "Unknown cover style.");
    }
    ensure_storage_capacity(2000000);
    $files = query(
        "SELECT content FROM project_files WHERE project_id=? ORDER BY path",
        [$p["id"]],
    )->fetchAll(PDO::FETCH_COLUMN);
    $code = implode("\n", $files);
    $hash = hash("sha256", $code . $style);
    $seed = array_values(unpack("C*", hex2bin($hash)));
    $meta = json_decode($p["metadata"], true);
    $bpm = (float) ($meta["bpm"] ?? 120);
    $id = uid();
    $wave = $signal["wave"] ?? [];
    preg_match_all("/[a-zA-Z_][\w]*|[<>\[\]*~]/", $code, $matches);
    $tokens = $matches[0];
    $red = "#ff3b47";
    $svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#090c11"/>';
    if ($style !== "minimal") {
        $svg .= '<g stroke="#202833" stroke-width="1">';
        for ($x = 60; $x <= 1140; $x += 40) {
            $svg .= '<path d="M' . $x . " 60V1140 M60 " . $x . 'H1140"/>';
        }
        $svg .= "</g>";
    }
    $svg .=
        '<rect x="60" y="60" width="1080" height="1080" fill="none" stroke="#667080"/>';
    $text = function (
        string $value,
        int $x,
        int $y,
        float $size,
        string $color,
    ) use (&$svg): void {
        $svg .=
            '<text x="' .
            $x .
            '" y="' .
            $y .
            '" fill="' .
            $color .
            '" font-family="JetBrains Mono,monospace" font-size="' .
            $size .
            '">' .
            esc($value) .
            "</text>";
    };
    $text("XXC / THUGS(red)", 90, 120, 25, $red);
    $text("CODE → PATTERN → SOUND", 90, 170, 16, "#8291a1");
    $title = mb_substr($p["title"], 0, 36);
    $text(
        $title,
        90,
        330,
        min(54, (900 / max(1, mb_strlen($title))) * 1.6),
        "#e3e7ec",
    );
    $text(
        mb_substr($p["author"] ?: "XXC STRUDEL LIBRARY", 0, 64),
        90,
        380,
        22,
        "#8291a1",
    );
    if (in_array($style, ["terminal", "oscilloscope", "thugs-red"])) {
        $points = [];
        for ($i = 0; $i < 180; $i++) {
            $sample = $wave[(int) floor(($i / 180) * count($wave))] ?? null;
            $v = is_numeric($sample)
                ? max(-1, min(1, (float) $sample))
                : sin($i * 0.13) * ($seed[$i % 32] / 320 + 0.1);
            $points[] =
                round(90 + $i * 5.7, 1) . "," . round(625 + $v * 210, 1);
        }
        $svg .=
            '<polyline points="' .
            implode(" ", $points) .
            '" fill="none" stroke="' .
            $red .
            '" stroke-width="3"/>';
    }
    if (in_array($style, ["spectral", "piano-roll", "glitch"])) {
        for ($i = 0; $i < 96; $i++) {
            $v = $seed[$i % 32] / 255;
            $x = 90 + ($i % 48) * 21;
            $y =
                $style === "piano-roll"
                    ? 460 + ($seed[$i % 32] % 16) * 20
                    : 780 - $v * 270;
            $height =
                $style === "piano-roll"
                    ? 9
                    : ($style === "glitch"
                        ? 4 + ($seed[($i + 3) % 32] % 15)
                        : $v * 270);
            $width =
                $style === "piano-roll"
                    ? 12 + ($seed[($i + 5) % 32] % 60)
                    : ($style === "glitch"
                        ? 55
                        : 7);
            $svg .=
                '<rect x="' .
                $x .
                '" y="' .
                $y .
                '" width="' .
                $width .
                '" height="' .
                $height .
                '" fill="' .
                $red .
                '" opacity=".7"/>';
        }
    }
    if ($style === "minimal" || $style === "thugs-red") {
        $svg .=
            '<path d="M140 520L250 610 140 700M290 710H450" fill="none" stroke="' .
            $red .
            '" stroke-width="28"/>';
        $text(substr(strtoupper($hash), 0, 8), 540, 670, 66, "#e3e7ec");
    }
    for ($i = 0; $i < 4; $i++) {
        $text(
            mb_substr(implode(" ", array_slice($tokens, $i * 10, 10)), 0, 90),
            90,
            875 + $i * 36,
            17,
            "#8291a1",
        );
    }
    $text(
        sprintf("[ %s BPM ]  [ %s ]", $bpm, strtoupper($style)),
        90,
        1060,
        20,
        $red,
    );
    $text(
        substr($hash, 0, 24) . " / " . gmdate("Y-m-d"),
        90,
        1100,
        15,
        "#8291a1",
    );
    $svg .= "</svg>";
    $master = ROOT . "/storage/covers/" . $id . ".svg";
    $png = ROOT . "/storage/covers/" . $id . ".png";
    try {
        file_put_contents($master, $svg, LOCK_EX);
        process(
            [
                "/usr/bin/rsvg-convert",
                "--format=png",
                "--output=" . $png,
                $master,
            ],
            15,
            ["FONTCONFIG_FILE" => ROOT . "/backend/fonts.conf"],
        );
        chmod($master, 0640);
        chmod($png, 0640);
        query(
            "INSERT INTO media(id,owner_hash,project_id,kind,filename,original_name,mime,size,metadata) VALUES(?,?,?,?,?,?,?,?,?)",
            [
                $id,
                owner(),
                $p["id"],
                "cover",
                $id . ".png",
                $p["slug"] . "-cover.png",
                "image/png",
                filesize($png),
                json_encode([
                    "style" => $style,
                    "code_hash" => $hash,
                    "waveform" => count($wave) > 0,
                ]),
            ],
        );
        query("UPDATE projects SET cover_id=? WHERE id=?", [$id, $p["id"]]);
        return media_data(
            query("SELECT * FROM media WHERE id=?", [$id])->fetch(),
        );
    } catch (Throwable $e) {
        if (is_file($master)) {
            unlink($master);
        }
        if (is_file($png)) {
            unlink($png);
        }
        throw $e;
    }
}
