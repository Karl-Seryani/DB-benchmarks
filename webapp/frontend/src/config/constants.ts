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

// Benchmark Categories - NEW STRUCTURE (10 benchmarks in 2 categories)
export const BENCHMARK_CATEGORIES = {
  query: {
    id: 'query',
    title: 'Query Performance',
    subtitle: 'Both systems can compete on these queries',
    icon: '📊',
    description: 'These 5 benchmarks test direct query performance where both systems can execute equivalent operations.'
  },
  capability: {
    id: 'capability',
    title: 'Capability Comparison',
    subtitle: 'Operations Elasticsearch cannot do',
    icon: '🔧',
    description: 'These 3 benchmarks showcase operations ClickHouse can perform that Elasticsearch fundamentally cannot.'
  }
};

// Benchmark Information - 8 query benchmarks + 2 infrastructure metrics = 10 total
export const BENCHMARK_INFO: Record<string, {
  title: string;
  description: string;
  sql: string;
  tests: string;
  category: 'query' | 'capability';
  limitation?: string;
  whyWins?: string;
}> = {
  // ===== QUERY PERFORMANCE (5 queries) =====
  'Simple Aggregation': {
    title: 'Simple Aggregation',
    category: 'query',
    description: 'GROUP BY department with COUNT and AVG - basic OLAP operation',
    sql: 'SELECT department, COUNT(*) as event_count, AVG(cost_usd) as avg_cost FROM medical_events GROUP BY department ORDER BY event_count DESC',
    tests: 'Basic aggregation performance - tests how both systems handle simple grouping with multiple metrics.',
    whyWins: 'Elasticsearch uses pre-computed doc_values for aggregations, avoiding full table scans.'
  },
  'Time-Series Analysis': {
    title: 'Time-Series Analysis',
    category: 'query',
    description: 'Daily aggregation with date bucketing (last 30 days)',
    sql: 'SELECT toDate(timestamp) as date, COUNT(*) as event_count, SUM(cost_usd) as daily_revenue FROM medical_events GROUP BY date ORDER BY date DESC LIMIT 30',
    tests: 'Time-series analytics - tests date handling and aggregation performance.',
    whyWins: 'Elasticsearch date_histogram uses indexed timestamps for efficient bucketing.'
  },
  'Full-Text Search': {
    title: 'Full-Text Search',
    category: 'query',
    description: 'Search for "Surgery" or "Emergency" events',
    sql: "SELECT event_type, COUNT(*) as match_count FROM medical_events WHERE event_type LIKE '%Surgery%' OR event_type LIKE '%Emergency%' GROUP BY event_type ORDER BY match_count DESC",
    tests: 'Text search performance - Elasticsearch inverted index vs ClickHouse LIKE scan.',
    whyWins: 'Elasticsearch uses inverted indexes optimized for text search. ClickHouse LIKE requires full column scan.'
  },
  'Top-N Query': {
    title: 'Top-N Query',
    category: 'query',
    description: 'Find top 10 highest-cost events',
    sql: 'SELECT event_id, patient_id, department, cost_usd FROM medical_events ORDER BY cost_usd DESC LIMIT 10',
    tests: 'Sorting and limiting - tests how both systems handle ORDER BY + LIMIT.',
    whyWins: 'Elasticsearch doc_values provide pre-sorted access for efficient top-N retrieval.'
  },
  'Multi-Metric Dashboard': {
    title: 'Multi-Metric Dashboard',
    category: 'query',
    description: 'Department dashboard with 6 metrics: COUNT, unique patients, revenue, avg cost, avg duration, critical cases',
    sql: "SELECT department, COUNT(*) as total_events, COUNT(DISTINCT patient_id) as unique_patients, SUM(cost_usd) as total_revenue, AVG(cost_usd) as avg_cost, AVG(duration_minutes) as avg_duration, SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_cases FROM medical_events GROUP BY department ORDER BY total_revenue DESC",
    tests: 'Complex multi-metric aggregation - tests comprehensive dashboard query performance.',
    whyWins: 'Elasticsearch aggregation pipeline efficiently computes multiple metrics in single pass over doc_values.'
  },

  // ===== CAPABILITY (3 ES limitations) =====
  'Patient-Event JOIN': {
    title: 'Patient-Event JOIN',
    category: 'capability',
    description: 'Join patients with their medical events by condition and insurance type',
    sql: 'SELECT p.primary_condition, p.insurance_type, COUNT(*) as event_count, AVG(e.cost_usd) as avg_cost, SUM(e.cost_usd) as total_cost FROM patients p JOIN medical_events e ON p.patient_id = e.patient_id GROUP BY p.primary_condition, p.insurance_type ORDER BY total_cost DESC LIMIT 20',
    tests: 'Multi-table JOIN operations - ClickHouse native SQL vs ES limitation.',
    limitation: 'Elasticsearch cannot perform JOINs. Apps must denormalize data (duplicating storage) or run multiple queries and join in application code (slower, more complex).',
    whyWins: 'ClickHouse supports native SQL JOINs across tables.'
  },
  'Cost by Condition': {
    title: 'Cost by Condition',
    category: 'capability',
    description: 'Total healthcare cost per patient condition (requires JOIN between patients and events)',
    sql: 'SELECT p.primary_condition, COUNT(DISTINCT p.patient_id) as patient_count, COUNT(*) as event_count, SUM(e.cost_usd) as total_cost, AVG(e.cost_usd) as avg_cost_per_event FROM patients p JOIN medical_events e ON p.patient_id = e.patient_id GROUP BY p.primary_condition ORDER BY total_cost DESC',
    tests: 'Healthcare cost analysis by condition - critical for mpathic use case.',
    limitation: 'Elasticsearch cannot join patient conditions with event costs. This is why mpathic switched - their data scientists needed this for ML experiments.',
    whyWins: 'ClickHouse JOINs enable linking patient metadata with event metrics in a single query.'
  },
  'Anomaly Detection': {
    title: 'Anomaly Detection',
    category: 'capability',
    description: 'Find events with cost above average using subquery',
    sql: 'SELECT department, severity, COUNT(*) as high_cost_events, AVG(cost_usd) as avg_high_cost FROM medical_events WHERE cost_usd > (SELECT AVG(cost_usd) FROM medical_events) GROUP BY department, severity ORDER BY high_cost_events DESC',
    tests: 'Dynamic filtering with subquery - common analytics pattern for anomaly detection.',
    limitation: 'Elasticsearch cannot execute subqueries. To find above-average events: 1) Query to get average, 2) Second query with that value. Doubles latency, complicates code.',
    whyWins: 'ClickHouse executes subqueries in a single query execution.'
  }
};

// Capability Comparison
export const CAPABILITY_COMPARISON = {
  clickhouse_can: [
    'Native SQL JOINs across multiple tables',
    'Subqueries in WHERE, SELECT, and FROM clauses',
    'Window functions (ROW_NUMBER, LAG, LEAD, etc.)',
    'HAVING clause with complex conditions',
    'Precise ORDER BY on aggregated columns',
    'Built-in quantile/percentile functions',
    'Columnar compression (5-10x smaller storage)',
    'Vectorized query execution',
  ],
  clickhouse_cannot: [
    'Full-text search with relevance scoring',
    'Fuzzy matching and typo tolerance',
    'Real-time document updates (append-only optimized)',
    'Inverted index on text fields',
    'Native geospatial queries',
  ],
  elasticsearch_can: [
    'Full-text search with BM25 relevance scoring',
    'Fuzzy matching and autocomplete',
    'Prefix and wildcard queries using inverted index',
    'Filter caching for repeated queries',
    'Real-time document updates',
    'Native geospatial queries',
    'Nested document structures',
  ],
  elasticsearch_cannot: [
    'Native SQL JOINs (requires denormalization)',
    'Subqueries (requires multiple queries + app logic)',
    'True HAVING clause (bucket_selector is limited)',
    'Efficient full-table scans on columnar data',
    'Window functions',
    'Precise quantile calculations (uses approximations)',
  ]
};
