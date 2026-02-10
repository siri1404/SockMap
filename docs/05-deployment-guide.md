# Deployment & Production Setup

## Quick Start

### Prerequisites

- Linux system (Ubuntu 20.04+ or equivalent)
- C compiler (gcc)
- Python 3.8+
- Node.js 16+ (for dashboard build only)
- git

### Local Development

```bash
# Clone repository
git clone https://github.com/siri1404/SockMap.git
cd SockMap

# Build C backend
cd backend/src
make clean
make
cd ../..

# Install Python dependencies
pip install -r backend/api/requirements.txt

# Build React dashboard
npm install
npm run build

# Start backend API
python backend/api/app.py &

# Serve dashboard
npm run dev
```

Access dashboard at `http://localhost:5000`

---

## Production Deployment

### 1. System Preparation

**Update system:**
```bash
sudo apt update
sudo apt upgrade -y
```

**Install dependencies:**
```bash
sudo apt install -y build-essential python3 python3-pip nodejs npm git
```

**Create application user:**
```bash
sudo useradd -m -s /bin/bash sockmap
sudo usermod -aG adm,systemd-journal sockmap
```

### 2. Application Setup

**Clone and build:**
```bash
cd /opt
sudo git clone https://github.com/siri1404/SockMap.git
sudo chown -R sockmap:sockmap SockMap
cd SockMap

# Build backend as sockmap user
sudo -u sockmap make -C backend/src clean
sudo -u sockmap make -C backend/src

# Install Python dependencies
sudo pip3 install -r backend/api/requirements.txt

# Build dashboard
sudo -u sockmap npm install
sudo -u sockmap npm run build
```

### 3. Systemd Service

Create service file: `/etc/systemd/system/sockmap.service`

```ini
[Unit]
Description=SockMap System Monitor API
After=network.target

[Service]
Type=simple
User=sockmap
WorkingDirectory=/opt/SockMap
Environment="FLASK_APP=backend/api/app.py"
Environment="FLASK_ENV=production"
ExecStart=/usr/bin/python3 backend/api/app.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable sockmap
sudo systemctl start sockmap
sudo systemctl status sockmap
```

### 4. Reverse Proxy (Nginx)

**Install Nginx:**
```bash
sudo apt install -y nginx
```

**Create config:** `/etc/nginx/sites-available/sockmap`

```nginx
upstream sockmap_api {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name example.com www.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    # Serve static dashboard
    location / {
        root /opt/SockMap/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests
    location /api/ {
        proxy_pass http://sockmap_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/sockmap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Certificates (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d example.com -d www.example.com
```

### 6. Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Monitoring Setup

### 1. Log Aggregation

**View application logs:**
```bash
sudo journalctl -u sockmap -f
```

**Configure log rotation:** `/etc/logrotate.d/sockmap`

```
/var/log/sockmap/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 sockmap sockmap
    sharedscripts
}
```

### 2. Health Checks

**Automated health check cron job:**

```bash
# /etc/cron.d/sockmap-health

*/5 * * * * sockmap curl -f http://localhost:5000/api/health > /dev/null 2>&1 || systemctl restart sockmap
```

### 3. Monitoring with Prometheus

**Install Prometheus endpoint middleware** (optional enhancement):

Add to `backend/api/app.py`:
```python
from prometheus_client import Counter, Histogram, generate_latest

request_count = Counter('sockmap_requests_total', 'Total requests')
request_duration = Histogram('sockmap_request_duration_seconds', 'Request duration')

@app.route('/metrics')
def metrics():
    return generate_latest()
```

**Prometheus config:** `/etc/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'sockmap'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
```

---

## Performance Tuning

### 1. Scan Frequency

Edit `backend/api/app.py`:

```python
# Balance between freshness and CPU usage
SCAN_INTERVAL = 5  # seconds

# For high-frequency updates (dev):
SCAN_INTERVAL = 1

# For low-overhead monitoring (prod):
SCAN_INTERVAL = 30
```

### 2. Memory Optimization

Edit `backend/src/Makefile`:

```makefile
CFLAGS = -O3 -Wall -march=native
```

Rebuild:
```bash
make clean
make
```

### 3. API Timeouts

Edit `backend/api/app.py`:

```python
API_TIMEOUT = 10  # seconds
SCAN_TIMEOUT = 5  # seconds
```

### 4. Connection Pooling

For heavy load, add to `app.py`:

```python
from flask_cors import CORS
from werkzeug.middleware.shared_data import SharedDataMiddleware

CORS(app)

# Enable gzip compression
@app.after_request
def gzip_response(response):
    # Werkzeug handles automatically
    return response
```

---

## Scaling Considerations

### Single Server

- Handles ~1000 processes easily
- Memory: ~20-50MB
- CPU: <1% idle, <5% during scans

### Multiple Servers

For monitoring multiple systems:

1. **Distributed deployment:**
   - Run `sockmap` locally on each server
   - Central aggregation server collects data
   - Single dashboard visualizes all systems

2. **Architecture:**
   ```
   Server 1 → localhost:5000 ↘
   Server 2 → localhost:5000 → Aggregator → Dashboard
   Server 3 → localhost:5000 ↗
   ```

3. **Aggregator implementation:**
   ```python
   import requests
   
   TARGETS = [
     'http://server1:5000',
     'http://server2:5000',
     'http://server3:5000'
   ]
   
   def aggregate_sockets():
     all_sockets = []
     for target in TARGETS:
       response = requests.get(f'{target}/api/sockets')
       all_sockets.extend(response.json()['sockets'])
     return all_sockets
   ```

### Load Balancing

Behind HAProxy:

```
global
    maxconn 4096

frontend sockmap_ft
    bind *:80
    default_backend sockmap_bk

backend sockmap_bk
    balance roundrobin
    server sockmap1 127.0.0.1:5001
    server sockmap2 127.0.0.1:5002
```

---

## Backup & Restore

### Database Export

SockMap doesn't use a database by default, but for extended monitoring:

```bash
# Export current state
sockmap -j > /backups/sockmap_$(date +%s).json

# Automated backups
0 * * * * sockmap /usr/local/bin/backup-sockmap.sh
```

### Configuration Backup

```bash
tar -czf /backups/sockmap_config.tar.gz /opt/SockMap/backend/api/
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u sockmap -n 50

# Run manually to see errors
sudo -u sockmap python3 backend/api/app.py

# Check permissions
ls -la /opt/SockMap/
sudo chown -R sockmap:sockmap /opt/SockMap
```

### High CPU Usage

```bash
# Increase scan interval
# Edit SCAN_INTERVAL in app.py

# Or reduce process sampling
# Edit backend/src/sockmap.c
```

### Permission Denied on /proc

```bash
# Ensure running as root or with capabilities
sudo -u sockmap python3 -c "import os; print(os.getuid())"

# Grant CAP_SYS_PTRACE if needed
sudo setcap cap_sys_ptrace=ep /opt/SockMap/backend/src/Sockmap
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Change port in app.py
app.run(host='127.0.0.1', port=5001)
```

---

## Security Hardening

### 1. Run as Non-Root

Already configured via systemd user directive.

### 2. Use AppArmor/SELinux

Create AppArmor profile: `/etc/apparmor.d/opt.sockmap`

```
#include <tunables/global>

/opt/SockMap/backend/api/app.py {
  #include <abstractions/base>
  #include <abstractions/python>
  
  /proc/** r,
  /opt/SockMap/** r,
  /dev/null rw,
  /var/log/sockmap/ w,
}
```

### 3. Restrict API Access

Add authentication to sensitive endpoints:

```python
from functools import wraps
from flask import request, abort

API_KEY = os.getenv('SOCKMAP_API_KEY', 'change-me')

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get('X-API-Key')
        if key != API_KEY:
            abort(401)
        return f(*args, **kwargs)
    return decorated

@app.route('/api/sockets')
@require_api_key
def get_sockets():
    # ...
```

### 4. Network Isolation

Only allow local connections:

```python
app.run(host='127.0.0.1', port=5000)  # Localhost only
```

Then proxy through Nginx (already configured above).

---

## Maintenance

### Weekly

- Review anomaly logs
- Check disk space
- Monitor memory usage

### Monthly

- Update system packages
- Review and rotate logs
- Backup configurations

### Quarterly

- Upgrade SockMap
- Audit security settings
- Performance baseline

---

## Next Steps

- Review [Architecture Overview](./01-architecture-overview.md) for system design
- Check [Anomaly Detection](./03-anomaly-detection.md) for monitoring anomalies
- See [API Reference](./02-api-reference.md) for endpoint details
