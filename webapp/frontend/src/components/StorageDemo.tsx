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

const StorageDemo: React.FC = () => {
  const [healthcare1mStorage, setHealthcare1mStorage] = useState<any>(null);
  const [healthcare10mStorage, setHealthcare10mStorage] = useState<any>(null);
  const [healthcare100mStorage, setHealthcare100mStorage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [animateProgress, setAnimateProgress] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<'healthcare_1m' | 'healthcare_10m' | 'healthcare_100m'>('healthcare_1m');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/storage`);

        // Extract healthcare data from API
        setHealthcare1mStorage(response.data.healthcare_1m);
        setHealthcare10mStorage(response.data.healthcare_10m);
        setHealthcare100mStorage(response.data.healthcare_100m);

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

  const currentData = selectedDataset === 'healthcare_1m' ? healthcare1mStorage :
                      selectedDataset === 'healthcare_10m' ? healthcare10mStorage : healthcare100mStorage;

  if (!currentData) {
    return (
      <div className="storage-demo">
        <div className="demo-header">
          <h2>Storage Compression Analysis</h2>
          <p className="demo-subtitle">No data available for this dataset yet</p>
        </div>
      </div>
    );
  }

  const getBreakdownChartData = () => {
    return [
      {
        dataset: selectedDataset === 'healthcare_1m' ? '1M' : selectedDataset === 'healthcare_10m' ? '10M' : '100M',
        ClickHouse: currentData.clickhouse_mb,
        Elasticsearch: currentData.elasticsearch_mb
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
            className={`selector-btn ${selectedDataset === 'healthcare_1m' ? 'active' : ''}`}
            onClick={() => setSelectedDataset('healthcare_1m')}
          >
            Healthcare 1M
          </button>
          <button
            className={`selector-btn ${selectedDataset === 'healthcare_10m' ? 'active' : ''}`}
            onClick={() => setSelectedDataset('healthcare_10m')}
          >
            Healthcare 10M
          </button>
          <button
            className={`selector-btn ${selectedDataset === 'healthcare_100m' ? 'active' : ''}`}
            onClick={() => setSelectedDataset('healthcare_100m')}
            disabled={!healthcare100mStorage}
            style={{ opacity: healthcare100mStorage ? 1 : 0.5, cursor: healthcare100mStorage ? 'pointer' : 'not-allowed' }}
          >
            Healthcare 100M {!healthcare100mStorage && '⏳'}
          </button>
        </div>
      </motion.div>

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
              <h3>ClickHouse</h3>
            </div>
            <motion.div
              className="size-display"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
            >
              <div className="size-value">{currentData.clickhouse_mb.toFixed(2)}</div>
              <div className="size-unit">MB</div>
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
              <span className="ratio-number">{currentData.compression_ratio}x</span>
              <span className="ratio-label">Better</span>
            </div>
          </motion.div>

          <div className="comparison-item es">
            <div className="system-label">
              <h3>Elasticsearch</h3>
            </div>
            <motion.div
              className="size-display"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
            >
              <div className="size-value">{currentData.elasticsearch_mb.toFixed(2)}</div>
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
                  animate={{ width: animateProgress ? `${(currentData.clickhouse_mb / currentData.elasticsearch_mb) * 100}%` : 0 }}
                  transition={{ duration: 1.5, delay: 0.8 }}
                />
              </div>
              <div className="row-value">{currentData.clickhouse_mb.toFixed(2)} MB</div>
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
              <div className="row-value">{currentData.elasticsearch_mb.toFixed(2)} MB</div>
            </div>
          </div>
        </div>

        {/* Breakdown Chart */}
        <div className="breakdown-section">
          <h3>Storage Comparison</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={getBreakdownChartData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis
                dataKey="dataset"
                stroke="#8b949e"
                tick={{ fill: '#8b949e' }}
              />
              <YAxis
                stroke="#8b949e"
                tick={{ fill: '#8b949e' }}
                scale="log"
                domain={['auto', 'auto']}
                label={{ value: 'Storage (MB)', angle: -90, position: 'insideLeft', fill: '#8b949e' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#c9d1d9'
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} MB`,
                  name
                ]}
              />
              <Legend />
              <Bar dataKey="ClickHouse" fill={COLORS.clickhouse} radius={[4, 4, 0, 0]} minPointSize={15} />
              <Bar dataKey="Elasticsearch" fill={COLORS.elasticsearch} radius={[4, 4, 0, 0]} minPointSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key Insights */}
        <div className="insights-section">
          <h3>Key Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-content">
                <h4>Columnar Compression</h4>
                <p>ClickHouse stores data by columns, allowing for superior compression ratios. Similar values compress extremely well together.</p>
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-content">
                <h4>Cost Savings</h4>
                <p>At scale, this {currentData.compression_ratio}x difference translates to massive storage cost savings in cloud environments.</p>
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-content">
                <h4>Document Overhead</h4>
                <p>Elasticsearch stores complete JSON documents plus multiple indexes, resulting in higher storage requirements.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Data Source Attribution */}
      <div className="data-source">
        <div className="source-text">
          <strong>Real Measurements</strong>
          <p>All storage values are actual measurements from healthcare {selectedDataset.replace('healthcare_', '').toUpperCase()} dataset</p>
        </div>
      </div>
    </div>
  );
};

export default StorageDemo;
