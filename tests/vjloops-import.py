#!/usr/bin/env python3
"""Check installed-library retention after upload staging is cleaned up."""
import contextlib
import importlib.util
import io
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('vj_import', ROOT/'scripts/install-vjloops.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='xxc-vj-import-')
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        paths = patch.multiple(importer, SOURCE=root/'uploads', STORE=root/'installed', PUBLIC=root/'public')
        paths.start()
        self.addCleanup(paths.stop)
        self.source('red', 'pack1')
        self.run_import()

    def source(self, color, pack):
        path = importer.SOURCE/pack/(color+'.mp4')
        path.parent.mkdir(parents=True, exist_ok=True)
        importer.run_ffmpeg(['-f', 'lavfi', '-i', f'color=c={color}:s=64x64:d=0.12',
                             '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(path)])

    def run_import(self, *args):
        with patch('sys.argv', ['install-vjloops.py', *args]), contextlib.redirect_stdout(io.StringIO()):
            importer.main()

    def catalog(self):
        return (importer.PUBLIC/'catalog.json').read_bytes()

    def test_missing_or_empty_staging_preserves_catalog(self):
        before = self.catalog()
        shutil.rmtree(importer.SOURCE)
        self.run_import()
        self.assertEqual(before, self.catalog())
        importer.SOURCE.mkdir()
        self.run_import()
        self.run_import('--check')
        self.assertEqual(before, self.catalog())

    def test_new_upload_keeps_installed_pack_and_repeat_has_no_duplicates(self):
        shutil.rmtree(importer.SOURCE)
        self.source('blue', 'pack2')
        self.run_import()
        before = self.catalog()
        self.assertEqual([p['id'] for p in json.loads(before)['packs']], ['pack1', 'pack2'])
        self.assertEqual(len(json.loads(before)['clips']), 2)
        self.run_import()
        self.assertEqual(before, self.catalog())

    def test_missing_installed_video_fails_without_publishing_empty_catalog(self):
        before = self.catalog()
        shutil.rmtree(importer.SOURCE)
        next((importer.STORE/'video').glob('*.mp4')).unlink()
        with self.assertRaisesRegex(ValueError, 'Missing or corrupt'):
            self.run_import()
        self.assertEqual(before, self.catalog())


if __name__ == '__main__':
    unittest.main()
