import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'viking_api.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

user, _ = User.objects.get_or_create(username='admin')
token, _ = Token.objects.get_or_create(user=user)

client = Client(HTTP_AUTHORIZATION=f'Token {token.key}')

# Test POST with FormData
with open('manage.py', 'rb') as f:
    data = {
        'name': 'Test Product',
        'sku': '1234',
        'priceExVat': '30.00',
        'priceIncVat': '36.00',
        'image': '',
        'section': 'listing',
        'image_file': f
    }
    response = client.post('/api/products/', data=data)
    print("Status:", response.status_code)
    print("Body:", response.content.decode())
