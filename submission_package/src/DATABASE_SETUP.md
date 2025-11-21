# Database Setup Guide

## ✅ Installation Complete

Both databases have been successfully installed via Homebrew:

- **ClickHouse**: Version 25.10.2.65 (latest stable)
- **Elasticsearch**: Version 7.17.4
- **Python Libraries**: clickhouse-driver, elasticsearch, pandas, matplotlib, plotly, jupyter

---

## Starting the Databases

### Option 1: Start as Background Services (Recommended)

This will start the databases now and auto-restart them on login:

```bash
# Start ClickHouse
brew services start clickhouse

# Start Elasticsearch
brew services start elastic/tap/elasticsearch-full
```

### Option 2: Start Manually (Just for this session)

```bash
# Start ClickHouse (runs in foreground)
clickhouse server

# In another terminal, start Elasticsearch
/opt/homebrew/opt/elasticsearch-full/bin/elasticsearch
```

---

## Verify Installations

### Test ClickHouse

```bash
# Wait a few seconds after starting, then connect
clickhouse client

# Once connected, try a simple query:
SELECT version();

# Exit with:
exit;
```

### Test Elasticsearch

```bash
# Check if Elasticsearch is running
curl http://localhost:9200

# You should see JSON output with cluster info
```

---

## Database Connection Details

### ClickHouse
- **Host**: `localhost`
- **Port**: `9000` (native protocol) or `8123` (HTTP)
- **User**: `default` (no password by default)
- **Database**: `default`

### Elasticsearch
- **Host**: `localhost`  
- **Port**: `9200` (HTTP)
- **Logs**: `/opt/homebrew/var/log/elasticsearch/elasticsearch_karlseryani.log`
- **Data**: `/opt/homebrew/var/lib/elasticsearch/elasticsearch_karlseryani/`

---

## Quick Start Commands

```bash
# 1. Start both databases
brew services start clickhouse
brew services start elastic/tap/elasticsearch-full

# 2. Wait 10-15 seconds for Elasticsearch to fully start

# 3. Verify both are running
clickhouse client --query "SELECT 1"
curl http://localhost:9200

# 4. Stop databases when done
brew services stop clickhouse
brew services stop elastic/tap/elasticsearch-full
```

---

## Troubleshooting

### ClickHouse won't start
```bash
# Check logs
tail -f /opt/homebrew/var/log/clickhouse-server/clickhouse-server.log

# Reset and restart
brew services restart clickhouse
```

### Elasticsearch won't start
```bash
# Check logs
tail -f /opt/homebrew/var/log/elasticsearch/elasticsearch_karlseryani.log

# Common issue: Not enough memory
# Edit config to reduce memory:
# /opt/homebrew/etc/elasticsearch/jvm.options

# Restart
brew services restart elastic/tap/elasticsearch-full
```

### Python can't connect
```bash
# Make sure databases are actually running
brew services list | grep -E "(clickhouse|elasticsearch)"

# Should show "started" status
```

---

## Next Steps

Once both databases are running:
1. ✅ Run the test connection script: `python3 test_connections.py`
2. Load test data into both systems
3. Run benchmarks
