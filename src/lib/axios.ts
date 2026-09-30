import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getIdToken } from '@/utils/auth';
import { auth } from '@/lib/firebase';
import { Routes } from "@/routes/constants";

/** A request config carrying the one-retry marker the 401 handler sets. */
type RetryableConfig = InternalAxiosRequestConfig & { _retriedAfter401?: boolean };

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Which backend database every request is routed to, via the `x-environment` header.
 *
 * The header decides which Firestore database the API reads: "staging" gets the named
 * staging database, anything else gets the default one. That makes it the single most
 * consequential variable in the app, and it used to be resolved inline in two places with
 * a silent fallback — so an environment that had never set it read staging without
 * announcing it. Two apps disagreeing that way is invisible from the outside: the account
 * exists, the token verifies, and the API answers "User not found" about a user who is
 * plainly there, in the other database.
 *
 * The default stays "staging" deliberately. Flipping it to production would fix the
 * silence by pointing any deployment that forgot the variable at live data, which is worse
 * than the problem — a forgotten variable should leave you broken, not writing to
 * production. What changes is that it is now said out loud, once, at startup.
 */
export const API_ENVIRONMENT: string = import.meta.env.VITE_API_ENVIRONMENT || 'staging';

const API_ENVIRONMENT_IS_DEFAULTED = !import.meta.env.VITE_API_ENVIRONMENT;

// Logged once rather than warned per request. Answering "which database am I talking to"
// should take one glance at the console, not a comparison of two apps' network tabs.
console.info(
  API_ENVIRONMENT_IS_DEFAULTED
    ? `[api] environment "${API_ENVIRONMENT}" (defaulted — VITE_API_ENVIRONMENT is not set)`
    : `[api] environment "${API_ENVIRONMENT}"`,
);

const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

/**
 * Client for the merged `careconnectCore` function (jobs + profiles + connections + posts).
 * Same auth/env behaviour as `axiosClient`, just a different base so those four domains
 * hit one consolidated Cloud Function (one cold-start surface). Paths keep their
 * `/careconnectX` prefixes, e.g. `careconnectClient.get('/careconnectProfiles/:uid')`.
 */
export const careconnectClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/careconnectCore`,
  timeout: 60000,
});

export const axiosClientWithoutAuth: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

/**
 * Wait for Firebase auth to initialize
 * This prevents race conditions on page refresh
 */
let authInitPromise: Promise<void> | null = null;

const waitForAuthInit = (): Promise<void> => {
  if (authInitPromise) return authInitPromise;
  authInitPromise = new Promise((resolve) => {
    if (auth.currentUser !== null) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => { unsubscribe(); resolve(); }, 5000);
    const unsubscribe = auth.onAuthStateChanged(() => {
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    });
  });
  return authInitPromise;
};

/**
 * Cached Firebase ID token, keyed by the uid it was minted for.
 *
 * The uid is load-bearing, not bookkeeping. Without it, a token cached for one
 * user was reused after `auth.currentUser` changed — which broke signup for
 * anyone who landed with a restored session: `createUserWithEmailAndPassword`
 * switched the current user, but `POST /users` still carried the previous
 * user's token, so the server resolved the OLD uid, found that user's doc, and
 * returned 409 "User already exists". A page refresh cleared this module state,
 * which is why retrying after a refresh appeared to fix it.
 *
 * Keying by uid rather than subscribing to `onAuthStateChanged` because the
 * listener can fire after a request has already read the cache.
 */
let cachedToken: { uid: string; value: string; expiresAt: number } | null = null;

export const clearAuthCache = (): void => {
  cachedToken = null;
};

export const getCachedIdToken = async (forceRefresh = false): Promise<string | null> => {
  const uid = auth.currentUser?.uid ?? null;
  // Signed out: there is no token to serve, and certainly not a previous one.
  if (!uid) return null;

  if (
    !forceRefresh &&
    cachedToken &&
    cachedToken.uid === uid &&
    Date.now() < cachedToken.expiresAt - 60_000
  ) {
    return cachedToken.value;
  }

  // Forward `forceRefresh`: without it the 401 retry only bypassed this local
  // cache while Firebase happily returned its own cached token, so a retry
  // re-sent the same rejected credential.
  const token = await getIdToken(forceRefresh);
  if (token) {
    cachedToken = { uid, value: token, expiresAt: Date.now() + 55 * 60 * 1000 };
  }
  return token ?? null;
};

/**
 * Attach the shared auth request interceptor (cached Firebase token + x-environment)
 * and the 401-refresh response interceptor to an axios instance. The 401 retry re-issues
 * the request through the same `instance` so its base URL is preserved.
 */
const attachAuthInterceptors = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Wait for Firebase auth to initialize before getting token
      await waitForAuthInit();

      // Get Firebase ID token
      const token = await getCachedIdToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      config.headers['x-environment'] = API_ENVIRONMENT;

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      if (error.response) {
        switch (error.response.status) {
          case 401: {
            // One retry, and only one.
            //
            // A 401 that survives a freshly minted token is not a stale token: it is an
            // account the API will not accept — no `users` record in the database this
            // build points at, a revoked account, a wrong environment. Refreshing cannot
            // fix any of those, and the retry re-enters this same handler, so without a
            // guard it refreshes and retries forever. That loop hammers Firebase's token
            // endpoint and never reaches the redirect below, so the user sits on a
            // spinner instead of being told to sign in again.
            const retryable = error.config as RetryableConfig | undefined;
            if (retryable && !retryable._retriedAfter401) {
              try {
                cachedToken = null;
                const newToken = await getCachedIdToken(true);
                if (newToken) {
                  retryable._retriedAfter401 = true;
                  retryable.headers = retryable.headers ?? {};
                  retryable.headers.Authorization = `Bearer ${newToken}`;
                  return instance(retryable);
                }
              } catch {
                // fall through to redirect
              }
            }
            if (window.location.pathname !== Routes.auth.login) {
              window.location.href = Routes.auth.login;
            }
            break;
          }
          case 403:
            console.error('Access forbidden:', error.response.data);
            break;
          case 404:
            console.error('Resource not found:', error.response.data);
            break;
          case 500:
            console.error('Server error:', error.response.data);
            break;
          default:
            console.error('API error:', error.response.data);
        }
      } else if (error.request) {
        console.error('Network error:', error.request);
      } else {
        console.error('Error:', error.message);
      }

      return Promise.reject(error);
    }
  );
};

attachAuthInterceptors(axiosClient);
attachAuthInterceptors(careconnectClient);

axiosClientWithoutAuth.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.headers['x-environment'] = API_ENVIRONMENT;

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

export const setEnvironment = (env: string): void => {
  axiosClient.defaults.headers.common['x-environment'] = env;
  careconnectClient.defaults.headers.common['x-environment'] = env;
};

export default axiosClient;
