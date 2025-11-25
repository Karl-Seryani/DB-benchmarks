// API Configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// Color Scheme for ClickHouse vs Elasticsearch
export const COLORS = {
  clickhouse: '#d9a864',
  elasticsearch: '#7fb3bf',
};

// Chart Theme Configuration
export const CHART_THEME = {
  grid: 'rgba(255, 255, 255, 0.06)',
  axis: 'rgba(255, 255, 255, 0.7)',
  axisMuted: 'rgba(255, 255, 255, 0.45)',
  tooltipBg: 'rgba(13, 18, 28, 0.95)',
  tooltipBorder: 'rgba(255, 255, 255, 0.08)',
};

// Benchmark Information
export const BENCHMARK_INFO: Record<string, { title: string; description: string; sql: string; tests: string }> = {
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

