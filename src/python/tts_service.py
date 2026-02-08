#!/usr/bin/env python3
"""
Eclo TTS Service
Multilingual Text-to-Speech with Voice Cloning support
Supports multiple TTS models via configuration
"""

import argparse
import json
import os
import sys
import io
from pathlib import Path
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod
from contextlib import contextmanager


@contextmanager
def suppress_stdout():
    """Context manager to suppress stdout output from libraries"""
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    try:
        yield
    finally:
        sys.stdout = old_stdout


def report_progress(stage: str, percent: int, message: str = ""):
    """Report progress to stderr for Electron to capture"""
    progress = {
        "type": "progress",
        "data": {
            "stage": stage,
            "percent": percent,
            "message": message
        }
    }
    print(json.dumps(progress), file=sys.stderr)
    sys.stderr.flush()

# TTS Model Interface
class TTSModelInterface(ABC):
    """Abstract interface for TTS models"""

    @abstractmethod
    def load(self) -> bool:
        """Load the model"""
        pass

    @abstractmethod
    def generate(
        self,
        text: str,
        language: str,
        output_path: str,
        ref_audio: Optional[str] = None,
        ref_text: Optional[str] = None,
        instruct_text: Optional[str] = None,
        speed: float = 1.0
    ) -> Dict[str, Any]:
        """Generate speech from text"""
        pass

    @abstractmethod
    def get_supported_languages(self) -> list:
        """Return list of supported language codes"""
        pass


class CosyVoice3Model(TTSModelInterface):
    """CosyVoice3 TTS Model implementation using mlx-audio-plus"""

    def __init__(self, model_path: str = "mlx-community/Fun-CosyVoice3-0.5B-2512-fp16"):
        self.model_path = model_path
        self.loaded = True  # No pre-loading needed, generate_audio handles it

    def load(self) -> bool:
        # generate_audio handles model loading internally
        return True

    def generate(
        self,
        text: str,
        language: str,
        output_path: str,
        ref_audio: Optional[str] = None,
        ref_text: Optional[str] = None,
        instruct_text: Optional[str] = None,
        speed: float = 1.0
    ) -> Dict[str, Any]:
        if not self.loaded:
            if not self.load():
                return {"success": False, "error": "Model not loaded"}

        # CosyVoice3 requires reference audio
        if not ref_audio:
            return {"success": False, "error": "CosyVoice3 requires a reference voice audio. Please select a voice first."}

        try:
            from mlx_audio.tts.generate import generate_audio
            import soundfile as sf

            report_progress("loading", 10, "Loading model...")

            # Determine generation mode
            if ref_audio and ref_text:
                mode = "zero_shot"
            else:
                mode = "cross_lingual"

            # Get output path without extension for file_prefix
            output_dir = os.path.dirname(output_path)
            file_prefix = os.path.splitext(os.path.basename(output_path))[0]
            full_prefix = os.path.join(output_dir, file_prefix) if output_dir else file_prefix

            report_progress("processing", 30, "Generating audio...")

            # Generate speech using generate_audio
            # Note: generate_audio takes model path as string, not loaded model object
            # Use suppress_stdout to prevent "Resampling" messages from polluting JSON output
            with suppress_stdout():
                generate_audio(
                    text=text,
                    model=self.model_path,
                    ref_audio=ref_audio,
                    ref_text=ref_text,
                    file_prefix=full_prefix,
                )

            report_progress("saving", 80, "Saving audio file...")

            # The output file will be named {file_prefix}_0.wav
            actual_output = f"{full_prefix}_0.wav"

            # Check for various possible output file patterns
            import glob
            possible_files = glob.glob(f"{full_prefix}*.wav")
            if possible_files and not os.path.exists(actual_output):
                # Use the first matching file
                actual_output = possible_files[0]

            # Rename to expected output path if different
            if os.path.exists(actual_output) and actual_output != output_path:
                os.rename(actual_output, output_path)
            elif os.path.exists(actual_output):
                # actual_output is the same as output_path, file exists
                pass
            else:
                # List what files exist for debugging
                existing_files = glob.glob(f"{output_dir}/eclo_*.wav") if output_dir else glob.glob("eclo_*.wav")
                return {"success": False, "error": f"Audio generation failed - output file not created. Checked: {actual_output}, Found: {existing_files}"}

            # Read the audio file to get duration
            final_path = output_path if os.path.exists(output_path) else actual_output
            if os.path.exists(final_path):
                audio_data, sample_rate = sf.read(final_path)
                duration = len(audio_data) / sample_rate
                # Ensure the file is at output_path
                if final_path != output_path:
                    os.rename(final_path, output_path)
            else:
                return {"success": False, "error": f"Audio generation failed - cannot find output file"}

            return {
                "success": True,
                "output_path": output_path,
                "duration": duration,
                "mode": mode
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_supported_languages(self) -> list:
        return ["zh", "en", "ja", "ko", "de", "es", "fr", "it", "ru"]


class OuteTTSModel(TTSModelInterface):
    """OuteTTS Model implementation"""

    def __init__(self, model_path: str = "mlx-community/OuteTTS-0.2-500M-MLX"):
        self.model_path = model_path
        self.loaded = True

    def load(self) -> bool:
        return True

    def generate(
        self,
        text: str,
        language: str,
        output_path: str,
        ref_audio: Optional[str] = None,
        ref_text: Optional[str] = None,
        instruct_text: Optional[str] = None,
        speed: float = 1.0
    ) -> Dict[str, Any]:
        try:
            from mlx_audio.tts.generate import generate_audio
            import soundfile as sf

            output_dir = os.path.dirname(output_path)
            file_prefix = os.path.splitext(os.path.basename(output_path))[0]
            full_prefix = os.path.join(output_dir, file_prefix) if output_dir else file_prefix

            with suppress_stdout():
                generate_audio(
                    text=text,
                    model=self.model_path,
                    ref_audio=ref_audio,
                    file_prefix=full_prefix,
                )

            actual_output = f"{full_prefix}_0.wav"
            if actual_output != output_path and os.path.exists(actual_output):
                os.rename(actual_output, output_path)

            if os.path.exists(output_path):
                audio_data, sample_rate = sf.read(output_path)
                duration = len(audio_data) / sample_rate
            else:
                duration = 0

            return {
                "success": True,
                "output_path": output_path,
                "duration": duration
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_supported_languages(self) -> list:
        return ["en", "zh", "ja", "ko"]


class KokoroModel(TTSModelInterface):
    """Kokoro lightweight TTS Model implementation"""

    def __init__(self, model_path: str = "mlx-community/Kokoro-82M-MLX"):
        self.model_path = model_path
        self.loaded = True

    def load(self) -> bool:
        return True

    def generate(
        self,
        text: str,
        language: str,
        output_path: str,
        ref_audio: Optional[str] = None,
        ref_text: Optional[str] = None,
        instruct_text: Optional[str] = None,
        speed: float = 1.0
    ) -> Dict[str, Any]:
        try:
            from mlx_audio.tts.generate import generate_audio
            import soundfile as sf

            output_dir = os.path.dirname(output_path)
            file_prefix = os.path.splitext(os.path.basename(output_path))[0]
            full_prefix = os.path.join(output_dir, file_prefix) if output_dir else file_prefix

            with suppress_stdout():
                generate_audio(
                    text=text,
                    model=self.model_path,
                    file_prefix=full_prefix,
                )

            actual_output = f"{full_prefix}_0.wav"
            if actual_output != output_path and os.path.exists(actual_output):
                os.rename(actual_output, output_path)

            if os.path.exists(output_path):
                audio_data, sample_rate = sf.read(output_path)
                duration = len(audio_data) / sample_rate
            else:
                duration = 0

            return {
                "success": True,
                "output_path": output_path,
                "duration": duration
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_supported_languages(self) -> list:
        return ["en", "ja"]


class EcloTTSService:
    """
    Eclo TTS Service
    Supports multiple TTS models via configuration
    """

    MODEL_REGISTRY = {
        "mlx-community/Fun-CosyVoice3-0.5B-2512-fp16": CosyVoice3Model,
        "mlx-community/OuteTTS-0.2-500M-MLX": OuteTTSModel,
        "mlx-community/Kokoro-82M-MLX": KokoroModel,
    }

    def __init__(self, model_id: str = "mlx-community/Fun-CosyVoice3-0.5B-2512-fp16"):
        self.model_id = model_id
        self.model: Optional[TTSModelInterface] = None
        self._load_model(model_id)

    def _load_model(self, model_id: str) -> bool:
        """Load a TTS model by ID"""
        if model_id in self.MODEL_REGISTRY:
            self.model = self.MODEL_REGISTRY[model_id](model_id)
        elif model_id == "custom" or model_id.startswith("/"):
            # Custom model path - try CosyVoice3 format first
            self.model = CosyVoice3Model(model_id)
        else:
            # Try as HuggingFace model path
            self.model = CosyVoice3Model(model_id)

        return self.model.load() if self.model else False

    def change_model(self, model_id: str) -> bool:
        """Change the current TTS model"""
        self.model_id = model_id
        return self._load_model(model_id)

    def generate_speech(
        self,
        text: str,
        language: str,
        output_path: str,
        ref_audio: Optional[str] = None,
        ref_text: Optional[str] = None,
        instruct_text: Optional[str] = None,
        speed: float = 1.0
    ) -> Dict[str, Any]:
        """Generate speech from text"""
        if not self.model:
            return {"success": False, "error": "No model loaded"}

        return self.model.generate(
            text=text,
            language=language,
            output_path=output_path,
            ref_audio=ref_audio,
            ref_text=ref_text,
            instruct_text=instruct_text,
            speed=speed
        )

    def get_supported_languages(self) -> list:
        """Get supported languages for current model"""
        if self.model:
            return self.model.get_supported_languages()
        return []

    @classmethod
    def get_available_models(cls) -> list:
        """Get list of available model configurations"""
        return [
            {
                "id": "mlx-community/Fun-CosyVoice3-0.5B-2512-fp16",
                "name": "CosyVoice3 0.5B",
                "languages": ["zh", "en", "ja", "ko", "de", "es", "fr", "it", "ru"],
                "features": ["voice_cloning", "cross_lingual", "instruct"]
            },
            {
                "id": "mlx-community/OuteTTS-0.2-500M-MLX",
                "name": "OuteTTS 0.2 500M",
                "languages": ["en", "zh", "ja", "ko"],
                "features": ["voice_cloning"]
            },
            {
                "id": "mlx-community/Kokoro-82M-MLX",
                "name": "Kokoro 82M",
                "languages": ["en", "ja"],
                "features": []
            }
        ]


def main():
    parser = argparse.ArgumentParser(description='Eclo TTS Service')
    parser.add_argument('--action', type=str, default='generate',
                        choices=['generate', 'list-models', 'list-languages'],
                        help='Action to perform')
    parser.add_argument('--text', type=str, help='Text to convert to speech')
    parser.add_argument('--language', type=str, default='en', help='Language code')
    parser.add_argument('--model', type=str,
                        default='mlx-community/Fun-CosyVoice3-0.5B-2512-fp16',
                        help='TTS model to use')
    parser.add_argument('--output', type=str, help='Output file path')
    parser.add_argument('--ref-audio', type=str, help='Reference audio for voice cloning')
    parser.add_argument('--ref-text', type=str, help='Reference text transcription')
    parser.add_argument('--instruct', type=str, help='Style instruction text')
    parser.add_argument('--speed', type=float, default=1.0, help='Speech speed (0.5-2.0)')

    args = parser.parse_args()

    if args.action == 'list-models':
        models = EcloTTSService.get_available_models()
        print(json.dumps(models, indent=2))
        return

    if args.action == 'list-languages':
        service = EcloTTSService(args.model)
        languages = service.get_supported_languages()
        print(json.dumps(languages))
        return

    if args.action == 'generate':
        if not args.text:
            print(json.dumps({"success": False, "error": "Text is required"}))
            sys.exit(1)

        if not args.output:
            print(json.dumps({"success": False, "error": "Output path is required"}))
            sys.exit(1)

        service = EcloTTSService(args.model)
        result = service.generate_speech(
            text=args.text,
            language=args.language,
            output_path=args.output,
            ref_audio=args.ref_audio,
            ref_text=args.ref_text,
            instruct_text=args.instruct,
            speed=args.speed
        )
        print(json.dumps(result))
        sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
