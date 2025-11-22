import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import './App.css';

const API_URL = 'http://localhost:5002/api';

const COLORS = {
  clickhouse: '#D4763D',
  elasticsearch: '#2D8B75',
};

interface BenchmarkResult {
  system: string;
  benchmark: string;
  avg_ms: number;
}

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 }
};

// Benchmark descriptions
const BENCHMARK_INFO: Record<string, { title: string; description: string; sql: string; tests: string }> = {
  'Simple Aggregation': {
    title: 'Simple Aggregation',
    description: 'Basic COUNT and AVG operations grouped by a single field',
    sql: 'SELECT department, COUNT(*), AVG(cost) FROM events GROUP BY department',
    tests: 'Fundamental OLAP capability and basic aggregation performance'
  },
  'Multi-Level GROUP BY': {
    title: 'Multi-Level GROUP BY',
    description: 'Grouping data by multiple dimensions simultaneously',
    sql: 'SELECT dept, severity, COUNT(*) FROM events GROUP BY dept, severity',
    tests: 'Multi-dimensional analysis and cardinality handling'
  },
  'Time-Series Aggregation': {
    title: 'Time-Series Aggregation',
    description: 'Daily aggregations over time-stamped data',
    sql: 'SELECT DATE(timestamp), COUNT(*), SUM(amount) GROUP BY DATE(timestamp)',
    tests: 'Date-partitioned queries - a ClickHouse strength'
  },
  'Filter + Aggregation': {
    title: 'Filter + Aggregation',
    description: 'WHERE clause filtering combined with aggregations',
    sql: "SELECT ... WHERE severity='Critical' AND cost > 3000 GROUP BY ...",
    tests: 'Selective filtering before aggregation'
  },
  'JOIN Performance': {
    title: 'JOIN Performance',
    description: 'Joining multiple tables (SQL vs application-side)',
    sql: 'SELECT ... FROM patients JOIN events ON patient_id',
    tests: "ClickHouse's native SQL JOIN vs Elasticsearch workaround"
  },
  'Complex Analytical Query': {
    title: 'Complex Analytical',
    description: 'Subqueries, HAVING clauses, and multiple aggregations',
    sql: 'SELECT ... WHERE cost > (SELECT AVG(cost)...) HAVING count > 10',
    tests: 'Advanced SQL capabilities and query optimization'
  },
  'Concurrent Load': {
    title: 'Concurrent Load',
    description: '5 simultaneous queries executing in parallel',
    sql: '5x parallel: SELECT ... GROUP BY ...',
    tests: 'Scalability and resource management under load'
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState(0);
  const [syntheticData, setSyntheticData] = useState<any>(null);
  const [nycData, setNycData] = useState<any>(null);
  const [storageData, setStorageData] = useState<any>(null);
  const [mpathicData, setMpathicData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const pages = [
    'intro',
    'agenda',
    'mpathic',
    'mpathic-benefits',
    'architecture',
    'storage',
    'storage-breakdown',
    // Healthcare benchmarks
    'healthcare-intro',
    'healthcare-simple',
    'healthcare-multilevel',
    'healthcare-timeseries',
    'healthcare-filter',
    'healthcare-join',
    'healthcare-complex',
    'healthcare-concurrent',
    'healthcare-summary',
    // NYC Taxi benchmarks
    'nyc-intro',
    'nyc-simple',
    'nyc-multilevel',
    'nyc-timeseries',
    'nyc-filter',
    'nyc-join',
    'nyc-complex',
    'nyc-concurrent',
    'nyc-summary',
    // Final slides
    'comparison',
    'takeaways',
    'questions'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [synthetic, nyc, storage, mpathic] = await Promise.all([
          axios.get(`${API_URL}/results/synthetic`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/results/nyc`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/storage`),
          axios.get(`${API_URL}/mpathic`)
        ]);

        if (synthetic.data && !synthetic.data.error) {
          setSyntheticData(synthetic.data);
        }
        if (nyc.data && !nyc.data.error) {
          setNycData(nyc.data);
        }

        setStorageData(storage.data);
        setMpathicData(mpathic.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentPage(p => Math.min(p + 1, pages.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(p => Math.max(p - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length]);

  const getBenchmarkData = (data: any, benchmarkName: string) => {
    if (!data?.benchmarks) return null;
    const ch = data.benchmarks.find((b: BenchmarkResult) => b.system === 'ClickHouse' && b.benchmark === benchmarkName);
    const es = data.benchmarks.find((b: BenchmarkResult) => b.system === 'Elasticsearch' && b.benchmark === benchmarkName);
    if (!ch || !es) return null;
    return {
      name: benchmarkName.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', ''),
      ClickHouse: ch.avg_ms,
      Elasticsearch: es.avg_ms,
      winner: ch.avg_ms < es.avg_ms ? 'ClickHouse' : 'Elasticsearch',
      speedup: ch.avg_ms < es.avg_ms ? (es.avg_ms / ch.avg_ms).toFixed(1) : (ch.avg_ms / es.avg_ms).toFixed(1)
    };
  };

  const getAllBenchmarkData = (data: any) => {
    if (!data?.benchmarks) return [];
    const names = [
      'Simple Aggregation', 'Multi-Level GROUP BY', 'Time-Series Aggregation',
      'Filter + Aggregation', 'JOIN Performance', 'Complex Analytical Query', 'Concurrent Load'
    ];
    return names.map(name => {
      const result = getBenchmarkData(data, name);
      return result || { name: name.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', ''), ClickHouse: 0, Elasticsearch: 0 };
    });
  };

  const renderBenchmarkSlide = (benchmarkName: string, data: any, datasetLabel: string) => {
    const benchmarkData = getBenchmarkData(data, benchmarkName);
    const info = BENCHMARK_INFO[benchmarkName];

    if (!benchmarkData || !info) {
      return (
        <motion.div className="page" variants={staggerContainer} initial="initial" animate="animate">
          <motion.h2 variants={fadeInUp}>Loading...</motion.h2>
        </motion.div>
      );
    }

    const chartData = [benchmarkData];

    return (
      <motion.div className="page benchmark-page" variants={staggerContainer} initial="initial" animate="animate">
        <motion.h2 variants={fadeInUp}>{info.title}</motion.h2>
        <motion.p variants={fadeInUp} className="page-subtitle">{datasetLabel}</motion.p>

        <motion.div variants={fadeInUp} className="benchmark-info">
          <p className="benchmark-desc">{info.description}</p>
          <code className="benchmark-sql">{info.sql}</code>
          <p className="benchmark-tests"><strong>Tests:</strong> {info.tests}</p>
        </motion.div>

        <motion.div variants={fadeInUp} className="chart-wrapper single-benchmark">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 80, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 119, 101, 0.15)" />
              <XAxis type="number" stroke="rgba(61, 50, 41, 0.5)" tick={{ fill: 'rgba(61, 50, 41, 0.6)' }} />
              <YAxis dataKey="name" type="category" width={100} stroke="rgba(61, 50, 41, 0.5)" tick={{ fill: 'rgba(61, 50, 41, 0.6)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(139, 119, 101, 0.2)',
                  borderRadius: '8px',
                  color: '#3D3229'
                }}
                formatter={(value: number) => [`${value.toFixed(1)} ms`]}
              />
              <Legend />
              <Bar dataKey="ClickHouse" fill={COLORS.clickhouse} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Elasticsearch" fill={COLORS.elasticsearch} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={fadeInUp} className="benchmark-result">
          <div className={`winner-badge ${benchmarkData.winner === 'Elasticsearch' ? 'es-winner' : ''}`}>
            <div className="winner-label">WINNER</div>
            <div className="winner-name">{benchmarkData.winner}</div>
            <div className="winner-speedup">{benchmarkData.speedup}x faster</div>
          </div>
          <div className="times">
            <div className="time ch">
              <div className="label">ClickHouse</div>
              <div className="value">{benchmarkData.ClickHouse.toFixed(1)}ms</div>
            </div>
            <div className="vs-text">vs</div>
            <div className="time es">
              <div className="label">Elasticsearch</div>
              <div className="value">{benchmarkData.Elasticsearch.toFixed(1)}ms</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderSummarySlide = (data: any, title: string, subtitle: string) => {
    const chartData = getAllBenchmarkData(data);

    return (
      <motion.div className="page summary-page" variants={staggerContainer} initial="initial" animate="animate">
        <motion.h2 variants={fadeInUp}>{title}</motion.h2>
        <motion.p variants={fadeInUp} className="page-subtitle">{subtitle}</motion.p>

        <motion.div variants={fadeInUp} className="chart-wrapper">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 119, 101, 0.15)" />
              <XAxis
                dataKey="name"
                stroke="rgba(61, 50, 41, 0.5)"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11, fill: 'rgba(61, 50, 41, 0.6)' }}
              />
              <YAxis
                stroke="rgba(61, 50, 41, 0.5)"
                tick={{ fill: 'rgba(61, 50, 41, 0.6)' }}
                label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: 'rgba(61, 50, 41, 0.6)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(139, 119, 101, 0.2)',
                  borderRadius: '8px',
                  color: '#3D3229'
                }}
                formatter={(value: number) => [`${value.toFixed(1)} ms`]}
              />
              <Legend />
              <Bar dataKey="ClickHouse" fill={COLORS.clickhouse} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Elasticsearch" fill={COLORS.elasticsearch} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={fadeInUp} className="summary-insight">
          <p>Lower bars = faster performance. Compare execution times across all 7 benchmarks.</p>
        </motion.div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="app loading">
        <motion.div
          className="loader"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Loading benchmark data...
        </motion.p>
      </div>
    );
  }

  const renderPage = () => {
    switch (pages[currentPage]) {
      case 'intro':
        return (
          <motion.div className="page intro-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h1 variants={fadeInUp} className="main-title">
              <span className="ch">ClickHouse</span>
              <span className="vs">vs</span>
              <span className="es">Elasticsearch</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="subtitle">
              Performance Benchmark Analysis
            </motion.p>
            <motion.div variants={fadeInUp} className="team-card">
              <p>Karl Seryani • Arik Dhaliwal • Raghav Gulati</p>
              <span>Database Systems • Fall 2025</span>
            </motion.div>
            <motion.div variants={fadeInUp} className="hint">
              Press <kbd>→</kbd> or <kbd>Space</kbd> to continue
            </motion.div>
          </motion.div>
        );

      case 'agenda':
        return (
          <motion.div className="page agenda-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>Agenda</motion.h2>
            <motion.div variants={fadeInUp} className="agenda-list">
              <motion.div className="agenda-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <span className="number">01</span>
                <span className="title">mpathic Case Study</span>
                <span className="desc">Real-world migration story</span>
              </motion.div>
              <motion.div className="agenda-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <span className="number">02</span>
                <span className="title">Architecture & Storage</span>
                <span className="desc">Columnar vs Document, 13.3x compression</span>
              </motion.div>
              <motion.div className="agenda-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <span className="number">03</span>
                <span className="title">Healthcare Benchmarks</span>
                <span className="desc">7 benchmarks on 160K rows</span>
              </motion.div>
              <motion.div className="agenda-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                <span className="number">04</span>
                <span className="title">NYC Taxi Benchmarks</span>
                <span className="desc">7 benchmarks on 3M rows</span>
              </motion.div>
              <motion.div className="agenda-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                <span className="number">05</span>
                <span className="title">Key Findings & Takeaways</span>
                <span className="desc">When to use each system</span>
              </motion.div>
            </motion.div>
          </motion.div>
        );

      case 'mpathic':
        return (
          <motion.div className="page mpathic-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>The mpathic Case Study</motion.h2>
            <motion.div variants={fadeInUp} className="mpathic-card">
              <div className="mpathic-logo">mpathic</div>
              <p className="tagline">AI Healthcare Startup</p>
              <div className="migration-arrow">
                <span className="from">Elasticsearch</span>
                <span className="arrow">→</span>
                <span className="to">ClickHouse Cloud</span>
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="benefits-grid">
              {mpathicData?.key_benefits.map((benefit: string, i: number) => (
                <motion.div
                  key={i}
                  className="benefit-card"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  {benefit}
                </motion.div>
              ))}
            </motion.div>
            <motion.p variants={fadeInUp} className="context">
              Processing <strong>billions of rows</strong> of genomic data
            </motion.p>
          </motion.div>
        );

      case 'mpathic-benefits':
        return (
          <motion.div className="page mpathic-benefits-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>Why mpathic Switched</motion.h2>
            <motion.p variants={fadeInUp} className="page-subtitle">Pain points with Elasticsearch</motion.p>

            <motion.div variants={fadeInUp} className="pain-points-grid">
              <motion.div className="pain-point" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="pain-icon">🐌</div>
                <h4>Performance</h4>
                <p>Slow analytical queries on billions of genomic rows</p>
              </motion.div>
              <motion.div className="pain-point" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="pain-icon">⚙️</div>
                <h4>Operational Overhead</h4>
                <p>Self-managed EC2 clusters required constant maintenance</p>
              </motion.div>
              <motion.div className="pain-point" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="pain-icon">💰</div>
                <h4>Storage Costs</h4>
                <p>Document storage inflated storage requirements</p>
              </motion.div>
              <motion.div className="pain-point" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <div className="pain-icon">🔗</div>
                <h4>Limited SQL</h4>
                <p>No native JOINs for complex ML pipeline queries</p>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeInUp} className="solution-box">
              <strong>Solution:</strong> Migrate to ClickHouse Cloud for managed OLAP with full SQL support
            </motion.div>
          </motion.div>
        );

      case 'architecture':
        return (
          <motion.div className="page architecture-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>Architecture Comparison</motion.h2>
            <motion.p variants={fadeInUp} className="page-subtitle">Fundamentally different storage engines</motion.p>

            <motion.div variants={fadeInUp} className="arch-comparison">
              <motion.div className="arch-card ch" initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                <h3>ClickHouse</h3>
                <div className="arch-type">Columnar OLAP</div>
                <ul className="arch-features">
                  <li>Stores data by columns</li>
                  <li>Excellent compression (LZ4, ZSTD)</li>
                  <li>Native SQL with JOINs</li>
                  <li>Optimized for aggregations</li>
                  <li>MergeTree engine</li>
                </ul>
              </motion.div>

              <motion.div className="vs-divider" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}>
                VS
              </motion.div>

              <motion.div className="arch-card es" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                <h3>Elasticsearch</h3>
                <div className="arch-type">Document Store</div>
                <ul className="arch-features">
                  <li>Stores JSON documents</li>
                  <li>Inverted index for search</li>
                  <li>DSL query language</li>
                  <li>Optimized for full-text search</li>
                  <li>Lucene-based engine</li>
                </ul>
              </motion.div>
            </motion.div>
          </motion.div>
        );

      case 'storage':
        return (
          <motion.div className="page storage-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>Storage Efficiency</motion.h2>
            <motion.p variants={fadeInUp} className="page-subtitle">
              The most significant finding of our study
            </motion.p>

            <motion.div variants={fadeInUp} className="storage-visual">
              <div className="storage-bars">
                <div className="bar-container">
                  <span className="label">ClickHouse</span>
                  <motion.div
                    className="bar ch"
                    initial={{ width: 0 }}
                    animate={{ width: '7%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                  <span className="value">{storageData?.clickhouse.total_mib} MiB</span>
                </div>
                <div className="bar-container">
                  <span className="label">Elasticsearch</span>
                  <motion.div
                    className="bar es"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: 0.8 }}
                  />
                  <span className="value">{storageData?.elasticsearch.total_mb} MB</span>
                </div>
              </div>

              <motion.div
                className="ratio-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 1.2 }}
              >
                <span className="number">{storageData?.compression_ratio}x</span>
                <span className="text">Better Compression</span>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeInUp} className="callout">
              <strong>mpathic Impact:</strong> At scale, this compression translates to massive storage cost savings
            </motion.div>
          </motion.div>
        );

      case 'storage-breakdown':
        return (
          <motion.div className="page storage-breakdown-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>Storage Breakdown by Table</motion.h2>
            <motion.p variants={fadeInUp} className="page-subtitle">Per-table compression analysis</motion.p>

            <motion.div variants={fadeInUp} className="breakdown-grid">
              <motion.div className="breakdown-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h4>Patients (10K rows)</h4>
                <div className="breakdown-bars">
                  <div className="breakdown-item">
                    <span className="label">ClickHouse</span>
                    <div className="mini-bar ch" style={{ width: '7%' }}></div>
                    <span className="val">96 KiB</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Elasticsearch</span>
                    <div className="mini-bar es" style={{ width: '100%' }}></div>
                    <span className="val">1.37 MB</span>
                  </div>
                </div>
                <div className="ratio">14.3x better</div>
              </motion.div>

              <motion.div className="breakdown-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h4>Medical Events (100K rows)</h4>
                <div className="breakdown-bars">
                  <div className="breakdown-item">
                    <span className="label">ClickHouse</span>
                    <div className="mini-bar ch" style={{ width: '7%' }}></div>
                    <span className="val">1.51 MiB</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Elasticsearch</span>
                    <div className="mini-bar es" style={{ width: '100%' }}></div>
                    <span className="val">20.31 MB</span>
                  </div>
                </div>
                <div className="ratio">13.5x better</div>
              </motion.div>

              <motion.div className="breakdown-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <h4>IoT Telemetry (50K rows)</h4>
                <div className="breakdown-bars">
                  <div className="breakdown-item">
                    <span className="label">ClickHouse</span>
                    <div className="mini-bar ch" style={{ width: '8%' }}></div>
                    <span className="val">521 KiB</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Elasticsearch</span>
                    <div className="mini-bar es" style={{ width: '100%' }}></div>
                    <span className="val">6.29 MB</span>
                  </div>
                </div>
                <div className="ratio">12.1x better</div>
              </motion.div>
            </motion.div>
          </motion.div>
        );

      // Healthcare dataset intro
      case 'healthcare-intro':
        return (
          <motion.div className="page dataset-intro-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>Healthcare Dataset Benchmarks</motion.h2>
            <motion.p variants={fadeInUp} className="page-subtitle">Synthetic medical records • 160,000 rows</motion.p>

            <motion.div variants={fadeInUp} className="dataset-details">
              <div className="detail-card">
                <h4>Tables</h4>
                <ul>
                  <li>Patients (10K rows)</li>
                  <li>Medical Events (100K rows)</li>
                  <li>IoT Telemetry (50K rows)</li>
                </ul>
              </div>
              <div className="detail-card">
                <h4>7 Benchmarks</h4>
                <ul>
                  <li>Simple to Complex Aggregations</li>
                  <li>JOIN Performance</li>
                  <li>Concurrent Load Testing</li>
                </ul>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="insight-box">
              Each benchmark runs 5 times, results show average execution time
            </motion.div>
          </motion.div>
        );

      // Healthcare individual benchmarks
      case 'healthcare-simple':
        return renderBenchmarkSlide('Simple Aggregation', syntheticData, 'Healthcare Dataset (160K rows)');
      case 'healthcare-multilevel':
        return renderBenchmarkSlide('Multi-Level GROUP BY', syntheticData, 'Healthcare Dataset (160K rows)');
      case 'healthcare-timeseries':
        return renderBenchmarkSlide('Time-Series Aggregation', syntheticData, 'Healthcare Dataset (160K rows)');
      case 'healthcare-filter':
        return renderBenchmarkSlide('Filter + Aggregation', syntheticData, 'Healthcare Dataset (160K rows)');
      case 'healthcare-join':
        return renderBenchmarkSlide('JOIN Performance', syntheticData, 'Healthcare Dataset (160K rows)');
      case 'healthcare-complex':
        return renderBenchmarkSlide('Complex Analytical Query', syntheticData, 'Healthcare Dataset (160K rows)');
      case 'healthcare-concurrent':
        return renderBenchmarkSlide('Concurrent Load', syntheticData, 'Healthcare Dataset (160K rows)');
      case 'healthcare-summary':
        return renderSummarySlide(syntheticData, 'Healthcare Results Summary', 'All 7 benchmarks on 160K rows');

      // NYC Taxi dataset intro
      case 'nyc-intro':
        return (
          <motion.div className="page dataset-intro-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>NYC Taxi Dataset Benchmarks</motion.h2>
            <motion.p variants={fadeInUp} className="page-subtitle">Real-world trip data • 3 Million rows</motion.p>

            <motion.div variants={fadeInUp} className="dataset-details">
              <div className="detail-card">
                <h4>Data Source</h4>
                <ul>
                  <li>NYC TLC Trip Records</li>
                  <li>Pickup/dropoff times</li>
                  <li>Fare amounts, distances</li>
                </ul>
              </div>
              <div className="detail-card">
                <h4>Scale Comparison</h4>
                <ul>
                  <li>19x larger than healthcare</li>
                  <li>Tests at-scale performance</li>
                  <li>Same 7 benchmark suite</li>
                </ul>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="insight-box">
              Larger datasets reveal true performance characteristics
            </motion.div>
          </motion.div>
        );

      // NYC individual benchmarks
      case 'nyc-simple':
        return renderBenchmarkSlide('Simple Aggregation', nycData, 'NYC Taxi Dataset (3M rows)');
      case 'nyc-multilevel':
        return renderBenchmarkSlide('Multi-Level GROUP BY', nycData, 'NYC Taxi Dataset (3M rows)');
      case 'nyc-timeseries':
        return renderBenchmarkSlide('Time-Series Aggregation', nycData, 'NYC Taxi Dataset (3M rows)');
      case 'nyc-filter':
        return renderBenchmarkSlide('Filter + Aggregation', nycData, 'NYC Taxi Dataset (3M rows)');
      case 'nyc-join':
        return renderBenchmarkSlide('JOIN Performance', nycData, 'NYC Taxi Dataset (3M rows)');
      case 'nyc-complex':
        return renderBenchmarkSlide('Complex Analytical Query', nycData, 'NYC Taxi Dataset (3M rows)');
      case 'nyc-concurrent':
        return renderBenchmarkSlide('Concurrent Load', nycData, 'NYC Taxi Dataset (3M rows)');
      case 'nyc-summary':
        return renderSummarySlide(nycData, 'NYC Taxi Results Summary', 'All 7 benchmarks on 3M rows');

      case 'comparison':
        return (
          <motion.div className="page comparison-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>mpathic vs Our Results</motion.h2>

            <motion.div variants={fadeInUp} className="comparison-grid">
              {mpathicData?.comparison_panels.map((panel: any, i: number) => (
                <motion.div
                  key={i}
                  className="comparison-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <h4>{panel.metric}</h4>
                  <div className="values">
                    <div className="mpathic-val">
                      <span className="label">mpathic</span>
                      <span className="val">{panel.mpathic}</span>
                    </div>
                    <div className="our-val">
                      <span className="label">Our Test</span>
                      <span className="val">{panel.our_test}</span>
                    </div>
                  </div>
                  <p className="insight">{panel.insight}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        );

      case 'takeaways':
        return (
          <motion.div className="page takeaways-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>Key Takeaways</motion.h2>

            <motion.div variants={fadeInUp} className="takeaway-grid">
              <motion.div
                className="takeaway-card ch"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3>Choose ClickHouse</h3>
                <ul>
                  <li>Large datasets (100M+ rows)</li>
                  <li>Complex SQL (JOINs, subqueries)</li>
                  <li>Storage costs matter</li>
                  <li>Time-series analytics</li>
                </ul>
              </motion.div>

              <motion.div
                className="takeaway-card es"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3>Choose Elasticsearch</h3>
                <ul>
                  <li>Full-text search</li>
                  <li>Small-medium datasets</li>
                  <li>Simple aggregations</li>
                  <li>Real-time indexing</li>
                </ul>
              </motion.div>
            </motion.div>

            <motion.div
              className="final-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p>Storage: <strong>13.3x compression</strong> • JOINs: <strong>2.3x faster</strong> • Context matters</p>
            </motion.div>
          </motion.div>
        );

      case 'questions':
        return (
          <motion.div className="page questions-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp} className="questions-title">Questions?</motion.h2>

            <motion.div variants={fadeInUp} className="summary-stats">
              <div className="stat">
                <span className="stat-number">13.3x</span>
                <span className="stat-label">Storage Compression</span>
              </div>
              <div className="stat">
                <span className="stat-number">2.3x</span>
                <span className="stat-label">JOIN Performance</span>
              </div>
              <div className="stat">
                <span className="stat-number">7</span>
                <span className="stat-label">Benchmarks Run</span>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="team-credit">
              <p>Karl Seryani • Arik Dhaliwal • Raghav Gulati</p>
              <p className="course">Database Systems • Fall 2025</p>
            </motion.div>

            <motion.div variants={fadeInUp} className="repo-link">
              <p>Thank you!</p>
            </motion.div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      {/* Navigation dots */}
      <div className="nav-dots">
        {pages.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === currentPage ? 'active' : ''}`}
            onClick={() => setCurrentPage(i)}
          />
        ))}
      </div>

      {/* Page content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4 }}
          className="page-container"
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <div className="nav-arrows">
        <button
          className="nav-arrow prev"
          onClick={() => setCurrentPage(p => Math.max(p - 1, 0))}
          disabled={currentPage === 0}
        >
          ←
        </button>
        <span className="page-indicator">{currentPage + 1} / {pages.length}</span>
        <button
          className="nav-arrow next"
          onClick={() => setCurrentPage(p => Math.min(p + 1, pages.length - 1))}
          disabled={currentPage === pages.length - 1}
        >
          →
        </button>
      </div>
    </div>
  );
}

export default App;
