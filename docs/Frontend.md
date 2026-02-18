## Frontend
- Verify each finding against the current code and only fix it if needed.

In @src/admin/components/StatusBadge.tsx around lines 19 - 26, Removing the docs_collected and bank_logged entries from the status mapping in StatusBadge.tsx causes existing records using those raw values to fall back to the default gray styling; either migrate all stored/status-producing code to the new values (docs_pending, bank_processing) and update any API responses or UI components that emit those statuses, or reintroduce the old keys (docs_collected, bank_logged) into the StatusBadge status mapping object with labels and className values that map to the new visual states so they remain supported during migration; check any code that writes or transforms statuses (APIs, mappers, seed/migration scripts) to ensure consistency with the StatusBadge fallback behavior.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/components/leads/AddLeadModal.tsx around lines 76 - 80, The loanAmount validation in AddLeadModal.tsx currently uses Number(formData.loanAmount) <= 0 which lets non-numeric strings pass; update the validation in the block that sets nextErrors.loanAmount to first parse the trimmed value (e.g., using Number or parseFloat), check that it is a finite number (!isNaN/Number.isFinite) and then ensure it is > 0, producing the existing error messages if it is non-numeric or <= 0; reference the formData.loanAmount field and the nextErrors.loanAmount assignment so you replace the current conditional with a numeric-validated check.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/components/leads/LeadsFilters.tsx around lines 30 - 44, Add an accessible label for the search input in LeadsFilters by either adding a visually-hidden <label> associated via an id or by adding an aria-label (e.g., aria-label="Search leads by name, phone, or ID") to the input that uses searchQuery and setSearchQuery; also mark the decorative SVG as hidden from assistive tech by setting aria-hidden="true" and focusable="false" so screen readers ignore it. Ensure the input keeps its existing props (value={searchQuery}, onChange={(e) => setSearchQuery(e.target.value)}) and styling while the label or aria-label provides persistent accessibility.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/components/leads/LeadsFilters.tsx around lines 61 - 74, The select in LeadsFilters.tsx using state variables statusFilter and setStatusFilter needs an accessible name and should render options from a shared constant instead of hardcoded strings: add an associated label element (or aria-label/aria-labelledby) tied to the select to provide a screen-reader accessible name, and replace the inline <option> values with a map over a new LEAD_STATUS_LABELS (or reuse a loanTypeLabels-style map) keyed by LeadStatus so options are derived from that constant to keep UI and the LeadStatus type in sync.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/components/leads/LeadsFilters.tsx around lines 49 - 58, The select for loan type (controlled by loanTypeFilter and setLoanTypeFilter and populated from loanTypeLabels) is missing an accessible name; add an explicit label or ARIA attribute (e.g., a visually-hidden <label> linked via htmlFor/id or an aria-label/aria-labelledby on the select) so screen readers announce the purpose of the dropdown; ensure the id on the select matches the label's htmlFor or that aria-labelledby references the label element.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/components/leads/LeadsTable.tsx around lines 10 - 21, The formatCurrency function currently returns a misleading "₹0.00" on any formatting error; update formatCurrency to first validate the input (check for undefined/null, typeof number, and !isNaN(amount), and decide how to treat negative values), and if validation fails return a clear sentinel like "₹—" or "Invalid" instead of "₹0.00"; also keep a concise console/processLogger warning that includes the original invalid value and the thrown error for observability. Use the formatCurrency function name to locate and change the behavior.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/components/leads/LeadsTable.tsx around lines 99 - 137, The status dropdown stays open because there is no click-outside handler; add a useRef (e.g., statusDropdownRef) to the dropdown container (the parent div around the button + conditional menu), then in a useEffect attach a document click listener that checks if the event target is outside statusDropdownRef.current and, if so, calls setShowStatusDropdown(null); ensure the effect cleans up the listener on unmount and also depends on showStatusDropdown so it only listens when a dropdown is open; keep existing handlers (getNextStatuses, onStatusUpdate) unchanged.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/data/placeholderData.ts around lines 632 - 643, The export auditLogs was commented out causing a breaking change for consumers; either restore the export (uncomment the auditLogs array) or, if removal is intentional, remove the now-unused AuditLog type import and update callers to stop importing auditLogs; alternatively add a TODO comment explaining why auditLogs is disabled and reference the AuditLog type so reviewers know to also clean up its import.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/hooks/useLeadsManager.ts around lines 160 - 174, The phone filter in the filteredLeads predicate uses searchQuery instead of the lowercased query variable, creating an inconsistency; update the phone check inside the filter to use query (i.e., compare (lead.customerPhone ?? '').toLowerCase().includes(query)) so all three search checks consistently use the same normalized variable (searchQuery -> query) in the filteredLeads function.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/pages/AdminDashboard.tsx around lines 215 - 218, The "Leads" StatsCard currently shows recentLeads.length (recentLeads) which is capped by getLeads({ limit: 5 }, true) and thus misrepresents total leads; update the component to either fetch and use the API's total count (e.g., expose and pass totalLeadsCount from the getLeads response into the StatsCard's value) or rename the card/title to "Recent Leads" to reflect it shows only recent items (modify the StatsCard usage where title="Leads" and value={recentLeads.length} accordingly), ensuring the change references recentLeads, getLeads, and StatsCard.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/pages/AdminDashboard.tsx at line 95, The mapping assigns loanAmount: lead.loanAmount directly, which can be undefined/null and later cause formatCurrency to produce NaN; update the assignment in AdminDashboard (the object where loanAmount is set) to provide a safe numeric fallback (e.g., coalesce to 0 or parse to Number with a default) and/or validate before passing to formatCurrency so loanAmount is always a finite number (use the unique symbol loanAmount and the formatCurrency call sites to locate and fix both mapping and consumption).

- Verify each finding against the current code and only fix it if needed.

In @src/admin/pages/AdminDashboard.tsx around lines 19 - 28, The DashboardStats interface's field names (DashboardStats) are misleading because the object is actually populated with user metrics (newUsersThisWeek, totalUsers, verifiedUsers, activeUsers); rename the interface fields to reflect user metrics (e.g., newUsersThisWeek, totalUsers, verifiedUsers, activeUsers, pendingReview, leadsByLoanType or other accurate names) and update every place that constructs or consumes the DashboardStats object in AdminDashboard (including the code that currently assigns values to leadsToday, leadsMTD, loansApprovedMTD, loansDisbursedMTD) to use the new field names and types; ensure any props, destructuring, and usages are updated to the new identifiers to keep type checks passing.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/pages/AuditLogsPage.tsx around lines 76 - 78, The stats cards currently compute loginEvents, securityEvents, and authEvents from the paginated logs array (logs) while pagination.total shows the full dataset, causing inconsistent scopes; either change the UI labels to explicitly state "on this page" for the three card labels (loginEvents, securityEvents, authEvents) or modify the data flow so the backend returns aggregated counts (e.g., include fields like totalLoginEvents, totalSecurityEvents, totalAuthEvents in the API response) and use those totals instead of filtering logs; locate the calculations of loginEvents, securityEvents, authEvents and where pagination.total is displayed and implement one of these two fixes consistently for all occurrences of these computed metrics.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/pages/AuditLogsPage.tsx around lines 47 - 74, The fetch logic in fetchLogs (used in useEffect) fires on every keystroke and doesn’t cancel in-flight requests; wrap the searchQuery with a debounce (300–500ms) so fetchLogs is only called after the user stops typing and add request cancellation using AbortController when calling getAuditLogs to abort previous requests on filter changes; update fetchLogs to accept an AbortSignal (or create the controller inside fetchLogs), ensure the controller is stored/cleared between calls, and pass the signal to getAuditLogs so stale responses cannot overwrite newer state (refer to fetchLogs, useEffect and getAuditLogs).

- Verify each finding against the current code and only fix it if needed.

In @src/admin/pages/DocumentsPage.tsx at line 170, The fallback value 'uploaded' used for (updatedDoc.status as DocumentStatus) is likely not a member of the DocumentStatus union and will cause type/filtering mismatches; change the fallback to one of the valid statuses used elsewhere (e.g., 'pending', 'verified', or 'rejected') or update the DocumentStatus definition to include 'uploaded' if that state is intentional—specifically update the expression around updatedDoc.status in DocumentsPage to use a valid DocumentStatus fallback (or adjust the DocumentStatus type) so filtering/stats logic that expects 'pending'|'verified'|'rejected' remains correct.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/pages/DocumentsPage.tsx around lines 149 - 177, handleUploadFile currently updates only the addedClients state so uploads for leads coming from leadsWithDocs (original leads) never update the UI; update the handler to also merge the updated document into the primary lead state source (either update the leads/leadsWithDocs copy or maintain and merge an uploadedDocs map) so UI reads the merged document set when rendering. Specifically, in handleUploadFile after a successful upload (response.data.document) perform the same document replacement on the leads/leadsWithDocs representation (or set a new uploadedDocs keyed by leadId+docId) and ensure the render path combines addedClients, leadsWithDocs (or leads) and uploadedDocs so the new fileName/uploadedBy/uploadedAt/status/url are shown across both sources; you can also opt to refetch leads data after success instead of local merging if simpler.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/pages/UsersPage.tsx at line 87, The current fallback id assignment in UsersPage (id: user._id || user.id || '') can produce duplicate React keys when multiple users lack IDs; update the id fallback to guarantee uniqueness (e.g., generate a stable unique id from user data or a UUID) and ensure the list rendering uses that unique value as the key in the map (or as a last resort use the map index only in the render loop). Locate the id assignment for the user object (the id: user._id || user.id || '' line) and the map/rendering where key is set (around the key usage at the list render), replace the empty-string fallback with a unique-generator/fallback and/or fall back to the item index only in the map callback so no two items share the same React key.

- Verify each finding against the current code and only fix it if needed.

In @src/admin/pages/UsersPage.tsx around lines 85 - 86, In UsersPage.tsx inside the block that handles response.success, guard the mapping over response.data.users by first verifying response.data.users is an array (e.g., Array.isArray(response.data?.users)) or provide a safe fallback; then assign apiUsers from that array (or an empty array) before mapping to the ApiUser shape so .map() cannot be invoked on undefined or non-array values and downstream code remains safe.

- Verify each finding against the current code and only fix it if needed.

In @src/api/adminApi.ts around lines 116 - 121, The getAdminPartners return type uses unknown[]; define a concrete Partner interface (e.g., export interface Partner { /* id, name, email, status, createdAt, etc. matching API shape */ }) similar to AdminUser, update the function signature in getAdminPartners to return Promise<ApiResponse<{ partners: Partner[] }>>, and replace any other occurrences expecting unknown with Partner so callers get proper type safety; add the Partner interface to the same module or a shared types file and ensure imports/exports are updated accordingly.

- Verify each finding against the current code and only fix it if needed.

In @src/api/apiClient.ts around lines 75 - 84, When isRefreshing is true, the promise created in the token refresh branch (inside the interceptor where isRefreshing, subscribeTokenRefresh and originalRequest are used) currently only stores resolve callbacks via subscribeTokenRefresh and ignores the captured _reject, causing queued requests to hang if refresh fails; change the subscribeTokenRefresh (and underlying refreshSubscribers/onTokenRefreshed mechanism) to accept and store both resolve and reject callbacks, call the resolve with the new token on success and call every stored reject with the refresh error on failure (also clear refreshSubscribers after invoking), and update the promise creation to pass both resolve and _reject so apiClient(originalRequest) is resolved on success or rejected on refresh failure.

- Verify each finding against the current code and only fix it if needed.

In @src/api/documentsApi.ts around lines 57 - 61, In the axios request config in src/api/documentsApi.ts remove the manual headers entry that sets 'Content-Type': 'multipart/form-data' (the object shown as headers: { 'Content-Type': 'multipart/form-data' }) so the browser/axios can automatically set the Content-Type with the required boundary; simply omit that header (or the headers field) on the FormData POST request and update any tests/mocks that assert the exact content-type if necessary.

- Verify each finding against the current code and only fix it if needed.

In @src/components/BankCard.tsx around lines 4 - 14, The BankCardProps interface declares a required id property that is not used in the BankCard component; either remove id from BankCardProps or start using it where meaningful. To fix, update the BankCardProps interface by deleting id if it’s unnecessary, or modify the BankCard component to accept/destructure id and apply it (for example as a data-id attribute on the root element, pass it into analytics/event handlers like onApply, or use it as a stable key when rendering lists). Ensure the change is made to the BankCardProps interface and the BankCard component signature so types remain consistent.

- Verify each finding against the current code and only fix it if needed.

In @src/components/BankCard.tsx around lines 71 - 74, The processing fee area in the BankCard component (the div rendering {processingFeeText} and <ChevronDown />) is styled as interactive but lacks behavior—either implement proper expand/collapse or make it non-interactive: to implement, add local state (e.g., isFeeOpen) in BankCard, an onClick handler on the container to toggle it, render expanded content conditionally, and add accessibility attributes (role="button", tabIndex={0}, onKeyDown handling Enter/Space) and aria-expanded; alternatively, if it should not be interactive remove the cursor-pointer class and the <ChevronDown /> icon and ensure no misleading affordance remains.

- Verify each finding against the current code and only fix it if needed.

In @src/components/Navbar.tsx around lines 10 - 42, The effect currently lists isVisible in its dependency array causing useEffect to tear down and recreate the scroll listener on every visibility change which breaks the RAF throttle; update the effect to not depend on isVisible (use an empty dependency array) and change updateVisibility to call setIsVisible(prev => { const currentScrollY = window.scrollY; const goingDown = currentScrollY > lastScrollY.current; lastScrollY.current = currentScrollY; return goingDown ? (prev ? false : prev) : (prev ? prev : true); }) (i.e., use functional setState to read previous value and only flip when direction changes), keep ticking and rafId as local variables inside useEffect, and leave handleScroll/requestAnimationFrame logic unchanged so the listener is stable and throttling works.

- Verify each finding against the current code and only fix it if needed.

In @src/components/PrefetchLink.tsx around lines 12 - 16, The spread of {...props} after onMouseEnter/onFocus in the PrefetchLink component lets consumer handlers overwrite prefetchRoute; fix by destructuring onMouseEnter and onFocus from props inside PrefetchLink, create merged handlers (e.g., mergedOnMouseEnter and mergedOnFocus) that call prefetchRoute(path) and then invoke the original prop handlers if present (preserving event argument and this-context), and pass those merged handlers plus the rest of props to <Link>; reference PrefetchLink, prefetchRoute, onMouseEnter, onFocus and ensure {...rest} is spread last.

- Verify each finding against the current code and only fix it if needed.

In @src/components/ProtectedRoute.tsx around lines 46 - 51, The current ProtectedRoute component returns <Navigate to="/login" ... /> when an authenticated user lacks the required role, which risks redirect loops and poor UX; change the behavior in the ProtectedRoute component (the block checking allowedRoles.includes(user.role)) to either redirect to a dedicated forbidden page (e.g., Navigate to "/forbidden" with the original location in state) or, if the intent is to force an account switch, perform an explicit logout action first and then Navigate to "/login" with a switchAccount flag in state (e.g., state: { from: location, switchAccount: true }) and ensure the Login component respects switchAccount by clearing auth before showing the login form.

- Verify each finding against the current code and only fix it if needed.

In @src/components/application-form/LoanDetails.tsx around lines 36 - 58, When `loanType` changes the existing `loanSubType` can become invalid; update the change handling so that when the select for `loanType` (the field name `loanType` handled by `handleChange`) is changed you also reset `formData.loanSubType` to an empty string (`""`). Implement this in the parent component's state update logic (the same place that updates `formData.loanType`) so that selecting a new `loanType` clears `loanSubType` before rendering the `LoanDetails` options derived from `serviceCategories`.

- Verify each finding against the current code and only fix it if needed.

In @src/components/application-form/SuccessPopup.tsx around lines 19 - 21, The focusableElements query in SuccessPopup.tsx (the modalRef.current.querySelectorAll used to build the focus trap) currently can return disabled controls; update the selector to explicitly exclude disabled elements (e.g., add :not([disabled]) to inputs, buttons, selects, textareas and elements with tabindex) so that modalRef and the focus trap logic only consider truly focusable, interactive elements; ensure the change is applied where focusableElements is defined and used to manage focus within the SuccessPopup component.

- Verify each finding against the current code and only fix it if needed.

In @src/components/application-form/SuccessPopup.tsx around lines 64 - 75, The modal currently renders no focusable controls when onClose is undefined, trapping keyboard users; update the SuccessPopup component so that if onClose is not provided it still renders a focusable fallback (e.g., a "Got it" button) wired to an internal close handler, ensure the existing closeButtonRef is attached to that fallback and that the Escape key handler calls the same internal close routine (so onClose ? onClose() : internalClose()), and keep the original close button behavior when onClose is present.

- Verify each finding against the current code and only fix it if needed.

In @src/components/onboarding/StepBasicIdentity.tsx around lines 158 - 172, The conditional uses a stale render-time otpError after awaiting verifyOTP; remove that redundant check and fallback error-setting and rely on the hook's onError to set otp errors instead. In handleVerifyOTP (and similarly handleResendOTP) delete the if (!otpError) { setErrors(...) } branch, ensure setIsVerifying(false) (or appropriate loading state) is set on both success and failure paths, and keep error handling centralized in the hook's onError; reference: handleVerifyOTP, handleResendOTP, and otpError.

- Verify each finding against the current code and only fix it if needed.

In @src/components/shared/OptimizedImage.tsx around lines 79 - 81, The placeholder div inside the OptimizedImage component is incorrectly reusing the image's className (variable className) which can introduce image-specific layout utilities like object-cover or aspect-ratio onto a plain div; update the placeholder rendering so it does NOT include className (keep just "absolute inset-0 bg-gray-200 animate-pulse") or introduce a separate placeholderClassName prop if custom styling is required; locate the conditional that references isLoaded, hasError and className and remove className from the placeholder div to prevent layout issues.

- Verify each finding against the current code and only fix it if needed.

In @src/components/shared/OptimizedImage.tsx around lines 31 - 62, The prefetch useEffect (which builds compositeSource and creates img with onLoad/onError) causes false errors because it probes AVIF first regardless of browser support and duplicates state updates alongside the real <img> handlers (handleLoad/handleError), so remove the prefetching effect entirely (delete the useEffect block that references compositeSource, img, onLoad, onError, cancelled, and img.src) and rely solely on the existing handleLoad and handleError on the actual <img> element to update setIsLoaded and setHasError; alternatively, if prefetching is required, gate it by format-support detection before creating the Image() so it never probes unsupported formats.

- Verify each finding against the current code and only fix it if needed.

In @src/components/shared/Skeleton.tsx at line 18, The component currently does Array(count).fill(0) which will throw for negative, non-integer, or non-numeric prop values; sanitize the incoming count prop first (e.g., coerce to Number, clamp to a minimum of 0, and floor to an integer) and use that sanitized value when creating the skeletons array (replace uses of Array(count) with Array/similar based on the sanitizedCount). Update any references to `count` in this file (the `skeletons` creation and render logic) to use the sanitized variable to guarantee no RangeError occurs.

- Verify each finding against the current code and only fix it if needed.

In @src/data/loanProducts.tsx at line 1, Replace the corrupted character in the top-of-file comment that currently reads "Barrel re-export � keeps existing import paths working." with a proper punctuation character (use an em-dash "–" or a simple hyphen "-") so the comment becomes "Barrel re-export – keeps existing import paths working." or "Barrel re-export - keeps existing import paths working."; update the comment text in src/data/loanProducts.tsx accordingly.

- Verify each finding against the current code and only fix it if needed.

In @src/data/mockBanks.ts around lines 196 - 223, For bank id 'B006' (SBI) the supportedLoanTypes array and commissionRates array are inconsistent: commissionRates contains an entry with loanType 'car_loan' but supportedLoanTypes does not. Fix by making them consistent—either add 'car_loan' to the supportedLoanTypes array or remove the 'car_loan' object from the commissionRates array (update the supportedLoanTypes or commissionRates definitions accordingly so both reflect the same set of loan types).

- Verify each finding against the current code and only fix it if needed.

In @src/hooks/useFetch.ts at line 46, The isMounted ref is being set only at creation which breaks under React 18 Strict Mode; update the useFetch hook so isMounted is set to true inside the effect body and set to false in that effect's cleanup. Specifically, in useFetch set isMounted (the useRef variable) to true at the start of the relevant useEffect and set it to false in the returned cleanup, and adjust any code in the fetch/data-handling effect (the effect that guards state updates with isMounted.current — e.g., the fetchData/promise resolution handlers around lines where isMounted is checked) to rely on that corrected lifecycle handling.

- Verify each finding against the current code and only fix it if needed.

In @src/hooks/useForm.ts around lines 100 - 112, The handleBlur callback marks the field touched and runs validateField but only sets an error when one exists, so cleared validations persist; update handleBlur to also clear the error when validateField(name) returns null/undefined — after computing error call setErrors with a functional update that either removes the name key from the errors object (e.g., omit the property) or sets it to undefined, while preserving other errors; reference the handleBlur function, validateField, setErrors, setTouched, and setHasValidated when making the change.

- Verify each finding against the current code and only fix it if needed.

In @src/hooks/useForm.ts around lines 148 - 153, resetForm currently resets values, errors, touched and isSubmitting but leaves hasValidated true; update the useCallback for resetForm to also call setHasValidated(false) so the form returns to the "not yet validated" state, and include setHasValidated in the dependency array (or ensure dependencies reflect this change) — target the resetForm function and the setHasValidated setter from the same hook.

- Verify each finding against the current code and only fix it if needed.

In @src/hooks/useLocalStorage.ts around lines 27 - 40, The synthetic StorageEvent dispatched in useLocalStorage's setValue only includes key, causing event.newValue to be null and triggering a reset; change the dispatch in setValue to include newValue (JSON.stringify(valueToStore)), oldValue (the previous stored value read from window.localStorage or JSON.stringify(prev)), and storageArea: window.localStorage so handleStorageChange sees the correct newValue/oldValue instead of null. Locate setValue in useLocalStorage and update the StorageEvent init object to provide newValue, oldValue, and storageArea (use stringified values) when calling window.dispatchEvent.

- Verify each finding against the current code and only fix it if needed.

In @src/hooks/useMsg91.ts around lines 30 - 45, The loadOtpScript function's attempt creates new <script> elements with the same scriptId on retries but never removes the failed element and also never surfaces a final failure; update attempt to remove the failed script element from the DOM on onerror (e.g., document.head.removeChild(s) or remove by id) before incrementing i and retrying, ensure you don't reuse the same id if you prefer (set s.id only after successful load or remove previous by scriptId), and add a final failure path that logs or rejects a promise when i >= urls.length so callers of loadOtpScript get visible feedback.

- Verify each finding against the current code and only fix it if needed.

In @src/hooks/useMsg91.ts around lines 66 - 70, The configuration object in useMsg91 (const configuration) currently contains hard-coded credentials (widgetId, tokenAuth); move these values to environment variables (use appropriate client-exposed names like NEXT_PUBLIC_MSG91_WIDGET_ID and NEXT_PUBLIC_MSG91_TOKEN or your app's env convention) and read them into configuration.widgetId and configuration.tokenAuth instead of inlining literals; add a runtime validation in the same hook (check configuration.widgetId and configuration.tokenAuth) and if missing call console.error('MSG91 credentials not configured') and return false (or falsey) so initialization aborts—update any references to configuration in the hook (e.g., exposeMethods/identifier logic) to use the env-backed values.

- Verify each finding against the current code and only fix it if needed.

In @src/hooks/useMsg91.ts around lines 100 - 104, The catch in sendOtp (in useMsg91.ts) currently logs the error then returns true, which hides failures; change the method to return a structured result or propagate the error instead: update sendOtp to return a result object (e.g., { success: boolean, sent?: boolean, error?: Error | string }) and in the catch populate success:false and error with the caught error (and sent: true/false if you can infer it), or rethrow the error if callers expect exceptions; also replace the unconditional return true in the catch with the new failure result and add a warning-level log that the send state is uncertain.

- Verify each finding against the current code and only fix it if needed.

In @src/hooks/usePagination.ts around lines 84 - 91, Validate the incoming total in setTotalItems: ensure it's a finite, non-negative integer (or clamp to 0 if invalid) before calling setTotalItemsState and recomputing pages; e.g., in setTotalItems (the callback that currently calls setTotalItemsState and setCurrentPage) coerce total to a safe value like const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0, then use safeTotal for setTotalItemsState(safeTotal) and for computing newTotalPages with pageSize so NaN/negative/Infinity cannot corrupt endIndex or page calculations.

- Verify each finding against the current code and only fix it if needed.

In @src/hooks/usePagination.ts around lines 40 - 47, The hook currently validates initialPageSize but not initialPage, so compute a validatedInitialPage (e.g., if !Number.isFinite(rawInitialPage) or rawInitialPage < 1 then 1, else Math.floor(rawInitialPage)), then clamp it to the current totalPages (calculate totalPages via your existing totalItems/pageSize logic) so it cannot exceed the maximum page; initialize currentPage with this validated value (replace useState(initialPage) with useState(validatedInitialPage)) and update the reset function to setCurrentPage to the same validated/clamped value rather than the raw initialPage.

- Verify each finding against the current code and only fix it if needed.

In @src/pages/BestOffers.tsx around lines 84 - 97, The catch block in handleApply currently shows a success-style message on updatePreferredBank failure, which is misleading; update the catch in handleApply (and references to updatePreferredBank and leadId) to log the error and present a distinct failure alert (e.g., "Failed to record your preference — please try again" or include error.message) instead of "Application started for..."; ensure the success alert remains only after a successful await and consider adding a retry option or guidance in the error alert.

- Verify each finding against the current code and only fix it if needed.

In @src/pages/BestOffers.tsx around lines 36 - 40, The calculateEMI function can divide by zero when tenureMonths is 0 (especially in the r === 0 branch); add a guard at the top of calculateEMI to handle non-positive tenureMonths (e.g., return a sensible default or an error string) before computing r, and ensure both branches (r === 0 and r !== 0) never perform division by tenureMonths or the EMI denominator when tenureMonths <= 0; update callers if needed to handle the returned default/error value from calculateEMI.

- Verify each finding against the current code and only fix it if needed.

In @src/partner/pages/BankLoanTypesPage.tsx around lines 76 - 81, The back button rendering the ChevronLeft icon in BankLoanTypesPage.tsx lacks an accessible label; update the button (the element with onClick={() => navigate('/partner/bank-offers')}) to provide an accessible name by adding either an aria-label (e.g., aria-label="Go back to bank offers") or an inline visually-hidden text node (e.g., a span with screen-reader-only class containing "Back" or "Go back") so screen readers can announce the button purpose while keeping the icon visual intact.

- Verify each finding against the current code and only fix it if needed.

In @src/partner/pages/BankLoanTypesPage.tsx around lines 289 - 347, The map over loanTypesByCategory returns a shorthand fragment (<>) so the outer element has no key; move the existing category key from the inner <tr> to the fragment by replacing the shorthand fragment with a keyed React.Fragment (use React.Fragment with key={`cat-${category}`}) while keeping each loanType row's key (key={loanType}) intact so both the category group and individual rows are uniquely keyed.

- Verify each finding against the current code and only fix it if needed.

In @src/partner/pages/BankOffersPage.tsx around lines 173 - 174, The hardcoded "Up to 2.5%" text in the BankOffersPage component can be misleading; update the JSX in BankOffersPage.tsx to compute and display the actual maximum commission from your offers data (e.g., derive maxCommission = Math.max(...offers.map(o => o.commission || 0)) and render `Up to {maxCommission}%`) or, if data isn't available, change the copy to an explicit example label like "Example: Up to 2.5%" so users know it's not definitive; locate the paragraph element currently rendering "Up to 2.5%" and replace it with the computed value or clarified copy, using the offers/offer.commission field present in the component.

- Verify each finding against the current code and only fix it if needed.

In @src/partner/pages/BankOffersPage.tsx around lines 296 - 314, The table is fabricating per-loan-type rates by applying arbitrary offsets to offer.interestRateMin; update the rendering in BankOffersPage.tsx to use real per-loan-type rate fields (e.g., replace expressions like offer.interestRateMin - 2 with the actual property such as offer.interestRates?.homeLoan or offer.interestRates?.home_loan) and only display a rate when that specific field exists, otherwise show '—' (or hide the column if no offers provide per-type rates); if your data model doesn't include per-loan-type rates yet, remove these computed offsets and render a single published rate or a placeholder instead until backend fields (e.g., offer.interestRates) are available.

- Verify each finding against the current code and only fix it if needed.

In @src/partner/pages/PartnerDashboard.tsx around lines 32 - 33, dashboardStats currently computes totalLeads with stats?.total || leads.length which can mix server-side totals and client-side subset causing inconsistent KPIs; update dashboard logic to use a single source of truth: prefer stats.total when it represents the canonical server-side count and ensure all UI components (the KPI in dashboardStats, the funnel visualization, and any derived values) consistently consume stats or the same paginated subset (e.g., use stats.total for "Total Leads" and pass leads.length explicitly to the funnel), or alternatively compute both values from leads only—adjust references to dashboardStats, totalLeads, stats, and leads so the displayed total and funnel counts use the same scope.

- Verify each finding against the current code and only fix it if needed.

In @src/partner/pages/ProfilePage.tsx around lines 61 - 66, The current useEffect always overwrites editData with partnerProfile on any refetch, losing unsaved user edits; change the effect to only initialize editData when there are no current edits (e.g., when editData is null/undefined or when a separate isEditing flag is false). In practice, update the effect that watches partnerProfile to check the current editData (or an isEditing state) and only call setEditData(partnerProfile) when the user has not started editing — reference the useEffect that reads partnerProfile and calls setEditData, and the local editData state (or add/consult an isEditing boolean) to avoid clobbering unsaved changes.

- Verify each finding against the current code and only fix it if needed.

In @src/partner/pages/ProfilePage.tsx around lines 47 - 56, Effect depends on the entire `user` object which can change identity each render and cause an infinite loop; change the dependency to stable primitives (e.g., `user?.id`) or memoize the selected fields and only run when they actually change, and only call `fetchLeads()` inside the user guard if leads are user-specific. Concretely, in the effect that currently references `useEffect` with `user, fetchProfile, fetchLeads`, replace the `user` dependency with `user?.id` (and/or `user?.firstName`, `user?.lastName`, `user?.email` if those drive the fetch), ensure `fetchProfile`/`fetchLeads` are stable (wrap in useCallback where defined) and move the unconditional `fetchLeads()` call into the `if (user?.id) { ... }` block when leads depend on the user.

- Verify each finding against the current code and only fix it if needed.

In @src/stores/authStore.ts around lines 144 - 150, The try/catch retry path in checkAuth leaves isAuthenticated true on early return (when hadInMemoryToken && wasAuthenticated && refreshCount < 3) which can produce a stale authenticated state; update the logic in checkAuth to either (a) set isAuthenticated to false before returning or (b) initiate an automatic retry by scheduling a short setTimeout that calls checkAuth again and increments refreshCount, and also ensure set({ isLoading: false, refreshCount: refreshCount + 1 }) is preserved; reference the hadInMemoryToken, wasAuthenticated, refreshCount variables and the set(...) call to locate the block and implement one of these fixes (or add a fallback timeout that auto-logs out if subsequent checkAuth isn’t invoked).

- Verify each finding against the current code and only fix it if needed.

In @src/stores/leadsStore.ts around lines 82 - 92, fetchLeads currently skips fetching based only on lastFetchedAt/leads and reuses a single inflight promise, ignoring the request-specific params and isAdmin, so different queries get stale or wrong results; update fetchLeads to include the request identity in cache and inflight checks by tracking lastFetchedParams and lastFetchedIsAdmin (or a serialized key) and comparing them with the incoming params/isAdmin (use deep equality or JSON.stringify on params) before returning early or reusing inflight; likewise, when a fetch completes successfully, store the params/isAdmin alongside lastFetchedAt/leads (and set/reset inflight appropriately) so subsequent calls correctly consider parameter differences while preserving force behavior and TTL via LEADS_CACHE_TTL.

- Verify each finding against the current code and only fix it if needed.

In @src/stores/partnerProfileStore.ts around lines 54 - 71, The module-level inflight promise is shared across all users causing cross-user deduplication; change inflight to a map keyed by userId (e.g., inflightByUser: Map<string, Promise<void>>) and update fetchProfile to look up/assign inflightByUser.get(userId) and inflightByUser.set(userId, promise) instead of the single inflight variable, and clear inflightByUser.delete(userId) in the promise finally block; alternatively, if the store is intended to be single-user only, add a clear comment stating that fetchProfile assumes a single authenticated user and leave behavior as-is. Ensure all refs to inflight in this module (including the check "if (inflight) return inflight;") are replaced to use the keyed map and the userId parameter.

- Verify each finding against the current code and only fix it if needed.

In @src/utils/routePrefetch.ts around lines 38 - 41, The current logic calls importFn() without handling its returned Promise and marks path as prefetched immediately, causing unhandled rejections and preventing retries on failure; change the flow so you only add path to the prefetched Set after the import Promise fulfills and attach a .catch handler to the import Promise to handle errors (log or swallow) and ensure failed imports are not left marked as prefetched (remove from prefetched or avoid adding it on failure) — update the block that references prefetched, importFn, and path to use importFn().then(...) and .catch(...) so rejected dynamic imports are handled and can be retried.


## Frontend Phase-wise Implementation

### Phase 1: Auth, routing, and access-control correctness
- Complete frontend auth flow wiring (login/token exchange/storage/refresh) and role-guard enforcement.
- Fix `ProtectedRoute` unauthorized behavior to avoid redirect loops and improve forbidden handling.
- Address auth-store stale state/retry behavior in `src/stores/authStore.ts`.
- Ensure API refresh queue rejects pending requests correctly on refresh failure.

### Phase 2: High-impact UX and data integrity fixes
- Fix misleading success/failure messaging in `src/pages/BestOffers.tsx`.
- Prevent invalid EMI math/division-by-zero in `calculateEMI`.
- Align dashboard KPIs to a single data source (`stats.total` vs `leads.length`) for consistency.
- Fix profile page effects that overwrite unsaved edits or retrigger unnecessarily.

### Phase 3: Accessibility and interaction reliability
- Add accessible labels for search/select/back-icon controls across admin/partner pages.
- Fix modal focus trap behavior in `SuccessPopup` (exclude disabled elements, fallback focusable control).
- Add click-outside closing for dropdowns and remove misleading interactive affordances where needed.
- Ensure keyboard/ARIA behavior is correct for interactive controls.

### Phase 4: State management and async robustness
- Fix fetch/cache identity issues in `src/stores/leadsStore.ts` and per-user inflight handling in `partnerProfileStore`.
- Add debounce + cancellation in log/document/admin fetch flows where needed.
- Fix `useFetch` mount lifecycle handling for React Strict Mode.
- Harden `routePrefetch` to handle rejected imports and retry correctly.

### Phase 5: Form, validation, and hook correctness
- Fix numeric validation gaps (`loanAmount`, pagination totals/initial page, skeleton count sanitization).
- Fix `useForm` error-clearing/reset behavior (`handleBlur`, `resetForm`).
- Fix `useLocalStorage` synthetic storage event payload (`newValue`, `oldValue`, `storageArea`).
- Harden `useMsg91` script loading retries, env-driven config, and sendOtp error results.

### Phase 6: Data mapping, display accuracy, and cleanup
- Remove fabricated display values (hardcoded commissions, artificial interest-rate offsets).
- Resolve mapping inconsistencies (`mockBanks` loan type mismatch, status fallbacks, key uniqueness issues).
- Clean up unsafe defaults/corrupted comments and type-safety gaps in API/props/interfaces.
- Final pass for regression tests (unit/component) on updated hooks, stores, and key pages.

### Execution Order Recommendation
1. Security/auth + routing fixes
2. State/async correctness fixes
3. Accessibility and UX fixes
4. Data/display consistency and cleanup
5. Regression tests and release validation
