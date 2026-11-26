# Gunicorn production configuration
# Usage: gunicorn -c gunicorn.conf.py viking_api.wsgi:application

import multiprocessing

# Binding
bind    = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1

# Worker class
worker_class    = "sync"
worker_connections = 1000
timeout         = 30
keepalive       = 2

# Security
limit_request_line   = 4094
limit_request_fields = 100

# Logging
accesslog = "-"   # stdout
errorlog  = "-"   # stderr
loglevel  = "warning"

# Process naming
proc_name = "viking_api"
