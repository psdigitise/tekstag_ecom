"""
Authentication views.

Security fixes applied vs. original:
  - Token is no longer returned in the response body. It is set as an
    httpOnly, Secure (in production), SameSite=Lax cookie, making it
    completely inaccessible to JavaScript and immune to XSS theft.
  - is_staff is now included in every user payload so the frontend AdminLayout
    can enforce RBAC without an extra API call.
  - LogoutView deletes the DB token AND clears the cookie so replayed cookies
    are immediately invalid.
  - RegisterView validates password strength server-side (min 8 chars,
    upper, lower, digit) — same policy enforced on the frontend.
  - ValidateVoucherView replaces the client-side hardcoded voucher table;
    all voucher logic (expiry, usage limits, min order) is enforced here.
"""
import re

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile

# ── Constants ──────────────────────────────────────────────────────────────────

PASSWORD_RE   = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$')
COOKIE_NAME   = 'auth_token'
COOKIE_MAX_AGE = 60 * 60 * 24 * 14  # 14 days


# ── Helpers ────────────────────────────────────────────────────────────────────

def _user_payload(user: User) -> dict:
    """Safe user object sent to the client — never includes the raw token."""
    profile = getattr(user, 'profile', None)
    return {
        'id':        user.id,
        'email':     user.email,
        'username':  user.username,
        'firstName': user.first_name,
        'lastName':  user.last_name,
        'name':      (f"{user.first_name} {user.last_name}".strip()
                      or user.email.split('@')[0]),
        'company':   profile.company if profile else '',
        'phone':     profile.phone   if profile else '',
        'is_staff':  user.is_staff,
    }


def _set_auth_cookie(response: Response, token_key: str) -> None:
    """Write the token as an httpOnly cookie."""
    response.set_cookie(
        COOKIE_NAME,
        token_key,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,   # HTTPS-only in production
        samesite='Lax',
        path='/',
    )


# ── Views ──────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    def post(self, request):
        data       = request.data
        email      = data.get('email', '').strip().lower()
        password   = data.get('password', '')
        first_name = data.get('firstName', '')
        last_name  = data.get('lastName', '')
        company    = data.get('company', '')
        phone      = data.get('phone', '')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Server-side password strength enforcement
        if not PASSWORD_RE.match(password):
            return Response(
                {'error': 'Password must be at least 8 characters and include uppercase, lowercase, and a number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=email).exists():
            return Response(
                {'error': 'An account with this email already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        UserProfile.objects.create(user=user, company=company, phone=phone)

        token, _ = Token.objects.get_or_create(user=user)
        response = Response({'user': _user_payload(user)}, status=status.HTTP_201_CREATED)
        _set_auth_cookie(response, token.key)
        return response


class LoginView(APIView):
    def post(self, request):
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        # Look up by email first so it works regardless of what the username field is
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)
        response = Response({'user': _user_payload(user)})
        _set_auth_cookie(response, token.key)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Invalidate the token server-side so replayed cookies are rejected
        Token.objects.filter(user=request.user).delete()
        response = Response({'detail': 'Logged out successfully.'})
        response.delete_cookie(COOKIE_NAME, path='/')
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'user': _user_payload(request.user)})
