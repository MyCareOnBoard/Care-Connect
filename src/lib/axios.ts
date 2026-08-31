import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getIdToken } from '@/utils/auth';
import { auth } from '@/lib/firebase';
import { Routes } from "@/routes/constants";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

      const environment = import.meta.env.VITE_API_ENVIRONMENT || 'staging';
      config.headers['x-environment'] = environment;

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
            try {
              cachedToken = null;
              const newToken = await getCachedIdToken(true);
              if (newToken && error.config) {
                error.config.headers = error.config.headers ?? {};
                error.config.headers.Authorization = `Bearer ${newToken}`;
                return instance(error.config);
              }
            } catch {
              // fall through to redirect
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
    const environment = import.meta.env.VITE_API_ENVIRONMENT || 'staging';
    config.headers['x-environment'] = environment;

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
