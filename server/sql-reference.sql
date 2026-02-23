-- Reference SQL for schema and queries
-- This file is not executed directly by the application

--------------------------------------------------
-- drop
--------------------------------------------------

DROP TABLE vote_sessions, vote_results;

--------------------------------------------------
-- create
--------------------------------------------------

CREATE TABLE vote_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_hash CHAR(64) NOT NULL,
    zip VARCHAR(10),
    ip_address VARBINARY(16),
    fingerprint_hash CHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token_hash)
);

CREATE TABLE vote_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vote_session_id INT NOT NULL,
    entry_id INT NOT NULL,
    points INT NOT NULL,
    FOREIGN KEY (vote_session_id) 
        REFERENCES vote_sessions(id)
        ON DELETE CASCADE,
    UNIQUE(vote_session_id, entry_id),
    INDEX(vote_session_id),
    INDEX(entry_id)
);

--------------------------------------------------
-- insert
--------------------------------------------------

INSERT INTO vote_sessions
(token_hash, zip, ip_address, fingerprint_hash, created_at)
VALUES
(
  'abc',
  '78247',
  '192.168.1.100',
  'xyz',
  '2026-02-17 14:23:11'
);

INSERT INTO vote_results (vote_session_id, entry_id, points) VALUES
(1, 4, 16),
(1, 2, 14),
(1, 5, 12),
(1, 1, 1),
(1, 3, 1);

--------------------------------------------------
-- select
--------------------------------------------------

SELECT entry_id, SUM(points) AS count 
FROM vote_results
GROUP BY entry_id
ORDER BY entry_id

SELECT 
    vs.id AS session_id,
    vs.created_at,
    vs.zip,
    vs.ip_address,
    vs.fingerprint_hash,
    vr.entry_id,
    vr.points
FROM vote_sessions vs
JOIN vote_results vr 
    ON vs.id = vr.vote_session_id
ORDER BY vs.id, vr.entry_id;
