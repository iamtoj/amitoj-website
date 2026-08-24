export const LOCAL_BASE_URL = 'http://127.0.0.1:4327';

const LOCAL_WEB_SERVER = Object.freeze({
  command: 'ASTRO_PREVIEW_BACKGROUND=0 npm run preview -- --host 127.0.0.1 --port 4327',
  url: LOCAL_BASE_URL,
  reuseExistingServer: false,
});

function remoteVercelUrl(rawValue) {
  const value = rawValue?.trim();
  if (!value) return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('PLAYWRIGHT_BASE_URL must be a valid absolute URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('PLAYWRIGHT_BASE_URL must use HTTPS');
  }
  if (!url.hostname.endsWith('.vercel.app')) {
    throw new Error('PLAYWRIGHT_BASE_URL must name a Vercel host');
  }
  if (url.username || url.password) {
    throw new Error('PLAYWRIGHT_BASE_URL must not contain credentials');
  }
  if (url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PLAYWRIGHT_BASE_URL must be a root-level Vercel URL');
  }

  return url.origin;
}

export function resolvePlaywrightTarget(environment = process.env) {
  const remote = remoteVercelUrl(environment.PLAYWRIGHT_BASE_URL);
  if (remote) {
    return {
      baseURL: remote,
      isRemoteVercelHost: true,
      webServer: undefined,
    };
  }

  return {
    baseURL: LOCAL_BASE_URL,
    isRemoteVercelHost: false,
    webServer: { ...LOCAL_WEB_SERVER },
  };
}

export function shouldBlockExternalPost(requestUrl, method, siteBaseURL) {
  if (method.toUpperCase() !== 'POST') return false;

  try {
    return new URL(requestUrl).origin !== new URL(siteBaseURL).origin;
  } catch {
    return true;
  }
}

export function assertNavigationConfined({ finalUrl, redirected, requestedPath, siteBaseURL }) {
  if (redirected) {
    throw new Error(`Remote route ${requestedPath} must not redirect`);
  }

  const expected = new URL(requestedPath, siteBaseURL);
  const actual = new URL(finalUrl);
  if (actual.origin !== expected.origin || actual.pathname !== expected.pathname
    || actual.search !== expected.search || actual.hash !== expected.hash) {
    throw new Error(
      `Remote route ${requestedPath} escaped its verified target: ${actual.toString()}`,
    );
  }
}
