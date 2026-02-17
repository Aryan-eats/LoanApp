import React, { useEffect, useRef, useCallback } from 'react';

interface SuccessPopupProps {
  show: boolean;
  onClose?: () => void;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ show, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose?.();
      return;
    }
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (!show) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleKeyDown);
    const raf = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(raf);
      previousFocusRef.current?.focus();
    };
  }, [show, handleKeyDown]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-popup-title"
        className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full text-center mx-4 transform transition-all scale-100 animate-scale-in relative"
      >
        {onClose && (
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 id="success-popup-title" className="text-2xl font-bold text-gray-900 mb-2">Application Submitted</h3>
        <p className="text-gray-600 mb-6">Our team will contact you in 24-48 hours. Redirecting to best offers...</p>
      </div>
    </div>
  );
};

export default SuccessPopup;
