/**
 * Partner Profile Store
 *
 * Shared Zustand store so the partner profile is fetched once and
 * reused across PartnerHeader, ProfilePage, and any other component
 * that needs the partner summary.
 */

import { create } from 'zustand';
import { getCurrentPartnerProfile } from '../api/partnersApi';
import type { KYCStatus, PartnerProfile } from '../partner/types/partner-dashboard';

export interface PartnerInfo {
  fullName: string;
  email: string;
  phone: string;
  partnerType: string;
  partnerCode: string;
  kycStatus: KYCStatus;
  /** Full profile payload (available after fetch) */
  profile: PartnerProfile | null;
}

interface PartnerProfileState {
  partnerInfo: PartnerInfo | null;
  isLoading: boolean;
  error: string | null;
  /** Timestamp of the last successful fetch */
  lastFetchedAt: number;
}

/** How long the cached profile stays fresh (ms) */
const PROFILE_CACHE_TTL = 60_000;

interface PartnerProfileActions {
  /**
   * Fetch the partner profile from the API. Skips the network call when
   * the cache is still fresh unless `force` is true.
   */
  fetchProfile: (userId: string, fallback?: { firstName: string; lastName: string; email: string }) => Promise<void>;
  /** Force-clear local data (e.g. on logout) */
  reset: () => void;
}

type PartnerProfileStore = PartnerProfileState & PartnerProfileActions;

const initialState: PartnerProfileState = {
  partnerInfo: null,
  isLoading: false,
  error: null,
  lastFetchedAt: 0,
};

/** In-flight promise so concurrent callers share the same request */
let inflight: Promise<void> | null = null;

export const usePartnerProfileStore = create<PartnerProfileStore>()((set, get) => ({
  ...initialState,

  fetchProfile: async (userId, fallback) => {
    const { lastFetchedAt, partnerInfo } = get();

    // Skip fetch when cache is still fresh (only cache successes)
    if (partnerInfo?.profile && Date.now() - lastFetchedAt < PROFILE_CACHE_TTL) {
      return;
    }

    // If a request is already in-flight, wait for it instead of firing another
    if (inflight) {
      return inflight;
    }

    const run = async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await getCurrentPartnerProfile();

      if (response.success && response.data?.partner) {
        const partner = response.data.partner as unknown as Record<string, unknown>;
        const profile: PartnerProfile = {
          id: partner.id as string,
          fullName:
            (partner.fullName as string) ||
            `${partner.firstName || ''} ${partner.lastName || ''}`.trim(),
          email: partner.email as string,
          phone: (partner.phone as string) || '',
          partnerType: (partner.partnerType as PartnerProfile['partnerType']) || 'freelancer',
          partnerCode:
            (partner.partnerCode as string) || `GPS-${userId.slice(-8).toUpperCase()}`,
          city: (partner.city as string) || '',
          state: (partner.state as string) || '',
          pincode: (partner.pincode as string) || '',
          panNumber: (partner.panNumber as string) || '',
          aadhaarNumber: (partner.aadhaarNumber as string) || '',
          businessName: (partner.businessName as string) || '',
          gstNumber: (partner.gstNumber as string) || '',
          kycStatus: (partner.kycStatus as KYCStatus) || 'pending',
          joinedDate:
            (partner.joinedDate as string) ||
            new Date((partner.createdAt as string) || Date.now()).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
          bankDetails: {
            accountHolderName:
              (partner.accountHolderName as string) || (partner.fullName as string) || '',
            bankName: (partner.bankName as string) || '',
            accountNumber: (partner.accountNumber as string) || '',
            ifscCode: (partner.ifscCode as string) || '',
            isVerified: (partner.bankVerified as boolean) || false,
          },
        };

        set({
          partnerInfo: {
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
            partnerType: profile.partnerType,
            partnerCode: profile.partnerCode,
            kycStatus: profile.kycStatus,
            profile,
          },
          isLoading: false,
          lastFetchedAt: Date.now(),
        });
      } else {
        throw new Error('Partner data not available');
      }
    } catch {
      // Build fallback from auth user data
      const fb = fallback || { firstName: '', lastName: '', email: '' };
      const fullName = `${fb.firstName} ${fb.lastName}`.trim() || 'Partner';

      set({
        partnerInfo: {
          fullName,
          email: fb.email,
          phone: '',
          partnerType: 'freelancer',
          partnerCode: `GPS-${userId.slice(-8).toUpperCase()}`,
          kycStatus: 'pending',
          profile: null,
        },
        isLoading: false,
        error: 'Failed to load partner profile',
        // Don't set lastFetchedAt on failure so retries are allowed
      });
    } finally {
      inflight = null;
    }
    };

    inflight = run();
    return inflight;
  },

  reset: () => set(initialState),
}));

export default usePartnerProfileStore;
