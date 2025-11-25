import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './InteractiveTerminal.css';

const API_URL = 'http://localhost:5002/api';

interface QueryResult {
  success: boolean;
  rows?: any[];
  row_count?: number;
  execution_time?: number;
  error?: string;
  query_executed?: string;
}

const EXAMPLE_QUERIES = {
  clickhouse: {
    healthcare_1m: [
      "SELECT department, COUNT(*) as count FROM healthcare_1m.medical_events GROUP BY department LIMIT 10",
      "SELECT AVG(cost_usd) as avg_cost, severity FROM healthcare_1m.medical_events GROUP BY severity",
      "SELECT patient_id, COUNT(*) as visit_count FROM healthcare_1m.medical_events GROUP BY patient_id ORDER BY visit_count DESC LIMIT 5"
    ],
    healthcare_10m: [
      "SELECT department, severity, COUNT(*) as events, AVG(cost_usd) as avg_cost FROM healthcare_10m.medical_events GROUP BY department, severity LIMIT 20",
      "SELECT toYYYYMM(timestamp) as month, COUNT(*) as events FROM healthcare_10m.medical_events GROUP BY month ORDER BY month",
      "SELECT p.primary_condition, COUNT(*) as events FROM healthcare_10m.patients p JOIN healthcare_10m.medical_events e ON p.patient_id = e.patient_id WHERE p.age > 50 GROUP BY p.primary_condition ORDER BY events DESC LIMIT 10"
    ],
    healthcare_100m: [
      "SELECT COUNT(*) as total_events, SUM(cost_usd) as total_cost FROM healthcare_100m.medical_events WHERE timestamp >= now() - INTERVAL 7 DAY",
      "SELECT department, AVG(cost_usd) as avg_cost, AVG(duration_minutes) as avg_duration FROM healthcare_100m.medical_events GROUP BY department",
      "SELECT toYYYYMM(timestamp) as month, COUNT(*) as events, SUM(cost_usd) as revenue FROM healthcare_100m.medical_events WHERE timestamp >= '2024-01-01' GROUP BY month ORDER BY month"
    ]
  },
  elasticsearch: {
    healthcare_1m: [
      '{"size": 0, "aggs": {"by_dept": {"terms": {"field": "department", "size": 10}}}}',
      '{"size": 0, "aggs": {"by_severity": {"terms": {"field": "severity"}, "aggs": {"avg_cost": {"avg": {"field": "cost_usd"}}}}}}',
      '{"size": 5, "query": {"match_all": {}}, "sort": [{"timestamp": {"order": "desc"}}]}'
    ],
    healthcare_10m: [
      '{"size": 0, "aggs": {"by_department": {"terms": {"field": "department"}, "aggs": {"avg_cost": {"avg": {"field": "cost_usd"}}}}}}',
      '{"size": 0, "aggs": {"by_severity": {"terms": {"field": "severity"}}}}',
      '{"size": 10, "query": {"range": {"cost_usd": {"gte": 1000}}}, "sort": [{"cost_usd": {"order": "desc"}}]}'
    ],
    healthcare_100m: [
      '{"size": 0, "query": {"range": {"timestamp": {"gte": "now-7d"}}}, "aggs": {"total_cost": {"sum": {"field": "cost_usd"}}}}',
      '{"size": 0, "aggs": {"by_department": {"terms": {"field": "department"}, "aggs": {"avg_cost": {"avg": {"field": "cost_usd"}}, "avg_duration": {"avg": {"field": "duration_minutes"}}}}}}',
      '{"size": 0, "query": {"range": {"timestamp": {"gte": "2024-01-01"}}}, "aggs": {"by_month": {"date_histogram": {"field": "timestamp", "calendar_interval": "month"}, "aggs": {"total_cost": {"sum": {"field": "cost_usd"}}}}}}'
    ]
  }
};

export const InteractiveTerminal: React.FC = () => {
  const [database, setDatabase] = useState<'clickhouse' | 'elasticsearch'>('clickhouse');
  const [dataset, setDataset] = useState<'healthcare_1m' | 'healthcare_10m' | 'healthcare_100m'>('healthcare_1m');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/execute/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database,
          dataset,
          query: query.trim()
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: `Failed to execute query: ${error}`
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const loadExample = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  const examples = EXAMPLE_QUERIES[database][dataset];

  return (
    <div className="interactive-terminal">
      <div className="terminal-header">
        <h2>Interactive Query Terminal</h2>
        <p>Run custom queries on real datasets</p>
      </div>

      <div className="terminal-controls">
        <div className="control-group">
          <label>Database:</label>
          <div className="button-group">
            <button
              className={`db-btn ${database === 'clickhouse' ? 'active ch' : ''}`}
              onClick={() => setDatabase('clickhouse')}
            >
              ClickHouse
            </button>
            <button
              className={`db-btn ${database === 'elasticsearch' ? 'active es' : ''}`}
              onClick={() => setDatabase('elasticsearch')}
            >
              Elasticsearch
            </button>
          </div>
        </div>

        <div className="control-group">
          <label>Dataset:</label>
          <div className="button-group">
            <button
              className={`dataset-btn ${dataset === 'healthcare_1m' ? 'active' : ''}`}
              onClick={() => setDataset('healthcare_1m')}
            >
              Healthcare 1M
            </button>
            <button
              className={`dataset-btn ${dataset === 'healthcare_10m' ? 'active' : ''}`}
              onClick={() => setDataset('healthcare_10m')}
            >
              Healthcare 10M
            </button>
            <button
              className={`dataset-btn ${dataset === 'healthcare_100m' ? 'active' : ''}`}
              onClick={() => setDataset('healthcare_100m')}
            >
              Healthcare 100M ⏳
            </button>
          </div>
        </div>
      </div>

      <div className="terminal-content">
        <div className="query-section">
          <div className="query-header">
            <label>Query:</label>
            <span className="syntax-hint">
              {database === 'clickhouse' ? 'SQL Syntax' : 'Elasticsearch DSL (JSON)'}
            </span>
          </div>
          <textarea
            className="query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              database === 'clickhouse'
                ? 'Enter SQL query... (e.g., SELECT * FROM trips LIMIT 10)'
                : 'Enter Elasticsearch query JSON... (e.g., {"size": 10, "query": {"match_all": {}}})'
            }
            rows={6}
          />
          <div className="query-actions">
            <button
              className="execute-btn"
              onClick={handleExecute}
              disabled={isExecuting || !query.trim()}
            >
              {isExecuting ? 'Executing...' : '▶ Execute Query'}
            </button>
            <button
              className="clear-btn"
              onClick={() => {
                setQuery('');
                setResult(null);
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="examples-section">
          <h4>Example Queries:</h4>
          <div className="examples-list">
            {examples.map((example, idx) => (
              <motion.button
                key={idx}
                className="example-btn"
                onClick={() => loadExample(example)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Example {idx + 1}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <motion.div
          className={`result-section ${result.success ? 'success' : 'error'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {result.success ? (
            <>
              <div className="result-header">
                <span className="success-icon">✓</span>
                <span>Query executed successfully</span>
                <span className="exec-time">
                  {result.execution_time?.toFixed(2)}ms
                </span>
              </div>
              <div className="result-stats">
                <span>Rows returned: {result.row_count}</span>
              </div>
              {result.rows && result.rows.length > 0 && (
                <div className="result-table-container">
                  <table className="result-table">
                    <thead>
                      <tr>
                        {Object.keys(result.rows[0]).map((key) => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 50).map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val: any, vidx) => (
                            <td key={vidx}>
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.row_count && result.row_count > 50 && (
                    <div className="result-note">
                      Showing first 50 rows of {result.row_count}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="result-header">
                <span className="error-icon">✗</span>
                <span>Query failed</span>
              </div>
              <div className="error-message">{result.error}</div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

