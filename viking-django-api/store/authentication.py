from rest_framework.authentication import TokenAuthentication


class CookieTokenAuthentication(TokenAuthentication):
    """
    Reads the DRF auth token from the 'auth_token' httpOnly cookie instead of
    the Authorization request header.

    Benefits over header-based auth:
      - The token is never accessible from JavaScript, so XSS attacks cannot
        steal it.
      - No client-side token storage (localStorage/sessionStorage) is needed.
      - The cookie is sent automatically by the browser on every same-origin
        (or proxied) request.
    """

    def authenticate(self, request):
        token = request.COOKIES.get('auth_token')
        if not token:
            return None
        return self.authenticate_credentials(token)
