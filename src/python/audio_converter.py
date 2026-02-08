#!/usr/bin/env python3
"""
Audio format converter for Eclo
Converts between WAV, MP3, OGG, and FLAC formats
"""

import argparse
import json
import os
import sys


def convert_audio(input_path: str, output_path: str, output_format: str) -> dict:
    """
    Convert audio file to specified format.

    Args:
        input_path: Path to input audio file
        output_path: Path for output audio file
        output_format: Target format (mp3, ogg, flac, wav)

    Returns:
        dict with success status and error message if any
    """
    try:
        from pydub import AudioSegment

        # Load audio file
        audio = AudioSegment.from_file(input_path)

        # Export to target format
        format_map = {
            'mp3': 'mp3',
            'ogg': 'ogg',
            'flac': 'flac',
            'wav': 'wav'
        }

        export_format = format_map.get(output_format.lower(), 'wav')

        # Set export parameters based on format
        export_params = {}
        if export_format == 'mp3':
            export_params = {'format': 'mp3', 'bitrate': '192k'}
        elif export_format == 'ogg':
            export_params = {'format': 'ogg', 'codec': 'libvorbis'}
        elif export_format == 'flac':
            export_params = {'format': 'flac'}
        else:
            export_params = {'format': 'wav'}

        audio.export(output_path, **export_params)

        return {
            'success': True,
            'output_path': output_path,
            'format': export_format
        }

    except ImportError:
        return {
            'success': False,
            'error': 'pydub not installed. Install with: pip install pydub'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def main():
    parser = argparse.ArgumentParser(description='Audio format converter')
    parser.add_argument('--input', required=True, help='Input audio file path')
    parser.add_argument('--output', required=True, help='Output audio file path')
    parser.add_argument('--format', required=True, choices=['mp3', 'ogg', 'flac', 'wav'],
                        help='Output format')

    args = parser.parse_args()

    result = convert_audio(args.input, args.output, args.format)
    print(json.dumps(result))

    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
