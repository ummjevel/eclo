# Eclo

Multilingual On-Device TTS & Voice Cloning Mac Application

Apple Silicon Mac에서 완전히 오프라인으로 동작하는 다국어 텍스트-투-스피치(TTS) 및 음성 복제(Voice Cloning) 애플리케이션입니다.

## Features

- **다국어 TTS**: 9개 언어 지원 (한국어, 영어, 일본어, 중국어, 독일어, 스페인어, 프랑스어, 이탈리아어, 러시아어)
- **Voice Cloning**: 3-10초 음성 샘플로 목소리 복제
- **프리셋 음성**: 8개 프리셋 음성 제공 (한/영/일/중 남녀)
- **다양한 TTS 모델 지원**: 설정에서 모델 변경 가능
- **100% 오프라인**: 모든 처리가 로컬에서 수행
- **스타일 제어**: 속도, 감정, 톤 조절 가능
- **다양한 오디오 형식**: WAV, MP3, OGG, FLAC 내보내기 지원
- **생성 히스토리**: 이전 생성 기록 관리 및 재생

## System Requirements

- macOS 14.0 (Sonoma) 이상
- Apple Silicon (M1, M2, M3, M4 시리즈)
- 16GB RAM 이상 (권장 32GB)
- 2GB 이상 저장공간

## Installation

### 1. Prerequisites

```bash
# Node.js 설치 (v18 이상)
brew install node

# Python 3.10+ 설치
brew install python@3.10

# FFmpeg 설치 (MP3/OGG 변환용)
brew install ffmpeg
```

### 2. Clone and Install

```bash
cd /path/to/eclo

# Node.js 의존성 설치
npm install

# Python 의존성 설치
pip3 install -r src/python/requirements.txt
```

### 3. Run the App

```bash
# 개발 모드로 실행
npm run dev

# 일반 실행
npm start
```

### 4. Build for Distribution

```bash
npm run build:mac
```

## Supported TTS Models

설정에서 다음 모델들 중 선택할 수 있습니다:

| Model | Size | Languages | Features |
|-------|------|-----------|----------|
| **CosyVoice3 0.5B** (기본) | ~1GB | 9개 언어 | Voice Cloning, Cross-lingual, Instruct |
| **OuteTTS 0.2 500M** | ~500MB | 4개 언어 | Voice Cloning |
| **Kokoro 82M** | ~100MB | 2개 언어 | 기본 TTS |
| **Custom** | - | - | HuggingFace 또는 로컬 경로 지정 |

### Custom Model 사용

설정에서 "Custom Model Path"에 다음 형식으로 입력:
- HuggingFace: `mlx-community/your-model-name`
- 로컬 경로: `/path/to/your/model`

## Project Structure

```
eclo/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.js        # Main entry point
│   │   └── preload.js     # Preload script
│   ├── renderer/          # Electron renderer (UI)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── python/            # Python TTS service
│       ├── tts_service.py
│       ├── audio_converter.py
│       └── requirements.txt
├── assets/
│   └── voices/            # 프리셋 음성 샘플
├── tests/
│   ├── python/            # Python 단위 테스트
│   ├── node/              # Node.js 단위 테스트
│   ├── integration/       # 통합 테스트
│   └── e2e/               # E2E 테스트 (Playwright)
├── package.json
├── jest.config.js
├── playwright.config.ts
└── README.md
```

## Usage

### Basic TTS

1. TTS 탭에서 텍스트 입력
2. 프리셋 음성 또는 커스텀 음성 선택
3. 언어 선택
4. 속도 및 스타일 설정 (선택)
5. "Generate" 버튼 클릭
6. 생성 후 Save 버튼으로 원하는 형식(WAV/MP3/OGG/FLAC)으로 저장

### Voice Cloning

1. Voice Clone 탭으로 이동
2. 3-10초 음성 샘플 업로드
3. 권한 확인 체크박스 선택
4. 생성할 텍스트 입력
5. "Generate with Cloned Voice" 클릭

### History

1. History 탭에서 이전 생성 기록 확인
2. 재생 버튼으로 오디오 재생
3. 불필요한 항목 삭제 가능

## Testing

```bash
# 모든 테스트 실행
npm test

# Python 테스트만 실행
npm run test:python

# E2E 테스트 실행
npm run test:e2e

# 테스트 watch 모드
npm run test:watch
```

### 테스트 커버리지

- **Python 단위 테스트**: TTS 모델 인터페이스, CLI 명령어
- **Node.js 단위 테스트**: Electron main process, 모델 설정
- **통합 테스트**: Python IPC 통신, JSON 응답 검증
- **E2E 테스트**: 약관 동의, 네비게이션, TTS 생성, 설정

## Legal Notice

이 소프트웨어를 사용할 때 다음 사항을 준수해야 합니다:

- 타인의 음성을 복제하려면 반드시 해당인의 동의를 받아야 합니다
- 사기, 명예훼손, 협박 목적으로 사용하지 마세요
- 정치적 허위정보 생성에 사용하지 마세요
- 모든 법적 책임은 사용자에게 있습니다

자세한 내용은 `eclo-legal-requirements.md`를 참조하세요.

## License

- Application: MIT License
- CosyVoice3 Model: Apache 2.0

## Troubleshooting

### Python 모듈을 찾을 수 없음

```bash
# mlx-audio-plus 설치 확인
pip3 show mlx-audio-plus

# 재설치
pip3 install --upgrade mlx-audio-plus
```

### 메모리 부족 오류

- 다른 앱 종료 후 재시도
- 더 작은 모델 (Kokoro 82M) 사용

### 모델 다운로드 실패

```bash
# HuggingFace 캐시 정리
rm -rf ~/.cache/huggingface

# 모델 수동 다운로드
huggingface-cli download mlx-community/Fun-CosyVoice3-0.5B-2512-fp16
```
