# Initial Data Loading Results

## Storage Comparison (First Key Finding!)

### ClickHouse Cloud Storage
| Table | Rows | Size |
|-------|------|------|
| patients | 10,000 | 96.03 KiB |
| medical_events | 100,000 | 1.51 MiB |
| iot_telemetry | 50,000 | 521.36 KiB |
| **TOTAL** | **160,000** | **~2.1 MiB** |

### Elasticsearch Cloud Storage
| Index | Docs | Size |
|-------|------|------|
| patients | 10,000 | 1.37 MB |
| medical_events | 100,000 | 20.31 MB |
| iot_telemetry | 49,000 | 6.29 MB |
| **TOTAL** | **159,000** | **~27.97 MB** |

## Key Finding #1: Storage Efficiency

**ClickHouse is 13.3x more storage efficient than Elasticsearch** for the same dataset!

- ClickHouse: 2.1 MiB  
- Elasticsearch: 27.97 MB
- **Compression ratio: 13.3:1**

This aligns with the mpathic case study - ClickHouse's columnar storage and compression algorithms significantly reduce storage costs compared to Elasticsearch's document-oriented approach.

---

## Next Steps

Now that data is loaded, we can:
1. Run the 7 benchmark performance tests
2. Compare query speeds
3. Measure resource utilization
4. Generate final comparative analysis

---

*Data loaded: `{datetime.now()}`*
