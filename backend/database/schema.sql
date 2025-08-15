-- Ghost Job Detector Database Schema
-- SQLite database for persisting job analysis results and company insights

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Job searches table: main table for storing each job analysis
CREATE TABLE IF NOT EXISTS job_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'linkedin', 'indeed', 'glassdoor', 'company', 'other'
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    ghost_probability REAL NOT NULL CHECK (ghost_probability >= 0 AND ghost_probability <= 1),
    confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    parser_used TEXT,
    extraction_method TEXT,
    processing_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(url) -- Prevent duplicate analyses of the same URL
);

-- Key factors table: stores the individual risk factors for each analysis
CREATE TABLE IF NOT EXISTS key_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER NOT NULL,
    factor_type TEXT NOT NULL, -- 'red_flag', 'warning', 'positive'
    description TEXT NOT NULL,
    severity REAL CHECK (severity >= 0 AND severity <= 1), -- 0=low, 1=high severity
    weight REAL, -- Factor weight in the ML model
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (search_id) REFERENCES job_searches (id) ON DELETE CASCADE
);

-- Companies table: aggregated statistics and insights per company
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL UNIQUE,
    total_posts INTEGER DEFAULT 0,
    ghost_posts INTEGER DEFAULT 0,
    avg_ghost_probability REAL DEFAULT 0.0,
    min_ghost_probability REAL DEFAULT 1.0,
    max_ghost_probability REAL DEFAULT 0.0,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    platforms_seen TEXT, -- JSON array of platforms where company was found
    risk_level TEXT DEFAULT 'unknown' CHECK (risk_level IN ('low', 'medium', 'high', 'unknown')),
    notes TEXT -- Optional admin notes about the company
);

-- Parsing metadata table: detailed parsing information for debugging
CREATE TABLE IF NOT EXISTS parsing_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER NOT NULL,
    raw_title TEXT, -- Original HTML title
    structured_data_found BOOLEAN DEFAULT FALSE,
    meta_tags_count INTEGER DEFAULT 0,
    validation_results TEXT, -- JSON array of validation results
    confidence_scores TEXT, -- JSON object with field-specific confidence scores
    extraction_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (search_id) REFERENCES job_searches (id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_searches_company ON job_searches(company);
CREATE INDEX IF NOT EXISTS idx_job_searches_platform ON job_searches(platform);
CREATE INDEX IF NOT EXISTS idx_job_searches_analysis_date ON job_searches(analysis_date);
CREATE INDEX IF NOT EXISTS idx_job_searches_ghost_probability ON job_searches(ghost_probability);
CREATE INDEX IF NOT EXISTS idx_key_factors_search_id ON key_factors(search_id);
CREATE INDEX IF NOT EXISTS idx_key_factors_factor_type ON key_factors(factor_type);
CREATE INDEX IF NOT EXISTS idx_companies_company_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_risk_level ON companies(risk_level);

-- Triggers to automatically update company statistics
CREATE TRIGGER IF NOT EXISTS update_company_stats_insert
AFTER INSERT ON job_searches
BEGIN
    INSERT OR IGNORE INTO companies (company_name, first_seen) 
    VALUES (NEW.company, NEW.created_at);
    
    UPDATE companies 
    SET 
        total_posts = total_posts + 1,
        ghost_posts = ghost_posts + CASE WHEN NEW.ghost_probability >= 0.67 THEN 1 ELSE 0 END,
        avg_ghost_probability = (
            SELECT AVG(ghost_probability) 
            FROM job_searches 
            WHERE company = NEW.company
        ),
        min_ghost_probability = (
            SELECT MIN(ghost_probability) 
            FROM job_searches 
            WHERE company = NEW.company
        ),
        max_ghost_probability = (
            SELECT MAX(ghost_probability) 
            FROM job_searches 
            WHERE company = NEW.company
        ),
        last_updated = CURRENT_TIMESTAMP,
        risk_level = CASE 
            WHEN (SELECT AVG(ghost_probability) FROM job_searches WHERE company = NEW.company) >= 0.67 THEN 'high'
            WHEN (SELECT AVG(ghost_probability) FROM job_searches WHERE company = NEW.company) >= 0.34 THEN 'medium'
            ELSE 'low'
        END
    WHERE company_name = NEW.company;
END;

-- Trigger to update timestamps
CREATE TRIGGER IF NOT EXISTS update_job_searches_timestamp
AFTER UPDATE ON job_searches
BEGIN
    UPDATE job_searches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS company_insights AS
SELECT 
    c.*,
    ROUND(c.avg_ghost_probability * 100, 1) as avg_ghost_percentage,
    ROUND((c.ghost_posts * 100.0 / c.total_posts), 1) as ghost_job_rate,
    CASE 
        WHEN c.total_posts >= 10 AND c.avg_ghost_probability >= 0.67 THEN 'High Risk'
        WHEN c.total_posts >= 5 AND c.avg_ghost_probability >= 0.5 THEN 'Medium Risk'
        WHEN c.total_posts >= 3 THEN 'Low Risk'
        ELSE 'Insufficient Data'
    END as reliability_assessment
FROM companies c
WHERE c.total_posts > 0;

CREATE VIEW IF NOT EXISTS recent_analyses AS
SELECT 
    js.*,
    c.risk_level as company_risk_level,
    COUNT(kf.id) as factor_count
FROM job_searches js
LEFT JOIN companies c ON js.company = c.company_name
LEFT JOIN key_factors kf ON js.id = kf.search_id
WHERE js.analysis_date >= date('now', '-30 days')
GROUP BY js.id
ORDER BY js.analysis_date DESC;