# Stage 1: Build the Flutter web application
FROM ubuntu:20.04 AS build-env

# Instala ferramentas base
RUN apt-get update && \
    apt-get install -y curl git unzip xz-utils zip libglu1-mesa

# Setup do Flutter SDK
RUN git clone https://github.com/flutter/flutter.git -b stable /usr/local/flutter
ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Força o opt-in do web no container
RUN flutter config --enable-web
RUN flutter config --no-analytics

WORKDIR /app
COPY . .

# Obtem dependencias e compila
RUN flutter pub get
RUN flutter build web --release

# Stage 2: Serve the app with Nginx
FROM nginx:alpine
COPY --from=build-env /app/build/web /usr/share/nginx/html

# Exposição da porta nativa do Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
