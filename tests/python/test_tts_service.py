"""
Unit tests for Eclo TTS Service
"""

import pytest
import json
import subprocess
import os
import sys

# Add src/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../src/python'))

from tts_service import (
    CosyVoice3Model,
    OuteTTSModel,
    KokoroModel,
    EcloTTSService
)


class TestCosyVoice3Model:
    """Tests for CosyVoice3 model"""

    def test_supported_languages(self):
        """CosyVoice3 should support 9 languages"""
        model = CosyVoice3Model()
        langs = model.get_supported_languages()
        assert 'ko' in langs
        assert 'en' in langs
        assert 'ja' in langs
        assert 'zh' in langs
        assert len(langs) == 9

    def test_requires_ref_audio(self, temp_audio_file):
        """CosyVoice3 should require reference audio"""
        model = CosyVoice3Model()
        result = model.generate(
            text="테스트",
            language="ko",
            output_path=temp_audio_file,
            ref_audio=None  # No reference audio
        )
        assert result['success'] is False
        assert 'reference voice audio' in result['error'].lower()

    def test_loaded_by_default(self):
        """Model should be marked as loaded by default"""
        model = CosyVoice3Model()
        assert model.loaded is True


class TestOuteTTSModel:
    """Tests for OuteTTS model"""

    def test_supported_languages(self):
        """OuteTTS should support 4 languages"""
        model = OuteTTSModel()
        langs = model.get_supported_languages()
        assert 'en' in langs
        assert 'zh' in langs
        assert 'ja' in langs
        assert 'ko' in langs
        assert len(langs) == 4

    def test_loaded_by_default(self):
        """Model should be marked as loaded by default"""
        model = OuteTTSModel()
        assert model.loaded is True


class TestKokoroModel:
    """Tests for Kokoro model"""

    def test_supported_languages(self):
        """Kokoro should support 2 languages only"""
        model = KokoroModel()
        langs = model.get_supported_languages()
        assert 'en' in langs
        assert 'ja' in langs
        assert 'ko' not in langs  # Korean not supported
        assert len(langs) == 2

    def test_loaded_by_default(self):
        """Model should be marked as loaded by default"""
        model = KokoroModel()
        assert model.loaded is True


class TestEcloTTSService:
    """Tests for the main TTS service"""

    def test_available_models(self):
        """Should return list of available models"""
        models = EcloTTSService.get_available_models()
        assert isinstance(models, list)
        assert len(models) >= 3  # At least 3 built-in models

        # Check model structure
        for model in models:
            assert 'id' in model
            assert 'name' in model
            assert 'languages' in model
            assert 'features' in model

    def test_model_features(self):
        """Each model should have proper features defined"""
        models = EcloTTSService.get_available_models()

        cosyvoice = next(m for m in models if 'CosyVoice3' in m['name'])
        assert 'voice_cloning' in cosyvoice['features']
        assert 'cross_lingual' in cosyvoice['features']

        kokoro = next(m for m in models if 'Kokoro' in m['name'])
        assert 'voice_cloning' not in kokoro['features']

    def test_change_model(self):
        """Should be able to change model"""
        service = EcloTTSService()
        result = service.change_model("mlx-community/Kokoro-82M-MLX")
        assert result is True


class TestCLI:
    """Tests for CLI interface"""

    @pytest.fixture
    def script_path(self):
        return os.path.join(
            os.path.dirname(__file__),
            '../../src/python/tts_service.py'
        )

    def test_list_models(self, script_path):
        """CLI should return valid JSON for list-models"""
        result = subprocess.run(
            ['python3', script_path, '--action', 'list-models'],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0

        models = json.loads(result.stdout)
        assert isinstance(models, list)
        assert len(models) >= 3

    def test_list_languages(self, script_path):
        """CLI should return valid JSON for list-languages"""
        result = subprocess.run(
            ['python3', script_path, '--action', 'list-languages'],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0

        languages = json.loads(result.stdout)
        assert isinstance(languages, list)
        assert len(languages) > 0

    def test_generate_missing_text_returns_error(self, script_path, temp_audio_file):
        """CLI should return error JSON when text is missing"""
        result = subprocess.run(
            [
                'python3', script_path,
                '--action', 'generate',
                '--output', temp_audio_file
            ],
            capture_output=True,
            text=True
        )

        # Should still output JSON even on error
        try:
            data = json.loads(result.stdout)
            assert data.get('success') is False or 'error' in data
        except json.JSONDecodeError:
            # If no JSON, should have non-zero exit code
            assert result.returncode != 0

    def test_generate_missing_ref_audio_returns_error(self, script_path, temp_audio_file):
        """CosyVoice3 should return error when ref_audio is missing"""
        result = subprocess.run(
            [
                'python3', script_path,
                '--action', 'generate',
                '--text', 'Hello world',
                '--language', 'en',
                '--model', 'mlx-community/Fun-CosyVoice3-0.5B-2512-fp16',
                '--output', temp_audio_file
            ],
            capture_output=True,
            text=True
        )

        data = json.loads(result.stdout)
        assert data['success'] is False
        assert 'reference' in data['error'].lower()
