"""
Picture uploads for admin content (category and storefront images).

POST /api/uploads/   multipart field "image"   ->   {"url": "/media/uploads/…"}

Staff only. The file must really be a picture; its name and extension are chosen
by the server, never taken from the upload.
"""
import uuid

from django.core.files.storage import default_storage
from PIL import Image
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

MAX_BYTES = 10 * 1024 * 1024
# Detected picture format -> extension. SVG is deliberately not accepted.
EXTENSIONS = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp', 'GIF': 'gif', 'AVIF': 'avif'}


@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_image(request):
    upload = request.FILES.get('image')
    if upload is None:
        raise ValidationError({'error': 'Choose a picture to upload.'})
    if upload.size > MAX_BYTES:
        raise ValidationError({'error': 'The picture must be 10 MB or smaller.'})
    try:
        with Image.open(upload) as picture:
            extension = EXTENSIONS.get(picture.format)
            picture.verify()
    except Exception:  # Pillow raises many types for broken or hostile files
        extension = None
    if extension is None:
        raise ValidationError({'error': 'Use a JPG, PNG, WEBP, GIF or AVIF picture.'})
    upload.seek(0)
    name = default_storage.save(f'uploads/{uuid.uuid4().hex}.{extension}', upload)
    return Response({'url': default_storage.url(name)}, status=201)
