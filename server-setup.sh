#!/bin/bash
# Run this once on jagatab.uk as sree:
#   bash server-setup.sh
set -e

DEPLOY_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINnjvaYAuO9FbW86kPc8aCP/WU0QL0czKXz3RCoGEaFD gh-actions-nx-search"
DOMAIN="nx-search.jagatab.uk"
WEB_ROOT="/var/www/nx-search"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

echo "==> 1. Adding deploy SSH key to authorized_keys"
mkdir -p ~/.ssh
chmod 700 ~/.ssh
grep -qF "$DEPLOY_KEY" ~/.ssh/authorized_keys 2>/dev/null || echo "$DEPLOY_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
echo "    Done."

echo "==> 2. Creating web root: $WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo chown sree:sree "$WEB_ROOT"
echo "    Done."

echo "==> 3. Checking nginx"
if ! command -v nginx &>/dev/null; then
  echo "    Installing nginx..."
  sudo apt-get update -qq && sudo apt-get install -y nginx
fi
echo "    nginx: $(nginx -v 2>&1)"

echo "==> 4. Checking certbot"
if ! command -v certbot &>/dev/null; then
  echo "    Installing certbot..."
  sudo apt-get install -y certbot python3-certbot-nginx
fi
echo "    certbot: $(certbot --version 2>&1)"

echo "==> 5. Writing nginx config"
sudo tee "$NGINX_CONF" > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name nx-search.jagatab.uk;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nx-search.jagatab.uk;

    ssl_certificate     /etc/letsencrypt/live/nx-search.jagatab.uk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nx-search.jagatab.uk/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    root /var/www/nx-search;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml font/woff2;
    gzip_min_length 1024;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;

    proxy_read_timeout    180s;
    proxy_connect_timeout  30s;
    proxy_send_timeout    180s;

    location /api/ {
        proxy_pass https://neuronx.jagatab.uk/api/;
        proxy_set_header Host neuronx.jagatab.uk;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-API-Key $http_x_api_key;
        proxy_ssl_server_name on;
        proxy_buffering off;
    }

    location /v1/ {
        proxy_pass https://neuronx.jagatab.uk/v1/;
        proxy_set_header Host neuronx.jagatab.uk;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Authorization $http_authorization;
        proxy_ssl_server_name on;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header X-Accel-Buffering no;
        add_header X-Accel-Buffering no;
        proxy_read_timeout 180s;
    }

    location ~* \.(js|css|woff2|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location ~* \.(webmanifest|json)$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF
echo "    Config written to $NGINX_CONF"

echo "==> 6. Enabling site"
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo nginx -t
echo "    Config test passed."

echo "==> 7. Issuing SSL certificate for $DOMAIN"
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  sudo certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@jagatab.uk
else
  echo "    Certificate already exists, skipping."
fi

echo "==> 8. Reloading nginx"
sudo systemctl reload nginx

echo "==> 9. Allowing nginx reload without password (sudoers)"
SUDOERS_LINE="sree ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx"
echo "$SUDOERS_LINE" | sudo tee /etc/sudoers.d/nginx-reload > /dev/null
sudo chmod 440 /etc/sudoers.d/nginx-reload
echo "    Done."

echo ""
echo "============================================"
echo "  Server setup complete!"
echo "  nx-search.jagatab.uk is ready to receive"
echo "  deploys from GitHub Actions."
echo "============================================"
