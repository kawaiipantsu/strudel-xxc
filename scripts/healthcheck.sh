#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
curl --fail --silent --show-error https://strudel.xxc.dk/api/health | php -r '$r=json_decode(stream_get_contents(STDIN),true);if(!$r["ok"])exit(1);foreach($r["data"] as $k=>$v)echo $k.": ".(is_bool($v)?($v?"ready":"unavailable"):$v).PHP_EOL;foreach(["database","redis","storage","ffmpeg"] as $k)if(!$r["data"][$k])exit(1);'
