# Presentation Outline
## ClickHouse vs Elasticsearch: A Practical Comparison

**Duration:** 15 minutes  
**Team:** Karl Seryani, Arik Dhaliwal, Raghav Gulati

---

## Slide 1: Title Slide (30 seconds)
**Title:** How mpathic Built Better, Faster, and More Secure ML Workflows  
**Subtitle:** A Comparative Analysis of ClickHouse Cloud vs Elasticsearch Cloud  
**Team Names & Student IDs**

---

## Slide 2: Problem Statement (1 minute)
**Title:** The Challenge: Analytics at Scale

- Organizations need fast, secure databases for ML pipelines
- Traditional search databases (Elasticsearch) struggle with large analytical workloads
- mpathic case study: Healthcare AI startup faced performance bottlenecks

**Visuals:** 
- Icon showing data growth
- mpathic logo/screenshot

---

## Slide 3: Research Questions (1 minute)
**Title:** What We Investigated

1. How do storage efficiencies compare?
2. What are the query performance characteristics?
3. How do security features stack up for healthcare?
4. When should you choose one over the other?

---

## Slide 4: Architectural Differences (2 minutes)
**Title:** Columnar vs Document-Oriented Storage

**Two-column comparison:**

**ClickHouse**
- Columnar storage (MergeTree engine)
- Optimized for analytics (OLAP)
- Aggressive compression (LZ4, ZSTD)
- SQL interface

**Elasticsearch**
- Document-oriented (inverted index)
- Optimized for search
- JSON document storage
- REST API + Query DSL

**Visual:** Diagram showing columnar vs row storage

---

## Slide 5: Methodology (1.5 minutes)
**Title:** Our Experimental Approach

**Setup:**
- Both systems in cloud (ClickHouse Cloud + Elasticsearch Cloud)
- us-east-1 region for fair comparison
- Identical synthetic healthcare datasets

**Datasets:**
- 10,000 patients
- 100,000 medical events
- 50,000 IoT telemetry readings

**Tests:** 4 benchmark queries, 5 iterations each

---

## Slide 6: KEY FINDING #1 - Storage (2 minutes) 🌟
**Title:** Storage Efficiency: ClickHouse Dominates

**Large table/visual:**

| System | Storage Size |
|--------|-------------|
| ClickHouse | 2.1 MiB |
| Elasticsearch | 27.97 MB |

**BIG NUMBER:** **13.3x** more efficient

**Breakdown bar chart:**
- Patients: 14.2x
- Events: 13.5x  
- Telemetry: 12.1x

**Cost implication:** "At 1TB scale, save $1,200/month in storage costs"

---

## Slide 7: KEY FINDING #2 - Query Performance (2 minutes)
**Title:** Query Speed: Context Matters

**Table showing benchmark results:**

| Benchmark | ClickHouse | Elasticsearch | Winner |
|-----------|------------|---------------|---------|
| Simple Aggregation | 102ms | 64ms | ES (1.6x) |
| Multi-Level GROUP BY | 102ms | 79ms | ES (1.3x) |
| Time-Series | 98ms | 98ms | Tie |
| Filter + Agg | 103ms | 55ms | ES (1.9x) |

**Key insight box:**
"Elasticsearch faster on small dataset (100K rows).  
ClickHouse excels at billions of rows (mpathic scale)."

---

## Slide 8: Security Comparison (1.5 minutes)
**Title:** Both Are Production-Ready for Healthcare

**Feature comparison table:**

| Feature | ClickHouse | Elasticsearch |
|---------|------------|---------------|
| Encryption | ✅ TLS + At-rest | ✅ TLS + At-rest |
| HIPAA Compliant | ✅ Yes | ✅ Yes |
| RBAC | ✅ SQL-based | ✅ Field-level |
| Audit Logging | Basic | Comprehensive |
| Certifications | SOC 2 | SOC 2, ISO 27001 |

**Bottom line:** "Both meet healthcare security requirements"

---

## Slide 9: When to Use Each System (2 minutes)
**Title:** Decision Matrix

**Two boxes side-by-side:**

**Choose ClickHouse When:**
- ✅ Massive datasets (billions of rows)
- ✅ Analytics-focused workload
- ✅ Storage costs are critical
- ✅ SQL familiarity preferred
- ✅ Want operational simplicity

**Examples:** Data warehousing, ML feature engineering, time-series analytics

**Choose Elasticsearch When:**
- ✅ Full-text search required
- ✅ Real-time indexing needed
- ✅ Smaller datasets (millions)
- ✅ Need comprehensive audit logs
- ✅ Kibana ecosystem valuable

**Examples:** Log analytics, search engines, application monitoring

---

## Slide 10: The mpathic Story (1.5 minutes)
**Title:** Why mpathic Chose ClickHouse

**Before:** Elasticsearch + EC2
- Slow queries on genomic data
- High operational overhead
- Rising storage costs

**After:** ClickHouse Cloud
- Faster analytical queries ⚡
- 13x storage savings 💰
- Simplified operations ☁️
- Maintained HIPAA compliance 🔒

**Quote:** "ClickHouse Cloud delivered speed and simplicity for our ML pipelines"

---

## Slide 11: Lessons Learned (1 minute)
**Title:** Project Insights

**What worked:**
- ✅ Cloud approach avoided local installation issues
- ✅ Synthetic data generation was flexible and reproducible
- ✅ Storage compression findings were striking (13.3x)

**Challenges:**
- Small dataset didn't show ClickHouse query speed advantages
- Cloud latency affected measurements
- Need larger datasets for JOIN benchmarks

**If we had more time:**
- Test with 1M+ row datasets
- Benchmark JOIN operations
- Add concurrent query tests

---

## Slide 12: Conclusions (1 minute)
**Title:** Key Takeaways

1. **Storage:** ClickHouse's 13.3x compression advantage is game-changing
2. **Performance:** Context-dependent; scale matters
3. **Security:** Both are enterprise-ready for healthcare
4. **Decision:** Use case determines the right tool

**Final thought:**
"Modern columnar databases like ClickHouse are transforming ML workflows, especially when data volumes are massive and operational simplicity matters."

---

## Slide 13: Q&A (remaining time)
**Title:** Questions?

**Contact:**
- Karl Seryani - kseryani@uwo.ca
- Arik Dhaliwal - [email]
- Raghav Gulati - [email]

**Project Repository:**
- All code, data, and documentation available
- Reproducible benchmarks
- LaTeX report included

---

## Presentation Tips

### Speaking Roles Distribution
- **Karl:** Intro, methodology, storage findings (Slides 1-3, 5-6)
- **Arik:** Query performance, security (Slides 7-8)
- **Raghav:** Decision matrix, mpathic story, conclusions (Slides 9-12)
- **All:** Q&A (Slide 13)

### Key Messages to Emphasize
1. **The 13.3x storage advantage** - this is your headline finding
2. **Context matters** - explain why ES was faster on small data
3. **Real-world application** - tie back to mpathic throughout
4. **Honest analysis** - acknowledge limitations

### Visual Guidelines
- Use charts for storage comparison (bar chart works well)
- Use tables for query performance (clean, readable)
- Include mpathic logo/branding
- Use green ✅ checkmarks for comparisons
- Keep slides uncluttered - one key point per slide

### Recording Setup
- Test audio/video before recording
- Use clean background (virtual or real)
- Ensure screen share captures slides clearly
- Practice transitions between speakers
- Time yourselves - aim for 13-14 minutes to leave buffer

---

## Technical Setup for Recording

**Tools:**
- Zoom (free - 40 min limit, record in chunks if needed)
- OBS Studio (free, unlimited)
- PowerPoint/Google Slides screen recording

**Upload:**
- YouTube (unlisted link)
- Microsoft Stream (if you have access)

**Deliverables Checklist:**
- [ ] Slides (PDF + PPTX)
- [ ] Video recording (link)
- [ ] LaTeX report (PDF)
- [ ] All code/data (ZIP file)
