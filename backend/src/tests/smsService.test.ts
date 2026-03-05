import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendOTP, verifyOTP, resendOTP } from '../services/smsService.js';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('SMS Service - MSG91 REST API', () => {
  beforeEach(() => {
    fetchMock.mockClear();
    process.env.MSG91_AUTH_KEY = 'test-auth-key';
    process.env.MSG91_TEMPLATE_ID = 'test-template-id';
  });

  describe('sendOTP', () => {
    it('should return success when MSG91 returns success', async () => {
      fetchMock.mockResolvedValueOnce({
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
        json: async () => ({ type: 'error', message: 'Invalid mobile' }),
      });

      const result = await sendOTP('invalid');
      
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
  });

  describe('verifyOTP', () => {
    it('should return success when OTP is valid', async () => {
      fetchMock.mockResolvedValueOnce({
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
  });

  describe('resendOTP', () => {
    it('should return success when OTP is resent', async () => {
      fetchMock.mockResolvedValueOnce({
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
        json: async () => ({ type: 'error', message: 'Limit exceeded' }),
      });

      const result = await resendOTP('9876543210');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Limit exceeded');
    });
  });
});
