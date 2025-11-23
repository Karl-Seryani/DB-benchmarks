import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './StorageDemo.css';

const API_URL = 'http://localhost:5002/api';

const COLORS = {
  clickhouse: '#f97316',
  elasticsearch: '#14b8a6',
};

interface StorageData {
  clickhouse: {
    total_mib: number;
    breakdown: {
      patients: number;
      medical_events: number;
      iot_telemetry: number;
    };
  };
  elasticsearch: {
    total_mb: number;
    breakdown: {
      patients: number;
      medical_events: number;
      iot_telemetry: number;
    };
  };
  compression_ratio: number;
}

const StorageDemo: React.FC = () => {
  const [healthcareStorage, setHealthcareStorage] = useState<StorageData | null>(null);
  const [nycStorage, setNycStorage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [animateProgress, setAnimateProgress] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<'healthcare' | 'nyc'>('healthcare');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/storage`);
        
        // Extract healthcare and NYC data from the new API structure
        setHealthcareStorage(response.data.healthcare);
        setNycStorage(response.data.nyc);
        setLoading(false);

        // Trigger animation after a short delay
        setTimeout(() => setAnimateProgress(true), 500);
      } catch (error) {
        console.error('Error fetching storage data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="storage-demo loading">
        <div className="loader" />
        <p>Loading storage comparison data...</p>
      </div>
    );
  }

  const currentData = selectedDataset === 'healthcare' ? healthcareStorage : nycStorage;

  const getBreakdownChartData = () => {
    if (!healthcareStorage) return [];

    return [
      {
        table: 'Patients',
        ClickHouse: healthcareStorage.clickhouse.breakdown.patients,
        Elasticsearch: healthcareStorage.elasticsearch.breakdown.patients
      },
      {
        table: 'Medical Events',
        ClickHouse: healthcareStorage.clickhouse.breakdown.medical_events,
        Elasticsearch: healthcareStorage.elasticsearch.breakdown.medical_events
      },
      {
        table: 'IoT Telemetry',
        ClickHouse: healthcareStorage.clickhouse.breakdown.iot_telemetry,
        Elasticsearch: healthcareStorage.elasticsearch.breakdown.iot_telemetry
      }
    ];
  };

  return (
    <div className="storage-demo">
      <motion.div
        className="demo-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2>Storage Compression Analysis</h2>
        <p className="demo-subtitle">Real measured storage footprints from actual data</p>
        
        <div className="dataset-selector">
          <button
            className={`selector-btn ${selectedDataset === 'healthcare' ? 'active' : ''}`}
            onClick={() => setSelectedDataset('healthcare')}
          >
            Healthcare (160K rows)
          </button>
          <button
            className={`selector-btn ${selectedDataset === 'nyc' ? 'active' : ''}`}
            onClick={() => setSelectedDataset('nyc')}
          >
            NYC Taxi (13M rows)
          </button>
        </div>
      </motion.div>

      {selectedDataset === 'healthcare' && healthcareStorage && (
        <motion.div
          className="demo-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Main Comparison */}
          <div className="main-comparison">
            <div className="comparison-item ch">
              <div className="system-label">
                <div className="system-icon">🔶</div>
                <h3>ClickHouse</h3>
              </div>
              <motion.div
                className="size-display"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
              >
                <div className="size-value">{healthcareStorage.clickhouse.total_mib}</div>
                <div className="size-unit">MiB</div>
              </motion.div>
              <div className="size-label">Total Storage</div>
            </div>

            <motion.div
              className="vs-indicator"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.6, type: 'spring' }}
            >
              <div className="ratio-display">
                <span className="ratio-number">{healthcareStorage.compression_ratio}x</span>
                <span className="ratio-label">Better</span>
              </div>
            </motion.div>

            <div className="comparison-item es">
              <div className="system-label">
                <div className="system-icon">🔷</div>
                <h3>Elasticsearch</h3>
              </div>
              <motion.div
                className="size-display"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
              >
                <div className="size-value">{healthcareStorage.elasticsearch.total_mb}</div>
                <div className="size-unit">MB</div>
              </motion.div>
              <div className="size-label">Total Storage</div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="progress-section">
            <h3>Comparative Storage Usage</h3>
            <div className="progress-bars">
              <div className="progress-row">
                <div className="row-label">ClickHouse</div>
                <div className="progress-bar-container">
                  <motion.div
                    className="progress-bar ch"
                    initial={{ width: 0 }}
                    animate={{ width: animateProgress ? '7%' : 0 }}
                    transition={{ duration: 1.5, delay: 0.8 }}
                  />
                </div>
                <div className="row-value">{healthcareStorage.clickhouse.total_mib} MiB</div>
              </div>
              <div className="progress-row">
                <div className="row-label">Elasticsearch</div>
                <div className="progress-bar-container">
                  <motion.div
                    className="progress-bar es"
                    initial={{ width: 0 }}
                    animate={{ width: animateProgress ? '100%' : 0 }}
                    transition={{ duration: 1.5, delay: 1.0 }}
                  />
                </div>
                <div className="row-value">{healthcareStorage.elasticsearch.total_mb} MB</div>
              </div>
            </div>
          </div>

          {/* Breakdown Chart */}
          <div className="breakdown-section">
            <h3>Storage Breakdown by Table</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={getBreakdownChartData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis
                  dataKey="table"
                  stroke="#8b949e"
                  tick={{ fill: '#8b949e' }}
                />
                <YAxis
                  stroke="#8b949e"
                  tick={{ fill: '#8b949e' }}
                  label={{ value: 'Storage (MB / MiB)', angle: -90, position: 'insideLeft', fill: '#8b949e' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    color: '#c9d1d9'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)} ${name === 'ClickHouse' ? 'MiB' : 'MB'}`,
                    name
                  ]}
                />
                <Legend />
                <Bar dataKey="ClickHouse" fill={COLORS.clickhouse} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Elasticsearch" fill={COLORS.elasticsearch} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Key Insights */}
          <div className="insights-section">
            <h3>💡 Key Insights</h3>
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-icon">🗜️</div>
                <div className="insight-content">
                  <h4>Columnar Compression</h4>
                  <p>ClickHouse stores data by columns, allowing for superior compression ratios. Similar values compress extremely well together.</p>
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-icon">💰</div>
                <div className="insight-content">
                  <h4>Cost Savings</h4>
                  <p>At scale, this 15x difference translates to massive storage cost savings - exactly what mpathic experienced.</p>
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-icon">📦</div>
                <div className="insight-content">
                  <h4>Document Overhead</h4>
                  <p>Elasticsearch stores complete JSON documents plus multiple indexes, resulting in higher storage requirements.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {selectedDataset === 'nyc' && nycStorage && (
        <motion.div
          className="demo-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="nyc-storage-comparison">
            <div className="storage-card ch">
              <h3>ClickHouse</h3>
              <div className="storage-value">{nycStorage.clickhouse?.total_gb} GB</div>
              <div className="storage-detail">
                {nycStorage.clickhouse?.total_mib} MiB
              </div>
              <div className="compression-badge">8.4x compression from Parquet</div>
            </div>

            <div className="storage-card es">
              <h3>Elasticsearch</h3>
              <div className="storage-value">{nycStorage.elasticsearch?.total_gb} GB</div>
              <div className="storage-detail">
                {nycStorage.elasticsearch?.total_mb} MB
              </div>
              <div className="expansion-badge">1.01x (slight expansion)</div>
            </div>
          </div>

          <div className="nyc-insight">
            <h3>{nycStorage.compression_ratio}x Compression Advantage</h3>
            <p>ClickHouse uses {nycStorage.compression_ratio}x less storage than Elasticsearch. At enterprise scale (billions of rows), this saves petabytes of storage.</p>
          </div>
        </motion.div>
      )}

      {/* Data Source Attribution */}
      <div className="data-source">
        <div className="source-icon">✅</div>
        <div className="source-text">
          <strong>Real Measurements</strong>
          <p>All storage values are actual measurements from {selectedDataset === 'healthcare' ? 'healthcare' : 'NYC taxi'} dataset</p>
        </div>
      </div>
    </div>
  );
};

export default StorageDemo;

