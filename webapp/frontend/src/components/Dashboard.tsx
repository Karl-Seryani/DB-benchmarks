import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import LiveQueryDemo from './LiveQueryDemo';
import StorageDemo from './StorageDemo';
import './Dashboard.css';

const API_URL = 'http://localhost:5002/api';

const COLORS = {
  clickhouse: '#f97316',
  elasticsearch: '#14b8a6',
};

interface BenchmarkResult {
  system: string;
  benchmark: string;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
}

interface DashboardProps {
  onNavigateToPresentation: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToPresentation }) => {
  const [healthcare1mData, setHealthcare1mData] = useState<any>(null);
  const [healthcare10mData, setHealthcare10mData] = useState<any>(null);
  const [healthcare100mData, setHealthcare100mData] = useState<any>(null);
  const [storageData, setStorageData] = useState<any>(null);
  const [scalabilityData, setScalabilityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<'healthcare_1m' | 'healthcare_10m' | 'healthcare_100m'>('healthcare_1m');
  const [activeTab, setActiveTab] = useState<'overview' | 'live-query' | 'live-storage'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hc1m, hc10m, hc100m, storage, scalability] = await Promise.all([
          axios.get(`${API_URL}/results/healthcare_1m`),
          axios.get(`${API_URL}/results/healthcare_10m`),
          axios.get(`${API_URL}/results/healthcare_100m`),
          axios.get(`${API_URL}/storage`),
          axios.get(`${API_URL}/scalability`)
        ]);

        setHealthcare1mData(hc1m.data);
        setHealthcare10mData(hc10m.data);
        setHealthcare100mData(hc100m.data);
        setStorageData(storage.data);
        setScalabilityData(scalability.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentData = selectedDataset === 'healthcare_1m' ? healthcare1mData :
                      selectedDataset === 'healthcare_10m' ? healthcare10mData : healthcare100mData;

  const getBenchmarkChartData = () => {
    if (!currentData?.benchmarks) return [];

    const benchmarkNames = [
      'Simple Aggregation', 'Multi-Level GROUP BY', 'Time-Series Aggregation',
      'Filter + Aggregation', 'JOIN Performance', 'Complex Analytical Query', 'Concurrent Load'
    ];

    return benchmarkNames.map(name => {
      // Convert benchmark name to snake_case key
      const benchmarkKey = name.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
      const benchmark = currentData.benchmarks[benchmarkKey];

      if (!benchmark) {
        return {
          name: name.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', ''),
          ClickHouse: 0,
          Elasticsearch: 0
        };
      }

      return {
        name: name.replace(' Aggregation', '').replace(' Performance', '').replace(' Query', ''),
        ClickHouse: benchmark.clickhouse?.avg_time || 0,
        Elasticsearch: benchmark.elasticsearch?.avg_time || 0
      };
    });
  };

  const getWinnerStats = () => {
    if (!currentData?.benchmarks) return { ch: 0, es: 0, ties: 0 };

    const benchmarkNames = [
      'Simple Aggregation', 'Multi-Level GROUP BY', 'Time-Series Aggregation',
      'Filter + Aggregation', 'JOIN Performance', 'Complex Analytical Query', 'Concurrent Load'
    ];

    let ch = 0, es = 0, ties = 0;

    benchmarkNames.forEach(name => {
      const benchmarkKey = name.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
      const benchmark = currentData.benchmarks[benchmarkKey];

      if (benchmark?.clickhouse && benchmark?.elasticsearch) {
        const chTime = benchmark.clickhouse.avg_time;
        const esTime = benchmark.elasticsearch.avg_time;
        const diff = Math.abs(chTime - esTime);

        if (diff < 5) ties++;
        else if (chTime < esTime) ch++;
        else es++;
      }
    });

    return { ch, es, ties };
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <motion.div
          className="loader"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  const winnerStats = getWinnerStats();
  const pieData = [
    { name: 'ClickHouse', value: winnerStats.ch, color: COLORS.clickhouse },
    { name: 'Elasticsearch', value: winnerStats.es, color: COLORS.elasticsearch },
    { name: 'Ties', value: winnerStats.ties, color: '#6e7681' }
  ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <motion.div 
          className="header-content"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>
            <span className="ch-text">ClickHouse</span>
            <span className="vs-text"> vs </span>
            <span className="es-text">Elasticsearch</span>
          </h1>
          <p className="subtitle">Comprehensive Benchmark Analysis Dashboard</p>
          <div className="header-actions">
            <button className="presentation-btn" onClick={onNavigateToPresentation}>
              📊 View Presentation
            </button>
          </div>
        </motion.div>

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'live-query' ? 'active' : ''}`}
            onClick={() => setActiveTab('live-query')}
          >
            🧪 Live Query Lab
          </button>
          <button
            className={`tab-btn ${activeTab === 'live-storage' ? 'active' : ''}`}
            onClick={() => setActiveTab('live-storage')}
          >
            💾 Live Storage Lab
          </button>
        </div>
      </header>

      {activeTab === 'overview' && (
      <div className="dashboard-content">
        {/* Key Metrics Cards */}
        <motion.div 
          className="metrics-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="dataset-selector-card">
            <label>Select Dataset</label>
            <div className="dataset-buttons">
              <button
                className={selectedDataset === 'healthcare_1m' ? 'active' : ''}
                onClick={() => setSelectedDataset('healthcare_1m')}
              >
                Healthcare 1M
              </button>
              <button
                className={selectedDataset === 'healthcare_10m' ? 'active' : ''}
                onClick={() => setSelectedDataset('healthcare_10m')}
              >
                Healthcare 10M
              </button>
              <button
                className={selectedDataset === 'healthcare_100m' ? 'active' : ''}
                onClick={() => setSelectedDataset('healthcare_100m')}
                disabled={!healthcare100mData}
                style={{ opacity: healthcare100mData ? 1 : 0.5 }}
              >
                Healthcare 100M {!healthcare100mData && '⏳'}
              </button>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">💾</div>
            <div className="metric-value">{storageData?.compression_ratio || 0}x</div>
            <div className="metric-label">Storage Compression</div>
            <div className="metric-detail">ClickHouse advantage</div>
          </div>


          <div className="metric-card">
            <div className="metric-icon">🏆</div>
            <div className="metric-value">{currentData?.total_rows?.toLocaleString() || 0}</div>
            <div className="metric-label">Total Rows Tested</div>
            <div className="metric-detail">{currentData?.dataset || 'N/A'} dataset</div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-value">7</div>
            <div className="metric-label">Benchmarks Run</div>
            <div className="metric-detail">Comprehensive test suite</div>
          </div>
        </motion.div>

        {/* Winner Breakdown */}
        <motion.div 
          className="section-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2>Performance Summary - Healthcare {selectedDataset === 'healthcare_1m' ? '1M' : selectedDataset === 'healthcare_10m' ? '10M' : '100M'} Dataset</h2>
          <div className="winner-grid">
            <div className="winner-chart">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="winner-stats">
              <div className="stat-item ch">
                <div className="stat-number">{winnerStats.ch}</div>
                <div className="stat-label">ClickHouse Wins</div>
              </div>
              <div className="stat-item es">
                <div className="stat-number">{winnerStats.es}</div>
                <div className="stat-label">Elasticsearch Wins</div>
              </div>
              <div className="stat-item tie">
                <div className="stat-number">{winnerStats.ties}</div>
                <div className="stat-label">Ties</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Benchmark Comparison Chart */}
        <motion.div 
          className="section-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2>Benchmark Performance Comparison (Lower is Better)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={getBenchmarkChartData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis
                  dataKey="name"
                  stroke="#8b949e"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 11, fill: '#8b949e' }}
                  interval={0}
                />
                <YAxis
                  stroke="#8b949e"
                  tick={{ fill: '#8b949e' }}
                  label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: '#8b949e' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#c9d1d9'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} ms`]}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="ClickHouse" fill={COLORS.clickhouse} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Elasticsearch" fill={COLORS.elasticsearch} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Storage Comparison */}
        {storageData && (
          <motion.div 
            className="section-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2>Storage Efficiency Comparison</h2>
            <div className="storage-visual">
              <div className="storage-bars">
                <div className="storage-bar-item">
                  <div className="bar-label">ClickHouse</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill ch" 
                      style={{ width: '7%' }}
                    />
                  </div>
                  <div className="bar-value">{storageData.clickhouse.total_mib} MiB</div>
                </div>
                <div className="storage-bar-item">
                  <div className="bar-label">Elasticsearch</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill es" 
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="bar-value">{storageData.elasticsearch.total_mb} MB</div>
                </div>
              </div>
              <div className="storage-ratio">
                <div className="ratio-badge">
                  <div className="ratio-number">{storageData.compression_ratio}x</div>
                  <div className="ratio-text">Better Compression</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Data Source Attribution */}
        <motion.div 
          className="attribution-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="attribution-content">
            <div className="attribution-icon">✅</div>
            <div className="attribution-text">
              <strong>All data displayed comes from actual benchmark measurements</strong>
              <p>Results stored in: <code>results/benchmark_results.json</code> and <code>results/nyc_benchmark_results.json</code></p>
              <p>Test Date: {currentData?.test_date ? new Date(currentData.test_date).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </motion.div>
      </div>
      )}

      {activeTab === 'live-query' && (
        <div className="dashboard-content">
          <LiveQueryDemo />
        </div>
      )}

      {activeTab === 'live-storage' && (
        <div className="dashboard-content">
          <StorageDemo />
        </div>
      )}
    </div>
  );
};

export default Dashboard;

