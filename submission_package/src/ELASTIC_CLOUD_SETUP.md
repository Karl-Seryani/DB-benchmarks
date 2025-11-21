# Elastic Cloud Setup Guide

## Quick Setup (5 minutes)

### Step 1: Sign Up for Elastic Cloud

1. Go to: **https://cloud.elastic.co/registration**
2. Sign up with Google/email (free 14-day trial, no credit card)
3. Verify your email if needed

### Step 2: Create a Deployment

1. After logging in, click **"Create deployment"**
2. Choose:
   - **Name**: `elasticsearch-benchmark` (or any name)
   - **Cloud provider**: AWS
   - **Region**: Same as ClickHouse (`us-east-1`) for fairness
   - **Version**: 7.17 or 8.x (either works)
   - **Tier**: Basic/Standard (free trial)
3. Click **"Create deployment"**
4. **IMPORTANT**: Save your credentials when they appear!
   - **Username**: `elastic`
   - **Password**: (auto-generated, save it!)
   - **Endpoint**: Something like `https://abc123.us-east-1.aws.found.io:9243`

### Step 3: Update Your Config

After deployment is created, update `config.env` with:

```bash
# Elasticsearch Configuration - Elastic Cloud
ELASTICSEARCH_HOST=your-deployment-id.us-east-1.aws.found.io
ELASTICSEARCH_PORT=9243
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=your-password-here
ELASTICSEARCH_SCHEME=https
```

### Step 4: Test Connection

```bash
cd /Users/karlseryani/Documents/Cs\ shit/Databases\ 2/clickhouse-elasticsearch-comparison
env $(cat config.env | grep -v '^#' | xargs) python3 test_connections.py
```

You should see:
```
✅ ClickHouse Cloud connected successfully!
✅ Elasticsearch connected successfully!
```

---

## Alternative: Docker (If You Prefer Local)

If you prefer not to sign up for another cloud service:

```bash
docker run -d --name elasticsearch \
  -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:7.17.4

# Wait 30 seconds for it to start, then test:
curl http://localhost:9200
```

Then in `config.env`, keep:
```bash
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_SCHEME=http
```

---

## Next Steps

Once both databases are connected:
1. ✅ ClickHouse Cloud (DONE)
2. ⏳ Elasticsearch (in progress)
3. 🚀 Load healthcare data into both systems
4. 🚀 Run the 7 benchmark tests
5. 🚀 Analyze results
