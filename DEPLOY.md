# Deployment — nx-search.jagatab.uk

## One-time server setup

```bash
# 1. Create web root
sudo mkdir -p /var/www/nx-search
sudo chown $USER:$USER /var/www/nx-search

# 2. Issue SSL cert (assumes certbot installed)
sudo certbot certonly --nginx -d nx-search.jagatab.uk

# 3. Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/nx-search.jagatab.uk
sudo ln -s /etc/nginx/sites-available/nx-search.jagatab.uk \
           /etc/nginx/sites-enabled/nx-search.jagatab.uk
sudo nginx -t && sudo systemctl reload nginx

# 4. Allow deploy user to reload nginx without password
# Add to /etc/sudoers.d/nginx-reload:
# deploy ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
```

## GitHub Actions secrets required

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY` | Private key of the deploy SSH keypair |
| `SSH_KNOWN_HOSTS` | Output of `ssh-keyscan YOUR_SERVER_IP` |
| `SSH_USER` | SSH username on the server |
| `SSH_HOST` | Server IP or hostname |
| `DEPLOY_PATH` | `/var/www/nx-search` |
| `VITE_NEURONX_API_KEY` | NeuronX API key |

## Adding the deploy SSH key

```bash
# On your local machine — generate a dedicated deploy key
ssh-keygen -t ed25519 -C "gh-actions-nx-search" -f ~/.ssh/nx_search_deploy

# Add the PUBLIC key to the server
ssh-copy-id -i ~/.ssh/nx_search_deploy.pub USER@YOUR_SERVER

# Add the PRIVATE key as the SSH_PRIVATE_KEY GitHub secret
cat ~/.ssh/nx_search_deploy

# Get known_hosts value
ssh-keyscan YOUR_SERVER_IP
```

## DNS

Add an A record in your DNS provider:
```
nx-search.jagatab.uk  A  YOUR_SERVER_IP
```
