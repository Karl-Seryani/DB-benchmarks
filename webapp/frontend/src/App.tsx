import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { InteractiveTerminal } from './components/InteractiveTerminal';
import { API_URL, COLORS, CHART_THEME, BENCHMARK_INFO } from './config/constants';
import './App.css';

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

function App() {
  const [currentPage, setCurrentPage] = useState(0);
  const [healthcare1mData, setHealthcare1mData] = useState<any>(null);
  const [healthcare10mData, setHealthcare10mData] = useState<any>(null);
  const [healthcare100mData, setHealthcare100mData] = useState<any>(null);
  const [storageData, setStorageData] = useState<any>(null);
  const [scalabilityData, setScalabilityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScale, setSelectedScale] = useState<'1m' | '10m' | '100m'>('100m');
  const [printMode, setPrintMode] = useState(false);

  const pages = [
    'intro',
    'problem-statement',
    'datasets-overview',
    'ingestion-performance',
    'storage-comparison',
    'benchmark-categories',
    'performance-query',
    'performance-capability',
    'interactive-terminal',
    'takeaways',
    'conclusions'
  ];


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
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPage(p => Math.min(p + 1, pages.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(p => Math.max(p - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length]);

  // Sync selectedScale with available data (Bug fix: prevent active+disabled state)
  useEffect(() => {
    const availableScales: ('100m' | '10m' | '1m')[] = [];
    if (healthcare100mData) availableScales.push('100m');
    if (healthcare10mData) availableScales.push('10m');
    if (healthcare1mData) availableScales.push('1m');
    
    // If current selection is not available, switch to first available
    if (availableScales.length > 0 && !availableScales.includes(selectedScale)) {
      setSelectedScale(availableScales[0]);
    }
  }, [healthcare1mData, healthcare10mData, healthcare100mData, selectedScale]);

  // Memoized function to extract benchmark data for a specific benchmark
  const getBenchmarkData = useMemo(() => {
    return (data: any, benchmarkName: string) => {
      if (!data?.benchmarks) return null;

      // Search through all categories for the benchmark
      let benchmark = null;
      for (const category of ['query', 'capability']) {
        if (data.benchmarks[category]) {
          const found = Object.values(data.benchmarks[category]).find(
            (b: any) => b.name === benchmarkName
          );
          if (found) {
            benchmark = found as any;
            break;
          }
        }
      }

      if (!benchmark) return null;

      const esNotPossible = benchmark.es_not_possible || benchmark.elasticsearch?.not_possible;

        return {
        name: benchmark.name.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', '').replace(' Analysis', '').replace(' Features', ''),
        fullName: benchmark.name,
        ClickHouse: benchmark.clickhouse?.avg_time || 0,
        Elasticsearch: esNotPossible ? null : (benchmark.elasticsearch?.avg_time || 0),
        esNotPossible: esNotPossible,
        winner: benchmark.winner === 'clickhouse' ? 'ClickHouse' : 'Elasticsearch',
        speedup: benchmark.speedup ? benchmark.speedup.toFixed(1) : 'N/A',
        chQuery: benchmark.clickhouse?.query || null,
        esQuery: esNotPossible ? null : (benchmark.elasticsearch?.query || null),
        esLimitation: benchmark.es_limitation || benchmark.elasticsearch?.limitation || null,
        whyWins: benchmark.why_ch_wins || benchmark.why_es_wins || null,
        category: benchmark.category
      };
    };
  }, []);

  // Memoized function to get benchmark data by category
  const getBenchmarksByCategory = useMemo(() => {
    return (data: any, category: 'query' | 'capability'): any[] => {
      if (!data?.benchmarks?.[category]) return [];

      const results: any[] = [];
      const categoryData = data.benchmarks[category];

      Object.keys(categoryData).forEach(key => {
        const benchmark = categoryData[key];
        if (benchmark?.clickhouse) {
          const esNotPossible = benchmark.es_not_possible || benchmark.elasticsearch?.not_possible;
          results.push({
            name: benchmark.name.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', '').replace(' Analysis', '').replace(' Features', ''),
            fullName: benchmark.name,
            ClickHouse: benchmark.clickhouse.avg_time,
            Elasticsearch: esNotPossible ? null : (benchmark.elasticsearch?.avg_time || 0),
            esNotPossible: esNotPossible,
            winner: benchmark.winner === 'clickhouse' ? 'ClickHouse' : 'Elasticsearch',
            speedup: benchmark.speedup ? benchmark.speedup.toFixed(1) : (esNotPossible ? 'N/A' : '1.0'),
            limitation: benchmark.es_limitation || benchmark.why_ch_wins || benchmark.why_es_wins
          });
        }
      });
      return results;
    };
  }, []);

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
    
    // Use the selected scale for modal data
    const dataMap = {
      '1m': healthcare1mData,
      '10m': healthcare10mData,
      '100m': healthcare100mData
    };
    const data = dataMap[selectedScale] || healthcare100mData || healthcare10mData || healthcare1mData;
    const datasetLabel = `Healthcare Dataset (${selectedScale.toUpperCase()} rows)`;

    const benchmarkData = getBenchmarkData(data, selectedBenchmark);

    if (!benchmarkData || !info) return null;

    const chartData = [benchmarkData];
    const gradientSuffix = selectedBenchmark.toLowerCase().replace(/[^a-z0-9]/gi, '-');
    const modalChGradientId = `modal-ch-${gradientSuffix}`;
    const modalEsGradientId = `modal-es-${gradientSuffix}`;

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
              {benchmarkData.esNotPossible ? (
                /* ES Not Possible - Show single bar with indicator */
                <div className="single-result-display">
                  <div className="timing-row ch">
                    <span className="timing-label">ClickHouse</span>
                    <span className="timing-value">{benchmarkData.ClickHouse?.toFixed(1)} ms</span>
                  </div>
                  <div className="timing-row es-not-possible">
                    <span className="timing-label">Elasticsearch</span>
                    <span className="timing-value not-possible">❌ Not Possible</span>
                  </div>
                </div>
              ) : (
                /* Normal comparison chart */
              <div className="chart-wrapper single-benchmark">
                  <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 40, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id={modalChGradientId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={COLORS.clickhouse} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={COLORS.clickhouse} stopOpacity={0.9} />
                      </linearGradient>
                      <linearGradient id={modalEsGradientId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={COLORS.elasticsearch} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={COLORS.elasticsearch} stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                    <XAxis type="number" stroke={CHART_THEME.axisMuted} tick={{ fill: CHART_THEME.axisMuted }} />
                    <YAxis dataKey="name" type="category" width={100} hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: CHART_THEME.tooltipBg,
                        border: `1px solid ${CHART_THEME.tooltipBorder}`,
                        borderRadius: 10,
                        color: CHART_THEME.axis
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)} ms`]}
                    />
                    <Legend wrapperStyle={{ color: CHART_THEME.axisMuted }} />
                    <Bar dataKey="ClickHouse" fill={`url(#${modalChGradientId})`} radius={[0, 6, 6, 0]} barSize={36} />
                    <Bar dataKey="Elasticsearch" fill={`url(#${modalEsGradientId})`} radius={[0, 6, 6, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              )}

              <div className="benchmark-result modal-result">
                <div className={`winner-badge ${benchmarkData.winner === 'Elasticsearch' ? 'es-winner' : ''} ${benchmarkData.esNotPossible ? 'es-not-possible' : ''}`}>
                  <div className="winner-label">{benchmarkData.esNotPossible ? 'RESULT' : 'WINNER'}</div>
                  <div className="winner-name">{benchmarkData.esNotPossible ? 'ClickHouse Only' : benchmarkData.winner}</div>
                  <div className="winner-speedup">{benchmarkData.esNotPossible ? 'ES Cannot Perform' : (benchmarkData.speedup === 'N/A' ? 'N/A' : `${benchmarkData.speedup}x faster`)}</div>
                </div>
              </div>
            </div>

            <div className="modal-info-section">
              <div className="info-block">
                <h4>Description</h4>
                <p>{info.description}</p>
              </div>

              {/* Why this system wins */}
              {benchmarkData.whyWins && (
                <div className="info-block why-wins">
                  <h4>💡 Why</h4>
                  <p>{benchmarkData.whyWins}</p>
                </div>
              )}

              {/* ClickHouse Query */}
                  <div className="info-block">
                    <h4>ClickHouse Query</h4>
                <code className="benchmark-sql copyable">{benchmarkData.chQuery || info.sql}</code>
                  </div>

              {/* Elasticsearch Query or Limitation */}
              {benchmarkData.esNotPossible ? (
                <div className="info-block es-limitation">
                  <h4>❌ Elasticsearch Cannot Do This</h4>
                  <p className="limitation-text">{benchmarkData.esLimitation || 'This operation is not supported by Elasticsearch.'}</p>
                </div>
              ) : (
                  <div className="info-block">
                    <h4>Elasticsearch Query</h4>
                    <code className="benchmark-sql copyable es-query">{
                      typeof benchmarkData.esQuery === 'object'
                        ? JSON.stringify(benchmarkData.esQuery, null, 2)
                      : (benchmarkData.esQuery || 'N/A')
                    }</code>
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

  // Category-based benchmark slide
  const renderCategorySlide = (category: 'query' | 'capability', title: string, subtitle: string) => {
    // Get data based on selected scale
    const dataMap = {
      '1m': healthcare1mData,
      '10m': healthcare10mData,
      '100m': healthcare100mData
    };
    const data = dataMap[selectedScale] || healthcare100mData || healthcare10mData || healthcare1mData;
    const scaleLabel = data === healthcare1mData ? '1M' : data === healthcare10mData ? '10M' : '100M';
    
    // Determine which scales are available
    const availableScales = {
      '1m': !!healthcare1mData,
      '10m': !!healthcare10mData,
      '100m': !!healthcare100mData
    };
    
    if (!data) {
      return (
        <motion.div className="page summary-page" variants={staggerContainer} initial="initial" animate="animate">
          <motion.div className="slide-header" variants={fadeInUp}>
            <span className="slide-number">{currentPage + 1}</span>
            <h2>{title}</h2>
            <p className="page-subtitle">{subtitle}</p>
          </motion.div>
          <motion.div variants={fadeInUp} className="loading-placeholder">
            <p>Run benchmarks to see results</p>
          </motion.div>
        </motion.div>
      );
    }

    const chartData = getBenchmarksByCategory(data, category);
    const gradientSuffix = `${category}-${selectedScale}`;
    const categoryChGradientId = `cat-ch-${gradientSuffix}`;
    const categoryEsGradientId = `cat-es-${gradientSuffix}`;

    if (chartData.length === 0) {
      return (
        <motion.div className="page summary-page" variants={staggerContainer} initial="initial" animate="animate">
          <motion.div className="slide-header" variants={fadeInUp}>
            <span className="slide-number">{currentPage + 1}</span>
            <h2>{title}</h2>
            <p className="page-subtitle">{subtitle}</p>
          </motion.div>
          <motion.div variants={fadeInUp} className="loading-placeholder">
            <p>No benchmark data available for this category</p>
          </motion.div>
        </motion.div>
      );
    }

    // Count wins excluding ES not possible cases (counted separately)
    // Count CH wins including ES not possible cases (CH wins by default when ES can't compete)
    const chWinsRegular = chartData.filter((d: any) => d?.winner === 'ClickHouse' && !d?.esNotPossible).length;
    const esNotPossibleCount = chartData.filter((d: any) => d?.esNotPossible).length;
    const chWins = chWinsRegular + esNotPossibleCount; // ES not possible = CH wins
    const esWins = chartData.filter((d: any) => d?.winner === 'Elasticsearch').length;

    return (
      <motion.div className="page summary-page-new" variants={staggerContainer} initial="initial" animate="animate">
        <motion.div className="slide-header" variants={fadeInUp}>
          <span className="slide-number">{currentPage + 1}</span>
          <h2>{title}</h2>
          <p className="page-subtitle">{subtitle}</p>
        </motion.div>

        {/* Dataset Scale Selector */}
        <motion.div className="scale-selector" variants={fadeInUp}>
          <span className="scale-label">Dataset:</span>
          <div className="scale-buttons">
            {(['1m', '10m', '100m'] as const).map((scale) => (
              <button
                key={scale}
                className={`scale-btn ${selectedScale === scale ? 'active' : ''} ${!availableScales[scale] ? 'disabled' : ''}`}
                onClick={() => availableScales[scale] && setSelectedScale(scale)}
                disabled={!availableScales[scale]}
              >
                {scale.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="current-scale">Showing: {scaleLabel} rows</span>
        </motion.div>

        <motion.div className="winner-summary" variants={fadeInUp}>
          <div className={`winner-pill ch ${chWins > esWins ? 'leading' : ''}`}>
            <span className="winner-count">{chWins}</span>
            <span className="winner-label">ClickHouse{esNotPossibleCount > 0 ? ` (${esNotPossibleCount} ES can't do)` : ''}</span>
          </div>
          <div className={`winner-pill es ${esWins > chWins ? 'leading' : ''}`}>
            <span className="winner-count">{esWins}</span>
            <span className="winner-label">Elasticsearch</span>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="chart-wrapper interactive-chart">
          <div className="interaction-hint">Click any bar for details</div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 140, bottom: 20 }}
            >
              <defs>
                <linearGradient id={categoryChGradientId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={COLORS.clickhouse} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={COLORS.clickhouse} stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id={categoryEsGradientId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={COLORS.elasticsearch} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={COLORS.elasticsearch} stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} horizontal={false} />
              <XAxis
                type="number"
                stroke={CHART_THEME.axisMuted}
                tick={{ fontSize: 11, fill: CHART_THEME.axisMuted }}
                tickFormatter={(value) => `${value.toFixed(0)}ms`}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke={CHART_THEME.axisMuted}
                tick={{ fontSize: 11, fill: CHART_THEME.axis }}
                width={130}
              />
              <Tooltip
                cursor={{ fill: 'rgba(217, 168, 100, 0.08)' }}
                contentStyle={{
                  backgroundColor: CHART_THEME.tooltipBg,
                  border: `1px solid ${CHART_THEME.tooltipBorder}`,
                  borderRadius: 12,
                  color: CHART_THEME.axis
                }}
                formatter={(value: any, name: string) => {
                  if (value === null || value === undefined) return ['❌ Not Possible', name];
                  return [`${Number(value).toFixed(1)} ms`, name];
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ color: CHART_THEME.axisMuted }} />
              <Bar
                dataKey="ClickHouse"
                fill={`url(#${categoryChGradientId})`}
                radius={[0, 6, 6, 0]}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
                barSize={20}
              />
              <Bar
                dataKey="Elasticsearch"
                fill={`url(#${categoryEsGradientId})`}
                radius={[0, 6, 6, 0]}
                barSize={20}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={fadeInUp} className="slide-insight">
          {category === 'query' && (
            <p><strong>Query Performance:</strong> ES doc_values provide pre-indexed columnar access for fast aggregations</p>
          )}
          {category === 'capability' && (
            <p><strong>Capability Gap:</strong> These operations require SQL features ES fundamentally cannot support</p>
          )}
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
              <kbd>→</kbd> to continue
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

      case 'storage-comparison':
        return (
          <motion.div className="page storage-comparison-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div className="slide-header" variants={fadeInUp}>
              <span className="slide-number">{currentPage + 1}</span>
              <h2>Storage Efficiency</h2>
              <p className="page-subtitle">ClickHouse compression advantage across all scales</p>
            </motion.div>

            <motion.div className="storage-grid" variants={fadeInUp}>
              {['healthcare_1m', 'healthcare_10m', 'healthcare_100m'].map((key, idx) => {
                const storage = storageData?.[key];
                if (!storage) return null;
                const labels = ['1M', '10M', '100M'];
                return (
                  <div key={key} className="storage-card">
                    <h3>{labels[idx]} Rows</h3>
                    <div className="storage-comparison">
                      <div className="db-storage ch">
                        <span className="db-label">ClickHouse</span>
                        <span className="db-size">{storage.clickhouse_mb < 1000 ? `${storage.clickhouse_mb.toFixed(0)} MB` : `${(storage.clickhouse_mb / 1024).toFixed(2)} GB`}</span>
                      </div>
                      <div className="compression-badge">{storage.compression_ratio}x</div>
                      <div className="db-storage es">
                        <span className="db-label">Elasticsearch</span>
                        <span className="db-size">{storage.elasticsearch_mb < 1000 ? `${storage.elasticsearch_mb.toFixed(0)} MB` : `${(storage.elasticsearch_mb / 1024).toFixed(2)} GB`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            <motion.div className="slide-insight" variants={fadeInUp}>
              <p><strong>Compression improves with scale:</strong> 5.8x at 1M → 8.7x at 10M → 9.5x at 100M rows</p>
            </motion.div>
          </motion.div>
        );

      case 'benchmark-categories':
        return (
          <motion.div className="page benchmark-categories-page" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div className="slide-header" variants={fadeInUp}>
              <span className="slide-number">{currentPage + 1}</span>
              <h2>Our Benchmark Approach</h2>
              <p className="page-subtitle">5 query + 3 capability + 2 infrastructure = 10 benchmarks</p>
            </motion.div>

            <div className="categories-grid two-col">
              <motion.div className="category-card query" variants={slideInLeft}>
                <div className="category-icon">📊</div>
                <h3>Query Performance (5)</h3>
                <p>Both systems can execute these - direct comparison</p>
                <ul>
                  <li>Simple Aggregation</li>
                  <li>Time-Series Analysis</li>
                  <li>Full-Text Search</li>
                  <li>Top-N Query</li>
                  <li>Multi-Metric Dashboard</li>
                </ul>
                <div className="category-expectation es">ES wins most (doc_values)</div>
              </motion.div>

              <motion.div className="category-card capability" variants={slideInRight}>
                <div className="category-icon">🔧</div>
                <h3>Capability + Infrastructure (5)</h3>
                <p>ES limitations + infrastructure metrics</p>
                <ul>
                  <li>Patient-Event JOIN ❌</li>
                  <li>Cost by Condition JOIN ❌</li>
                  <li>Anomaly Detection (Subquery) ❌</li>
                  <li>Data Ingestion (20x faster)</li>
                  <li>Storage Compression (9x better)</li>
                </ul>
                <div className="category-expectation ch">CH wins all 5</div>
              </motion.div>
            </div>

            <motion.div className="slide-insight" variants={fadeInUp}>
              <p><strong>Honest story:</strong> ES wins on pre-indexed queries, but CH enables analytics ES cannot do + massive infra advantages</p>
            </motion.div>
          </motion.div>
        );

      case 'performance-query':
        return renderCategorySlide('query', '📊 Query Performance', 'Both systems compete - ES wins with doc_values');

      case 'performance-capability':
        return renderCategorySlide('capability', '🔧 Capability Comparison', 'Operations Elasticsearch cannot perform');

      case 'capabilities-comparison-old':
        return (
          <motion.div className="page capabilities-page-detailed" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div className="slide-header" variants={fadeInUp}>
              <span className="slide-number">{currentPage + 1}</span>
              <h2>Why "ES Not Possible" in ClickHouse Strengths</h2>
              <p className="page-subtitle">These aren't performance differences - they're fundamental architectural limitations</p>
            </motion.div>

            {/* ES Cannot Do Grid - Visual Explanation */}
            <div className="es-limitations-grid">
              <motion.div className="limitation-card" variants={slideInLeft}>
                <div className="limitation-header">
                  <span className="limitation-icon">🔗</span>
                  <h3>JOINs</h3>
                </div>
                <div className="comparison-box">
                  <div className="ch-side">
                    <span className="label">ClickHouse ✅</span>
                    <code>SELECT * FROM patients p<br/>JOIN events e ON p.id = e.patient_id</code>
                  </div>
                  <div className="es-side">
                    <span className="label">Elasticsearch ❌</span>
                    <span className="reason">No JOIN capability.<br/>Requires denormalization or 2+ API calls + app-side logic.</span>
                  </div>
                </div>
              </motion.div>

              <motion.div className="limitation-card" variants={fadeInUp}>
                <div className="limitation-header">
                  <span className="limitation-icon">🔄</span>
                  <h3>Subqueries</h3>
                </div>
                <div className="comparison-box">
                  <div className="ch-side">
                    <span className="label">ClickHouse ✅</span>
                    <code>WHERE cost &gt; (<br/>  SELECT AVG(cost) FROM events<br/>)</code>
                  </div>
                  <div className="es-side">
                    <span className="label">Elasticsearch ❌</span>
                    <span className="reason">No subquery support.<br/>Must run 2 queries: first to get AVG, then filter by it.</span>
                  </div>
                </div>
              </motion.div>

              <motion.div className="limitation-card" variants={slideInRight}>
                <div className="limitation-header">
                  <span className="limitation-icon">📊</span>
                  <h3>Advanced SQL</h3>
                </div>
                <div className="comparison-box">
                  <div className="ch-side">
                    <span className="label">ClickHouse ✅</span>
                    <code>HAVING count &gt; 1000<br/>quantile(0.95)(cost)<br/>ORDER BY avg_cost LIMIT 25</code>
                  </div>
                  <div className="es-side">
                    <span className="label">Elasticsearch ❌</span>
                    <span className="reason">• HAVING → bucket_selector (limited)<br/>• Percentiles → TDigest (approximate)<br/>• ORDER BY agg → Not precise</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Visual Summary */}
            <motion.div className="capability-summary" variants={fadeInUp}>
              <div className="summary-row">
                <div className="summary-item ch">
                  <span className="count">3</span>
                  <span className="desc">Benchmarks ES<br/>Cannot Perform</span>
                </div>
                <div className="summary-divider">|</div>
                <div className="summary-item">
                  <span className="highlight">This isn't about speed.</span>
                  <span className="desc">ES literally cannot execute<br/>these operations equivalently.</span>
                </div>
              </div>
            </motion.div>

            <motion.div className="slide-insight" variants={fadeInUp}>
              <p><strong>Architectural truth:</strong> Elasticsearch is built on Lucene for search, not for relational SQL operations. These aren't "slow" - they're impossible.</p>
            </motion.div>
          </motion.div>
        );

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

  // Render a specific slide by name (for print mode)
  const renderSlideByName = (pageName: string, _slideIndex: number) => {
    switch (pageName) {
      case 'intro':
        return (
          <div className="page intro-page-new">
            <div className="intro-content">
              <h1 className="main-title-new">
                <span className="title-db ch">ClickHouse</span>
                <span className="title-vs">vs</span>
                <span className="title-db es">Elasticsearch</span>
              </h1>
              <p className="subtitle-new">Performance Benchmark Analysis</p>
            </div>
            <div className="team-card-new">
              <div className="team-names">Karl Seryani • Arik Dhaliwal • Raghav Gulati</div>
              <div className="team-course">Database Systems • Fall 2025</div>
            </div>
          </div>
        );
      case 'performance-query':
        return renderCategorySlide('query', '📊 Query Performance', 'Both systems compete - ES wins with doc_values');
      case 'performance-capability':
        return renderCategorySlide('capability', '🔧 Capability Comparison', 'Operations Elasticsearch cannot perform');
      case 'interactive-terminal':
        return (
          <div className="page demo-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <h2 style={{ color: '#facc15', marginBottom: '20px' }}>Interactive Terminal</h2>
            <p style={{ color: '#888', fontSize: '18px' }}>Live Demo - Run queries against both databases in real-time</p>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>(Interactive component - see live presentation)</p>
          </div>
        );
      default:
        // For other slides, we need to render based on the current switch logic
        // Temporarily set currentPage to render the correct slide
        return null;
    }
  };

  // Print mode: render all slides stacked vertically
  if (printMode) {
    const renderPrintSlide = (pageName: string, index: number) => {
      // Store original and render specific slide
      const customSlide = renderSlideByName(pageName, index);
      if (customSlide) return customSlide;

      // For slides that use the main renderPage, we render them based on pageName
      // This is a simplified version for print
      switch (pageName) {
        case 'problem-statement':
          return (
            <div className="page problem-page">
              <div className="slide-header">
                <span className="slide-number">{index + 1}</span>
                <h2>The Question</h2>
                <p className="page-subtitle">When should you use ClickHouse vs Elasticsearch?</p>
              </div>
              <div className="arch-comparison-new" style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '40px' }}>
                <div className="arch-card-new ch" style={{ padding: '30px', background: 'rgba(250,204,21,0.1)', borderRadius: '16px', border: '1px solid rgba(250,204,21,0.3)' }}>
                  <div className="arch-icon" style={{ fontSize: '40px' }}>⚡</div>
                  <h3 style={{ color: '#facc15' }}>ClickHouse</h3>
                  <div style={{ color: '#888', marginBottom: '15px' }}>Columnar OLAP</div>
                  <ul style={{ color: '#ccc', textAlign: 'left', lineHeight: '1.8' }}>
                    <li>Optimized for analytics</li>
                    <li>Aggressive compression</li>
                    <li>Native SQL support</li>
                    <li>Fast full-table scans</li>
                  </ul>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '24px', color: '#666' }}>VS</div>
                <div className="arch-card-new es" style={{ padding: '30px', background: 'rgba(0,191,165,0.1)', borderRadius: '16px', border: '1px solid rgba(0,191,165,0.3)' }}>
                  <div className="arch-icon" style={{ fontSize: '40px' }}>🔍</div>
                  <h3 style={{ color: '#00bfa5' }}>Elasticsearch</h3>
                  <div style={{ color: '#888', marginBottom: '15px' }}>Document Search</div>
                  <ul style={{ color: '#ccc', textAlign: 'left', lineHeight: '1.8' }}>
                    <li>Built on Lucene</li>
                    <li>Inverted indexes</li>
                    <li>Fast filtered queries</li>
                    <li>Full-text search</li>
                  </ul>
                </div>
              </div>
            </div>
          );
        case 'datasets-overview':
          return (
            <div className="page datasets-page">
              <div className="slide-header">
                <span className="slide-number">{index + 1}</span>
                <h2>Test Datasets</h2>
                <p className="page-subtitle">Three scales of healthcare data</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '40px' }}>
                {['1M', '10M', '100M'].map((size) => (
                  <div key={size} style={{ padding: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid #333', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#facc15' }}>{size}</div>
                    <h3 style={{ color: '#fff', margin: '15px 0' }}>Healthcare</h3>
                    <p style={{ color: '#888' }}>Patients, Events, Prescriptions</p>
                  </div>
                ))}
              </div>
            </div>
          );
        case 'ingestion-performance':
          return (
            <div className="page ingestion-page">
              <div className="slide-header">
                <span className="slide-number">{index + 1}</span>
                <h2>Data Ingestion Performance</h2>
                <p className="page-subtitle">ClickHouse: ~20x faster ingestion</p>
              </div>
              <div style={{ marginTop: '40px', color: '#ccc', textAlign: 'center' }}>
                <p>See live data in presentation</p>
              </div>
            </div>
          );
        case 'storage-comparison':
          return (
            <div className="page storage-page">
              <div className="slide-header">
                <span className="slide-number">{index + 1}</span>
                <h2>Storage Efficiency</h2>
                <p className="page-subtitle">ClickHouse compression advantage</p>
              </div>
              <div style={{ marginTop: '40px', color: '#ccc', textAlign: 'center' }}>
                <p>See live data in presentation</p>
              </div>
            </div>
          );
        case 'benchmark-categories':
          return (
            <div className="page benchmark-categories-page">
              <div className="slide-header">
                <span className="slide-number">{index + 1}</span>
                <h2>Our Benchmark Approach</h2>
                <p className="page-subtitle">5 query + 3 capability benchmarks</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '40px' }}>
                <div style={{ padding: '30px', background: 'rgba(0,191,165,0.1)', borderRadius: '16px', flex: 1, maxWidth: '400px' }}>
                  <h3 style={{ color: '#00bfa5' }}>📊 Query Performance (5)</h3>
                  <ul style={{ color: '#ccc', lineHeight: '2' }}>
                    <li>Simple Aggregation</li>
                    <li>Time-Series Analysis</li>
                    <li>Full-Text Search</li>
                    <li>Top-N Query</li>
                    <li>Multi-Metric Dashboard</li>
                  </ul>
                </div>
                <div style={{ padding: '30px', background: 'rgba(250,204,21,0.1)', borderRadius: '16px', flex: 1, maxWidth: '400px' }}>
                  <h3 style={{ color: '#facc15' }}>🔧 Capability (3)</h3>
                  <ul style={{ color: '#ccc', lineHeight: '2' }}>
                    <li>Patient-Event JOIN ❌ ES</li>
                    <li>Cost by Condition ❌ ES</li>
                    <li>Anomaly Detection ❌ ES</li>
                  </ul>
                </div>
              </div>
            </div>
          );
        case 'takeaways':
          return (
            <div className="page takeaways-page">
              <div className="slide-header">
                <span className="slide-number">{index + 1}</span>
                <h2>Key Takeaways</h2>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '40px' }}>
                <div style={{ padding: '30px', background: 'rgba(250,204,21,0.1)', borderRadius: '16px', flex: 1, maxWidth: '400px' }}>
                  <h3 style={{ color: '#facc15' }}>⚡ Choose ClickHouse</h3>
                  <ul style={{ color: '#ccc', lineHeight: '2' }}>
                    <li>JOINs & subqueries needed</li>
                    <li>Normalized data models</li>
                    <li>Storage efficiency critical</li>
                    <li>Batch ingestion</li>
                  </ul>
                </div>
                <div style={{ padding: '30px', background: 'rgba(0,191,165,0.1)', borderRadius: '16px', flex: 1, maxWidth: '400px' }}>
                  <h3 style={{ color: '#00bfa5' }}>🔍 Choose Elasticsearch</h3>
                  <ul style={{ color: '#ccc', lineHeight: '2' }}>
                    <li>Full-text search</li>
                    <li>Denormalized data</li>
                    <li>Real-time updates</li>
                    <li>Kibana ecosystem</li>
                  </ul>
                </div>
              </div>
            </div>
          );
        case 'conclusions':
          return (
            <div className="page conclusions-page">
              <div className="slide-header">
                <span className="slide-number">{index + 1}</span>
                <h2>Conclusions</h2>
              </div>
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', marginBottom: '40px' }}>
                  <div><span style={{ fontSize: '48px', color: '#facc15', fontWeight: 'bold' }}>8-24x</span><br/><span style={{ color: '#888' }}>ES faster on queries</span></div>
                  <div><span style={{ fontSize: '48px', color: '#facc15', fontWeight: 'bold' }}>3</span><br/><span style={{ color: '#888' }}>Operations ES can't do</span></div>
                </div>
                <p style={{ fontSize: '24px', color: '#fff', marginBottom: '20px' }}>There's no universal winner</p>
                <p style={{ color: '#888' }}>Architecture determines capability, not just performance</p>
                <p style={{ marginTop: '60px', fontSize: '20px', color: '#facc15' }}>Thank you! Questions?</p>
              </div>
            </div>
          );
        default:
          return <div>Slide: {pageName}</div>;
      }
    };

    return (
      <div className="app print-mode" style={{ background: '#0a0a0f', minHeight: '100vh' }}>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-slide { page-break-after: always; }
          }
        `}</style>
        <button
          className="exit-print-btn no-print"
          onClick={() => setPrintMode(false)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '10px 20px',
            background: '#facc15',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ← Back to Presentation
        </button>
        <div style={{ padding: '20px', color: '#facc15', fontSize: '14px' }} className="no-print">
          Scroll down to see all slides. Use Cmd+P (Mac) or Ctrl+P (Windows) to print/save as PDF.
        </div>
        {pages.map((pageName, index) => (
          <div key={pageName} className="print-slide" style={{
            width: '100%',
            minHeight: '100vh',
            padding: '40px',
            boxSizing: 'border-box',
            background: '#0a0a0f',
            borderBottom: '2px solid #333',
            pageBreakAfter: 'always'
          }}>
            {renderPrintSlide(pageName, index)}
          </div>
        ))}
      </div>
    );
  }

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

      <button
        className="print-mode-btn"
        onClick={() => setPrintMode(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 20px',
          background: '#facc15',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          zIndex: 1000
        }}
      >
        📄 PDF Mode
      </button>
    </div>
  );
}

export default App;
