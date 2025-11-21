# ClickHouse Cloud Setup Guide

## Step 1: Create Free Trial Account

1. Go to: **https://clickhouse.cloud/**
2. Click **"Start free trial"** or **"Sign up"**
3. Sign up with Google/GitHub or email
4. No credit card required for the trial!

## Step 2: Create a Service

1. Once logged in, click **"Create service"**
2. Choose:
   - **Service name**: `databases-project` (or whatever you like)
   - **Cloud provider**: AWS or GCP (doesn't matter)
   - **Region**: Choose one close to you (e.g., `us-east-1`)
   - **Tier**: Development (free tier)
3. Click **"Create service"**
4. Wait ~30 seconds for it to provision

## Step 3: Get Connection Details

After the service is created, you'll see:

1. **Host**: Something like `abc123.us-east-1.aws.clickhouse.cloud`
2. **Port**: `9440` (secure) or `8443` (HTTPS)
3. **Username**: `default`
4. **Password**: You'll set this or it will be auto-generated

**IMPORTANT: Save these details!** You'll need them for the Python scripts.

## Step 4: Test Connection from Python

Update the connection details in the test script below:

```python
from clickhouse_driver import Client

# Replace these with your actual connection details
client = Client(
    host='YOUR_HOST.clickhouse.cloud',
    port=9440,
    user='default',
    password='YOUR_PASSWORD',
    secure=True  # Important for cloud!
)

# Test query
result = client.execute('SELECT version()')
print(f"Connected! ClickHouse version: {result[0][0]}")
```

## Step 5: Save Connection Config

Create a `.env` file to store your credentials (don't commit this to git!):

```bash
# ClickHouse Cloud
CLICKHOUSE_HOST=your-instance.clickhouse.cloud
CLICKHOUSE_PORT=9440
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your-password-here
CLICKHOUSE_SECURE=true

# Elasticsearch (local or cloud)
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
```

## What About Elasticsearch?

For Elasticsearch, you have two options:

### Option 1: Elastic Cloud (Recommended - Easiest)
- Go to: https://cloud.elastic.co/registration
- Free 14-day trial
- No security issues like local install
- Takes 5 minutes

### Option 2: Use Docker (Local)
Avoids all the macOS security issues:
```bash
docker run -d --name elasticsearch \
  -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:7.17.4
```

### Option 3: Keep trying local install
We can disable System Integrity Protection (SIP) but that's risky and not recommended.

## Next Steps

Once you have ClickHouse Cloud set up:
1. ✅ Test the connection with Python
2. Load sample data
3. Run benchmarks
4. Compare with Elasticsearch

---

**Need help?** ClickHouse Cloud docs: https://clickhouse.com/docs/en/cloud/overview
