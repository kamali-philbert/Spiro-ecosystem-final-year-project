-- Drop existing tables to start fresh
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS otp_codes CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS telemetry_logs CASCADE;
DROP TABLE IF EXISTS repair_tickets CASCADE;
DROP TABLE IF EXISTS swap_transactions CASCADE;
DROP TABLE IF EXISTS batteries CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop Enums if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS battery_status CASCADE;
DROP TYPE IF EXISTS swap_status CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- ENUMs
CREATE TYPE user_role AS ENUM ('RIDER', 'TECHNICIAN', 'CASHIER', 'ADMIN');
CREATE TYPE battery_status AS ENUM ('AVAILABLE', 'IN_USE', 'CHARGING', 'FLAGGED', 'END_OF_LIFE');
CREATE TYPE swap_status AS ENUM ('COMPLETED', 'PENDING', 'FAILED');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'END_OF_LIFE');
CREATE TYPE notification_type AS ENUM ('SWAP_CONFIRM', 'MAINTENANCE_ALERT', 'LOW_BALANCE', 'SYSTEM');

CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stations (
    station_id BIGSERIAL PRIMARY KEY,
    station_name VARCHAR(150) NOT NULL,
    location_lat DECIMAL(10,7) NOT NULL,
    location_lng DECIMAL(10,7) NOT NULL,
    total_capacity INT NOT NULL,
    available_count INT NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE batteries (
    battery_id BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    state_of_health DECIMAL(5,2) NOT NULL,
    state_of_charge DECIMAL(5,2) NOT NULL,
    status battery_status NOT NULL,
    station_id BIGINT REFERENCES stations(station_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE swap_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    rider_id BIGINT REFERENCES users(user_id) NOT NULL,
    station_id BIGINT REFERENCES stations(station_id) NOT NULL,
    battery_given_id BIGINT REFERENCES batteries(battery_id) NOT NULL,
    battery_received_id BIGINT REFERENCES batteries(battery_id) NOT NULL,
    soc_at_return DECIMAL(5,2) NOT NULL,
    swap_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status swap_status NOT NULL
);

CREATE TABLE repair_tickets (
    ticket_id BIGSERIAL PRIMARY KEY,
    battery_id BIGINT REFERENCES batteries(battery_id) NOT NULL,
    technician_id BIGINT REFERENCES users(user_id) NOT NULL,
    issue_description TEXT NOT NULL,
    components_replaced TEXT,
    soh_before DECIMAL(5,2) NOT NULL,
    soh_after DECIMAL(5,2),
    status ticket_status NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE TABLE telemetry_logs (
    log_id BIGSERIAL PRIMARY KEY,
    battery_id BIGINT REFERENCES batteries(battery_id) NOT NULL,
    voltage DECIMAL(6,3) NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    current DECIMAL(6,3) NOT NULL,
    internal_resistance DECIMAL(6,4) NOT NULL,
    soc DECIMAL(5,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) NOT NULL,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
    subscription_id BIGSERIAL PRIMARY KEY,
    rider_id BIGINT REFERENCES users(user_id) NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE otp_codes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false
);

CREATE TABLE payments (
    payment_id BIGSERIAL PRIMARY KEY,
    collector_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    rider_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'CASH',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
