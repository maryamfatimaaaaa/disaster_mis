-- ============================================================
-- SMART DISASTER RESPONSE MIS
-- Microsoft SQL Server Implementation (FIXED)
-- Run in SQL Server Management Studio (SSMS)
-- SQL Server 2016+
-- ============================================================

-- ============================================================
-- STEP 0: Create and use database
-- ============================================================
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'disaster_mis')
    CREATE DATABASE disaster_mis;
GO

USE disaster_mis;
GO

-- Drop the two conflicting indexes
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_logged_at' AND object_id = OBJECT_ID('AUDIT_LOGS'))
    DROP INDEX idx_audit_logged_at ON AUDIT_LOGS;

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reports_type_severity' AND object_id = OBJECT_ID('EMERGENCY_REPORTS'))
    DROP INDEX idx_reports_type_severity ON EMERGENCY_REPORTS;

-- ============================================================
-- DROP TABLES (safe re-run)
-- ============================================================
IF OBJECT_ID('AUDIT_LOGS',            'U') IS NOT NULL DROP TABLE AUDIT_LOGS;
IF OBJECT_ID('APPROVAL_REQUESTS',     'U') IS NOT NULL DROP TABLE APPROVAL_REQUESTS;
IF OBJECT_ID('EXPENSES',              'U') IS NOT NULL DROP TABLE EXPENSES;
IF OBJECT_ID('DONATIONS',             'U') IS NOT NULL DROP TABLE DONATIONS;
IF OBJECT_ID('PATIENTS',              'U') IS NOT NULL DROP TABLE PATIENTS;
IF OBJECT_ID('RESOURCE_ALLOCATIONS',  'U') IS NOT NULL DROP TABLE RESOURCE_ALLOCATIONS;
IF OBJECT_ID('RESOURCES',             'U') IS NOT NULL DROP TABLE RESOURCES;
IF OBJECT_ID('WAREHOUSES',            'U') IS NOT NULL DROP TABLE WAREHOUSES;
IF OBJECT_ID('TEAM_ASSIGNMENTS',      'U') IS NOT NULL DROP TABLE TEAM_ASSIGNMENTS;
IF OBJECT_ID('RESCUE_TEAMS',          'U') IS NOT NULL DROP TABLE RESCUE_TEAMS;
IF OBJECT_ID('EMERGENCY_REPORTS',     'U') IS NOT NULL DROP TABLE EMERGENCY_REPORTS;
IF OBJECT_ID('HOSPITALS',             'U') IS NOT NULL DROP TABLE HOSPITALS;
IF OBJECT_ID('USERS',                 'U') IS NOT NULL DROP TABLE USERS;
IF OBJECT_ID('ROLES',                 'U') IS NOT NULL DROP TABLE ROLES;
GO

-- ============================================================
-- FILE 01: CREATE TABLES
-- ============================================================

-- 1. ROLES
CREATE TABLE ROLES (
    role_id     INT IDENTITY(1,1) PRIMARY KEY,
    role_name   NVARCHAR(50)      NOT NULL UNIQUE,
    description NVARCHAR(MAX)
);
GO

-- 2. USERS
CREATE TABLE USERS (
    user_id       INT IDENTITY(1,1) PRIMARY KEY,
    username      NVARCHAR(80)      NOT NULL UNIQUE,
    email         NVARCHAR(120)     NOT NULL UNIQUE,
    password_hash NVARCHAR(255)     NOT NULL,
    role_id       INT               NOT NULL REFERENCES ROLES(role_id),
    created_at    DATETIME2         NOT NULL DEFAULT GETDATE(),
    is_active     BIT               NOT NULL DEFAULT 1
);
GO

-- 3. EMERGENCY_REPORTS
CREATE TABLE EMERGENCY_REPORTS (
    report_id      INT IDENTITY(1,1) PRIMARY KEY,
    user_id        INT               NOT NULL REFERENCES USERS(user_id),
    location       NVARCHAR(200)     NOT NULL,
    disaster_type  NVARCHAR(80)      NOT NULL
                   CHECK (disaster_type IN ('Flood','Earthquake','Fire','Other')),
    severity_level NVARCHAR(20)      NOT NULL
                   CHECK (severity_level IN ('Low','Medium','High','Critical')),
    description    NVARCHAR(MAX),
    status         NVARCHAR(30)      NOT NULL DEFAULT 'Open'
                   CHECK (status IN ('Open','InProgress','Resolved','Closed')),
    reported_at    DATETIME2         NOT NULL DEFAULT GETDATE(),
    updated_at     DATETIME2         NOT NULL DEFAULT GETDATE()
);
GO

-- 4. RESCUE_TEAMS
CREATE TABLE RESCUE_TEAMS (
    team_id             INT IDENTITY(1,1) PRIMARY KEY,
    team_name           NVARCHAR(100)     NOT NULL,
    team_type           NVARCHAR(30)      NOT NULL
                        CHECK (team_type IN ('Medical','Fire','Rescue','Search')),
    current_location    NVARCHAR(200),
    availability_status NVARCHAR(20)      NOT NULL DEFAULT 'Available'
                        CHECK (availability_status IN ('Available','Assigned','Busy','Completed')),
    capacity            INT               NOT NULL CHECK (capacity > 0),
    last_updated        DATETIME2         NOT NULL DEFAULT GETDATE()
);
GO

-- 5. TEAM_ASSIGNMENTS (Weak + Associative)
CREATE TABLE TEAM_ASSIGNMENTS (
    assignment_id INT IDENTITY(1,1) PRIMARY KEY,
    report_id     INT               NOT NULL REFERENCES EMERGENCY_REPORTS(report_id),
    team_id       INT               NOT NULL REFERENCES RESCUE_TEAMS(team_id),
    assigned_by   INT               NOT NULL REFERENCES USERS(user_id),
    assigned_at   DATETIME2         NOT NULL DEFAULT GETDATE(),
    completed_at  DATETIME2,
    status        NVARCHAR(20)      NOT NULL DEFAULT 'Assigned'
                  CHECK (status IN ('Assigned','InProgress','Completed','Cancelled'))
);
GO

-- 6. WAREHOUSES
CREATE TABLE WAREHOUSES (
    warehouse_id   INT IDENTITY(1,1) PRIMARY KEY,
    warehouse_name NVARCHAR(100)     NOT NULL,
    location       NVARCHAR(200)     NOT NULL,
    managed_by     INT               NOT NULL REFERENCES USERS(user_id),
    is_active      BIT               NOT NULL DEFAULT 1
);
GO

-- 7. RESOURCES
CREATE TABLE RESOURCES (
    resource_id        INT IDENTITY(1,1) PRIMARY KEY,
    resource_name      NVARCHAR(100)     NOT NULL,
    resource_type      NVARCHAR(30)      NOT NULL
                       CHECK (resource_type IN ('Food','Water','Medicine','Shelter','Equipment')),
    quantity_available INT               NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    reorder_threshold  INT               NOT NULL CHECK (reorder_threshold >= 0),
    warehouse_id       INT               NOT NULL REFERENCES WAREHOUSES(warehouse_id),
    unit               NVARCHAR(20)      NOT NULL
);
GO

-- 8. RESOURCE_ALLOCATIONS (Weak + Associative)
CREATE TABLE RESOURCE_ALLOCATIONS (
    allocation_id      INT IDENTITY(1,1) PRIMARY KEY,
    resource_id        INT               NOT NULL REFERENCES RESOURCES(resource_id),
    report_id          INT               NOT NULL REFERENCES EMERGENCY_REPORTS(report_id),
    quantity_requested INT               NOT NULL CHECK (quantity_requested > 0),
    quantity_approved  INT               CHECK (quantity_approved >= 0),
    status             NVARCHAR(20)      NOT NULL DEFAULT 'Pending'
                       CHECK (status IN ('Pending','Approved','Rejected','Dispatched','Consumed')),
    requested_by       INT               NOT NULL REFERENCES USERS(user_id),
    approved_by        INT               REFERENCES USERS(user_id),
    requested_at       DATETIME2         NOT NULL DEFAULT GETDATE(),
    approved_at        DATETIME2
);
GO

-- 9. HOSPITALS
CREATE TABLE HOSPITALS (
    hospital_id    INT IDENTITY(1,1) PRIMARY KEY,
    hospital_name  NVARCHAR(150)     NOT NULL,
    location       NVARCHAR(200)     NOT NULL,
    total_beds     INT               NOT NULL CHECK (total_beds > 0),
    available_beds INT               NOT NULL DEFAULT 0 CHECK (available_beds >= 0),
    contact_number NVARCHAR(20),
    is_active      BIT               NOT NULL DEFAULT 1
);
GO

-- 10. PATIENTS (Weak Entity)
CREATE TABLE PATIENTS (
    patient_id         INT IDENTITY(1,1) PRIMARY KEY,
    patient_name       NVARCHAR(100)     NOT NULL,
    age                INT               CHECK (age BETWEEN 0 AND 150),
    condition_severity NVARCHAR(20)      NOT NULL
                       CHECK (condition_severity IN ('Stable','Critical','Deceased')),
    report_id          INT               NOT NULL REFERENCES EMERGENCY_REPORTS(report_id),
    hospital_id        INT               NOT NULL REFERENCES HOSPITALS(hospital_id),
    admitted_at        DATETIME2         NOT NULL DEFAULT GETDATE(),
    status             NVARCHAR(20)      NOT NULL DEFAULT 'Admitted'
                       CHECK (status IN ('Admitted','Discharged','Deceased'))
);
GO

-- 11. DONATIONS
CREATE TABLE DONATIONS (
    donation_id    INT IDENTITY(1,1) PRIMARY KEY,
    donor_name     NVARCHAR(150)     NOT NULL,
    donor_type     NVARCHAR(30)      NOT NULL
                   CHECK (donor_type IN ('Individual','Organization','Government')),
    amount         DECIMAL(12,2)     NOT NULL CHECK (amount > 0),
    report_id      INT               REFERENCES EMERGENCY_REPORTS(report_id),
    recorded_by    INT               NOT NULL REFERENCES USERS(user_id),
    donated_at     DATETIME2         NOT NULL DEFAULT GETDATE(),
    payment_method NVARCHAR(30)
                   CHECK (payment_method IN ('Cash','Bank Transfer','Online','Cheque'))
);
GO

-- 12. EXPENSES
CREATE TABLE EXPENSES (
    expense_id       INT IDENTITY(1,1) PRIMARY KEY,
    expense_category NVARCHAR(80)      NOT NULL,
    amount           DECIMAL(12,2)     NOT NULL CHECK (amount > 0),
    description      NVARCHAR(MAX),
    report_id        INT               REFERENCES EMERGENCY_REPORTS(report_id),
    recorded_by      INT               NOT NULL REFERENCES USERS(user_id),
    approved_by      INT               REFERENCES USERS(user_id),
    expense_date     DATE              NOT NULL,
    status           NVARCHAR(20)      NOT NULL DEFAULT 'Pending'
                     CHECK (status IN ('Pending','Approved','Rejected'))
);
GO

-- 13. APPROVAL_REQUESTS
CREATE TABLE APPROVAL_REQUESTS (
    approval_id  INT IDENTITY(1,1) PRIMARY KEY,
    request_type NVARCHAR(40)      NOT NULL
                 CHECK (request_type IN ('ResourceAllocation','TeamDeployment','Expense','Other')),
    reference_id INT               NOT NULL,
    requested_by INT               NOT NULL REFERENCES USERS(user_id),
    approved_by  INT               REFERENCES USERS(user_id),
    status       NVARCHAR(20)      NOT NULL DEFAULT 'Pending'
                 CHECK (status IN ('Pending','Approved','Rejected')),
    remarks      NVARCHAR(MAX),
    requested_at DATETIME2         NOT NULL DEFAULT GETDATE(),
    actioned_at  DATETIME2
);
GO

-- 14. AUDIT_LOGS (Weak Entity)
CREATE TABLE AUDIT_LOGS (
    log_id      INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT               NOT NULL REFERENCES USERS(user_id),
    action_type NVARCHAR(20)      NOT NULL
                CHECK (action_type IN ('INSERT','UPDATE','DELETE','LOGIN','LOGOUT')),
    table_name  NVARCHAR(60)      NOT NULL,
    record_id   INT,
    old_value   NVARCHAR(MAX),
    new_value   NVARCHAR(MAX),
    logged_at   DATETIME2         NOT NULL DEFAULT GETDATE(),
    ip_address  NVARCHAR(45)
);
GO

PRINT 'All tables created successfully.';
GO

-- ============================================================
-- FILE 02: INDEXES
-- ============================================================

CREATE INDEX idx_reports_location      ON EMERGENCY_REPORTS(location);
CREATE INDEX idx_reports_disaster_type ON EMERGENCY_REPORTS(disaster_type);
CREATE INDEX idx_reports_severity      ON EMERGENCY_REPORTS(severity_level);
CREATE INDEX idx_reports_status        ON EMERGENCY_REPORTS(status);
CREATE INDEX idx_reports_reported_at   ON EMERGENCY_REPORTS(reported_at);
CREATE INDEX idx_resources_type        ON RESOURCES(resource_type);
CREATE INDEX idx_resources_warehouse   ON RESOURCES(warehouse_id);
CREATE INDEX idx_team_status           ON RESCUE_TEAMS(availability_status);
CREATE INDEX idx_allocations_status    ON RESOURCE_ALLOCATIONS(status);
CREATE INDEX idx_allocations_resource  ON RESOURCE_ALLOCATIONS(resource_id);
CREATE INDEX idx_donations_at          ON DONATIONS(donated_at);
CREATE INDEX idx_expenses_date         ON EXPENSES(expense_date);
CREATE INDEX idx_expenses_status       ON EXPENSES(status);
CREATE INDEX idx_audit_logged_at       ON AUDIT_LOGS(logged_at);
CREATE INDEX idx_audit_user            ON AUDIT_LOGS(user_id);
CREATE INDEX idx_audit_table           ON AUDIT_LOGS(table_name);
CREATE INDEX idx_approval_status       ON APPROVAL_REQUESTS(status);
CREATE INDEX idx_patients_hospital     ON PATIENTS(hospital_id);
CREATE INDEX idx_patients_report       ON PATIENTS(report_id);
CREATE INDEX idx_reports_type_severity ON EMERGENCY_REPORTS(disaster_type, severity_level);
CREATE INDEX idx_reports_location_type ON EMERGENCY_REPORTS(location, disaster_type);
CREATE INDEX idx_alloc_resource_report ON RESOURCE_ALLOCATIONS(resource_id, report_id);
CREATE INDEX idx_audit_user_action     ON AUDIT_LOGS(user_id, action_type);
GO

PRINT 'All indexes created successfully.';
GO

-- ============================================================
-- FILE 03: VIEWS
-- ============================================================

CREATE OR ALTER VIEW v_pending_incidents AS
SELECT
    r.report_id, r.location, r.disaster_type,
    r.severity_level, r.status, r.reported_at,
    u.username AS reported_by
FROM EMERGENCY_REPORTS r
JOIN USERS u ON r.user_id = u.user_id
WHERE r.status IN ('Open','InProgress');
GO

CREATE OR ALTER VIEW v_team_availability AS
SELECT
    team_id, team_name, team_type,
    current_location, availability_status, capacity, last_updated
FROM RESCUE_TEAMS
WHERE availability_status = 'Available';
GO

CREATE OR ALTER VIEW v_warehouse_stock AS
SELECT
    w.warehouse_id, w.warehouse_name, w.location,
    r.resource_id, r.resource_name, r.resource_type,
    r.quantity_available, r.reorder_threshold, r.unit,
    CASE
        WHEN r.quantity_available <= r.reorder_threshold THEN 'LOW STOCK'
        ELSE 'OK'
    END AS stock_alert
FROM WAREHOUSES w
JOIN RESOURCES r ON w.warehouse_id = r.warehouse_id
WHERE w.is_active = 1;
GO

CREATE OR ALTER VIEW v_financial_summary AS
SELECT
    r.report_id, r.location, r.disaster_type,
    ISNULL(SUM(DISTINCT d.amount), 0) AS total_donations,
    ISNULL(SUM(DISTINCT e.amount), 0) AS total_expenses,
    ISNULL(SUM(DISTINCT d.amount), 0) -
    ISNULL(SUM(DISTINCT e.amount), 0) AS net_balance
FROM EMERGENCY_REPORTS r
LEFT JOIN DONATIONS d ON r.report_id = d.report_id
LEFT JOIN EXPENSES   e ON r.report_id = e.report_id
GROUP BY r.report_id, r.location, r.disaster_type;
GO

CREATE OR ALTER VIEW v_pending_approvals AS
SELECT
    a.approval_id, a.request_type, a.reference_id,
    a.status, a.requested_at, a.remarks,
    u.username AS requested_by_user
FROM APPROVAL_REQUESTS a
JOIN USERS u ON a.requested_by = u.user_id
WHERE a.status = 'Pending';
GO

CREATE OR ALTER VIEW v_audit_trail AS
SELECT
    al.log_id, u.username, al.action_type,
    al.table_name, al.record_id,
    al.old_value, al.new_value,
    al.logged_at, al.ip_address
FROM AUDIT_LOGS al
JOIN USERS u ON al.user_id = u.user_id;
GO

PRINT 'All views created successfully.';
GO

-- ============================================================
-- FILE 04: TRIGGERS
-- ============================================================

-- Trigger 1: Deduct stock when allocation approved
CREATE OR ALTER TRIGGER trg_deduct_resource_stock
ON RESOURCE_ALLOCATIONS
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM inserted i
        JOIN deleted d ON i.allocation_id = d.allocation_id
        WHERE i.status = 'Approved' AND d.status = 'Pending'
    )
    BEGIN
        IF EXISTS (
            SELECT 1 FROM inserted i
            JOIN deleted d ON i.allocation_id = d.allocation_id
            JOIN RESOURCES r ON i.resource_id = r.resource_id
            WHERE d.status = 'Pending' AND i.status = 'Approved'
              AND r.quantity_available < i.quantity_approved
        )
        BEGIN
            RAISERROR('Insufficient stock for the requested resource.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        UPDATE r
        SET r.quantity_available = r.quantity_available - i.quantity_approved
        FROM RESOURCES r
        JOIN inserted i ON r.resource_id = i.resource_id
        JOIN deleted  d ON i.allocation_id = d.allocation_id
        WHERE d.status = 'Pending' AND i.status = 'Approved';
    END
END;
GO

-- Trigger 2: Block negative stock
CREATE OR ALTER TRIGGER trg_block_negative_stock
ON RESOURCES
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted WHERE quantity_available < 0)
    BEGIN
        RAISERROR('Stock quantity cannot go below zero.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

-- Trigger 3: Update team status on assignment
CREATE OR ALTER TRIGGER trg_update_team_status
ON TEAM_ASSIGNMENTS
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- New assignment: set team to Assigned
    IF EXISTS (
        SELECT 1 FROM inserted i
        WHERE NOT EXISTS (SELECT 1 FROM deleted d WHERE d.assignment_id = i.assignment_id)
    )
    BEGIN
        UPDATE RESCUE_TEAMS
        SET availability_status = 'Assigned',
            last_updated = GETDATE()
        WHERE team_id IN (SELECT team_id FROM inserted);
    END

    -- Completed: set team back to Available
    IF EXISTS (
        SELECT 1 FROM inserted i
        JOIN deleted d ON i.assignment_id = d.assignment_id
        WHERE i.status = 'Completed'
    )
    BEGIN
        UPDATE RESCUE_TEAMS
        SET availability_status = 'Available',
            last_updated = GETDATE()
        WHERE team_id IN (
            SELECT i.team_id FROM inserted i
            JOIN deleted d ON i.assignment_id = d.assignment_id
            WHERE i.status = 'Completed'
        );
    END
END;
GO

-- Trigger 4: Auto-log emergency report inserts
CREATE OR ALTER TRIGGER trg_log_emergency_report
ON EMERGENCY_REPORTS
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AUDIT_LOGS (user_id, action_type, table_name, record_id, new_value, logged_at)
    SELECT
        i.user_id,
        'INSERT',
        'EMERGENCY_REPORTS',
        i.report_id,
        'location=' + i.location + ', type=' + i.disaster_type + ', severity=' + i.severity_level,
        GETDATE()
    FROM inserted i;
END;
GO

-- Trigger 5: Auto-log donation inserts
CREATE OR ALTER TRIGGER trg_log_donation
ON DONATIONS
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AUDIT_LOGS (user_id, action_type, table_name, record_id, new_value, logged_at)
    SELECT
        i.recorded_by,
        'INSERT',
        'DONATIONS',
        i.donation_id,
        'donor=' + i.donor_name + ', amount=' + CAST(i.amount AS NVARCHAR(50)),
        GETDATE()
    FROM inserted i;
END;
GO

-- Trigger 6: Auto-log expense inserts
CREATE OR ALTER TRIGGER trg_log_expense
ON EXPENSES
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AUDIT_LOGS (user_id, action_type, table_name, record_id, new_value, logged_at)
    SELECT
        i.recorded_by,
        'INSERT',
        'EXPENSES',
        i.expense_id,
        'category=' + i.expense_category + ', amount=' + CAST(i.amount AS NVARCHAR(50)),
        GETDATE()
    FROM inserted i;
END;
GO

-- Trigger 7: Auto-update updated_at on report update
CREATE OR ALTER TRIGGER trg_update_report_timestamp
ON EMERGENCY_REPORTS
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE EMERGENCY_REPORTS
    SET updated_at = GETDATE()
    WHERE report_id IN (SELECT report_id FROM inserted);
END;
GO

-- Trigger 8: Update hospital beds on patient admit/discharge
CREATE OR ALTER TRIGGER trg_update_hospital_beds
ON PATIENTS
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- New patient: check beds then decrement
    IF EXISTS (
        SELECT 1 FROM inserted i
        WHERE NOT EXISTS (SELECT 1 FROM deleted d WHERE d.patient_id = i.patient_id)
    )
    BEGIN
        IF EXISTS (
            SELECT 1 FROM inserted i
            JOIN HOSPITALS h ON i.hospital_id = h.hospital_id
            WHERE h.available_beds <= 0
        )
        BEGIN
            RAISERROR('No available beds in the selected hospital.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        UPDATE HOSPITALS
        SET available_beds = available_beds - 1
        WHERE hospital_id IN (SELECT hospital_id FROM inserted);
    END

    -- Discharge: increment beds
    IF EXISTS (
        SELECT 1 FROM inserted i
        JOIN deleted d ON i.patient_id = d.patient_id
        WHERE i.status = 'Discharged' AND d.status = 'Admitted'
    )
    BEGIN
        UPDATE HOSPITALS
        SET available_beds = available_beds + 1
        WHERE hospital_id IN (
            SELECT i.hospital_id FROM inserted i
            JOIN deleted d ON i.patient_id = d.patient_id
            WHERE i.status = 'Discharged' AND d.status = 'Admitted'
        );
    END
END;
GO

PRINT 'All triggers created successfully.';
GO

-- ============================================================
-- FILE 05: INSERT SAMPLE DATA
-- ============================================================

INSERT INTO ROLES (role_name, description) VALUES
('Administrator',      'Full system access'),
('Emergency Operator', 'Submit and track emergency reports'),
('Field Officer',      'View tasks, update team status'),
('Warehouse Manager',  'Manage inventory and allocations'),
('Finance Officer',    'Record donations and expenses');
GO

INSERT INTO USERS (username, email, password_hash, role_id) VALUES
('admin_user',     'admin@disaster.gov.pk',     '$2b$10$placeholder', 1),
('ali_operator',   'ali@disaster.gov.pk',        '$2b$10$placeholder', 2),
('sara_operator',  'sara@disaster.gov.pk',       '$2b$10$placeholder', 2),
('omar_field',     'omar@disaster.gov.pk',       '$2b$10$placeholder', 3),
('hina_field',     'hina@disaster.gov.pk',       '$2b$10$placeholder', 3),
('zain_warehouse', 'zain@disaster.gov.pk',       '$2b$10$placeholder', 4),
('nadia_warehouse','nadia@disaster.gov.pk',      '$2b$10$placeholder', 4),
('bilal_finance',  'bilal@disaster.gov.pk',      '$2b$10$placeholder', 5),
('ayesha_finance', 'ayesha@disaster.gov.pk',     '$2b$10$placeholder', 5),
('kamran_admin',   'kamran@disaster.gov.pk',     '$2b$10$placeholder', 1);
GO

INSERT INTO EMERGENCY_REPORTS (user_id, location, disaster_type, severity_level, description, status) VALUES
(2, 'Lahore, Punjab',      'Flood',      'Critical', 'Severe flooding in Model Town area, 500+ displaced',   'Open'),
(2, 'Karachi, Sindh',      'Earthquake', 'High',     'Magnitude 5.8 earthquake near Lyari',                  'InProgress'),
(3, 'Peshawar, KPK',       'Fire',       'High',     'Industrial fire in Hayatabad industrial zone',          'Open'),
(3, 'Quetta, Balochistan', 'Earthquake', 'Critical', 'Magnitude 6.2 earthquake, buildings collapsed',        'InProgress'),
(2, 'Multan, Punjab',      'Flood',      'Medium',   'River overflow affecting 3 villages',                   'Open'),
(3, 'Islamabad',           'Fire',       'Low',      'Forest fire near Margalla Hills',                       'Resolved'),
(2, 'Hyderabad, Sindh',    'Flood',      'High',     'Urban flooding after heavy rainfall',                   'Open'),
(3, 'Rawalpindi, Punjab',  'Other',      'Medium',   'Gas pipeline explosion residential area',               'InProgress'),
(2, 'Faisalabad, Punjab',  'Flood',      'Critical', 'Chenab river breach, mass evacuation needed',           'Open'),
(3, 'Sukkur, Sindh',       'Earthquake', 'High',     'Earthquake caused landslides blocking highway',         'Open');
GO

INSERT INTO RESCUE_TEAMS (team_name, team_type, current_location, availability_status, capacity) VALUES
('Alpha Medical Unit',   'Medical', 'Lahore Central',    'Available', 12),
('Bravo Fire Squad',     'Fire',    'Karachi South',     'Available', 8),
('Charlie Rescue Team',  'Rescue',  'Peshawar Base',     'Available', 15),
('Delta Search Unit',    'Search',  'Quetta HQ',         'Available', 10),
('Echo Medical Team',    'Medical', 'Multan Station',    'Available', 12),
('Foxtrot Fire Brigade', 'Fire',    'Islamabad Base',    'Available', 8),
('Golf Rescue Squad',    'Rescue',  'Rawalpindi North',  'Available', 14),
('Hotel Search Team',    'Search',  'Faisalabad East',   'Available', 9),
('India Medical Corps',  'Medical', 'Hyderabad Central', 'Available', 11),
('Juliet Fire Unit',     'Fire',    'Sukkur South',      'Available', 7);
GO

INSERT INTO WAREHOUSES (warehouse_name, location, managed_by) VALUES
('Central Emergency Warehouse', 'Lahore',    6),
('Southern Supply Depot',       'Karachi',   6),
('Northern Relief Store',       'Islamabad', 7),
('Western Resource Center',     'Quetta',    7),
('Eastern Supply Hub',          'Peshawar',  6);
GO

INSERT INTO RESOURCES (resource_name, resource_type, quantity_available, reorder_threshold, warehouse_id, unit) VALUES
('Rice Bags',          'Food',      2000, 200, 1, 'kg'),
('Wheat Flour',        'Food',      1500, 150, 1, 'kg'),
('Mineral Water',      'Water',     5000, 500, 2, 'L'),
('Water Purification', 'Water',      300,  50, 2, 'units'),
('Paracetamol',        'Medicine',   800,  80, 3, 'boxes'),
('First Aid Kits',     'Medicine',   400,  40, 3, 'kits'),
('Tents (Large)',      'Shelter',    150,  20, 4, 'units'),
('Sleeping Bags',      'Shelter',    500,  50, 4, 'units'),
('Generators',         'Equipment',   30,   5, 5, 'units'),
('Rescue Boats',       'Equipment',   15,   3, 5, 'units'),
('Antibiotics',        'Medicine',   600,  60, 3, 'boxes'),
('Baby Food',          'Food',       400,  40, 1, 'kg'),
('Blankets',           'Shelter',    800,  80, 4, 'units'),
('Stretchers',         'Equipment',  100,  10, 5, 'units'),
('Cooking Oil',        'Food',       300,  30, 2, 'L');
GO

INSERT INTO HOSPITALS (hospital_name, location, total_beds, available_beds, contact_number) VALUES
('Jinnah Hospital Lahore',          'Lahore',     800, 120, '042-99231301'),
('Civil Hospital Karachi',          'Karachi',    700,  80, '021-99215740'),
('Hayatabad Medical Complex',       'Peshawar',   400,  60, '091-9217011'),
('Bolan Medical Complex',           'Quetta',     350,  45, '081-9201060'),
('Nishtar Hospital Multan',         'Multan',     500,  90, '061-9200500'),
('PIMS Hospital Islamabad',         'Islamabad',  600, 110, '051-9261170'),
('Liaquat University Hospital',     'Hyderabad',  450,  70, '022-9200080'),
('Holy Family Hospital Rawalpindi', 'Rawalpindi', 550,  85, '051-9281734'),
('Allied Hospital Faisalabad',      'Faisalabad', 480,  65, '041-9220460'),
('Ghulam Muhammad Mahar Hospital',  'Sukkur',     300,  40, '071-9310271');
GO

-- Team assignments (trigger auto-updates team status)
INSERT INTO TEAM_ASSIGNMENTS (report_id, team_id, assigned_by, status) VALUES
(1,  1,  2, 'InProgress'),
(2,  2,  2, 'Assigned'),
(3,  3,  3, 'InProgress'),
(4,  4,  3, 'InProgress'),
(5,  5,  2, 'Assigned'),
(6,  6,  3, 'Completed'),
(7,  9,  2, 'Assigned'),
(8,  7,  3, 'InProgress'),
(9,  8,  2, 'Assigned'),
(10, 10, 3, 'InProgress');
GO

INSERT INTO RESOURCE_ALLOCATIONS
    (resource_id, report_id, quantity_requested, quantity_approved, status, requested_by, approved_by, approved_at)
VALUES
(1,  1, 500, 400, 'Approved',   2, 6, GETDATE()),
(3,  1, 1000,800, 'Approved',   2, 6, GETDATE()),
(5,  2, 100,  80, 'Approved',   3, 6, GETDATE()),
(7,  4,  30,  25, 'Approved',   3, 7, GETDATE()),
(9,  1,   5,   4, 'Approved',   2, 7, GETDATE()),
(2,  5, 200,NULL, 'Pending',    2, NULL, NULL),
(6,  3,  50,NULL, 'Pending',    3, NULL, NULL),
(8,  7, 100,NULL, 'Pending',    2, NULL, NULL),
(11, 2,  80,  60, 'Dispatched', 3, 6, GETDATE()),
(13, 9, 200, 180, 'Approved',   2, 7, GETDATE());
GO

-- Patients (trigger auto-deducts hospital beds)
INSERT INTO PATIENTS (patient_name, age, condition_severity, report_id, hospital_id, status) VALUES
('Muhammad Tariq',   45, 'Critical', 1, 1, 'Admitted'),
('Fatima Bibi',      62, 'Stable',   1, 1, 'Admitted'),
('Usman Khan',       34, 'Critical', 2, 2, 'Admitted'),
('Zainab Malik',     28, 'Stable',   2, 2, 'Discharged'),
('Ahmad Raza',       55, 'Critical', 4, 4, 'Admitted'),
('Rukhsana Parveen', 70, 'Stable',   4, 4, 'Admitted'),
('Hassan Ali',       19, 'Stable',   3, 3, 'Discharged'),
('Sadia Noor',       40, 'Critical', 7, 7, 'Admitted'),
('Imran Sheikh',     33, 'Stable',   8, 8, 'Admitted'),
('Nasreen Akhtar',   58, 'Critical', 9, 9, 'Admitted');
GO

INSERT INTO DONATIONS (donor_name, donor_type, amount, report_id, recorded_by, payment_method) VALUES
('Ahmed Enterprises',    'Organization', 500000,  1,    8, 'Bank Transfer'),
('Pakistan Red Crescent','Organization',1000000,  NULL, 8, 'Bank Transfer'),
('Anonymous Donor',      'Individual',    50000,  2,    8, 'Cash'),
('Edhi Foundation',      'Organization', 750000,  4,    9, 'Bank Transfer'),
('Government of Punjab', 'Government',  2000000,  1,    8, 'Bank Transfer'),
('Sara Khan',            'Individual',    25000,  3,    9, 'Online'),
('Al-Khidmat Foundation','Organization', 500000,  NULL, 8, 'Cheque'),
('Imran Associates',     'Organization', 300000,  7,    9, 'Online'),
('Citizens Relief Fund', 'Organization', 200000,  9,    8, 'Bank Transfer'),
('Dr. Asif Mirza',       'Individual',    75000,  5,    9, 'Cash');
GO

INSERT INTO EXPENSES
    (expense_category, amount, description, report_id, recorded_by, approved_by, expense_date, status)
VALUES
('Transport',     85000,  'Fuel and vehicle rental for relief ops',  1,    8, 1,    '2024-01-10', 'Approved'),
('Medical',      120000,  'Emergency medicines for Karachi EQ',      2,    8, 1,    '2024-01-11', 'Approved'),
('Food',          65000,  'Food packets for Peshawar fire victims',   3,    9, 1,    '2024-01-12', 'Approved'),
('Shelter',      200000,  'Emergency tents for Quetta EQ victims',   4,    8, 1,    '2024-01-12', 'Approved'),
('Transport',     45000,  'Boat rental for Multan flood ops',         5,    9, NULL, '2024-01-13', 'Pending'),
('Communication', 30000,  'Satellite phones for field officers',     NULL, 8, 1,    '2024-01-09', 'Approved'),
('Medical',       90000,  'First aid supplies Hyderabad',             7,    9, NULL, '2024-01-14', 'Pending'),
('Equipment',    150000,  'Generator rental Faisalabad',              9,    8, 1,    '2024-01-15', 'Approved'),
('Food',          55000,  'Ration packs for Sukkur EQ victims',      10,   9, NULL, '2024-01-16', 'Pending'),
('Transport',     70000,  'Helicopter support Rawalpindi',            8,    8, 1,    '2024-01-14', 'Approved');
GO

INSERT INTO APPROVAL_REQUESTS
    (request_type, reference_id, requested_by, approved_by, status, remarks, actioned_at)
VALUES
('ResourceAllocation', 6,  2, 6,    'Approved', 'Approved - critical need',   GETDATE()),
('ResourceAllocation', 7,  3, NULL, 'Pending',  NULL,                          NULL),
('ResourceAllocation', 8,  2, NULL, 'Pending',  NULL,                          NULL),
('TeamDeployment',     1,  2, 1,    'Approved', 'Team deployed immediately',   GETDATE()),
('TeamDeployment',     5,  2, NULL, 'Pending',  NULL,                          NULL),
('Expense',            5,  9, NULL, 'Pending',  NULL,                          NULL),
('Expense',            7,  9, NULL, 'Pending',  NULL,                          NULL),
('Expense',            9,  9, 1,    'Rejected', 'Budget exceeded for period',  GETDATE()),
('ResourceAllocation', 9,  2, 7,    'Approved', 'Approved for Faisalabad',    GETDATE()),
('TeamDeployment',     10, 3, 1,    'Approved', 'Urgent deployment approved',  GETDATE());
GO

PRINT 'All sample data inserted successfully.';
GO

-- ============================================================
-- FILE 06: SELECT QUERIES
-- ============================================================

-- Q1: Critical open incidents
SELECT report_id, location, disaster_type, severity_level, status, reported_at
FROM EMERGENCY_REPORTS
WHERE severity_level = 'Critical' AND status NOT IN ('Resolved','Closed')
ORDER BY reported_at ASC;
GO

-- Q2: Available rescue teams
SELECT team_id, team_name, team_type, current_location, capacity
FROM RESCUE_TEAMS
WHERE availability_status = 'Available'
ORDER BY team_type;
GO

-- Q3: Low stock resources
SELECT r.resource_id, r.resource_name, r.resource_type,
       r.quantity_available, r.reorder_threshold, r.unit, w.warehouse_name
FROM RESOURCES r
JOIN WAREHOUSES w ON r.warehouse_id = w.warehouse_id
WHERE r.quantity_available <= r.reorder_threshold
ORDER BY r.quantity_available ASC;
GO

-- Q4: Financial summary per disaster event
SELECT
    r.report_id, r.location, r.disaster_type,
    ISNULL(SUM(DISTINCT d.amount), 0) AS total_donations,
    ISNULL(SUM(DISTINCT e.amount), 0) AS total_expenses,
    ISNULL(SUM(DISTINCT d.amount), 0) -
    ISNULL(SUM(DISTINCT e.amount), 0) AS net_balance
FROM EMERGENCY_REPORTS r
LEFT JOIN DONATIONS d ON r.report_id = d.report_id
LEFT JOIN EXPENSES   e ON r.report_id = e.report_id
GROUP BY r.report_id, r.location, r.disaster_type
ORDER BY total_donations DESC;
GO

-- Q5: Pending approvals with requester info
SELECT a.approval_id, a.request_type, a.reference_id,
       u.username AS requested_by, ro.role_name, a.requested_at
FROM APPROVAL_REQUESTS a
JOIN USERS u  ON a.requested_by = u.user_id
JOIN ROLES ro ON u.role_id = ro.role_id
WHERE a.status = 'Pending'
ORDER BY a.requested_at ASC;
GO

-- Q6: Audit trail for user_id = 2
SELECT al.log_id, u.username, al.action_type,
       al.table_name, al.record_id, al.new_value, al.logged_at
FROM AUDIT_LOGS al
JOIN USERS u ON al.user_id = u.user_id
WHERE al.user_id = 2
ORDER BY al.logged_at DESC;
GO

-- Q7: Reports with assigned teams
SELECT er.report_id, er.location, er.disaster_type, er.severity_level,
       rt.team_name, rt.team_type, ta.status AS assignment_status, ta.assigned_at
FROM EMERGENCY_REPORTS er
JOIN TEAM_ASSIGNMENTS ta ON er.report_id = ta.report_id
JOIN RESCUE_TEAMS rt     ON ta.team_id   = rt.team_id
ORDER BY er.report_id;
GO

-- Q8: Hospital capacity overview
SELECT hospital_id, hospital_name, location,
       total_beds, available_beds,
       (total_beds - available_beds) AS occupied_beds,
       CAST(ROUND(CAST(available_beds AS FLOAT) / total_beds * 100, 2) AS DECIMAL(5,2)) AS availability_pct
FROM HOSPITALS
WHERE is_active = 1
ORDER BY availability_pct ASC;
GO

-- Q9: Resource allocation status per report
SELECT er.report_id, er.location, er.disaster_type,
       rs.resource_name, rs.resource_type,
       ra.quantity_requested, ra.quantity_approved,
       ra.status AS allocation_status, u.username AS requested_by
FROM RESOURCE_ALLOCATIONS ra
JOIN EMERGENCY_REPORTS er ON ra.report_id    = er.report_id
JOIN RESOURCES         rs ON ra.resource_id  = rs.resource_id
JOIN USERS             u  ON ra.requested_by = u.user_id
ORDER BY er.report_id, ra.status;
GO

-- Q10: Donations by donor type
SELECT donor_type, COUNT(*) AS total_donations,
       SUM(amount) AS total_amount, AVG(amount) AS average_amount
FROM DONATIONS
GROUP BY donor_type
ORDER BY total_amount DESC;
GO

-- Q11: Incidents by disaster type
SELECT disaster_type, COUNT(*) AS total_incidents,
       SUM(CASE WHEN severity_level = 'Critical' THEN 1 ELSE 0 END) AS critical_count,
       SUM(CASE WHEN status = 'Resolved'         THEN 1 ELSE 0 END) AS resolved_count
FROM EMERGENCY_REPORTS
GROUP BY disaster_type
ORDER BY total_incidents DESC;
GO

-- Q12: Patients per hospital
SELECT h.hospital_name, h.location,
       COUNT(p.patient_id) AS total_patients,
       SUM(CASE WHEN p.condition_severity = 'Critical' THEN 1 ELSE 0 END) AS critical_patients,
       SUM(CASE WHEN p.status = 'Admitted'             THEN 1 ELSE 0 END) AS currently_admitted
FROM HOSPITALS h
LEFT JOIN PATIENTS p ON h.hospital_id = p.hospital_id
GROUP BY h.hospital_id, h.hospital_name, h.location
ORDER BY total_patients DESC;
GO

-- Q13: View - pending incidents
SELECT * FROM v_pending_incidents
ORDER BY
    CASE severity_level
        WHEN 'Critical' THEN 1 WHEN 'High'   THEN 2
        WHEN 'Medium'   THEN 3 WHEN 'Low'    THEN 4
    END;
GO

-- Q14: View - low stock
SELECT * FROM v_warehouse_stock WHERE stock_alert = 'LOW STOCK';
GO

-- Q15: View - financial summary
SELECT * FROM v_financial_summary ORDER BY net_balance DESC;
GO

-- ============================================================
-- FILE 07: TRANSACTION DEMONSTRATIONS
-- ============================================================

-- Transaction 1: Resource Allocation + Stock Deduction
BEGIN TRANSACTION;
BEGIN TRY
    INSERT INTO RESOURCE_ALLOCATIONS
        (resource_id, report_id, quantity_requested, quantity_approved,
         status, requested_by, approved_by, approved_at)
    VALUES (1, 3, 100, 100, 'Approved', 2, 6, GETDATE());

    IF EXISTS (SELECT 1 FROM RESOURCES WHERE resource_id = 1 AND quantity_available < 0)
    BEGIN
        RAISERROR('Stock went negative after allocation', 16, 1);
    END

    COMMIT TRANSACTION;
    PRINT 'Transaction 1: Resource allocation committed.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Transaction 1 rolled back: ' + ERROR_MESSAGE();
END CATCH;
GO

-- Transaction 2: Team Assignment + Status Update
BEGIN TRANSACTION;
BEGIN TRY
    IF NOT EXISTS (
        SELECT 1 FROM RESCUE_TEAMS
        WHERE team_id = 6 AND availability_status = 'Available'
    )
    BEGIN
        RAISERROR('Team is not available for assignment', 16, 1);
    END

    INSERT INTO TEAM_ASSIGNMENTS (report_id, team_id, assigned_by, status)
    VALUES (5, 6, 2, 'Assigned');

    COMMIT TRANSACTION;
    PRINT 'Transaction 2: Team assigned successfully.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Transaction 2 rolled back: ' + ERROR_MESSAGE();
END CATCH;
GO

-- Transaction 3: Approve Expense + Audit Log
BEGIN TRANSACTION;
BEGIN TRY
    UPDATE EXPENSES
    SET approved_by = 1, status = 'Approved'
    WHERE expense_id = 5 AND status = 'Pending';

    UPDATE APPROVAL_REQUESTS
    SET approved_by = 1, status = 'Approved',
        remarks = 'Approved after review', actioned_at = GETDATE()
    WHERE request_type = 'Expense' AND reference_id = 5 AND status = 'Pending';

    INSERT INTO AUDIT_LOGS (user_id, action_type, table_name, record_id, old_value, new_value)
    VALUES (1, 'UPDATE', 'EXPENSES', 5, 'status=Pending', 'status=Approved');

    COMMIT TRANSACTION;
    PRINT 'Transaction 3: Expense approved and logged.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Transaction 3 rolled back: ' + ERROR_MESSAGE();
END CATCH;
GO

-- Transaction 4: Patient Admission + Bed Decrement
BEGIN TRANSACTION;
BEGIN TRY
    IF NOT EXISTS (SELECT 1 FROM HOSPITALS WHERE hospital_id = 5 AND available_beds > 0)
    BEGIN
        RAISERROR('No beds available in hospital 5', 16, 1);
    END

    INSERT INTO PATIENTS (patient_name, age, condition_severity, report_id, hospital_id, status)
    VALUES ('New Test Patient', 30, 'Stable', 5, 5, 'Admitted');

    COMMIT TRANSACTION;
    PRINT 'Transaction 4: Patient admitted, bed decremented.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Transaction 4 rolled back: ' + ERROR_MESSAGE();
END CATCH;
GO

-- Transaction 5: ROLLBACK Demo - Insufficient Stock
BEGIN TRANSACTION;
BEGIN TRY
    INSERT INTO RESOURCE_ALLOCATIONS
        (resource_id, report_id, quantity_requested, quantity_approved,
         status, requested_by, approved_by, approved_at)
    VALUES (10, 2, 9999, 9999, 'Approved', 2, 6, GETDATE());

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Transaction 5 rolled back (expected): ' + ERROR_MESSAGE();
END CATCH;
GO

-- ============================================================
-- FILE 08: PERFORMANCE ANALYSIS
-- ============================================================

-- Test 1: WITHOUT composite index
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reports_type_severity')
    DROP INDEX idx_reports_type_severity ON EMERGENCY_REPORTS;
GO

SET STATISTICS TIME ON;
SET STATISTICS IO ON;

SELECT report_id, location, severity_level, status
FROM EMERGENCY_REPORTS
WHERE disaster_type = 'Flood' AND severity_level = 'Critical';

SET STATISTICS TIME OFF;
SET STATISTICS IO OFF;
GO

-- Test 1: WITH composite index
CREATE INDEX idx_reports_type_severity ON EMERGENCY_REPORTS(disaster_type, severity_level);
GO

SET STATISTICS TIME ON;
SET STATISTICS IO ON;

SELECT report_id, location, severity_level, status
FROM EMERGENCY_REPORTS
WHERE disaster_type = 'Flood' AND severity_level = 'Critical';

SET STATISTICS TIME OFF;
SET STATISTICS IO OFF;
GO

-- Test 2: View vs Direct Table
SET STATISTICS TIME ON;

-- Direct
SELECT r.report_id, r.location, r.disaster_type,
       r.severity_level, r.status, r.reported_at, u.username
FROM EMERGENCY_REPORTS r
JOIN USERS u ON r.user_id = u.user_id
WHERE r.status IN ('Open','InProgress');

-- Via view
SELECT * FROM v_pending_incidents;

SET STATISTICS TIME OFF;
GO

-- Test 3: Audit log date range
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_logged_at')
    DROP INDEX idx_audit_logged_at ON AUDIT_LOGS;
GO

SET STATISTICS TIME ON;
SELECT log_id, user_id, action_type, logged_at FROM AUDIT_LOGS
WHERE logged_at >= DATEADD(DAY, -7, GETDATE());
SET STATISTICS TIME OFF;
GO

CREATE INDEX idx_audit_logged_at ON AUDIT_LOGS(logged_at);
GO

SET STATISTICS TIME ON;
SELECT log_id, user_id, action_type, logged_at FROM AUDIT_LOGS
WHERE logged_at >= DATEADD(DAY, -7, GETDATE());
SET STATISTICS TIME OFF;
GO

-- To see execution plans: press Ctrl+M in SSMS before running
-- Look for "Index Seek" vs "Table Scan" in the plan

PRINT '============================================';
PRINT 'All scripts executed successfully!';
PRINT 'Password update required - run separately:';
PRINT 'See README for bcrypt password setup steps.';
PRINT '============================================';
GO

USE disaster_mis;
UPDATE users SET password_hash = '$2a$10$eDdZjn.WqZc2qdNdyOEpzu/gYbjPlXyGLEX19.85iuD8tDSCifxvW';