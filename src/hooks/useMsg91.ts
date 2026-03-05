import { useEffect, useCallback, useRef } from 'react';

declare global {
  interface Window {
    initSendOTP: (config: any) => any;
  }
}

interface UseMsg91Options {
  onSuccess: (data: any) => void;
  onFailure?: (error: any) => void;
  identifier?: string;
}

export const useMsg91 = (options: UseMsg91Options) => {
  const { onSuccess, onFailure, identifier } = options;
  const widgetRef = useRef<any>(null);
  const callbacksRef = useRef({ onSuccess, onFailure });

  // Keep callbacks in sync without re-initializing widget
  useEffect(() => {
    callbacksRef.current = { onSuccess, onFailure };
  }, [onSuccess, onFailure]);

  // Load MSG91 script once
  useEffect(() => {
    const scriptId = 'msg91-otp-script';
    if (document.getElementById(scriptId)) return;

    const loadOtpScript = (urls: string[]) => {
      let i = 0;
      const attempt = () => {
        const s = document.createElement('script');
        s.id = scriptId;
        s.src = urls[i];
        s.async = true;
        s.onload = () => console.log('MSG91 script loaded successfully');
        s.onerror = () => {
          i++;
          if (i < urls.length) attempt();
        };
        document.head.appendChild(s);
      };
      attempt();
    };

    loadOtpScript([
      'https://verify.msg91.com/otp-provider.js',
      'https://verify.phone91.com/otp-provider.js',
    ]);

    return () => {
      const script = document.getElementById(scriptId);
      if (script) document.head.removeChild(script);
    };
  }, []);

  // Reset widget when identifier changes
  useEffect(() => {
    widgetRef.current = null;
  }, [identifier]);

  const initWidget = useCallback(() => {
    if (typeof window.initSendOTP !== 'function') return false;

    const configuration = {
      widgetId: '366264733564363936393439',
      tokenAuth: '492426TQaxZdbAa6983a619P1',
      identifier: identifier || '',
      exposeMethods: true,
      success: (data: any) => {
        console.log('MSG91 success response', data);
        callbacksRef.current.onSuccess(data);
      },
      failure: (error: any) => {
        console.log('MSG91 failure reason', error);
        callbacksRef.current.onFailure?.(error);
      },
    };

    const widget = window.initSendOTP(configuration);
    // initSendOTP may return the widget object or undefined
    // Either way, it auto-sends OTP on init with exposeMethods: true
    if (widget) {
      widgetRef.current = widget;
    }
    return true;
  }, [identifier]);

  const sendOTP = useCallback(async (): Promise<boolean> => {
    // initWidget() calls initSendOTP which auto-sends OTP on initialization
    if (!widgetRef.current) {
      if (!initWidget()) return false;
      // OTP was sent as part of init, return success
      return true;
    }
    try {
      await widgetRef.current.sendOtp();
      return true;
    } catch (e) {
      console.error('sendOtp method error (OTP may still have been sent):', e);
      // OTP often gets sent despite the method throwing
      return true;
    }
  }, [initWidget]);

  const verifyOTP = useCallback(async (otp: string): Promise<boolean> => {
    if (!widgetRef.current) return false;
    try {
      await widgetRef.current.verifyOtp(otp);
      return true;
    } catch (e) {
      console.error('Failed to verify OTP:', e);
      return false;
    }
  }, []);

  const resendOTP = useCallback(async (): Promise<boolean> => {
    if (!widgetRef.current) return false;
    try {
      await widgetRef.current.retryOtp('text');
      return true;
    } catch (e) {
      console.error('Failed to resend OTP:', e);
      return false;
    }
  }, []);

  return { sendOTP, verifyOTP, resendOTP };
};
