"""
Security middleware for the Viking API.

RateLimitMiddleware  — sliding-window rate limiter on auth endpoints (login/register).
SecurityHeadersMiddleware — appends OWASP-recommended response headers.
"""
import time
from collections import defaultdict
from threading import Lock

from django.http import JsonResponse


# ── Rate limiting ──────────────────────────────────────────────────────────────

_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = Lock()

RATE_WINDOW  = 60   # seconds
RATE_MAX_REQ = 10   # max requests per IP per window on protected paths


class RateLimitMiddleware:
    """
    Applies a sliding-window rate limit to login and register endpoints.
    Each IP is allowed RATE_MAX_REQ POST requests per RATE_WINDOW seconds.
    Returns HTTP 429 when the limit is exceeded.
    """

    PROTECTED = {'/api/auth/login/', '/api/auth/register/', '/api/vouchers/validate/'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path in self.PROTECTED and request.method == 'POST':
            ip  = self._get_ip(request)
            now = time.monotonic()

            with _rate_lock:
                hits = _rate_store[ip]
                # Evict hits outside the current window
                _rate_store[ip] = [t for t in hits if now - t < RATE_WINDOW]
                if len(_rate_store[ip]) >= RATE_MAX_REQ:
                    return JsonResponse(
                        {'error': 'Too many requests. Please wait before trying again.'},
                        status=429,
                    )
                _rate_store[ip].append(now)

        return self.get_response(request)

    @staticmethod
    def _get_ip(request) -> str:
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '0.0.0.0')


# ── Security headers ───────────────────────────────────────────────────────────

class SecurityHeadersMiddleware:
    """
    Adds OWASP-recommended security headers to every API response.
    (CSP is handled by the frontend's nginx/Vite config; here we cover
    the headers that belong on the API origin.)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Content-Type-Options']  = 'nosniff'
        response['X-Frame-Options']         = 'DENY'
        response['Referrer-Policy']         = 'strict-origin-when-cross-origin'
        response['Permissions-Policy']      = 'geolocation=(), microphone=(), camera=()'
        return response
