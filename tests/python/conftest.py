"""
Pytest fixtures for Eclo TTS Service tests
"""

import pytest
import tempfile
import os
import sys

# Add src/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../src/python'))


@pytest.fixture
def temp_output_dir():
    """Create a temporary directory for test outputs"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def temp_audio_file(temp_output_dir):
    """Create a temporary audio file path"""
    return os.path.join(temp_output_dir, 'test_output.wav')


@pytest.fixture
def sample_voice_path():
    """Path to a sample voice file for testing"""
    voice_path = os.path.join(
        os.path.dirname(__file__),
        '../../assets/voices/english_female.wav'
    )
    if os.path.exists(voice_path):
        return voice_path
    return None
