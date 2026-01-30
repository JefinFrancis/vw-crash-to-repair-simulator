-- VW Crash-to-Repair Simulator Database Initialization
-- This file creates the basic database structure for PostgreSQL

-- Enable UUID extension for UUID primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB operations
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create database schema
CREATE SCHEMA IF NOT EXISTS vw_simulator;

-- Set search path
SET search_path TO vw_simulator, public;

-- Create initial tables (basic structure - will be managed by Alembic for full schema)

-- Health check table
CREATE TABLE IF NOT EXISTS health_check (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'healthy',
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial health check record
INSERT INTO health_check (service_name, status, details) 
VALUES ('database', 'healthy', '{"message": "Database initialized successfully"}')
ON CONFLICT DO NOTHING;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'VW Crash-to-Repair Database initialized successfully at %', NOW();
END $$;