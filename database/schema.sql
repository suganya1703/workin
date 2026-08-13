-- Workin Database Schema (MySQL)
-- AI-Powered Verified Labor Marketplace for Tier-2/3 Towns

CREATE DATABASE IF NOT EXISTS workin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE workin;

-- 1. LABOURS TABLE
CREATE TABLE IF NOT EXISTS labours (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    phone               VARCHAR(15)  UNIQUE NOT NULL,
    skill               VARCHAR(100) NOT NULL,
    location            VARCHAR(100) NOT NULL,
    experience_years    INT          NOT NULL DEFAULT 1,
    verification_status VARCHAR(50)  NOT NULL DEFAULT 'Pending',
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    employer_name  VARCHAR(100)  NOT NULL,
    phone          VARCHAR(15)   NOT NULL,
    skill_required VARCHAR(100)  NOT NULL,
    location       VARCHAR(100)  NOT NULL,
    pay_rate       DECIMAL(10,2) NOT NULL DEFAULT 600.00,
    status         VARCHAR(20)   NOT NULL DEFAULT 'OPEN',
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance on filtering
CREATE INDEX idx_labours_skill ON labours (skill);
CREATE INDEX idx_labours_location ON labours (location);
CREATE INDEX idx_labours_verification ON labours (verification_status);
CREATE INDEX idx_jobs_skill ON jobs (skill_required);
CREATE INDEX idx_jobs_location ON jobs (location);
CREATE INDEX idx_jobs_status ON jobs (status);

-- ─────────────────────────────────────────
-- SEED DATA FOR DEMO & MVP TESTING
-- ─────────────────────────────────────────

-- Sample Labours
INSERT INTO labours (name, phone, skill, location, experience_years, verification_status)
VALUES
('Murugan K (முருகன்)', '9842112345', 'Catering / Cook', 'Dindigul', 5, 'Verified'),
('Senthil Kumar (செந்தில்)', '9789067890', 'Catering Helper', 'Madurai', 3, 'Verified'),
('Marimuthu P (மாரிமுத்து)', '9443154321', 'Biryani Specialist Cook', 'Thanjavur', 8, 'Verified'),
('Karthik S (கார்த்திக்)', '9629111223', 'Loading & Unloading', 'Salem', 2, 'Verified'),
('Ramu M (ராமு)', '9894099887', 'Electrician', 'Coimbatore', 6, 'Verified'),
('Velusamy R (வேலுசாமி)', '9487233445', 'Function Cook', 'Trichy', 4, 'Pending');

-- Sample Jobs
INSERT INTO jobs (employer_name, phone, skill_required, location, pay_rate, status)
VALUES
('Lakshmi Marriage Hall', '9876543210', 'Catering / Cook', 'Dindigul', 750.00, 'OPEN'),
('Kannan Traders', '9876543211', 'Loading & Unloading', 'Salem', 600.00, 'OPEN'),
('Sri Murugan Hotel', '9876543212', 'Biryani Specialist Cook', 'Madurai', 900.00, 'OPEN');
