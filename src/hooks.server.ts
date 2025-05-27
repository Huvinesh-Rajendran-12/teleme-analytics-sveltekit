import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getSecurityConfig } from '$lib/config/security';

export const handle: Handle = async ({ event, resolve }) => {
	const securityConfig = getSecurityConfig();
	
	// In production, check if the request should be restricted to iframe only
	if (!dev && securityConfig.iframe.allowIframes && securityConfig.iframe.fallbackBehavior !== 'allow') {
		const secFetchSite = event.request.headers.get('sec-fetch-site') || '';
		const secFetchDest = event.request.headers.get('sec-fetch-dest') || '';
		const secFetchMode = event.request.headers.get('sec-fetch-mode') || '';
		
		// Check if the request is coming from within an iframe context
		const isIframeRequest = secFetchDest === 'iframe' || 
			secFetchSite === 'cross-site' || 
			secFetchSite === 'same-site' ||
			secFetchMode === 'navigate';
		
		// Skip iframe check for API routes, static assets, and specific paths
		const isApiOrAsset = event.url.pathname.startsWith('/api') || 
			event.url.pathname.startsWith('/_app') ||
			event.url.pathname.startsWith('/static') ||
			event.url.pathname.includes('.') ||
			event.url.pathname === '/iframe-required';
		
		// For non-iframe requests in production, apply restrictions
		if (!isIframeRequest && !isApiOrAsset && secFetchDest === 'document') {
			if (securityConfig.iframe.fallbackBehavior === 'redirect' && securityConfig.iframe.redirectUrl) {
				return Response.redirect(securityConfig.iframe.redirectUrl, 302);
			} else if (securityConfig.iframe.fallbackBehavior === 'block') {
				const errorMessage = securityConfig.iframe.showDetailedErrors 
					? `This application can only be accessed when embedded in an authorized iframe. Request details: dest=${secFetchDest}, site=${secFetchSite}, mode=${secFetchMode}`
					: 'This application can only be accessed when embedded in an authorized iframe.';
				
				return new Response(
					`<!DOCTYPE html>
					<html>
						<head>
							<title>Access Restricted</title>
							<meta charset="utf-8">
							<meta name="viewport" content="width=device-width, initial-scale=1">
							<style>
								body { 
									font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
									margin: 0; 
									padding: 40px 20px; 
									text-align: center; 
									background: #f5f5f5;
									color: #333;
								}
								.container { 
									max-width: 500px; 
									margin: 0 auto; 
									background: white;
									padding: 40px;
									border-radius: 8px;
									box-shadow: 0 2px 10px rgba(0,0,0,0.1);
								}
								.error { 
									color: #d32f2f; 
									margin-bottom: 20px;
								}
								.icon {
									font-size: 48px;
									margin-bottom: 20px;
								}
								p {
									line-height: 1.6;
									margin-bottom: 16px;
								}
							</style>
						</head>
						<body>
							<div class="container">
								<div class="icon">🔒</div>
								<h1 class="error">Access Restricted</h1>
								<p>${errorMessage}</p>
								<p>Please access this application through the proper channel.</p>
							</div>
						</body>
					</html>`,
					{
						status: 403,
						headers: {
							'Content-Type': 'text/html',
							'X-Frame-Options': 'DENY'
						}
					}
				);
			}
		}
	}

	const response = await resolve(event);

	// Apply security headers in production
	if (!dev) {
		if (securityConfig.iframe.allowIframes) {
			// Allow iframe embedding from specified domains
			const allowedOrigins = securityConfig.iframe.allowedDomains
				.map(domain => domain === 'self' ? "'self'" : domain)
				.join(' ');
			
			// Set frame-ancestors in CSP for modern browsers
			const existingCSP = response.headers.get('Content-Security-Policy');
			const frameAncestors = `frame-ancestors ${allowedOrigins}`;
			
			if (existingCSP) {
				if (!existingCSP.includes('frame-ancestors')) {
					response.headers.set('Content-Security-Policy', `${existingCSP}; ${frameAncestors}`);
				}
			} else {
				response.headers.set('Content-Security-Policy', frameAncestors);
			}
			
			// Set X-Frame-Options for older browsers
			if (securityConfig.iframe.allowedDomains.length === 1 && securityConfig.iframe.allowedDomains[0] === 'self') {
				response.headers.set('X-Frame-Options', 'SAMEORIGIN');
			} else {
				// For multiple domains, we rely on CSP frame-ancestors
				response.headers.set('X-Frame-Options', 'SAMEORIGIN');
			}
		} else {
			// Completely deny iframe embedding
			response.headers.set('X-Frame-Options', 'DENY');
			response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
		}
		
		// Apply additional security headers
		Object.entries(securityConfig.additionalHeaders).forEach(([header, value]) => {
			response.headers.set(header, value);
		});
		
		// Apply HSTS if enabled
		if (securityConfig.enableHSTS) {
			response.headers.set('Strict-Transport-Security', `max-age=${securityConfig.hstsMaxAge}; includeSubDomains`);
		}
	}

	return response;
};