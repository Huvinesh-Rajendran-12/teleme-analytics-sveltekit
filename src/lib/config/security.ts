// Security configuration for iframe embedding and other security measures
export interface IframeSecurityConfig {
  // Whether to allow iframe embedding in production
  allowIframes: boolean;
  // Allowed domains that can embed this app in an iframe
  allowedDomains: string[];
  // What to do when accessed outside iframe: 'redirect' | 'block' | 'allow'
  fallbackBehavior: 'redirect' | 'block' | 'allow';
  // Custom redirect URL when fallbackBehavior is 'redirect'
  redirectUrl?: string;
  // Whether to show detailed error messages
  showDetailedErrors: boolean;
}

export interface SecurityConfig {
  iframe: IframeSecurityConfig;
  // Additional security headers to apply in production
  additionalHeaders: Record<string, string>;
  // Whether to enable strict transport security
  enableHSTS: boolean;
  // HSTS max age in seconds
  hstsMaxAge: number;
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  iframe: {
    allowIframes: true,
    allowedDomains: [
      'https://staging-botpress.teleme.co',
      'https://staging.teleme.co',
      'https://teleme.co'
    ],
    fallbackBehavior: 'block',
    showDetailedErrors: false
  },
  additionalHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  },
  enableHSTS: true,
  hstsMaxAge: 31536000 // 1 year
};

// Environment-based configuration
export function getSecurityConfig(): SecurityConfig {
  // You can override these settings based on environment variables
  const config = { ...defaultSecurityConfig };

  // Override iframe settings from environment variables if provided
  if (typeof window === 'undefined') {
    // Server-side environment access
    const allowedDomains = process.env.VITE_IFRAME_ALLOWED_DOMAINS;
    if (allowedDomains) {
      config.iframe.allowedDomains = allowedDomains.split(',').map((d: string) => d.trim());
    }

    const fallbackBehavior = process.env.VITE_IFRAME_FALLBACK_BEHAVIOR;
    if (fallbackBehavior) {
      config.iframe.fallbackBehavior = fallbackBehavior as 'redirect' | 'block' | 'allow';
    }

    const redirectUrl = process.env.VITE_IFRAME_REDIRECT_URL;
    if (redirectUrl) {
      config.iframe.redirectUrl = redirectUrl;
    }

    const showDetailedErrors = process.env.VITE_SHOW_DETAILED_ERRORS;
    if (showDetailedErrors === 'true') {
      config.iframe.showDetailedErrors = true;
    }
  }

  return config;
}
