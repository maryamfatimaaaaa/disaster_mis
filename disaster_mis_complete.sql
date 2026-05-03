-- ============================================================
-- SMART DISASTER RESPONSE MIS
-- Complete SQL Implementation for PostgreSQL / pgAdmin 4
-- Run each file in order: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08
-- ============================================================

-- ============================================================
-- FILE 01: DDL - CREATE TABLES
-- ============================================================

-- Drop tables in reverse FK order (safe re-run)
DROP TABLE IF EXISTS AUDIT_LOGS CASCADE;
DROP TABLE IF EXISTS APPROVAL_REQUESTS CASCADE;
DROP TABLE IF EXISTS EXPENSES CASCADE;
DROP TABLE IF EXISTS DONATIONS CASCADE;
DROP TABLE IF EXISTS PATIENTS CASCADE;
DROP TABLE IF EXISTS RESOURCE_ALLOCATIONS CASCADE;
DROP TABLE IF EXISTS RESOURCES CASCADE;
DROP TABLE IF EXISTS WAREHOUSES CASCADE;
DROP TABLE IF EXISTS TEAM_ASSIGNMENTS CASCADE;
DROP TABLE IF EXISTS RESCUE_TEAMS CASCADE;
DROP TABLE IF EXISTS EMERGENCY_REPORTS CASCADE;
DROP TABLE IF EXISTS USERS CASCADE;
DROP TABLE IF EXISTS ROLES CASCADE;
DROP TABLE IF EXISTS HOSPITALS CASCADE;

-- ─────────────────────────────────────
-- 1. ROLES (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE ROLES (
    role_id     SERIAL          PRIMARY KEY,
    role_name   VARCHAR(50)     NOT NULL UNIQUE,
    description TEXT
);

-- ─────────────────────────────────────
-- 2. USERS (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE USERS (
    user_id       SERIAL          PRIMARY KEY,
    username      VARCHAR(80)     NOT NULL UNIQUE,
    email         VARCHAR(120)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    role_id       INT             NOT NULL REFERENCES ROLES(role_id),
    created_at    TIMESTAMP       NOT NULL DEFAULT NOW(),
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE
);

-- ─────────────────────────────────────
-- 3. EMERGENCY_REPORTS (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE EMERGENCY_REPORTS (
    report_id     SERIAL          PRIMARY KEY,
    user_id       INT             NOT NULL REFERENCES USERS(user_id),
    location      VARCHAR(200)    NOT NULL,
    disaster_type VARCHAR(80)     NOT NULL
                  CHECK (disaster_type IN ('Flood','Earthquake','Fire','Other')),
    severity_level VARCHAR(20)    NOT NULL
                  CHECK (severity_level IN ('Low','Medium','High','Critical')),
    description   TEXT,
    status        VARCHAR(30)     NOT NULL DEFAULT 'Open'
                  CHECK (status IN ('Open','InProgress','Resolved','Closed')),
    reported_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────
-- 4. RESCUE_TEAMS (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE RESCUE_TEAMS (
    team_id             SERIAL          PRIMARY KEY,
    team_name           VARCHAR(100)    NOT NULL,
    team_type           VARCHAR(30)     NOT NULL
                        CHECK (team_type IN ('Medical','Fire','Rescue','Search')),
    current_location    VARCHAR(200),
    availability_status VARCHAR(20)     NOT NULL DEFAULT 'Available'
                        CHECK (availability_status IN ('Available','Assigned','Busy','Completed')),
    capacity            INT             NOT NULL CHECK (capacity > 0),
    last_updated        TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────
-- 5. TEAM_ASSIGNMENTS (Weak + Associative)
-- ─────────────────────────────────────
CREATE TABLE TEAM_ASSIGNMENTS (
    assignment_id SERIAL          PRIMARY KEY,
    report_id     INT             NOT NULL REFERENCES EMERGENCY_REPORTS(report_id),
    team_id       INT             NOT NULL REFERENCES RESCUE_TEAMS(team_id),
    assigned_by   INT             NOT NULL REFERENCES USERS(user_id),
    assigned_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMP,
    status        VARCHAR(20)     NOT NULL DEFAULT 'Assigned'
                  CHECK (status IN ('Assigned','InProgress','Completed','Cancelled'))
);

-- ─────────────────────────────────────
-- 6. WAREHOUSES (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE WAREHOUSES (
    warehouse_id   SERIAL          PRIMARY KEY,
    warehouse_name VARCHAR(100)    NOT NULL,
    location       VARCHAR(200)    NOT NULL,
    managed_by     INT             NOT NULL REFERENCES USERS(user_id),
    is_active      BOOLEAN         NOT NULL DEFAULT TRUE
);

-- ─────────────────────────────────────
-- 7. RESOURCES (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE RESOURCES (
    resource_id        SERIAL          PRIMARY KEY,
    resource_name      VARCHAR(100)    NOT NULL,
    resource_type      VARCHAR(30)     NOT NULL
                       CHECK (resource_type IN ('Food','Water','Medicine','Shelter','Equipment')),
    quantity_available INT             NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    reorder_threshold  INT             NOT NULL CHECK (reorder_threshold >= 0),
    warehouse_id       INT             NOT NULL REFERENCES WAREHOUSES(warehouse_id),
    unit               VARCHAR(20)     NOT NULL
);

-- ─────────────────────────────────────
-- 8. RESOURCE_ALLOCATIONS (Weak + Associative)
-- ─────────────────────────────────────
CREATE TABLE RESOURCE_ALLOCATIONS (
    allocation_id      SERIAL          PRIMARY KEY,
    resource_id        INT             NOT NULL REFERENCES RESOURCES(resource_id),
    report_id          INT             NOT NULL REFERENCES EMERGENCY_REPORTS(report_id),
    quantity_requested INT             NOT NULL CHECK (quantity_requested > 0),
    quantity_approved  INT             CHECK (quantity_approved >= 0),
    status             VARCHAR(20)     NOT NULL DEFAULT 'Pending'
                       CHECK (status IN ('Pending','Approved','Rejected','Dispatched','Consumed')),
    requested_by       INT             NOT NULL REFERENCES USERS(user_id),
    approved_by        INT             REFERENCES USERS(user_id),
    requested_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    approved_at        TIMESTAMP
);

-- ─────────────────────────────────────
-- 9. HOSPITALS (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE HOSPITALS (
    hospital_id    SERIAL          PRIMARY KEY,
    hospital_name  VARCHAR(150)    NOT NULL,
    location       VARCHAR(200)    NOT NULL,
    total_beds     INT             NOT NULL CHECK (total_beds > 0),
    available_beds INT             NOT NULL DEFAULT 0 CHECK (available_beds >= 0),
    contact_number VARCHAR(20),
    is_active      BOOLEAN         NOT NULL DEFAULT TRUE
);

-- ─────────────────────────────────────
-- 10. PATIENTS (Weak Entity)
-- ─────────────────────────────────────
CREATE TABLE PATIENTS (
    patient_id         SERIAL          PRIMARY KEY,
    patient_name       VARCHAR(100)    NOT NULL,
    age                INT             CHECK (age BETWEEN 0 AND 150),
    condition_severity VARCHAR(20)     NOT NULL
                       CHECK (condition_severity IN ('Stable','Critical','Deceased')),
    report_id          INT             NOT NULL REFERENCES EMERGENCY_REPORTS(report_id),
    hospital_id        INT             NOT NULL REFERENCES HOSPITALS(hospital_id),
    admitted_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
    status             VARCHAR(20)     NOT NULL DEFAULT 'Admitted'
                       CHECK (status IN ('Admitted','Discharged','Deceased'))
);

-- ─────────────────────────────────────
-- 11. DONATIONS (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE DONATIONS (
    donation_id    SERIAL           PRIMARY KEY,
    donor_name     VARCHAR(150)     NOT NULL,
    donor_type     VARCHAR(30)      NOT NULL
                   CHECK (donor_type IN ('Individual','Organization','Government')),
    amount         DECIMAL(12,2)    NOT NULL CHECK (amount > 0),
    report_id      INT              REFERENCES EMERGENCY_REPORTS(report_id),
    recorded_by    INT              NOT NULL REFERENCES USERS(user_id),
    donated_at     TIMESTAMP        NOT NULL DEFAULT NOW(),
    payment_method VARCHAR(30)
                   CHECK (payment_method IN ('Cash','Bank Transfer','Online','Cheque'))
);

-- ─────────────────────────────────────
-- 12. EXPENSES (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE EXPENSES (
    expense_id       SERIAL           PRIMARY KEY,
    expense_category VARCHAR(80)      NOT NULL,
    amount           DECIMAL(12,2)    NOT NULL CHECK (amount > 0),
    description      TEXT,
    report_id        INT              REFERENCES EMERGENCY_REPORTS(report_id),
    recorded_by      INT              NOT NULL REFERENCES USERS(user_id),
    approved_by      INT              REFERENCES USERS(user_id),
    expense_date     DATE             NOT NULL,
    status           VARCHAR(20)      NOT NULL DEFAULT 'Pending'
                     CHECK (status IN ('Pending','Approved','Rejected'))
);

-- ─────────────────────────────────────
-- 13. APPROVAL_REQUESTS (Strong Entity)
-- ─────────────────────────────────────
CREATE TABLE APPROVAL_REQUESTS (
    approval_id  SERIAL          PRIMARY KEY,
    request_type VARCHAR(40)     NOT NULL
                 CHECK (request_type IN ('ResourceAllocation','TeamDeployment','Expense','Other')),
    reference_id INT             NOT NULL,
    requested_by INT             NOT NULL REFERENCES USERS(user_id),
    approved_by  INT             REFERENCES USERS(user_id),
    status       VARCHAR(20)     NOT NULL DEFAULT 'Pending'
                 CHECK (status IN ('Pending','Approved','Rejected')),
    remarks      TEXT,
    requested_at TIMESTAMP       NOT NULL DEFAULT NOW(),
    actioned_at  TIMESTAMP
);

-- ─────────────────────────────────────
-- 14. AUDIT_LOGS (Weak Entity)
-- ─────────────────────────────────────
CREATE TABLE AUDIT_LOGS (
    log_id      SERIAL          PRIMARY KEY,
    user_id     INT             NOT NULL REFERENCES USERS(user_id),
    action_type VARCHAR(20)     NOT NULL
                CHECK (action_type IN ('INSERT','UPDATE','DELETE','LOGIN','LOGOUT')),
    table_name  VARCHAR(60)     NOT NULL,
    record_id   INT,
    old_value   TEXT,
    new_value   TEXT,
    logged_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
    ip_address  VARCHAR(45)
);


-- ============================================================
-- FILE 02: DDL - INDEXES
-- ============================================================

-- Single-column indexes
CREATE INDEX idx_reports_location       ON EMERGENCY_REPORTS(location);
CREATE INDEX idx_reports_disaster_type  ON EMERGENCY_REPORTS(disaster_type);
CREATE INDEX idx_reports_severity       ON EMERGENCY_REPORTS(severity_level);
CREATE INDEX idx_reports_status         ON EMERGENCY_REPORTS(status);
CREATE INDEX idx_reports_reported_at    ON EMERGENCY_REPORTS(reported_at);

CREATE INDEX idx_resources_type         ON RESOURCES(resource_type);
CREATE INDEX idx_resources_warehouse    ON RESOURCES(warehouse_id);

CREATE INDEX idx_team_status            ON RESCUE_TEAMS(availability_status);

CREATE INDEX idx_allocations_status     ON RESOURCE_ALLOCATIONS(status);
CREATE INDEX idx_allocations_resource   ON RESOURCE_ALLOCATIONS(resource_id);

CREATE INDEX idx_donations_at           ON DONATIONS(donated_at);
CREATE INDEX idx_expenses_date          ON EXPENSES(expense_date);
CREATE INDEX idx_expenses_status        ON EXPENSES(status);

CREATE INDEX idx_audit_logged_at        ON AUDIT_LOGS(logged_at);
CREATE INDEX idx_audit_user             ON AUDIT_LOGS(user_id);
CREATE INDEX idx_audit_table            ON AUDIT_LOGS(table_name);

CREATE INDEX idx_approval_status        ON APPROVAL_REQUESTS(status);
CREATE INDEX idx_patients_hospital      ON PATIENTS(hospital_id);
CREATE INDEX idx_patients_report        ON PATIENTS(report_id);

-- Composite indexes
CREATE INDEX idx_reports_type_severity  ON EMERGENCY_REPORTS(disaster_type, severity_level);
CREATE INDEX idx_reports_location_type  ON EMERGENCY_REPORTS(location, disaster_type);
CREATE INDEX idx_alloc_resource_report  ON RESOURCE_ALLOCATIONS(resource_id, report_id);
CREATE INDEX idx_audit_user_action      ON AUDIT_LOGS(user_id, action_type);


-- ============================================================
-- FILE 03: DDL - VIEWS
-- ============================================================

-- View 1: Pending incidents for Emergency Operators
CREATE OR REPLACE VIEW v_pending_incidents AS
SELECT
    r.report_id,
    r.location,
    r.disaster_type,
    r.severity_level,
    r.status,
    r.reported_at,
    u.username AS reported_by
FROM EMERGENCY_REPORTS r
JOIN USERS u ON r.user_id = u.user_id
WHERE r.status IN ('Open','InProgress')
ORDER BY
    CASE r.severity_level
        WHEN 'Critical' THEN 1
        WHEN 'High'     THEN 2
        WHEN 'Medium'   THEN 3
        WHEN 'Low'      THEN 4
    END,
    r.reported_at ASC;

-- View 2: Available rescue teams for Field Officers
CREATE OR REPLACE VIEW v_team_availability AS
SELECT
    team_id,
    team_name,
    team_type,
    current_location,
    availability_status,
    capacity,
    last_updated
FROM RESCUE_TEAMS
WHERE availability_status = 'Available'
ORDER BY team_type;

-- View 3: Warehouse stock with low-stock alerts for Warehouse Managers
CREATE OR REPLACE VIEW v_warehouse_stock AS
SELECT
    w.warehouse_id,
    w.warehouse_name,
    w.location,
    r.resource_id,
    r.resource_name,
    r.resource_type,
    r.quantity_available,
    r.reorder_threshold,
    r.unit,
    CASE
        WHEN r.quantity_available <= r.reorder_threshold THEN 'LOW STOCK'
        ELSE 'OK'
    END AS stock_alert
FROM WAREHOUSES w
JOIN RESOURCES r ON w.warehouse_id = r.warehouse_id
WHERE w.is_active = TRUE
ORDER BY stock_alert DESC, r.resource_type;

-- View 4: Financial summary for Finance Officers
CREATE OR REPLACE VIEW v_financial_summary AS
SELECT
    r.report_id,
    r.location,
    r.disaster_type,
    COALESCE(SUM(DISTINCT d.amount), 0)  AS total_donations,
    COALESCE(SUM(DISTINCT e.amount), 0)  AS total_expenses,
    COALESCE(SUM(DISTINCT d.amount), 0) -
    COALESCE(SUM(DISTINCT e.amount), 0)  AS net_balance
FROM EMERGENCY_REPORTS r
LEFT JOIN DONATIONS d ON r.report_id = d.report_id
LEFT JOIN EXPENSES   e ON r.report_id = e.report_id
GROUP BY r.report_id, r.location, r.disaster_type
ORDER BY r.report_id;

-- View 5: Pending approval requests
CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT
    a.approval_id,
    a.request_type,
    a.reference_id,
    a.status,
    a.requested_at,
    a.remarks,
    u.username AS requested_by_user
FROM APPROVAL_REQUESTS a
JOIN USERS u ON a.requested_by = u.user_id
WHERE a.status = 'Pending'
ORDER BY a.requested_at ASC;

-- View 6: Full audit trail
CREATE OR REPLACE VIEW v_audit_trail AS
SELECT
    al.log_id,
    u.username,
    al.action_type,
    al.table_name,
    al.record_id,
    al.old_value,
    al.new_value,
    al.logged_at,
    al.ip_address
FROM AUDIT_LOGS al
JOIN USERS u ON al.user_id = u.user_id
ORDER BY al.logged_at DESC;


-- ============================================================
-- FILE 04: DDL - TRIGGERS
-- ============================================================

-- ─── Trigger 1: Deduct stock after resource allocation is APPROVED ───
CREATE OR REPLACE FUNCTION fn_deduct_resource_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Only deduct when status changes to 'Approved'
    IF NEW.status = 'Approved' AND OLD.status = 'Pending' THEN
        -- Check sufficient stock
        IF (SELECT quantity_available FROM RESOURCES WHERE resource_id = NEW.resource_id)
            < NEW.quantity_approved THEN
            RAISE EXCEPTION 'Insufficient stock for resource_id %', NEW.resource_id;
        END IF;
        -- Deduct stock
        UPDATE RESOURCES
        SET quantity_available = quantity_available - NEW.quantity_approved
        WHERE resource_id = NEW.resource_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_resource_stock
AFTER UPDATE ON RESOURCE_ALLOCATIONS
FOR EACH ROW
EXECUTE FUNCTION fn_deduct_resource_stock();

-- ─── Trigger 2: Block negative inventory on direct resource update ───
CREATE OR REPLACE FUNCTION fn_block_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity_available < 0 THEN
        RAISE EXCEPTION 'Stock cannot go below 0 for resource_id %', NEW.resource_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_negative_stock
BEFORE UPDATE ON RESOURCES
FOR EACH ROW
EXECUTE FUNCTION fn_block_negative_stock();

-- ─── Trigger 3: Update rescue team status when assignment is made ───
CREATE OR REPLACE FUNCTION fn_update_team_status_on_assign()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE RESCUE_TEAMS
        SET availability_status = 'Assigned',
            last_updated = NOW()
        WHERE team_id = NEW.team_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'Completed' THEN
        UPDATE RESCUE_TEAMS
        SET availability_status = 'Available',
            last_updated = NOW()
        WHERE team_id = NEW.team_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_team_status
AFTER INSERT OR UPDATE ON TEAM_ASSIGNMENTS
FOR EACH ROW
EXECUTE FUNCTION fn_update_team_status_on_assign();

-- ─── Trigger 4: Auto-log INSERT on EMERGENCY_REPORTS ───
CREATE OR REPLACE FUNCTION fn_log_emergency_report()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO AUDIT_LOGS (user_id, action_type, table_name, record_id, new_value, logged_at)
    VALUES (
        NEW.user_id,
        'INSERT',
        'EMERGENCY_REPORTS',
        NEW.report_id,
        'location=' || NEW.location || ', type=' || NEW.disaster_type || ', severity=' || NEW.severity_level,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_emergency_report
AFTER INSERT ON EMERGENCY_REPORTS
FOR EACH ROW
EXECUTE FUNCTION fn_log_emergency_report();

-- ─── Trigger 5: Auto-log INSERT on DONATIONS ───
CREATE OR REPLACE FUNCTION fn_log_donation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO AUDIT_LOGS (user_id, action_type, table_name, record_id, new_value, logged_at)
    VALUES (
        NEW.recorded_by,
        'INSERT',
        'DONATIONS',
        NEW.donation_id,
        'donor=' || NEW.donor_name || ', amount=' || NEW.amount::TEXT,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_donation
AFTER INSERT ON DONATIONS
FOR EACH ROW
EXECUTE FUNCTION fn_log_donation();

-- ─── Trigger 6: Auto-log INSERT on EXPENSES ───
CREATE OR REPLACE FUNCTION fn_log_expense()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO AUDIT_LOGS (user_id, action_type, table_name, record_id, new_value, logged_at)
    VALUES (
        NEW.recorded_by,
        'INSERT',
        'EXPENSES',
        NEW.expense_id,
        'category=' || NEW.expense_category || ', amount=' || NEW.amount::TEXT,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_expense
AFTER INSERT ON EXPENSES
FOR EACH ROW
EXECUTE FUNCTION fn_log_expense();

-- ─── Trigger 7: Update updated_at on EMERGENCY_REPORTS ───
CREATE OR REPLACE FUNCTION fn_update_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_report_timestamp
BEFORE UPDATE ON EMERGENCY_REPORTS
FOR EACH ROW
EXECUTE FUNCTION fn_update_report_timestamp();

-- ─── Trigger 8: Reduce hospital available_beds when patient admitted ───
CREATE OR REPLACE FUNCTION fn_update_hospital_beds()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF (SELECT available_beds FROM HOSPITALS WHERE hospital_id = NEW.hospital_id) <= 0 THEN
            RAISE EXCEPTION 'No available beds in hospital_id %', NEW.hospital_id;
        END IF;
        UPDATE HOSPITALS
        SET available_beds = available_beds - 1
        WHERE hospital_id = NEW.hospital_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'Discharged' AND OLD.status = 'Admitted' THEN
        UPDATE HOSPITALS
        SET available_beds = available_beds + 1
        WHERE hospital_id = NEW.hospital_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_hospital_beds
AFTER INSERT OR UPDATE ON PATIENTS
FOR EACH ROW
EXECUTE FUNCTION fn_update_hospital_beds();


-- ============================================================
-- FILE 05: DML - INSERT SAMPLE DATA
-- ============================================================

-- ── ROLES ──────────────────────────────────────────────────
INSERT INTO ROLES (role_name, description) VALUES
('Administrator',     'Full system access — manage users, view all reports and finances'),
('Emergency Operator','Submit and track emergency reports, assign rescue teams'),
('Field Officer',     'View assigned tasks, update team status in the field'),
('Warehouse Manager', 'Manage inventory, approve resource allocation requests'),
('Finance Officer',   'Record donations and expenses, view financial summaries');

-- ── USERS ──────────────────────────────────────────────────
INSERT INTO USERS (username, email, password_hash, role_id) VALUES
('admin_user',   'admin@disaster.gov.pk',     '$2b$10$hashedpassword1', 1),
('ali_operator', 'ali@disaster.gov.pk',        '$2b$10$hashedpassword2', 2),
('sara_operator','sara@disaster.gov.pk',       '$2b$10$hashedpassword3', 2),
('omar_field',   'omar@disaster.gov.pk',       '$2b$10$hashedpassword4', 3),
('hina_field',   'hina@disaster.gov.pk',       '$2b$10$hashedpassword5', 3),
('zain_warehouse','zain@disaster.gov.pk',      '$2b$10$hashedpassword6', 4),
('nadia_warehouse','nadia@disaster.gov.pk',    '$2b$10$hashedpassword7', 4),
('bilal_finance', 'bilal@disaster.gov.pk',     '$2b$10$hashedpassword8', 5),
('ayesha_finance','ayesha@disaster.gov.pk',    '$2b$10$hashedpassword9', 5),
('kamran_admin',  'kamran@disaster.gov.pk',    '$2b$10$hashedpassword10',1);

-- ── EMERGENCY_REPORTS ──────────────────────────────────────
INSERT INTO EMERGENCY_REPORTS (user_id, location, disaster_type, severity_level, description, status) VALUES
(2, 'Lahore, Punjab',           'Flood',      'Critical', 'Severe flooding in Model Town area, 500+ displaced', 'Open'),
(2, 'Karachi, Sindh',           'Earthquake', 'High',     'Magnitude 5.8 earthquake near Lyari', 'InProgress'),
(3, 'Peshawar, KPK',            'Fire',       'High',     'Industrial fire in Hayatabad industrial zone', 'Open'),
(3, 'Quetta, Balochistan',      'Earthquake', 'Critical', 'Magnitude 6.2 earthquake, buildings collapsed', 'InProgress'),
(2, 'Multan, Punjab',           'Flood',      'Medium',   'River overflow affecting 3 villages', 'Open'),
(3, 'Islamabad',                'Fire',       'Low',      'Forest fire near Margalla Hills', 'Resolved'),
(2, 'Hyderabad, Sindh',         'Flood',      'High',     'Urban flooding after heavy rainfall', 'Open'),
(3, 'Rawalpindi, Punjab',       'Other',      'Medium',   'Gas pipeline explosion residential area', 'InProgress'),
(2, 'Faisalabad, Punjab',       'Flood',      'Critical', 'Chenab river breach, mass evacuation needed', 'Open'),
(3, 'Sukkur, Sindh',            'Earthquake', 'High',     'Earthquake caused landslides blocking highway', 'Open');

-- ── RESCUE_TEAMS ───────────────────────────────────────────
INSERT INTO RESCUE_TEAMS (team_name, team_type, current_location, availability_status, capacity) VALUES
('Alpha Medical Unit',    'Medical', 'Lahore Central',    'Available', 12),
('Bravo Fire Squad',      'Fire',    'Karachi South',     'Available', 8),
('Charlie Rescue Team',   'Rescue',  'Peshawar Base',     'Assigned',  15),
('Delta Search Unit',     'Search',  'Quetta HQ',         'Busy',      10),
('Echo Medical Team',     'Medical', 'Multan Station',    'Available', 12),
('Foxtrot Fire Brigade',  'Fire',    'Islamabad Base',    'Available', 8),
('Golf Rescue Squad',     'Rescue',  'Rawalpindi North',  'Available', 14),
('Hotel Search Team',     'Search',  'Faisalabad East',   'Assigned',  9),
('India Medical Corps',   'Medical', 'Hyderabad Central', 'Available', 11),
('Juliet Fire Unit',      'Fire',    'Sukkur South',      'Busy',      7);

-- ── WAREHOUSES ─────────────────────────────────────────────
INSERT INTO WAREHOUSES (warehouse_name, location, managed_by) VALUES
('Central Emergency Warehouse', 'Lahore',    6),
('Southern Supply Depot',       'Karachi',   6),
('Northern Relief Store',       'Islamabad', 7),
('Western Resource Center',     'Quetta',    7),
('Eastern Supply Hub',          'Peshawar',  6);

-- ── RESOURCES ──────────────────────────────────────────────
INSERT INTO RESOURCES (resource_name, resource_type, quantity_available, reorder_threshold, warehouse_id, unit) VALUES
('Rice Bags',           'Food',      2000, 200, 1, 'kg'),
('Wheat Flour',         'Food',      1500, 150, 1, 'kg'),
('Mineral Water',       'Water',     5000, 500, 2, 'L'),
('Water Purification',  'Water',      300,  50, 2, 'units'),
('Paracetamol',         'Medicine',   800,  80, 3, 'boxes'),
('First Aid Kits',      'Medicine',   400,  40, 3, 'kits'),
('Tents (Large)',       'Shelter',    150,  20, 4, 'units'),
('Sleeping Bags',       'Shelter',    500,  50, 4, 'units'),
('Generators',          'Equipment',   30,   5, 5, 'units'),
('Rescue Boats',        'Equipment',   15,   3, 5, 'units'),
('Antibiotics',         'Medicine',   600,  60, 3, 'boxes'),
('Baby Food',           'Food',       400,  40, 1, 'kg'),
('Blankets',            'Shelter',    800,  80, 4, 'units'),
('Stretchers',          'Equipment',  100,  10, 5, 'units'),
('Cooking Oil',         'Food',       300,  30, 2, 'L');

-- ── HOSPITALS ──────────────────────────────────────────────
INSERT INTO HOSPITALS (hospital_name, location, total_beds, available_beds, contact_number) VALUES
('Jinnah Hospital Lahore',          'Lahore',    800, 120, '042-99231301'),
('Civil Hospital Karachi',          'Karachi',   700,  80, '021-99215740'),
('Hayatabad Medical Complex',       'Peshawar',  400,  60, '091-9217011'),
('Bolan Medical Complex',           'Quetta',    350,  45, '081-9201060'),
('Nishtar Hospital Multan',         'Multan',    500,  90, '061-9200500'),
('PIMS Hospital Islamabad',         'Islamabad', 600, 110, '051-9261170'),
('Liaquat University Hospital',     'Hyderabad', 450,  70, '022-9200080'),
('Holy Family Hospital Rawalpindi', 'Rawalpindi',550,  85, '051-9281734'),
('Allied Hospital Faisalabad',      'Faisalabad',480,  65, '041-9220460'),
('Ghulam Muhammad Mahar Hospital',  'Sukkur',    300,  40, '071-9310271');

-- ── TEAM_ASSIGNMENTS ───────────────────────────────────────
-- Note: Trigger will auto-update RESCUE_TEAMS.availability_status
INSERT INTO TEAM_ASSIGNMENTS (report_id, team_id, assigned_by, status) VALUES
(1, 1, 2, 'InProgress'),
(2, 2, 2, 'Assigned'),
(3, 3, 3, 'InProgress'),
(4, 4, 3, 'InProgress'),
(5, 5, 2, 'Assigned'),
(6, 6, 3, 'Completed'),
(7, 9, 2, 'Assigned'),
(8, 7, 3, 'InProgress'),
(9, 8, 2, 'Assigned'),
(10,10, 3, 'InProgress');

-- ── RESOURCE_ALLOCATIONS ───────────────────────────────────
INSERT INTO RESOURCE_ALLOCATIONS
    (resource_id, report_id, quantity_requested, quantity_approved, status, requested_by, approved_by, approved_at)
VALUES
(1,  1, 500, 400, 'Approved',   2, 6, NOW()),
(3,  1, 1000, 800, 'Approved',  2, 6, NOW()),
(5,  2, 100,  80, 'Approved',   3, 6, NOW()),
(7,  4,  30,  25, 'Approved',   3, 7, NOW()),
(9,  1,   5,   4, 'Approved',   2, 7, NOW()),
(2,  5, 200, NULL, 'Pending',   2, NULL, NULL),
(6,  3,  50, NULL, 'Pending',   3, NULL, NULL),
(8,  7, 100, NULL, 'Pending',   2, NULL, NULL),
(11, 2,  80,  60, 'Dispatched', 3, 6, NOW()),
(13, 9, 200, 180, 'Approved',   2, 7, NOW());

-- ── PATIENTS ───────────────────────────────────────────────
-- Note: Trigger auto-deducts available_beds
INSERT INTO PATIENTS (patient_name, age, condition_severity, report_id, hospital_id, status) VALUES
('Muhammad Tariq',    45, 'Critical', 1, 1, 'Admitted'),
('Fatima Bibi',       62, 'Stable',   1, 1, 'Admitted'),
('Usman Khan',        34, 'Critical', 2, 2, 'Admitted'),
('Zainab Malik',      28, 'Stable',   2, 2, 'Discharged'),
('Ahmad Raza',        55, 'Critical', 4, 4, 'Admitted'),
('Rukhsana Parveen',  70, 'Stable',   4, 4, 'Admitted'),
('Hassan Ali',        19, 'Stable',   3, 3, 'Discharged'),
('Sadia Noor',        40, 'Critical', 7, 7, 'Admitted'),
('Imran Sheikh',      33, 'Stable',   8, 8, 'Admitted'),
('Nasreen Akhtar',    58, 'Critical', 9, 9, 'Admitted');

-- ── DONATIONS ──────────────────────────────────────────────
INSERT INTO DONATIONS (donor_name, donor_type, amount, report_id, recorded_by, payment_method) VALUES
('Ahmed Enterprises',   'Organization', 500000,  1, 8, 'Bank Transfer'),
('Pakistan Red Crescent','Organization',1000000, NULL,8, 'Bank Transfer'),
('Anonymous Donor',     'Individual',    50000,  2, 8, 'Cash'),
('Edhi Foundation',     'Organization', 750000,  4, 9, 'Bank Transfer'),
('Government of Punjab','Government',  2000000,  1, 8, 'Bank Transfer'),
('Sara Khan',           'Individual',    25000,  3, 9, 'Online'),
('Al-Khidmat Foundation','Organization',500000, NULL,8, 'Cheque'),
('Imran Associates',    'Organization', 300000,  7, 9, 'Online'),
('Citizens Relief Fund','Organization', 200000,  9, 8, 'Bank Transfer'),
('Dr. Asif Mirza',      'Individual',    75000,  5, 9, 'Cash');

-- ── EXPENSES ───────────────────────────────────────────────
INSERT INTO EXPENSES (expense_category, amount, description, report_id, recorded_by, approved_by, expense_date, status) VALUES
('Transport',    85000, 'Fuel and vehicle rental for relief ops', 1, 8, 1, '2024-01-10', 'Approved'),
('Medical',     120000, 'Emergency medicines for Karachi EQ',    2, 8, 1, '2024-01-11', 'Approved'),
('Food',         65000, 'Food packets for Peshawar fire victims', 3, 9, 1, '2024-01-12', 'Approved'),
('Shelter',     200000, 'Emergency tents for Quetta EQ victims',  4, 8, 1, '2024-01-12', 'Approved'),
('Transport',    45000, 'Boat rental for Multan flood ops',       5, 9, NULL,'2024-01-13','Pending'),
('Communication',30000, 'Satellite phones for field officers',  NULL,8, 1, '2024-01-09', 'Approved'),
('Medical',      90000, 'First aid supplies Hyderabad',           7, 9, NULL,'2024-01-14','Pending'),
('Equipment',   150000, 'Generator rental Faisalabad',            9, 8, 1, '2024-01-15', 'Approved'),
('Food',         55000, 'Ration packs for Sukkur EQ victims',    10, 9, NULL,'2024-01-16','Pending'),
('Transport',    70000, 'Helicopter support Rawalpindi',          8, 8, 1, '2024-01-14', 'Approved');

-- ── APPROVAL_REQUESTS ──────────────────────────────────────
INSERT INTO APPROVAL_REQUESTS (request_type, reference_id, requested_by, approved_by, status, remarks, actioned_at) VALUES
('ResourceAllocation', 6,  2, 6,    'Approved', 'Approved — critical need',   NOW()),
('ResourceAllocation', 7,  3, NULL, 'Pending',  NULL,                         NULL),
('ResourceAllocation', 8,  2, NULL, 'Pending',  NULL,                         NULL),
('TeamDeployment',     1,  2, 1,    'Approved', 'Team deployed immediately',  NOW()),
('TeamDeployment',     5,  2, NULL, 'Pending',  NULL,                         NULL),
('Expense',            5,  9, NULL, 'Pending',  NULL,                         NULL),
('Expense',            7,  9, NULL, 'Pending',  NULL,                         NULL),
('Expense',            9,  9, 1,    'Rejected', 'Budget exceeded for period', NOW()),
('ResourceAllocation', 9,  2, 7,    'Approved', 'Approved for Faisalabad',   NOW()),
('TeamDeployment',     10, 3, 1,    'Approved', 'Urgent deployment approved', NOW());


-- ============================================================
-- FILE 06: DML - CORE SELECT QUERIES
-- ============================================================

-- ── Q1: All CRITICAL incidents currently open ──────────────
SELECT
    report_id,
    location,
    disaster_type,
    severity_level,
    status,
    reported_at
FROM EMERGENCY_REPORTS
WHERE severity_level = 'Critical'
  AND status NOT IN ('Resolved','Closed')
ORDER BY reported_at ASC;

-- ── Q2: All available rescue teams ────────────────────────
SELECT
    team_id,
    team_name,
    team_type,
    current_location,
    capacity
FROM RESCUE_TEAMS
WHERE availability_status = 'Available'
ORDER BY team_type;

-- ── Q3: Resources below reorder threshold (low stock) ──────
SELECT
    r.resource_id,
    r.resource_name,
    r.resource_type,
    r.quantity_available,
    r.reorder_threshold,
    r.unit,
    w.warehouse_name
FROM RESOURCES r
JOIN WAREHOUSES w ON r.warehouse_id = w.warehouse_id
WHERE r.quantity_available <= r.reorder_threshold
ORDER BY r.quantity_available ASC;

-- ── Q4: Financial summary per disaster event ───────────────
SELECT
    r.report_id,
    r.location,
    r.disaster_type,
    COALESCE(SUM(DISTINCT d.amount), 0) AS total_donations,
    COALESCE(SUM(DISTINCT e.amount), 0) AS total_expenses,
    COALESCE(SUM(DISTINCT d.amount), 0) -
    COALESCE(SUM(DISTINCT e.amount), 0) AS net_balance
FROM EMERGENCY_REPORTS r
LEFT JOIN DONATIONS d ON r.report_id = d.report_id
LEFT JOIN EXPENSES   e ON r.report_id = e.report_id
GROUP BY r.report_id, r.location, r.disaster_type
ORDER BY total_donations DESC;

-- ── Q5: Pending approval requests with requester details ───
SELECT
    a.approval_id,
    a.request_type,
    a.reference_id,
    u.username     AS requested_by,
    ro.role_name   AS requester_role,
    a.requested_at
FROM APPROVAL_REQUESTS a
JOIN USERS u  ON a.requested_by = u.user_id
JOIN ROLES ro ON u.role_id = ro.role_id
WHERE a.status = 'Pending'
ORDER BY a.requested_at ASC;

-- ── Q6: Full audit trail for a specific user ───────────────
SELECT
    al.log_id,
    u.username,
    al.action_type,
    al.table_name,
    al.record_id,
    al.new_value,
    al.logged_at
FROM AUDIT_LOGS al
JOIN USERS u ON al.user_id = u.user_id
WHERE al.user_id = 2          -- change user_id as needed
ORDER BY al.logged_at DESC;

-- ── Q7: Incidents with assigned teams and team types ────────
SELECT
    er.report_id,
    er.location,
    er.disaster_type,
    er.severity_level,
    rt.team_name,
    rt.team_type,
    ta.status        AS assignment_status,
    ta.assigned_at
FROM EMERGENCY_REPORTS er
JOIN TEAM_ASSIGNMENTS ta ON er.report_id = ta.report_id
JOIN RESCUE_TEAMS rt     ON ta.team_id   = rt.team_id
ORDER BY er.report_id;

-- ── Q8: Hospital capacity overview ─────────────────────────
SELECT
    hospital_id,
    hospital_name,
    location,
    total_beds,
    available_beds,
    (total_beds - available_beds) AS occupied_beds,
    ROUND((available_beds::NUMERIC / total_beds) * 100, 2) AS availability_pct
FROM HOSPITALS
WHERE is_active = TRUE
ORDER BY availability_pct ASC;

-- ── Q9: Resource allocation status per report ───────────────
SELECT
    er.report_id,
    er.location,
    er.disaster_type,
    rs.resource_name,
    rs.resource_type,
    ra.quantity_requested,
    ra.quantity_approved,
    ra.status         AS allocation_status,
    u.username        AS requested_by
FROM RESOURCE_ALLOCATIONS ra
JOIN EMERGENCY_REPORTS er ON ra.report_id   = er.report_id
JOIN RESOURCES         rs ON ra.resource_id = rs.resource_id
JOIN USERS             u  ON ra.requested_by= u.user_id
ORDER BY er.report_id, ra.status;

-- ── Q10: Total donations by donor type ─────────────────────
SELECT
    donor_type,
    COUNT(*)        AS total_donations,
    SUM(amount)     AS total_amount,
    AVG(amount)     AS average_amount
FROM DONATIONS
GROUP BY donor_type
ORDER BY total_amount DESC;

-- ── Q11: Incidents by disaster type count ──────────────────
SELECT
    disaster_type,
    COUNT(*)                                      AS total_incidents,
    COUNT(*) FILTER (WHERE severity_level='Critical') AS critical_count,
    COUNT(*) FILTER (WHERE status='Resolved')        AS resolved_count
FROM EMERGENCY_REPORTS
GROUP BY disaster_type
ORDER BY total_incidents DESC;

-- ── Q12: Patients per hospital with severity breakdown ──────
SELECT
    h.hospital_name,
    h.location,
    COUNT(p.patient_id)                                        AS total_patients,
    COUNT(p.patient_id) FILTER (WHERE p.condition_severity='Critical') AS critical_patients,
    COUNT(p.patient_id) FILTER (WHERE p.status='Admitted')             AS currently_admitted
FROM HOSPITALS h
LEFT JOIN PATIENTS p ON h.hospital_id = p.hospital_id
GROUP BY h.hospital_id, h.hospital_name, h.location
ORDER BY total_patients DESC;

-- ── Q13: Using view — pending incidents ────────────────────
SELECT * FROM v_pending_incidents;

-- ── Q14: Using view — warehouse stock with alert ───────────
SELECT * FROM v_warehouse_stock WHERE stock_alert = 'LOW STOCK';

-- ── Q15: Using view — financial summary ────────────────────
SELECT * FROM v_financial_summary ORDER BY net_balance DESC;


-- ============================================================
-- FILE 07: TRANSACTION DEMONSTRATIONS
-- ============================================================

-- ─── Transaction 1: Resource Allocation + Stock Deduction ───
-- Atomic: either both succeed or both roll back
BEGIN;

    -- Step 1: Insert allocation request
    INSERT INTO RESOURCE_ALLOCATIONS
        (resource_id, report_id, quantity_requested, quantity_approved,
         status, requested_by, approved_by, approved_at)
    VALUES (1, 3, 100, 100, 'Approved', 2, 6, NOW());

    -- Step 2: Stock deduction happens automatically via trigger trg_deduct_resource_stock
    -- But we can also manually verify stock before committing
    DO $$
    DECLARE
        current_stock INT;
    BEGIN
        SELECT quantity_available INTO current_stock
        FROM RESOURCES WHERE resource_id = 1;

        IF current_stock < 0 THEN
            RAISE EXCEPTION 'Stock went negative — rolling back';
        END IF;
    END $$;

COMMIT;


-- ─── Transaction 2: Team Assignment + Status Update ─────────
BEGIN;

    -- Step 1: Assign a team to a report
    INSERT INTO TEAM_ASSIGNMENTS
        (report_id, team_id, assigned_by, status)
    VALUES (5, 6, 2, 'Assigned');

    -- Step 2: Trigger trg_update_team_status auto-updates RESCUE_TEAMS
    -- Verify team is now 'Assigned'
    DO $$
    DECLARE
        t_status VARCHAR(20);
    BEGIN
        SELECT availability_status INTO t_status
        FROM RESCUE_TEAMS WHERE team_id = 6;

        IF t_status != 'Assigned' THEN
            RAISE EXCEPTION 'Team status did not update — rolling back';
        END IF;

        RAISE NOTICE 'Team status confirmed: %', t_status;
    END $$;

COMMIT;


-- ─── Transaction 3: Approve Expense + Log + Update Status ───
BEGIN;

    -- Step 1: Approve a pending expense
    UPDATE EXPENSES
    SET approved_by = 1,
        status      = 'Approved'
    WHERE expense_id = 5
      AND status     = 'Pending';

    -- Step 2: Update the approval request record
    UPDATE APPROVAL_REQUESTS
    SET approved_by = 1,
        status      = 'Approved',
        remarks     = 'Approved by admin after review',
        actioned_at = NOW()
    WHERE request_type   = 'Expense'
      AND reference_id   = 5
      AND status         = 'Pending';

    -- Step 3: Manual audit log entry
    INSERT INTO AUDIT_LOGS
        (user_id, action_type, table_name, record_id, old_value, new_value)
    VALUES
        (1, 'UPDATE', 'EXPENSES', 5, 'status=Pending', 'status=Approved');

COMMIT;


-- ─── Transaction 4: Patient Admission + Bed Reduction ───────
BEGIN;

    -- Verify beds available before admitting
    DO $$
    DECLARE
        beds INT;
    BEGIN
        SELECT available_beds INTO beds
        FROM HOSPITALS WHERE hospital_id = 5;

        IF beds <= 0 THEN
            RAISE EXCEPTION 'No beds available in hospital 5';
        END IF;
    END $$;

    -- Admit patient (trigger auto-deducts bed)
    INSERT INTO PATIENTS
        (patient_name, age, condition_severity, report_id, hospital_id, status)
    VALUES ('New Patient', 35, 'Stable', 5, 5, 'Admitted');

COMMIT;


-- ─── Transaction 5: ROLLBACK Demo — Insufficient Stock ──────
BEGIN;

    -- Try to allocate more than available stock (should fail)
    INSERT INTO RESOURCE_ALLOCATIONS
        (resource_id, report_id, quantity_requested, quantity_approved,
         status, requested_by, approved_by, approved_at)
    VALUES (10, 2, 999, 999, 'Approved', 2, 6, NOW());

    -- This will trigger the stock check and raise an exception
    -- The ROLLBACK ensures no partial data is saved

ROLLBACK;
-- After rollback: RESOURCE_ALLOCATIONS unchanged, RESOURCES stock unchanged


-- ============================================================
-- FILE 08: PERFORMANCE ANALYSIS (EXPLAIN ANALYZE)
-- ============================================================

-- ─── Test 1: Query WITHOUT composite index ──────────────────
-- First drop the composite index temporarily
DROP INDEX IF EXISTS idx_reports_type_severity;

EXPLAIN ANALYZE
SELECT report_id, location, severity_level, status
FROM EMERGENCY_REPORTS
WHERE disaster_type = 'Flood'
  AND severity_level = 'Critical';

-- ─── Recreate index then test WITH index ────────────────────
CREATE INDEX idx_reports_type_severity ON EMERGENCY_REPORTS(disaster_type, severity_level);

EXPLAIN ANALYZE
SELECT report_id, location, severity_level, status
FROM EMERGENCY_REPORTS
WHERE disaster_type = 'Flood'
  AND severity_level = 'Critical';


-- ─── Test 2: Location search WITHOUT index ──────────────────
DROP INDEX IF EXISTS idx_reports_location;

EXPLAIN ANALYZE
SELECT report_id, disaster_type, severity_level, status
FROM EMERGENCY_REPORTS
WHERE location LIKE 'Lahore%';

-- WITH index
CREATE INDEX idx_reports_location ON EMERGENCY_REPORTS(location);

EXPLAIN ANALYZE
SELECT report_id, disaster_type, severity_level, status
FROM EMERGENCY_REPORTS
WHERE location LIKE 'Lahore%';


-- ─── Test 3: Audit log timestamp search ─────────────────────
DROP INDEX IF EXISTS idx_audit_logged_at;

EXPLAIN ANALYZE
SELECT log_id, user_id, action_type, table_name, logged_at
FROM AUDIT_LOGS
WHERE logged_at >= NOW() - INTERVAL '7 days';

CREATE INDEX idx_audit_logged_at ON AUDIT_LOGS(logged_at);

EXPLAIN ANALYZE
SELECT log_id, user_id, action_type, table_name, logged_at
FROM AUDIT_LOGS
WHERE logged_at >= NOW() - INTERVAL '7 days';


-- ─── Test 4: Resource type filter ────────────────────────────
DROP INDEX IF EXISTS idx_resources_type;

EXPLAIN ANALYZE
SELECT resource_id, resource_name, quantity_available, unit
FROM RESOURCES
WHERE resource_type = 'Medicine';

CREATE INDEX idx_resources_type ON RESOURCES(resource_type);

EXPLAIN ANALYZE
SELECT resource_id, resource_name, quantity_available, unit
FROM RESOURCES
WHERE resource_type = 'Medicine';


-- ─── Test 5: View vs Direct Table Query comparison ───────────

-- Direct table query (no view)
EXPLAIN ANALYZE
SELECT
    r.report_id, r.location, r.disaster_type,
    r.severity_level, r.status, r.reported_at,
    u.username
FROM EMERGENCY_REPORTS r
JOIN USERS u ON r.user_id = u.user_id
WHERE r.status IN ('Open','InProgress')
ORDER BY r.reported_at ASC;

-- Same query using view
EXPLAIN ANALYZE
SELECT * FROM v_pending_incidents;


-- ─── Performance Comparison Summary ─────────────────────────
-- After running EXPLAIN ANALYZE above, note:
-- "Execution Time: X ms" for each query
-- Record results in this format:

SELECT 'PERFORMANCE SUMMARY' AS note,
       'Run EXPLAIN ANALYZE queries above and compare Execution Time values' AS instruction,
       'Expected: Index scans faster than Sequential scans on large tables' AS expected_result;
