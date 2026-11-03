FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Détecteur d'images IA local : téléchargé et compressé une fois, à la construction de l'image.
# En cas d'échec du téléchargement, le service démarre quand même (détecteur signalé indisponible).
RUN python -m app.local_detector prepare || echo "Détecteur IA local non préparé"

# Utilisateur sans privilèges
RUN useradd --create-home maso
USER maso

# Le port est fourni par l'hébergeur (Render, Railway…) ; l'adresse IP réelle du visiteur vient du proxy (limite de débit).
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
