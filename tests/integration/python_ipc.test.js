/**
 * Integration tests for Python TTS Service via IPC
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PYTHON_PATH = 'python3';
const SCRIPT_PATH = path.join(__dirname, '../../src/python/tts_service.py');
const VOICE_PATH = path.join(__dirname, '../../assets/voices/english_female.wav');

describe('Python TTS Service Integration', () => {
  let tempDir;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eclo-test-'));
  });

  afterAll(() => {
    // Cleanup temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('list-models action', () => {
    test('returns valid JSON array', (done) => {
      const proc = spawn(PYTHON_PATH, [SCRIPT_PATH, '--action', 'list-models']);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data; });
      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        expect(code).toBe(0);

        const models = JSON.parse(stdout.trim());
        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThanOrEqual(3);

        // Check model structure
        models.forEach(model => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('name');
          expect(model).toHaveProperty('languages');
          expect(model).toHaveProperty('features');
        });

        done();
      });
    }, 30000);
  });

  describe('list-languages action', () => {
    test('returns valid JSON array of languages', (done) => {
      const proc = spawn(PYTHON_PATH, [SCRIPT_PATH, '--action', 'list-languages']);
      let stdout = '';

      proc.stdout.on('data', (data) => { stdout += data; });

      proc.on('close', (code) => {
        expect(code).toBe(0);

        const languages = JSON.parse(stdout.trim());
        expect(Array.isArray(languages)).toBe(true);
        expect(languages.length).toBeGreaterThan(0);

        done();
      });
    }, 30000);
  });

  describe('generate action - error cases', () => {
    test('returns error JSON when ref_audio missing for CosyVoice3', (done) => {
      const outputPath = path.join(tempDir, 'test_output.wav');

      const proc = spawn(PYTHON_PATH, [
        SCRIPT_PATH,
        '--action', 'generate',
        '--text', 'Hello world',
        '--language', 'en',
        '--model', 'mlx-community/Fun-CosyVoice3-0.5B-2512-fp16',
        '--output', outputPath
      ]);

      let stdout = '';

      proc.stdout.on('data', (data) => { stdout += data; });

      proc.on('close', () => {
        const result = JSON.parse(stdout.trim());
        expect(result.success).toBe(false);
        expect(result.error.toLowerCase()).toContain('reference');

        done();
      });
    }, 60000);

    test('returns error when output path is invalid', (done) => {
      const invalidPath = '/nonexistent/directory/output.wav';

      const proc = spawn(PYTHON_PATH, [
        SCRIPT_PATH,
        '--action', 'generate',
        '--text', 'Hello world',
        '--language', 'en',
        '--model', 'mlx-community/Kokoro-82M-MLX',
        '--output', invalidPath
      ]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data; });
      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        // Should fail with error
        if (stdout.trim()) {
          const result = JSON.parse(stdout.trim());
          expect(result.success).toBe(false);
        } else {
          expect(code).not.toBe(0);
        }
        done();
      });
    }, 60000);
  });

  describe('JSON output format', () => {
    test('stdout contains only valid JSON', (done) => {
      const proc = spawn(PYTHON_PATH, [SCRIPT_PATH, '--action', 'list-models']);
      let stdout = '';

      proc.stdout.on('data', (data) => { stdout += data; });

      proc.on('close', () => {
        // Should be parseable as JSON
        expect(() => JSON.parse(stdout.trim())).not.toThrow();

        // Should not contain Python print statements or warnings
        expect(stdout).not.toContain('print');
        expect(stdout).not.toContain('Warning');

        done();
      });
    }, 30000);

    test('stderr may contain warnings but not errors for valid actions', (done) => {
      const proc = spawn(PYTHON_PATH, [SCRIPT_PATH, '--action', 'list-models']);
      let stderr = '';

      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        expect(code).toBe(0);

        // stderr may have warnings but should not have Python errors
        if (stderr.trim()) {
          expect(stderr.toLowerCase()).not.toContain('traceback');
          expect(stderr.toLowerCase()).not.toContain('exception');
        }

        done();
      });
    }, 30000);
  });

  describe('Model features verification', () => {
    test('CosyVoice3 has voice cloning feature', (done) => {
      const proc = spawn(PYTHON_PATH, [SCRIPT_PATH, '--action', 'list-models']);
      let stdout = '';

      proc.stdout.on('data', (data) => { stdout += data; });

      proc.on('close', () => {
        const models = JSON.parse(stdout.trim());
        const cosyVoice = models.find(m => m.id.includes('CosyVoice3'));

        expect(cosyVoice).toBeDefined();
        expect(cosyVoice.features).toContain('voice_cloning');

        done();
      });
    }, 30000);

    test('Kokoro does not have voice cloning feature', (done) => {
      const proc = spawn(PYTHON_PATH, [SCRIPT_PATH, '--action', 'list-models']);
      let stdout = '';

      proc.stdout.on('data', (data) => { stdout += data; });

      proc.on('close', () => {
        const models = JSON.parse(stdout.trim());
        const kokoro = models.find(m => m.id.includes('Kokoro'));

        expect(kokoro).toBeDefined();
        expect(kokoro.features).not.toContain('voice_cloning');

        done();
      });
    }, 30000);
  });
});
