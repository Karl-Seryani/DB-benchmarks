import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { InteractiveTerminal } from './components/InteractiveTerminal';
import './App.css';

const API_URL = 'http://localhost:5002/api';

const COLORS = {
  clickhouse: '#f97316',
  elasticsearch: '#14b8a6',
};

interface BenchmarkResult {
  system: string;
  benchmark: string;
  avg_ms: number;
}

// Cinematic page transitions
const pageVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.05 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

const slideInLeft = {
  initial: { opacity: 0, x: -60 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const slideInRight = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

// Benchmark descriptions
const BENCHMARK_INFO: Record<string, { title: string; description: string; sql: string; tests: string }> = {
  'Simple Aggregation': {
    title: 'Simple Aggregation',
    description: 'Basic aggregations with COUNT, SUM, and AVG across medical events',
    sql: 'SELECT department, COUNT(*) as events, SUM(cost_usd) as total_cost, AVG(cost_usd) as avg_cost FROM medical_events GROUP BY department',
    tests: 'Columnar processing excels at multiple aggregations.'
  },
  'Multi-Level GROUP BY': {
    title: 'Multi-Level GROUP BY',
    description: 'Multi-dimensional grouping by department and severity',
    sql: 'SELECT department, severity, COUNT(*) as events, AVG(cost_usd) as avg_cost FROM medical_events GROUP BY department, severity',
    tests: 'Complex multi-level aggregations test.'
  },
  'Time-Series Aggregation': {
    title: 'Time-Series Aggregation',
    description: 'Daily aggregations across medical events',
    sql: 'SELECT toDate(timestamp) as date, COUNT(*) as events, SUM(cost_usd) as total_cost FROM medical_events GROUP BY date ORDER BY date DESC',
    tests: 'Time-series analysis - ClickHouse columnar strength'
  },
  'Filter + Aggregation': {
    title: 'Filter + Aggregation',
    description: 'Time-filtered queries on recent medical events',
    sql: "SELECT department, COUNT(*) as events, AVG(cost_usd) as avg_cost FROM medical_events WHERE timestamp >= now() - INTERVAL 7 DAY GROUP BY department",
    tests: 'Elasticsearch excels at time-filtered queries'
  },
  'JOIN Performance': {
    title: 'JOIN Performance',
    description: 'JOIN between patients and medical events',
    sql: 'SELECT p.primary_condition, COUNT(*) as events, AVG(e.cost_usd) as avg_cost FROM patients p JOIN medical_events e ON p.patient_id = e.patient_id WHERE p.age > 50 GROUP BY p.primary_condition',
    tests: "ClickHouse's native SQL JOINs vs Elasticsearch application-side joins"
  },
  'Complex Analytical Query': {
    title: 'Complex Analytical Query',
    description: 'Subqueries with aggregations and HAVING clauses',
    sql: 'SELECT department, COUNT(*) as events, AVG(cost_usd) as avg_cost FROM medical_events WHERE cost_usd > (SELECT AVG(cost_usd) FROM medical_events) GROUP BY department HAVING events > 100',
    tests: 'Advanced SQL with subqueries - ClickHouse native SQL advantage'
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState(0);
  const [healthcare1mData, setHealthcare1mData] = useState<any>(null);
  const [healthcare10mData, setHealthcare10mData] = useState<any>(null);
  const [healthcare100mData, setHealthcare100mData] = useState<any>(null);
  const [storageData, setStorageData] = useState<any>(null);
  const [scalabilityData, setScalabilityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);

  const pages = [
    'intro',
    'problem-statement',
    'datasets-overview',
    'ingestion-performance',
    'storage-healthcare-1m',
    'storage-healthcare-10m',
    'storage-healthcare-100m',
    'performance-healthcare-1m',
    'performance-healthcare-10m',
    'performance-healthcare-100m',
    'interactive-terminal',
    'takeaways',
    'conclusions'
  ];

  // Speaker notes for each slide
  const speakerNotes: Record<string, string> = {
    'intro': 'Introduce yourself. "Today I\'ll be presenting my comparative analysis of ClickHouse versus Elasticsearch..."',
    'problem-statement': 'Explain the motivation. Both are popular for analytics but built on fundamentally different architectures.',
    'datasets-overview': 'Describe the three healthcare datasets: 1M, 10M, and 100M rows.',
    'ingestion-performance': 'Critical metric: ClickHouse loads data 20-23x faster. This matters for real-time pipelines.',
    'storage-healthcare-1m': 'Highlight compression advantage. Storage costs money in cloud environments.',
    'storage-healthcare-10m': 'As data scales, ClickHouse advantage becomes more pronounced.',
    'storage-healthcare-100m': 'At 100M scale, compression and ingestion speed differences are massive.',
    'performance-healthcare-1m': 'Performance patterns at 1M scale.',
    'performance-healthcare-10m': 'At 10M scale, patterns shift with more data.',
    'performance-healthcare-100m': 'At 100M scale, architectural differences dominate.',
    'interactive-terminal': 'Demo time! Try queries on different datasets.',
    'takeaways': 'Query pattern matters. Choose based on your workload.',
    'conclusions': 'No universal winner. ClickHouse for analytics, Elasticsearch for hybrid search-analytics.'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hc1m, hc10m, hc100m, storage, scalability] = await Promise.all([
          axios.get(`${API_URL}/results/healthcare_1m`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/results/healthcare_10m`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/results/healthcare_100m`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/storage`).catch(() => ({ data: {} })),
          axios.get(`${API_URL}/scalability`).catch(() => ({ data: {} }))
        ]);

        if (hc1m.data && !hc1m.data.error) setHealthcare1mData(hc1m.data);
        if (hc10m.data && !hc10m.data.error) setHealthcare10mData(hc10m.data);
        if (hc100m.data && !hc100m.data.error) setHealthcare100mData(hc100m.data);
        setStorageData(storage.data || {});
        setScalabilityData(scalability.data || {});
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
        e.preventDefault();
        setCurrentPage(p => Math.min(p + 1, pages.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(p => Math.max(p - 1, 0));
      } else if (e.key === 'n' || e.key === 'N') {
        setShowSpeakerNotes(s => !s);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length]);

  const getBenchmarkData = (data: any, benchmarkName: string) => {
    if (!data?.benchmarks) return null;

    if (Array.isArray(data.benchmarks)) {
      const ch = data.benchmarks.find((b: BenchmarkResult) => b.system === 'ClickHouse' && b.benchmark === benchmarkName);
      const es = data.benchmarks.find((b: BenchmarkResult) => b.system === 'Elasticsearch' && b.benchmark === benchmarkName);
      if (!ch || !es) return null;
      return {
        name: benchmarkName.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', ''),
        ClickHouse: ch.avg_ms,
        Elasticsearch: es.avg_ms,
        winner: ch.avg_ms < es.avg_ms ? 'ClickHouse' : 'Elasticsearch',
        speedup: ch.avg_ms < es.avg_ms ? (es.avg_ms / ch.avg_ms).toFixed(1) : (ch.avg_ms / es.avg_ms).toFixed(1),
        chQuery: null,
        esQuery: null
      };
    } else {
      const benchmarkKey = Object.keys(data.benchmarks).find(key => {
        const bench = data.benchmarks[key];
        return bench.name === benchmarkName;
      });

      if (!benchmarkKey) return null;
      const benchmark = data.benchmarks[benchmarkKey];

      return {
        name: benchmark.name.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', '').replace(' Window', ''),
        ClickHouse: benchmark.clickhouse.avg_time,
        Elasticsearch: benchmark.elasticsearch.avg_time,
        winner: benchmark.winner === 'clickhouse' ? 'ClickHouse' : 'Elasticsearch',
        speedup: benchmark.speedup.toFixed(1),
        chQuery: benchmark.clickhouse.query || null,
        esQuery: benchmark.elasticsearch.query || null
      };
    }
  };

  const getAllBenchmarkData = (data: any): any[] => {
    if (!data?.benchmarks) return [];

    if (Array.isArray(data.benchmarks)) {
      const names = [
        'Simple Aggregation', 'Multi-Level GROUP BY', 'Time-Series Aggregation',
        'Filter + Aggregation', 'JOIN Performance', 'Complex Analytical Query'
      ];
      return names.map(name => {
        const result = getBenchmarkData(data, name);
        return {
          ...(result || { name: name.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', ''), ClickHouse: 0, Elasticsearch: 0, winner: '', speedup: '1.0' }),
          fullName: name
        };
      });
    } else {
      const results: any[] = [];
      Object.keys(data.benchmarks).forEach(key => {
        const benchmark = data.benchmarks[key];
        if (benchmark?.clickhouse && benchmark?.elasticsearch) {
          results.push({
            name: benchmark.name.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', '').replace(' Analysis', '').replace(' Window', ''),
            fullName: benchmark.name,
            ClickHouse: benchmark.clickhouse.avg_time,
            Elasticsearch: benchmark.elasticsearch.avg_time,
            winner: benchmark.winner === 'clickhouse' ? 'ClickHouse' : 'Elasticsearch',
            speedup: benchmark.speedup ? benchmark.speedup.toFixed(1) : '1.0'
          });
        }
      });
      return results;
    }
  };

  // Interactive Benchmark State
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);

  const handleBarClick = (data: any) => {
    if (data?.fullName) {
      setSelectedBenchmark(data.fullName);
      return;
    }
    if (data?.activePayload?.[0]?.payload?.fullName) {
      setSelectedBenchmark(data.activePayload[0].payload.fullName);
    }
  };

  const renderBenchmarkModal = () => {
    if (!selectedBenchmark) return null;

    const info = BENCHMARK_INFO[selectedBenchmark];
    const currentPageName = pages[currentPage];
    const is100m = currentPageName.includes('100m');
    const is10m = currentPageName.includes('10m') && !is100m;

    let data, datasetLabel;
    if (is100m) {
      data = healthcare100mData;
      datasetLabel = 'Healthcare Dataset (100M rows)';
    } else if (is10m) {
      data = healthcare10mData;
      datasetLabel = 'Healthcare Dataset (10M rows)';
    } else {
      data = healthcare1mData;
      datasetLabel = 'Healthcare Dataset (1M rows)';
    }

    const benchmarkData = getBenchmarkData(data, selectedBenchmark);

    if (!benchmarkData || !info) return null;

    const chartData = [benchmarkData];

    return (
      <motion.div
        className="benchmark-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSelectedBenchmark(null)}
      >
        <motion.div
          className="benchmark-modal"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="close-modal-btn" onClick={() => setSelectedBenchmark(null)}>×</button>
          <h2>{info.title}</h2>
          <p className="modal-subtitle">{datasetLabel}</p>

          <div className="modal-content-grid">
            <div className="modal-chart-section">
              <div className="chart-wrapper single-benchmark">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 119, 101, 0.15)" />
                    <XAxis type="number" stroke="rgba(61, 50, 41, 0.5)" tick={{ fill: 'rgba(201, 209, 217, 0.6)' }} />
                    <YAxis dataKey="name" type="category" width={100} hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(22, 27, 34, 0.95)',
                        border: '1px solid rgba(48, 54, 61, 0.8)',
                        borderRadius: '8px',
                        color: '#c9d1d9'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)} ms`]}
                    />
                    <Legend />
                    <Bar dataKey="ClickHouse" fill={COLORS.clickhouse} radius={[0, 4, 4, 0]} barSize={40} />
                    <Bar dataKey="Elasticsearch" fill={COLORS.elasticsearch} radius={[0, 4, 4, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="benchmark-result modal-result">
                <div className={`winner-badge ${benchmarkData.winner === 'Elasticsearch' ? 'es-winner' : ''}`}>
                  <div className="winner-label">WINNER</div>
                  <div className="winner-name">{benchmarkData.winner}</div>
                  <div className="winner-speedup">{benchmarkData.speedup}x faster</div>
                </div>
              </div>
            </div>

            <div className="modal-info-section">
              <div className="info-block">
                <h4>Description</h4>
                <p>{info.description}</p>
              </div>

              {benchmarkData.chQuery ? (
                <>
                  <div className="info-block">
                    <h4>ClickHouse Query</h4>
                    <code className="benchmark-sql copyable">{benchmarkData.chQuery}</code>
                  </div>
                  <div className="info-block">
                    <h4>Elasticsearch Query</h4>
                    <code className="benchmark-sql copyable es-query">{
                      typeof benchmarkData.esQuery === 'object'
                        ? JSON.stringify(benchmarkData.esQuery, null, 2)
                        : benchmarkData.esQuery
                    }</code>
                  </div>
                </>
              ) : (
                <div className="info-block">
                  <h4>SQL Query</h4>
                  <code className="benchmark-sql">{info.sql}</code>
                </div>
              )}

              <div className="info-block">
                <h4>What we tested</h4>
                <p>{info.tests}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Enhanced Storage Slide with Visual Impact
  const renderStorageSlide = (datasetKey: string, title: string, subtitle: string, rowCount: string) => {
    if (!storageData || !storageData[datasetKey]) {
      return (
        <motion.div className="page storage-page" variants={staggerContainer} initial="initial" animate="animate">
          <motion.h2 variants={fadeInUp}>{title}</motion.h2>
          <motion.p variants={fadeInUp} className="page-subtitle">{subtitle}</motion.p>
          <motion.div variants={fadeInUp} className="loading-placeholder">
            <div className="pulse-circle"></div>
            <p>{datasetKey === 'healthcare_100m' ? 'Coming Soon - Data Loading in Progress...' : 'Loading storage data...'}</p>
          </motion.div>
        </motion.div>
      );
    }

    const storage = storageData[datasetKey];
    const chTotal = storage.clickhouse_mb / 1024;
    const esTotal = storage.elasticsearch_mb / 1024;
    const compressionRatio = storage.compression_ratio;

    return (
      <motion.div className="page storage-page-new" variants={staggerContainer} initial="initial" animate="animate">
        <motion.div className="slide-header" variants={fadeInUp}>
          <span className="slide-number">{currentPage + 1}</span>
          <h2>{title}</h2>
          <p className="page-subtitle">{subtitle} • {rowCount}</p>
        </motion.div>

        <div className="storage-content-grid">
          <motion.div className="storage-visual-section" variants={slideInLeft}>
            <div className="storage-bars-visual">
              <div className="bar-item">
                <div className="bar-label">
                  <span className="db-name ch">ClickHouse</span>
                  <span className="bar-value">{chTotal < 1 ? `${(chTotal * 1024).toFixed(1)} MB` : `${chTotal.toFixed(2)} GB`}</span>
                </div>
                <div className="bar-track">
                  <motion.div
                    className="bar-fill ch"
                    initial={{ width: 0 }}
                    animate={{ width: `${(chTotal / esTotal) * 100}%` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  />
                </div>
              </div>
              <div className="bar-item">
                <div className="bar-label">
                  <span className="db-name es">Elasticsearch</span>
                  <span className="bar-value">{esTotal < 1 ? `${(esTotal * 1024).toFixed(1)} MB` : `${esTotal.toFixed(2)} GB`}</span>
                </div>
                <div className="bar-track">
                  <motion.div
                    className="bar-fill es"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div className="compression-highlight" variants={scaleIn}>
            <div className="compression-circle">
              <motion.span
                className="compression-number"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, delay: 0.8, type: "spring", stiffness: 200 }}
              >
                {compressionRatio}x
              </motion.span>
              <span className="compression-label">Better Compression</span>
            </div>
            <p className="compression-winner">ClickHouse Advantage</p>
          </motion.div>
        </div>

        <motion.div className="slide-insight" variants={fadeInUp}>
          {datasetKey === 'healthcare_1m' && (
            <p><strong>{compressionRatio}x compression</strong> means significant cloud storage cost savings</p>
          )}
          {datasetKey === 'healthcare_10m' && (
            <p>Compression advantage <strong>increases with scale</strong> - columnar storage shines</p>
          )}
          {datasetKey === 'healthcare_100m' && (
            <p><strong>At enterprise scale:</strong> Compression differences translate to massive cost savings</p>
          )}
        </motion.div>
      </motion.div>
    );
  };

  // Enhanced Summary Slide
  const renderSummarySlide = (data: any, title: string, subtitle: string) => {
    if (!data) {
      return (
        <motion.div className="page summary-page" variants={staggerContainer} initial="initial" animate="animate">
          <motion.div className="slide-header" variants={fadeInUp}>
            <span className="slide-number">{currentPage + 1}</span>
            <h2>{title}</h2>
            <p className="page-subtitle">{subtitle}</p>
          </motion.div>
          <motion.div variants={fadeInUp} className="loading-placeholder">
            <p>{title.includes('100M') ? 'Coming Soon - Data Loading in Progress...' : 'Run benchmarks to see results'}</p>
          </motion.div>
        </motion.div>
      );
    }

    const chartData = getAllBenchmarkData(data);

    if (chartData.length === 0) {
      return (
        <motion.div className="page summary-page" variants={staggerContainer} initial="initial" animate="animate">
          <motion.div className="slide-header" variants={fadeInUp}>
            <span className="slide-number">{currentPage + 1}</span>
            <h2>{title}</h2>
            <p className="page-subtitle">{subtitle}</p>
          </motion.div>
          <motion.div variants={fadeInUp} className="loading-placeholder">
            <p>No benchmark data available</p>
          </motion.div>
        </motion.div>
      );
    }

    // Calculate winners
    const chWins = chartData.filter((d: any) => d?.winner === 'ClickHouse').length;
    const esWins = chartData.filter((d: any) => d?.winner === 'Elasticsearch').length;

    return (
      <motion.div className="page summary-page-new" variants={staggerContainer} initial="initial" animate="animate">
        <motion.div className="slide-header" variants={fadeInUp}>
          <span className="slide-number">{currentPage + 1}</span>
          <h2>{title}</h2>
          <p className="page-subtitle">{subtitle}</p>
        </motion.div>

        <motion.div className="winner-summary" variants={fadeInUp}>
          <div className="winner-pill ch">
            <span className="winner-count">{chWins}</span>
            <span className="winner-label">ClickHouse Wins</span>
          </div>
          <div className="winner-pill es">
            <span className="winner-count">{esWins}</span>
            <span className="winner-label">Elasticsearch Wins</span>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="chart-wrapper interactive-chart">
          <div className="interaction-hint">Click any bar for details</div>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(48, 54, 61, 0.3)" horizontal={false} />
              <XAxis
                type="number"
                stroke="rgba(139, 148, 158, 0.5)"
                tick={{ fontSize: 11, fill: 'rgba(201, 209, 217, 0.8)' }}
                tickFormatter={(value) => `${value.toFixed(0)}ms`}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="rgba(139, 148, 158, 0.5)"
                tick={{ fontSize: 11, fill: 'rgba(201, 209, 217, 0.8)' }}
                width={110}
              />
              <Tooltip
                cursor={{ fill: 'rgba(249, 115, 22, 0.1)' }}
                contentStyle={{
                  backgroundColor: 'rgba(22, 27, 34, 0.95)',
                  border: '1px solid rgba(48, 54, 61, 0.8)',
                  borderRadius: '8px',
                  color: '#c9d1d9'
                }}
                formatter={(value: number) => [`${value.toFixed(1)} ms`]}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar
                dataKey="ClickHouse"
                fill={COLORS.clickhouse}
                radius={[0, 4, 4, 0]}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
                barSize={18}
              />
              <Bar
                dataKey="Elasticsearch"
                fill={COLORS.elasticsearch}
                radius={[0, 4, 4, 0]}
                barSize={18}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={fadeInUp} className="slide-insight">
          <p>Lower bars = faster performance</p>
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
          <motion.div className="page intro-page-new" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div className="intro-content" variants={fadeInUp}>
              <motion.h1
                className="main-title-new"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="title-db ch">ClickHouse</span>
                <motion.span
                  className="title-vs"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                >
                  vs
                </motion.span>
                <span className="title-db es">Elasticsearch</span>
              </motion.h1>
              <motion.p
                className="subtitle-new"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Performance Benchmark Analysis
              </motion.p>
            </motion.div>

            <motion.div
              className="team-card-new"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="team-names">Karl Seryani • Arik Dhaliwal • Raghav Gulati</div>
              <div className="team-course">Database Systems • Fall 2025</div>
            </motion.div>

            <motion.div
              className="nav-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <kbd>→</kbd> or <kbd>Space</kbd> to continue • <kbd>N</kbd> for speaker notes
            </motion.div>
          </motion.div>
        );

      case 'problem-statement':
        return (
          <motion.div className="page problem-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div className="slide-header" variants={fadeInUp}>
              <span className="slide-number">{currentPage + 1}</span>
              <h2>The Question</h2>
              <p className="page-subtitle">When should you use ClickHouse vs Elasticsearch?</p>
            </motion.div>

            <div className="arch-comparison-new">
              <motion.div className="arch-card-new ch" variants={slideInLeft}>
                <div className="arch-icon">⚡</div>
                <h3>ClickHouse</h3>
                <div className="arch-type-badge">Columnar OLAP</div>
                <ul className="arch-features-new">
                  <li>Optimized for analytics</li>
                  <li>Aggressive compression</li>
                  <li>Native SQL support</li>
                  <li>Fast full-table scans</li>
                </ul>
              </motion.div>

              <motion.div
                className="vs-circle"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
              >
                VS
              </motion.div>

              <motion.div className="arch-card-new es" variants={slideInRight}>
                <div className="arch-icon">🔍</div>
                <h3>Elasticsearch</h3>
                <div className="arch-type-badge">Document Search</div>
                <ul className="arch-features-new">
                  <li>Built on Lucene</li>
                  <li>Inverted indexes</li>
                  <li>Fast filtered queries</li>
                  <li>Full-text search</li>
                </ul>
              </motion.div>
            </div>

            <motion.div className="slide-insight" variants={fadeInUp}>
              <p>Both popular for analytics, but <strong>fundamentally different architectures</strong></p>
            </motion.div>
          </motion.div>
        );

      case 'datasets-overview':
        return (
          <motion.div className="page datasets-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div className="slide-header" variants={fadeInUp}>
              <span className="slide-number">{currentPage + 1}</span>
              <h2>Test Datasets</h2>
              <p className="page-subtitle">Three scales of healthcare data to test different workload patterns</p>
            </motion.div>

            <div className="datasets-showcase">
              <motion.div
                className="dataset-card-new"
                variants={fadeInUp}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="dataset-size">1M</div>
                <h3>Healthcare (Small)</h3>
                <p>200K patients, 500K events, 300K prescriptions</p>
                <div className="dataset-meta">
                  <span>3 tables</span>
                  <span>•</span>
                  <span>Small enterprise</span>
                </div>
              </motion.div>

              <motion.div
                className="dataset-card-new featured"
                variants={fadeInUp}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="dataset-size">10M</div>
                <h3>Healthcare (Medium)</h3>
                <p>2M patients, 5M events, 3M prescriptions</p>
                <div className="dataset-meta">
                  <span>3 tables</span>
                  <span>•</span>
                  <span>Medium enterprise</span>
                </div>
              </motion.div>

              <motion.div
                className="dataset-card-new"
                variants={fadeInUp}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="dataset-size">100M</div>
                <h3>Healthcare (Large)</h3>
                <p>10M patients, 60M events, 30M prescriptions</p>
                <div className="dataset-meta">
                  <span>3 tables</span>
                  <span>•</span>
                  <span>Enterprise scale</span>
                </div>
              </motion.div>
            </div>

            <motion.div className="slide-insight" variants={fadeInUp}>
              <p>Each dataset tests <strong>different query patterns</strong> and scale characteristics</p>
            </motion.div>
          </motion.div>
        );

      case 'ingestion-performance':
        return (
          <motion.div className="page ingestion-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div className="slide-header" variants={fadeInUp}>
              <span className="slide-number">{currentPage + 1}</span>
              <h2>Data Ingestion Performance</h2>
              <p className="page-subtitle">How long does it take to load data at each scale?</p>
            </motion.div>

            {!scalabilityData || (!scalabilityData.healthcare_1m && !scalabilityData.healthcare_10m) ? (
              <motion.div variants={fadeInUp} className="loading-placeholder">
                <div className="pulse-circle"></div>
                <p>Loading ingestion data...</p>
              </motion.div>
            ) : (
              <>
                <motion.div className="ingestion-comparison-grid" variants={fadeInUp}>
                  {/* 1M Dataset */}
                  {scalabilityData.healthcare_1m && (
                    <motion.div className="ingestion-dataset-card" variants={slideInLeft}>
                      <h3>1M Rows</h3>
                      <div className="ingestion-stats-row">
                        <div className="ingestion-stat ch">
                          <div className="stat-icon">⚡</div>
                          <div className="stat-label">ClickHouse</div>
                          <div className="stat-time">{scalabilityData.healthcare_1m.clickhouse.load_time_seconds.toFixed(1)}s</div>
                          <div className="stat-throughput">{(scalabilityData.healthcare_1m.clickhouse.throughput_rows_sec / 1000).toFixed(0)}K rows/sec</div>
                        </div>
                        <div className="ingestion-vs-badge">
                          <span className="speedup-value">{scalabilityData.healthcare_1m.speedup}x</span>
                          <span className="speedup-label">faster</span>
                        </div>
                        <div className="ingestion-stat es">
                          <div className="stat-icon">🐌</div>
                          <div className="stat-label">Elasticsearch</div>
                          <div className="stat-time">{scalabilityData.healthcare_1m.elasticsearch.load_time_seconds.toFixed(1)}s</div>
                          <div className="stat-throughput">{(scalabilityData.healthcare_1m.elasticsearch.throughput_rows_sec / 1000).toFixed(0)}K rows/sec</div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 10M Dataset */}
                  {scalabilityData.healthcare_10m && (
                    <motion.div className="ingestion-dataset-card" variants={fadeInUp}>
                      <h3>10M Rows</h3>
                      <div className="ingestion-stats-row">
                        <div className="ingestion-stat ch">
                          <div className="stat-icon">⚡</div>
                          <div className="stat-label">ClickHouse</div>
                          <div className="stat-time">{scalabilityData.healthcare_10m.clickhouse.load_time_seconds.toFixed(1)}s</div>
                          <div className="stat-throughput">{(scalabilityData.healthcare_10m.clickhouse.throughput_rows_sec / 1000).toFixed(0)}K rows/sec</div>
                        </div>
                        <div className="ingestion-vs-badge">
                          <span className="speedup-value">{scalabilityData.healthcare_10m.speedup}x</span>
                          <span className="speedup-label">faster</span>
                        </div>
                        <div className="ingestion-stat es">
                          <div className="stat-icon">🐌</div>
                          <div className="stat-label">Elasticsearch</div>
                          <div className="stat-time">{(scalabilityData.healthcare_10m.elasticsearch.load_time_seconds / 60).toFixed(1)} min</div>
                          <div className="stat-throughput">{(scalabilityData.healthcare_10m.elasticsearch.throughput_rows_sec / 1000).toFixed(0)}K rows/sec</div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 100M Dataset - Coming Soon or Actual */}
                  <motion.div className="ingestion-dataset-card" variants={slideInRight}>
                    <h3>100M Rows</h3>
                    {scalabilityData.healthcare_100m ? (
                      <div className="ingestion-stats-row">
                        <div className="ingestion-stat ch">
                          <div className="stat-icon">⚡</div>
                          <div className="stat-label">ClickHouse</div>
                          <div className="stat-time">{(scalabilityData.healthcare_100m.clickhouse.load_time_seconds / 60).toFixed(1)} min</div>
                          <div className="stat-throughput">{(scalabilityData.healthcare_100m.clickhouse.throughput_rows_sec / 1000).toFixed(0)}K rows/sec</div>
                        </div>
                        <div className="ingestion-vs-badge">
                          <span className="speedup-value">{scalabilityData.healthcare_100m.speedup}x</span>
                          <span className="speedup-label">faster</span>
                        </div>
                        <div className="ingestion-stat es">
                          <div className="stat-icon">🐌</div>
                          <div className="stat-label">Elasticsearch</div>
                          <div className="stat-time">{(scalabilityData.healthcare_100m.elasticsearch.load_time_seconds / 3600).toFixed(1)} hrs</div>
                          <div className="stat-throughput">{(scalabilityData.healthcare_100m.elasticsearch.throughput_rows_sec / 1000).toFixed(0)}K rows/sec</div>
                        </div>
                      </div>
                    ) : (
                      <div className="coming-soon-badge">
                        <div className="loading-spinner">⏳</div>
                        <div>Loading in Progress...</div>
                        <div className="coming-soon-note">Check back soon for 100M results</div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>

                <motion.div className="slide-insight" variants={fadeInUp}>
                  <p><strong>Key Insight:</strong> ClickHouse maintains 20-23x faster ingestion across all scales. This is critical for real-time data pipelines.</p>
                </motion.div>
              </>
            )}
          </motion.div>
        );

      case 'storage-healthcare-1m':
        return renderStorageSlide('healthcare_1m', 'Storage: Healthcare 1M', 'Synthetic medical records', '1M rows');

      case 'storage-healthcare-10m':
        return renderStorageSlide('healthcare_10m', 'Storage: Healthcare 10M', 'Medium enterprise scale', '10M rows');

      case 'storage-healthcare-100m':
        return renderStorageSlide('healthcare_100m', 'Storage: Healthcare 100M', 'Large enterprise scale', '100M rows');

      case 'performance-healthcare-1m':
        return renderSummarySlide(healthcare1mData, 'Performance: Healthcare 1M', '1M rows across 3 tables');

      case 'performance-healthcare-10m':
        return renderSummarySlide(healthcare10mData, 'Performance: Healthcare 10M', '10M rows across 3 tables');

      case 'performance-healthcare-100m':
        return renderSummarySlide(healthcare100mData, 'Performance: Healthcare 100M', '100M rows across 3 tables');

      case 'interactive-terminal':
        return (
          <motion.div className="page demo-page" variants={staggerContainer} initial="initial" animate="animate">
            <InteractiveTerminal />
          </motion.div>
        );

      case 'takeaways':
        return (
          <motion.div className="page takeaways-page-new" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div className="slide-header" variants={fadeInUp}>
              <span className="slide-number">{currentPage + 1}</span>
              <h2>Key Takeaways</h2>
            </motion.div>

            <div className="takeaways-grid">
              <motion.div className="takeaway-card-new ch" variants={slideInLeft}>
                <div className="takeaway-header">
                  <span className="takeaway-icon">⚡</span>
                  <h3>Choose ClickHouse</h3>
                </div>
                <ul>
                  <li>Full historical analytics (billions of rows)</li>
                  <li>Complex SQL with JOINs & subqueries</li>
                  <li>6-9x storage compression</li>
                  <li>20x faster bulk ingestion</li>
                  <li>Time-series on complete datasets</li>
                </ul>
              </motion.div>

              <motion.div className="takeaway-card-new es" variants={slideInRight}>
                <div className="takeaway-header">
                  <span className="takeaway-icon">🔍</span>
                  <h3>Choose Elasticsearch</h3>
                </div>
                <ul>
                  <li>Recent data analysis (7/30/90 days)</li>
                  <li>Full-text search + analytics</li>
                  <li>High-cardinality filtered aggregations</li>
                  <li>Document-oriented data</li>
                  <li>Geospatial queries</li>
                </ul>
              </motion.div>
            </div>

            <motion.div className="key-insight-box" variants={scaleIn}>
              <div className="insight-icon">💡</div>
              <div className="insight-content">
                <h4>Critical Insight</h4>
                <p><strong>Query pattern matters more than data size</strong></p>
                <p className="insight-detail">Scale from 1M to 100M shows consistent architectural advantages</p>
              </div>
            </motion.div>
          </motion.div>
        );

      case 'conclusions':
        return (
          <motion.div className="page conclusions-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div className="slide-header" variants={fadeInUp}>
              <span className="slide-number">{currentPage + 1}</span>
              <h2>Conclusions</h2>
            </motion.div>

            <motion.div className="final-stats" variants={fadeInUp}>
              <div className="final-stat">
                <span className="final-stat-value">6-9x</span>
                <span className="final-stat-label">Storage Compression</span>
              </div>
              <div className="final-stat">
                <span className="final-stat-value">20x</span>
                <span className="final-stat-label">Ingestion Speed</span>
              </div>
              <div className="final-stat">
                <span className="final-stat-value">3</span>
                <span className="final-stat-label">Dataset Scales</span>
              </div>
            </motion.div>

            <motion.div className="final-message-new" variants={fadeInUp}>
              <p className="main-conclusion">There's no universal winner</p>
              <p className="sub-conclusion">The right choice depends entirely on your workload</p>
              <div className="conclusion-summary">
                <span className="ch">ClickHouse → Full historical analytics</span>
                <span className="es">Elasticsearch → Recent filtered analysis</span>
              </div>
            </motion.div>

            <motion.div className="thank-you" variants={fadeInUp}>
              <p>Thank you for your attention</p>
              <p className="questions">Questions?</p>
            </motion.div>
          </motion.div>
        );

      default:
        return (
          <motion.div className="page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp}>Page Not Found</motion.h2>
          </motion.div>
        );
    }
  };

  return (
    <div className="app presentation-mode">
      <div className="progress-bar">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="nav-dots">
        {pages.map((page, i) => (
          <button
            key={i}
            className={`dot ${i === currentPage ? 'active' : ''} ${i < currentPage ? 'completed' : ''}`}
            onClick={() => setCurrentPage(i)}
            title={page.replace(/-/g, ' ')}
          />
        ))}
      </div>

      <AnimatePresence>
        {showSpeakerNotes && (
          <motion.div
            className="speaker-notes"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
          >
            <h4>Speaker Notes</h4>
            <p>{speakerNotes[pages[currentPage]] || 'No notes for this slide.'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="page-container"
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedBenchmark && renderBenchmarkModal()}
      </AnimatePresence>

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
