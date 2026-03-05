import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Shield,
} from 'lucide-react';
import apiClient from '../api/apiClient';

type PageState = 'loading' | 'ready' | 'expired' | 'error' | 'all_done';

interface DocItem {
  id: string;
  type: string;
  status: string;
  fileName: string | null;
}

interface TokenInfo {
  customerName: string;
  loanType: string;
  expiresAt: string;
  documents: DocItem[];
}

export default function CustomerUploadPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('No upload token provided');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await apiClient.get(`/documents/upload-via-token/${token}`);
        if (response.data.success) {
          setTokenInfo(response.data.data);
          setState('ready');
        }
      } catch (err: any) {
        const data = err.response?.data;
        if (data?.code === 'EXPIRED') {
          setState('expired');
        } else if (err.response?.status === 404) {
          setState('error');
          setErrorMessage('This upload link is invalid or no longer exists.');
        } else {
          setState('error');
          setErrorMessage(data?.message || 'Something went wrong. Please try again.');
        }
      }
    };

    validateToken();
  }, [token]);

  const handleUpload = useCallback(
    async (docId: string, file: File) => {
      if (!token) return;

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF or image file (JPG, PNG, or WebP).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File is too large. Maximum size is 10 MB.');
        return;
      }

      setUploadingDocId(docId);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append('document', file);

        const response = await apiClient.post(
          `/documents/upload-via-token/${token}?documentId=${docId}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
              }
            },
          }
        );

        if (response.data.success) {
          // Update the document in local state
          setTokenInfo((prev) => {
            if (!prev) return prev;
            const updatedDocs = prev.documents.map((d) =>
              d.id === docId
                ? { ...d, status: 'uploaded', fileName: response.data.data.document.fileName }
                : d
            );
            return { ...prev, documents: updatedDocs };
          });
        }
      } catch (err: any) {
        const data = err.response?.data;
        alert(data?.message || 'Upload failed. Please try again.');
      } finally {
        setUploadingDocId(null);
        setUploadProgress(0);
      }
    },
    [token]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Computed values
  const pendingDocs = tokenInfo?.documents.filter((d) => d.status === 'pending' || d.status === 'rejected') || [];
  const uploadedDocs = tokenInfo?.documents.filter((d) => d.status === 'uploaded' || d.status === 'verified') || [];
  const allUploaded = tokenInfo ? pendingDocs.length === 0 : false;

  // ── Page States ────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500">Verifying your upload link...</p>
        </div>
      </PageShell>
    );
  }

  if (state === 'expired') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Link Expired</h2>
          <p className="text-gray-500 max-w-sm">
            This upload link has expired. Please contact your loan advisor to get a new link.
          </p>
        </div>
      </PageShell>
    );
  }

  if (state === 'error') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something Went Wrong</h2>
          <p className="text-gray-500 max-w-sm">{errorMessage}</p>
        </div>
      </PageShell>
    );
  }

  // ── Main Upload View ───────────────────────────────────────────────────

  return (
    <PageShell>
      <div className="space-y-5">
        {/* Customer & Loan Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-900">
            Hello, <span className="font-semibold">{tokenInfo?.customerName}</span>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Please upload the required documents for your <span className="font-medium">{tokenInfo?.loanType}</span> application.
          </p>
        </div>

        {/* Expiry Notice */}
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            This link expires on{' '}
            <strong>{tokenInfo?.expiresAt ? new Date(tokenInfo.expiresAt).toLocaleString() : ''}</strong>
          </span>
        </div>

        {/* Progress Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {uploadedDocs.length} of {tokenInfo?.documents.length || 0} uploaded
          </span>
          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{
                width: `${tokenInfo?.documents.length ? (uploadedDocs.length / tokenInfo.documents.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* All Done Banner */}
        {allUploaded && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-green-900 text-lg">All Documents Uploaded!</h3>
            <p className="text-sm text-green-700 mt-1">
              Thank you! All required documents have been uploaded successfully. You can safely close this page.
            </p>
          </div>
        )}

        {/* Pending Documents */}
        {pendingDocs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Documents Needed ({pendingDocs.length})
            </h3>
            <div className="space-y-3">
              {pendingDocs.map((doc) => {
                const isUploading = uploadingDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`border rounded-xl p-4 transition-all ${
                      doc.status === 'rejected'
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            doc.status === 'rejected' ? 'bg-red-100' : 'bg-gray-100'
                          }`}
                        >
                          <FileText
                            className={`w-5 h-5 ${
                              doc.status === 'rejected' ? 'text-red-500' : 'text-gray-400'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{doc.type}</p>
                          {doc.status === 'rejected' && (
                            <p className="text-xs text-red-600 mt-0.5">
                              <XCircle className="w-3 h-3 inline -mt-0.5" /> Rejected — please re-upload
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Upload Button */}
                      <div>
                        <input
                          type="file"
                          ref={(el) => {
                            fileInputRefs.current[doc.id] = el;
                          }}
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(doc.id, file);
                            e.target.value = '';
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[doc.id]?.click()}
                          disabled={isUploading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {uploadProgress}%
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              {doc.status === 'rejected' ? 'Re-upload' : 'Upload'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {isUploading && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Uploaded / Verified Documents */}
        {uploadedDocs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Uploaded ({uploadedDocs.length})
            </h3>
            <div className="space-y-2">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between border border-green-200 bg-green-50 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.type}</p>
                      {doc.fileName && (
                        <p className="text-xs text-gray-500">{doc.fileName}</p>
                      )}
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
          <Shield className="w-3.5 h-3.5" />
          <span>Your documents are securely encrypted during upload</span>
        </div>
      </div>
    </PageShell>
  );
}

/** Shared wrapper for consistent layout across all page states */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="font-semibold text-gray-900">GPS India Financial Services</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
            <h1 className="text-xl font-bold text-white">Document Upload</h1>
            <p className="text-blue-100 text-sm mt-1">
              Securely upload your documents for your loan application
            </p>
          </div>

          {/* Card Body */}
          <div className="p-6">{children}</div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Need help? Contact your loan advisor or call us at{' '}
          <a href="tel:+919999999999" className="text-blue-500 hover:underline">
            +91 99999 99999
          </a>
        </p>
      </main>
    </div>
  );
}
