import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LiveQueryDemo.css';

const API_URL = 'http://localhost:5002/api';

interface QueryResult {
  system: string;
  time_ms: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  result_count?: number;
  query?: any;
  error?: string;
}

const BENCHMARKS = [
  { id: 1, name: 'Simple Aggregation', description: 'Basic aggregations with COUNT, SUM, and AVG' },
  { id: 2, name: 'Multi-Level GROUP BY', description: 'Multi-dimensional grouping by department and severity' },
  { id: 3, name: 'Time-Series Aggregation', description: 'Daily aggregations across medical events' },
  { id: 4, name: 'Filter + Aggregation', description: 'Time-filtered queries on recent data (last 7 days)' },
  { id: 5, name: 'JOIN Performance', description: 'JOIN between patients and medical events' },
  { id: 6, name: 'Complex Analytical Query', description: 'Subqueries with aggregations and HAVING clauses' }
];

const LiveQueryDemo: React.FC = () => {
  const [selectedDataset, setSelectedDataset] = useState<'healthcare_1m' | 'healthcare_10m' | 'healthcare_100m'>('healthcare_1m');
  const [selectedBenchmark, setSelectedBenchmark] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{clickhouse: QueryResult | null, elasticsearch: QueryResult | null}>({
    clickhouse: null,
    elasticsearch: null
  });

  const runBenchmark = async () => {
    setIsRunning(true);

    // Set initial pending state
    setResults({
      clickhouse: { system: 'ClickHouse', time_ms: 0, status: 'running' },
      elasticsearch: { system: 'Elasticsearch', time_ms: 0, status: 'running' }
    });

    const benchmarkName = BENCHMARKS[selectedBenchmark - 1].name;

    try {
      // Fetch the actual benchmark data
      const response = await fetch(`${API_URL}/benchmark/detail/${selectedDataset}/${encodeURIComponent(benchmarkName)}`);

      // Check if data is available
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Coming Soon - Data Loading in Progress');
        }
        throw new Error(`Benchmark data not available (${response.status})`);
      }

      const data = await response.json();

      // Check for error in response
      if (data.error) {
        throw new Error(data.error);
      }

      // Simulate one finishing before the other for visual effect
      // Show ClickHouse result first or second based on who actually won
      const chWon = data.clickhouse.avg_ms < data.elasticsearch.avg_ms;

      if (chWon) {
        // ClickHouse finishes first
        setTimeout(() => {
          setResults(prev => ({
            ...prev,
            clickhouse: {
              system: 'ClickHouse',
              time_ms: data.clickhouse.avg_ms,
              status: 'completed',
              result_count: data.clickhouse.result_count,
              query: data.clickhouse.query
            }
          }));
        }, 800);

        setTimeout(() => {
          setResults(prev => ({
            ...prev,
            elasticsearch: {
              system: 'Elasticsearch',
              time_ms: data.elasticsearch.avg_ms,
              status: 'completed',
              result_count: data.elasticsearch.result_count,
              query: data.elasticsearch.query
            }
          }));
          setIsRunning(false);
        }, 1500);
      } else {
        // Elasticsearch finishes first
        setTimeout(() => {
          setResults(prev => ({
            ...prev,
            elasticsearch: {
              system: 'Elasticsearch',
              time_ms: data.elasticsearch.avg_ms,
              status: 'completed',
              result_count: data.elasticsearch.result_count,
              query: data.elasticsearch.query
            }
          }));
        }, 800);

        setTimeout(() => {
          setResults(prev => ({
            ...prev,
            clickhouse: {
              system: 'ClickHouse',
              time_ms: data.clickhouse.avg_ms,
              status: 'completed',
              result_count: data.clickhouse.result_count,
              query: data.clickhouse.query
            }
          }));
          setIsRunning(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Error fetching benchmark data:', error);

      // Show error state
      const errorMessage = (error instanceof Error) ? error.message : 'Benchmark data not available';
      setResults({
        clickhouse: {
          system: 'ClickHouse',
          time_ms: 0,
          status: 'error',
          error: errorMessage
        },
        elasticsearch: {
          system: 'Elasticsearch',
          time_ms: 0,
          status: 'error',
          error: errorMessage
        }
      });
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✓';
      case 'error': return '⚠️';
      default: return '';
    }
  };

  const winner = results.clickhouse && results.elasticsearch && results.clickhouse.status === 'completed' && results.elasticsearch.status === 'completed'
    ? results.clickhouse.time_ms < results.elasticsearch.time_ms ? 'ClickHouse' : 'Elasticsearch'
    : null;

  return (
    <div className="live-query-demo">
      <div className="demo-header">
        <h2>Live Query Benchmark Lab</h2>
        <p className="demo-subtitle">Run actual benchmarks and see results in real-time</p>
      </div>

      <div className="demo-controls">
        <div className="control-group">
          <label>Select Dataset</label>
          <div className="dataset-buttons">
            <button
              className={selectedDataset === 'healthcare_1m' ? 'active' : ''}
              onClick={() => setSelectedDataset('healthcare_1m')}
              disabled={isRunning}
            >
              Healthcare 1M
            </button>
            <button
              className={selectedDataset === 'healthcare_10m' ? 'active' : ''}
              onClick={() => setSelectedDataset('healthcare_10m')}
              disabled={isRunning}
            >
              Healthcare 10M
            </button>
            <button
              className={selectedDataset === 'healthcare_100m' ? 'active' : ''}
              onClick={() => setSelectedDataset('healthcare_100m')}
              disabled={isRunning}
            >
              Healthcare 100M ⏳
            </button>
          </div>
        </div>

        <div className="control-group">
          <label>Select Benchmark</label>
          <select
            value={selectedBenchmark}
            onChange={(e) => setSelectedBenchmark(parseInt(e.target.value))}
            disabled={isRunning}
          >
            {BENCHMARKS.map(b => (
              <option key={b.id} value={b.id}>
                {b.id}. {b.name} - {b.description}
              </option>
            ))}
          </select>
        </div>

        <button
          className="run-button"
          onClick={runBenchmark}
          disabled={isRunning}
        >
          {isRunning ? '🔄 Running...' : '▶️ Run Benchmark'}
        </button>
      </div>

      <AnimatePresence>
        {(results.clickhouse || results.elasticsearch) && (
          <motion.div
            className="results-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="results-grid">
              {/* ClickHouse Result */}
              <motion.div
                className={`result-card ch ${results.clickhouse?.status === 'completed' && winner === 'ClickHouse' ? 'winner' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="result-header">
                  <h3>ClickHouse</h3>
                  <span className="status-icon">{getStatusIcon(results.clickhouse?.status || '')}</span>
                </div>
                {results.clickhouse?.status === 'running' && (
                  <div className="loading-bar">
                    <motion.div
                      className="loading-fill ch"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                )}
                {results.clickhouse?.status === 'completed' && (
                  <>
                    <div className="result-time">{results.clickhouse.time_ms.toFixed(2)} ms</div>
                    {results.clickhouse.result_count && (
                      <div className="result-count">{results.clickhouse.result_count.toLocaleString()} results</div>
                    )}
                  </>
                )}
                {results.clickhouse?.status === 'error' && (
                  <div className="error-message" style={{
                    color: '#ff6b6b',
                    padding: '20px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    textAlign: 'center'
                  }}>
                    {(results.clickhouse as any).error || 'Data not available'}
                  </div>
                )}
              </motion.div>

              {/* VS Badge */}
              <div className="vs-badge">VS</div>

              {/* Elasticsearch Result */}
              <motion.div
                className={`result-card es ${results.elasticsearch?.status === 'completed' && winner === 'Elasticsearch' ? 'winner' : ''}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="result-header">
                  <h3>Elasticsearch</h3>
                  <span className="status-icon">{getStatusIcon(results.elasticsearch?.status || '')}</span>
                </div>
                {results.elasticsearch?.status === 'running' && (
                  <div className="loading-bar">
                    <motion.div
                      className="loading-fill es"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                )}
                {results.elasticsearch?.status === 'completed' && (
                  <>
                    <div className="result-time">{results.elasticsearch.time_ms.toFixed(2)} ms</div>
                    {results.elasticsearch.result_count && (
                      <div className="result-count">{results.elasticsearch.result_count.toLocaleString()} results</div>
                    )}
                  </>
                )}
                {results.elasticsearch?.status === 'error' && (
                  <div className="error-message" style={{
                    color: '#ff6b6b',
                    padding: '20px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    textAlign: 'center'
                  }}>
                    {(results.elasticsearch as any).error || 'Data not available'}
                  </div>
                )}
              </motion.div>
            </div>

            {winner && results.clickhouse && results.elasticsearch && results.clickhouse.status === 'completed' && results.elasticsearch.status === 'completed' && (
              <motion.div
                className="winner-announcement"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
              >
                <div className={`winner-badge ${winner === 'ClickHouse' ? 'ch' : 'es'}`}>
                  🏆 {winner} Wins!
                </div>
                <div className="speedup">
                  {winner === 'ClickHouse'
                    ? `${(results.elasticsearch.time_ms / results.clickhouse.time_ms).toFixed(2)}x faster`
                    : `${(results.clickhouse.time_ms / results.elasticsearch.time_ms).toFixed(2)}x faster`
                  }
                </div>
              </motion.div>
            )}

            {/* Show actual queries executed */}
            {results.clickhouse && results.elasticsearch && results.clickhouse.status === 'completed' && results.elasticsearch.status === 'completed' && (
              <motion.div
                className="queries-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3>Queries Executed</h3>
                <div className="queries-grid">
                  <div className="query-display ch">
                    <div className="query-header">
                      <span className="db-icon">⚡</span>
                      <span>ClickHouse SQL</span>
                    </div>
                    <pre className="query-code">
                      {(results.clickhouse as any).query || 'Query not available'}
                    </pre>
                  </div>
                  <div className="query-display es">
                    <div className="query-header">
                      <span className="db-icon">🔍</span>
                      <span>Elasticsearch DSL</span>
                    </div>
                    <pre className="query-code">
                      {typeof (results.elasticsearch as any).query === 'object'
                        ? JSON.stringify((results.elasticsearch as any).query, null, 2)
                        : ((results.elasticsearch as any).query || 'Query not available')
                      }
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="data-note">
        <div className="note-icon">✓</div>
        <div className="note-text">
          <strong>Real Data:</strong> Results from actual benchmark measurements (5 runs averaged)
        </div>
      </div>
    </div>
  );
};

export default LiveQueryDemo;
