import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendOTP, verifyOTP, resendOTP, formatIndianNumber } from '../services/smsService.js';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('SMS Service - MSG91 REST API', () => {
  beforeEach(() => {
    fetchMock.mockClear();
    process.env.MSG91_AUTH_KEY = 'test-auth-key';
    process.env.MSG91_TEMPLATE_ID = 'test-template-id';
  });

  // ----------------------------------------------------------------
  // formatIndianNumber
  // ----------------------------------------------------------------
  describe('formatIndianNumber', () => {
    it('should format a valid 10-digit number', () => {
      expect(formatIndianNumber('9876543210')).toBe('919876543210');
    });

    it('should accept 91 + 10-digit number', () => {
      expect(formatIndianNumber('919876543210')).toBe('919876543210');
    });

    it('should strip leading +91', () => {
      expect(formatIndianNumber('+919876543210')).toBe('919876543210');
    });

    it('should strip whitespace', () => {
      expect(formatIndianNumber(' 98765 43210 ')).toBe('919876543210');
    });

    it('should return null for 9-digit number', () => {
      expect(formatIndianNumber('987654321')).toBeNull();
    });

    it('should return null for 11-digit number', () => {
      expect(formatIndianNumber('98765432101')).toBeNull();
    });

    it('should return null for letters', () => {
      expect(formatIndianNumber('abcdefghij')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(formatIndianNumber('')).toBeNull();
    });

    it('should return null for non-91 country code + 10 digits', () => {
      expect(formatIndianNumber('449876543210')).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // sendOTP
  // ----------------------------------------------------------------
  describe('sendOTP', () => {
    it('should return success when MSG91 returns success', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'success', message: 'OTP sent', request_id: 'req123' }),
      });

      const result = await sendOTP('9876543210');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP sent');
      expect(result.requestId).toBe('req123');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('https://control.msg91.com/api/v5/otp'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should return failure when MSG91 returns error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'error', message: 'Invalid mobile' }),
      });

      const result = await sendOTP('9876543210');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid mobile');
    });

    it('should return failure when configuration is missing', async () => {
      delete process.env.MSG91_AUTH_KEY;

      const result = await sendOTP('9876543210');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('configuration missing');
    });

    it('should return failure when fetch throws error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendOTP('9876543210');
      
      expect(result.success).toBe(false);
    });

    it('should return failure for invalid phone number', async () => {
      const result = await sendOTP('invalid');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid phone number');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return failure for non-ok HTTP response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 502,
      });

      const result = await sendOTP('9876543210');

      expect(result.success).toBe(false);
      expect(result.message).toContain('HTTP 502');
    });

    it('should return failure on timeout', async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
            });
          }),
      );

      const promise = sendOTP('9876543210');
      vi.advanceTimersByTime(10_000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.message).toContain('timed out');
      vi.useRealTimers();
    });
  });

  // ----------------------------------------------------------------
  // verifyOTP
  // ----------------------------------------------------------------
  describe('verifyOTP', () => {
    it('should return success when OTP is valid', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'success', message: 'OTP verified' }),
      });

      const result = await verifyOTP('9876543210', '123456');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP verified');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('https://control.msg91.com/api/v5/otp/verify'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ authkey: 'test-auth-key' }),
        })
      );
    });

    it('should return failure when OTP is invalid', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'error', message: 'Invalid OTP' }),
      });

      const result = await verifyOTP('9876543210', '000000');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid OTP');
    });

    it('should return failure when fetch throws error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await verifyOTP('9876543210', '123456');
      
      expect(result.success).toBe(false);
    });

    it('should return failure for invalid phone number', async () => {
      const result = await verifyOTP('abc', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid phone number');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // resendOTP
  // ----------------------------------------------------------------
  describe('resendOTP', () => {
    it('should return success when OTP is resent', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'success', message: 'OTP resent' }),
      });

      const result = await resendOTP('9876543210', 'text');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP resent');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('https://control.msg91.com/api/v5/otp/retry'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should support voice retry type', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'success', message: 'Voice OTP sent' }),
      });

      await resendOTP('9876543210', 'voice');
      
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('retrytype=voice'),
        expect.anything()
      );
    });

    it('should return failure when resend fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'error', message: 'Limit exceeded' }),
      });

      const result = await resendOTP('9876543210');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Limit exceeded');
    });

    it('should return failure for invalid phone number', async () => {
      const result = await resendOTP('12345');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid phone number');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
