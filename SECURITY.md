# Security Audit and Best Practices Guide

**Site:** amitoj.co
**Framework:** Astro 4.16.0 (static site generator)
**Hosting:** Vercel
**Audit Date:** January 2026

---

## Executive Summary

The amitoj.co website has a **strong security posture** inherent to its architecture. As a fully static Astro site with no server-side rendering, database connections, or user authentication, the attack surface is minimal.

**Overall Risk Assessment: Low**

Key strengths:
- Static site generation eliminates most server-side vulnerabilities
- No user authentication or sessions
- No database connections
- Form handling delegated to Formspree (third-party service)
- No dynamic content rendering from user input
- No use of `set:html` or raw HTML injection

Areas for improvement:
- Add Content Security Policy headers
- Add additional security headers via Vercel configuration
- Implement Subresource Integrity for external resources
- Review dependency security practices

---

## Audit Findings

### 1. XSS (Cross-Site Scripting) Vulnerabilities

**Current State:** No vulnerabilities found

**Analysis:**
- All page content is statically generated at build time
- No `set:html` or `is:raw` directives used that could inject unsanitized HTML
- No `innerHTML`, `dangerouslySetInnerHTML`, `eval()`, or `document.write` in source files
- User input is only collected via the contact form, which submits directly to Formspree (external service)
- The mobile menu toggle script uses safe DOM methods (`classList.toggle`, `getAttribute`, `setAttribute`)

**Risk Level:** None

**Files Reviewed:**
- `/src/layouts/Layout.astro` - Safe DOM manipulation only
- `/src/pages/contact.astro` - Form posts to external Formspree endpoint
- All page files - No dynamic content injection

### 2. Injection Vulnerabilities

**Current State:** No vulnerabilities found

**Analysis:**
- No server-side code execution (static site)
- No database queries
- No file system operations from user input
- Photography page reads from filesystem at build time only, not runtime

**Risk Level:** None

### 3. Form Handling (Formspree Integration)

**Current State:** Acceptable, with recommendations

**Analysis:**
The contact form at `/src/pages/contact.astro` submits to Formspree:
```html
<form action="https://formspree.io/f/mlgjdrwp" method="POST">
```

**Strengths:**
- Form handling is delegated to Formspree, reducing attack surface
- Formspree handles spam protection, rate limiting, and data validation
- No sensitive data stored on site

**Concerns:**
- Formspree endpoint ID (`mlgjdrwp`) is exposed (unavoidable for client-side forms)
- No client-side validation (minor concern - Formspree handles server-side)
- No CSRF token (not needed - Formspree uses its own protection)

**Risk Level:** Low

**Recommendations:**
1. Enable Formspree's reCAPTCHA integration if spam becomes an issue
2. Consider adding `rel="noopener"` to any external links (already a best practice)

### 4. Content Security Policy (CSP)

**Current State:** No CSP headers configured

**Analysis:**
The site loads external resources:
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)
- Formspree (`formspree.io`)

Without CSP, the browser allows any scripts/styles to load.

**Risk Level:** Medium (not a vulnerability, but a missing defense layer)

**Recommendation:** Add CSP headers via `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; form-action https://formspree.io; frame-ancestors 'none'; base-uri 'self'"
        }
      ]
    }
  ]
}
```

### 5. Security Headers

**Current State:** No custom headers configured

**Analysis:**
Vercel provides some default headers, but additional hardening is recommended.

**Risk Level:** Low-Medium

**Recommended Headers:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### 6. External Resource Integrity

**Current State:** No Subresource Integrity (SRI)

**Analysis:**
Google Fonts are loaded via `@import` in CSS:
```css
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond...');
```

**Risk Level:** Low (Google is a trusted source)

**Recommendation:** SRI is difficult with Google Fonts due to dynamic CSS generation. Consider self-hosting fonts for maximum security:

1. Download fonts from Google Fonts
2. Place in `public/fonts/`
3. Reference locally in CSS

### 7. Exposed Secrets and Sensitive Data

**Current State:** No issues found

**Analysis:**
- `.gitignore` properly excludes `.env`, `.env.production`, `.env.local`
- No hardcoded API keys or secrets in source files
- Formspree form ID is intentionally public (required for client-side forms)
- No authentication credentials present

**Risk Level:** None

**Files Reviewed:**
- `/.gitignore` - Properly configured
- `/package.json` - No secrets
- All source files - No credentials

### 8. Dependency Security

**Current State:** Acceptable

**Analysis:**
The site has minimal dependencies:
```json
{
  "dependencies": {
    "@astrojs/check": "^0.9.0",
    "@astrojs/tailwind": "^5.1.0",
    "astro": "^4.16.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0"
  },
  "devDependencies": {
    "@types/node": "^25.0.10"
  }
}
```

**Risk Level:** Low

**Recommendations:**
1. Run `npm audit` regularly to check for vulnerabilities
2. Keep dependencies updated with `npm update`
3. Consider using `npm audit fix` for automatic patching
4. Add Dependabot or Renovate for automated dependency updates

### 9. File Exposure

**Current State:** Potential minor issue

**Analysis:**
The following files exist in the repository root:
- `setup-ssh.command` - Contains SSH key generation script (not secret data)
- `/scripts/` - Build and development scripts

These files are not served by Vercel (only `dist/` contents are deployed), but they exist in the repository.

**Risk Level:** Low

**Recommendation:** Ensure `.gitignore` is properly configured (currently is) and that the Vercel deployment only serves static assets.

### 10. HTTPS Enforcement

**Current State:** Handled by Vercel

**Analysis:**
Vercel automatically:
- Provides SSL certificates via Let's Encrypt
- Enforces HTTPS with automatic redirects
- Handles HTTP/2 and HSTS

**Risk Level:** None (handled by platform)

---

## Best Practices Checklist

### Implemented
- [x] Static site generation (no server-side vulnerabilities)
- [x] No user authentication required
- [x] No database connections
- [x] Form handling delegated to trusted third party
- [x] No raw HTML injection or unsafe DOM operations
- [x] Sensitive files excluded from version control
- [x] HTTPS enforcement via Vercel
- [x] Minimal dependency footprint

### Recommended
- [ ] Add Content Security Policy headers
- [ ] Add security headers (X-Frame-Options, etc.)
- [ ] Configure `vercel.json` with security headers
- [ ] Set up automated dependency scanning (Dependabot)
- [ ] Self-host Google Fonts for maximum control
- [ ] Add `rel="noopener noreferrer"` to external links
- [ ] Run `npm audit` as part of CI/CD

---

## Implementation Recommendations

### Priority 1: Add Security Headers (vercel.json)

Create `/vercel.json` in the project root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; form-action https://formspree.io; frame-ancestors 'none'; base-uri 'self'"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### Priority 2: Automated Dependency Scanning

Add to `package.json` scripts:
```json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix"
  }
}
```

Or create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

### Priority 3: External Link Security

Audit all external links and add `rel="noopener noreferrer"` where missing. Current links to review:
- Formspree form action (form element, not link - no action needed)
- Any future external links in essays or pages

### Priority 4: Consider Self-Hosting Fonts

1. Download EB Garamond from Google Fonts
2. Convert to WOFF2 format
3. Place in `public/fonts/`
4. Update `global.css`:

```css
@font-face {
  font-family: 'EB Garamond';
  src: url('/fonts/eb-garamond-v26-latin-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
/* Add additional weights as needed */
```

---

## Ongoing Security Maintenance

### Monthly
- Run `npm audit` to check for dependency vulnerabilities
- Review Formspree dashboard for unusual activity

### Quarterly
- Update all dependencies to latest versions
- Review this security document for relevance
- Check Vercel security advisories

### Annually
- Full security audit of codebase
- Review third-party service security (Formspree, Vercel)
- Update security headers based on current best practices

---

## OWASP Top 10 Relevance

| OWASP Category | Applicability | Status |
|----------------|---------------|--------|
| A01 Broken Access Control | N/A (no auth) | N/A |
| A02 Cryptographic Failures | Low (no secrets) | OK |
| A03 Injection | Low (static site) | OK |
| A04 Insecure Design | Low | OK |
| A05 Security Misconfiguration | Medium | Headers needed |
| A06 Vulnerable Components | Medium | Monitor deps |
| A07 Authentication Failures | N/A (no auth) | N/A |
| A08 Data Integrity Failures | Low | OK |
| A09 Security Logging | N/A (Vercel handles) | N/A |
| A10 Server-Side Request Forgery | N/A (static site) | N/A |

---

## Conclusion

The amitoj.co website benefits from a secure-by-default architecture. Static site generation eliminates entire categories of vulnerabilities that affect dynamic web applications. The main recommendations focus on defense-in-depth measures (security headers) rather than fixing active vulnerabilities.

**Action Items:**
1. Create `vercel.json` with security headers
2. Set up dependency scanning
3. Consider self-hosting fonts

The site is production-ready from a security perspective. The recommended improvements add additional layers of protection but are not blocking issues.
