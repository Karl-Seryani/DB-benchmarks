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

// Benchmark Categories
export const BENCHMARK_CATEGORIES = {
  fair: {
    id: 'fair',
    title: 'Fair Benchmarks',
    subtitle: 'Equivalent operations on both systems',
    icon: '⚖️',
    description: 'These benchmarks test identical logical operations with equivalent queries on both databases.'
  },
  clickhouse_strength: {
    id: 'clickhouse_strength',
    title: 'ClickHouse Strengths',
    subtitle: 'Operations where ClickHouse excels',
    icon: '🟡',
    description: 'These benchmarks showcase ClickHouse\'s columnar storage and native SQL advantages.'
  },
  elasticsearch_strength: {
    id: 'elasticsearch_strength',
    title: 'Elasticsearch Strengths',
    subtitle: 'Operations where Elasticsearch excels',
    icon: '🔵',
    description: 'These benchmarks showcase Elasticsearch\'s inverted index and search-oriented advantages.'
  }
};

// Benchmark Information - 12 benchmarks in 3 categories
export const BENCHMARK_INFO: Record<string, {
  title: string;
  description: string;
  sql: string;
  tests: string;
  category: 'fair' | 'clickhouse_strength' | 'elasticsearch_strength';
  limitation?: string;
  whyWins?: string;
}> = {
  // ===== FAIR BENCHMARKS =====
  'Simple Aggregation': {
    title: 'Simple Aggregation',
    category: 'fair',
    description: 'GROUP BY single field with COUNT and AVG - equivalent on both systems',
    sql: 'SELECT department, COUNT(*), AVG(cost_usd) FROM medical_events GROUP BY department',
    tests: 'Basic OLAP aggregation capability - tests how both systems handle simple grouping.'
  },
  'Multi-Field GROUP BY': {
    title: 'Multi-Field GROUP BY',
    category: 'fair',
    description: 'GROUP BY two fields with aggregations - equivalent on both systems',
    sql: 'SELECT department, severity, COUNT(*), AVG(cost_usd) FROM medical_events GROUP BY department, severity',
    tests: 'Multi-dimensional grouping - tests nested aggregation capabilities.'
  },
  'Range Filter + Aggregation': {
    title: 'Range Filter + Aggregation',
    category: 'fair',
    description: 'Filter by cost range then aggregate - equivalent on both systems',
    sql: 'SELECT department, COUNT(*), SUM(cost_usd) FROM medical_events WHERE cost_usd BETWEEN 500 AND 5000 GROUP BY department',
    tests: 'Filtered aggregation - tests how both systems handle range predicates with grouping.'
  },
  'Cardinality Count': {
    title: 'Cardinality Count',
    category: 'fair',
    description: 'COUNT DISTINCT equivalent - same operation on both systems',
    sql: 'SELECT department, COUNT(DISTINCT patient_id) FROM medical_events GROUP BY department',
    tests: 'Distinct counting - tests approximate vs exact cardinality computation.'
  },

  // ===== CLICKHOUSE STRENGTHS =====
  'Complex JOIN': {
    title: 'Complex JOIN',
    category: 'clickhouse_strength',
    description: 'Native SQL JOIN across tables - ClickHouse does this natively, ES cannot',
    sql: 'SELECT p.condition, COUNT(*), AVG(e.cost_usd) FROM patients p JOIN medical_events e ON p.patient_id = e.patient_id WHERE p.age > 50 GROUP BY p.condition',
    tests: 'Multi-table JOIN operations.',
    whyWins: 'ClickHouse supports native SQL JOINs. Elasticsearch has no JOIN capability - requires denormalization or application-side joins.',
    limitation: 'ES cannot JOIN tables - query only aggregates single index'
  },
  'Time-Series Analysis': {
    title: 'Time-Series Analysis',
    category: 'clickhouse_strength',
    description: 'Daily time bucketing with multiple aggregations',
    sql: 'SELECT toDate(timestamp) as date, COUNT(*), SUM(cost_usd), COUNT(DISTINCT patient_id) FROM medical_events GROUP BY date ORDER BY date',
    tests: 'Time-series analytics with date functions.',
    whyWins: 'ClickHouse has optimized date functions and columnar storage excels at full-table time-series scans.'
  },
  'Subquery Filter': {
    title: 'Subquery Filter',
    category: 'clickhouse_strength',
    description: 'Filter using subquery result - native SQL feature ES lacks',
    sql: 'SELECT department, COUNT(*) FROM medical_events WHERE cost_usd > (SELECT AVG(cost_usd) FROM medical_events) GROUP BY department',
    tests: 'Dynamic filtering based on computed values.',
    whyWins: 'ClickHouse supports subqueries natively. Elasticsearch requires multiple queries and application logic.',
    limitation: 'ES uses hardcoded threshold - cannot dynamically compute from subquery'
  },
  'Advanced SQL Features': {
    title: 'Advanced SQL Features',
    category: 'clickhouse_strength',
    description: 'HAVING clause + exact percentiles + ORDER BY aggregate + precise LIMIT',
    sql: 'SELECT department, COUNT(*) as cnt, quantile(0.95)(cost_usd) FROM medical_events GROUP BY department HAVING cnt > 1000 ORDER BY cnt DESC LIMIT 25',
    tests: 'Complex SQL with HAVING, aggregate ordering, and statistical functions.',
    whyWins: 'ClickHouse supports exact percentiles, true HAVING semantics, and precise ORDER BY + LIMIT. Elasticsearch can only approximate these.',
    limitation: 'ES cannot do: (1) Exact percentiles (uses TDigest approximation), (2) True HAVING semantics (bucket_selector is limited), (3) Precise ORDER BY aggregate + LIMIT'
  },

  // ===== ELASTICSEARCH STRENGTHS =====
  'Full-Text Search': {
    title: 'Full-Text Search',
    category: 'elasticsearch_strength',
    description: 'Text search with relevance scoring - Elasticsearch core strength',
    sql: "SELECT event_type, COUNT(*) FROM medical_events WHERE event_type LIKE '%Surgery%' GROUP BY event_type",
    tests: 'Text matching and relevance ranking.',
    whyWins: 'Elasticsearch uses inverted indexes optimized for text search. ClickHouse LIKE requires full table scan.'
  },
  'Prefix Search': {
    title: 'Prefix Search',
    category: 'elasticsearch_strength',
    description: 'Search by field prefix - inverted index advantage',
    sql: "SELECT medication, COUNT(*) FROM prescriptions WHERE medication LIKE 'Met%' GROUP BY medication",
    tests: 'Prefix-based filtering on text fields.',
    whyWins: 'Elasticsearch prefix queries use inverted index directly. ClickHouse must scan and compare strings.'
  },
  'Recent Data Filter': {
    title: 'Recent Data Filter',
    category: 'elasticsearch_strength',
    description: 'Filter to recent time window then aggregate - ES caching advantage',
    sql: 'SELECT department, COUNT(*) FROM medical_events WHERE timestamp >= now() - INTERVAL 7 DAY GROUP BY department',
    tests: 'Time-bounded queries with caching.',
    whyWins: 'Elasticsearch filter caching and inverted indexes excel at repeated time-filtered queries on subsets.'
  },
  'High-Cardinality Terms': {
    title: 'High-Cardinality Terms',
    category: 'elasticsearch_strength',
    description: 'Aggregate by high-cardinality field (patient_id)',
    sql: 'SELECT patient_id, COUNT(*), SUM(cost_usd) FROM medical_events GROUP BY patient_id ORDER BY SUM(cost_usd) DESC LIMIT 100',
    tests: 'Top-N queries on high-cardinality dimensions.',
    whyWins: 'Elasticsearch doc_values provide efficient term lookups for high-cardinality fields with ordering.'
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
