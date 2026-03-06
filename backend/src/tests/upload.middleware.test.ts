import { describe, expect, it, vi } from 'vitest';
import { detectFileMimeType, validateMagicBytes } from '../middleware/upload.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
};

describe('detectFileMimeType', () => {
  it('detects PDF content from file signature', () => {
    const buffer = Buffer.from('%PDF-1.7\n', 'utf8');
    expect(detectFileMimeType(buffer)).toBe('application/pdf');
  });

  it('detects WebP content from RIFF and WEBP markers', () => {
    const buffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46,
      0x2a, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]);

    expect(detectFileMimeType(buffer)).toBe('image/webp');
  });
});

describe('validateMagicBytes', () => {
  it('rejects mismatched declared MIME types', () => {
    const req = {
      file: {
        originalname: 'statement.png',
        mimetype: 'image/png',
        buffer: Buffer.from('%PDF-1.7\n', 'utf8'),
      },
    } as any;
    const res = createResponse();
    const next = vi.fn();

    validateMagicBytes(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('normalizes the uploaded file to the detected MIME type', () => {
    const req = {
      file: {
        originalname: 'statement.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.7\n', 'utf8'),
      },
    } as any;
    const res = createResponse();
    const next = vi.fn();

    validateMagicBytes(req, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.file.mimetype).toBe('application/pdf');
  });
});