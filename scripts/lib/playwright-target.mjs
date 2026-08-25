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

function vercelShareUrl(rawValue, remoteOrigin) {
  const value = rawValue?.trim();
  if (!value) return null;
  if (!remoteOrigin) {
    throw new Error('PLAYWRIGHT_VERCEL_SHARE_URL requires PLAYWRIGHT_BASE_URL');
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('PLAYWRIGHT_VERCEL_SHARE_URL must be a valid absolute URL');
  }

  if (url.origin !== remoteOrigin || url.pathname !== '/' || url.hash
    || url.username || url.password || url.port) {
    throw new Error('PLAYWRIGHT_VERCEL_SHARE_URL must be a root-level URL on PLAYWRIGHT_BASE_URL');
  }
  if (url.searchParams.size !== 1 || !url.searchParams.get('_vercel_share')) {
    throw new Error('PLAYWRIGHT_VERCEL_SHARE_URL must contain only a non-empty _vercel_share token');
  }

  return url.toString();
}

export function resolvePlaywrightTarget(environment = process.env) {
  const remote = remoteVercelUrl(environment.PLAYWRIGHT_BASE_URL);
  const shareURL = vercelShareUrl(environment.PLAYWRIGHT_VERCEL_SHARE_URL, remote);
  if (remote) {
    return {
      baseURL: remote,
      isRemoteVercelHost: true,
      shareURL,
      webServer: undefined,
    };
  }

  return {
    baseURL: LOCAL_BASE_URL,
    isRemoteVercelHost: false,
    shareURL: null,
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

export function traceModeForTarget(target) {
  return target.shareURL ? 'off' : 'retain-on-failure';
}

export function isExpectedPreviewConsoleError({
  isRemoteVercelHost,
  locationURL,
  message,
  route,
  siteBaseURL,
}) {
  if (!isRemoteVercelHost) return false;
  const routeURL = new URL(route, siteBaseURL).toString();
  if (route === '/404'
    && locationURL === routeURL
    && /^Failed to load resource: the server responded with a status of 404 \(\)$/.test(message)) {
    return true;
  }
  const toolbarMessage = /^Loading the script 'https:\/\/vercel\.live\/_next-live\/feedback\/feedback\.js' violates the following Content Security Policy directive: "[^"\r\n]+"\. Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback\. The action has been blocked\.$/;
  const toolbarLocation = !locationURL || locationURL === routeURL
    || locationURL.startsWith('https://vercel.live/_next-live/feedback/');
  return toolbarLocation && toolbarMessage.test(message);
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
