-- Reference SQL for schema and queries
-- This file is not executed directly by the application

--------------------------------------------------
-- drop
--------------------------------------------------

DROP TABLE IF EXISTS vote_results, vote_sessions;

--------------------------------------------------
-- create
--------------------------------------------------

CREATE TABLE vote_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_hash CHAR(64) NOT NULL,
    zip VARCHAR(10),
    ip_address VARBINARY(16),
    fingerprint_hash CHAR(64),
    vote_signature VARCHAR(255),
    suspicion_score INT DEFAULT 0,
    suspicion_flags VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token_hash),
    INDEX(ip_address),
    INDEX(fingerprint_hash),
    INDEX(vote_signature),
    INDEX(created_at)
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
(token_hash, zip, ip_address, fingerprint_hash, vote_signature, suspicion_score, suspicion_flags)
VALUES
(
  'abc',
  '78247',
  INET6_ATON('192.168.1.100'),
  'xyz',  
  '16-14-12-10-9',
  0,
  ''  
);

INSERT INTO vote_results (vote_session_id, entry_id, points) VALUES
(1, 4, 16),
(1, 2, 14),
(1, 5, 12),
(1, 1, 10),
(1, 3, 9);

--------------------------------------------------
-- select totals
--------------------------------------------------

SELECT entry_id, SUM(points) AS count 
FROM vote_results
GROUP BY entry_id
ORDER BY entry_id

--------------------------------------------------
-- select rows for csv export
--------------------------------------------------

SELECT 
    vs.id AS session_id,
    vs.created_at,
    vs.zip,
    vs.suspicion_score,
    vs.suspicion_flags,    
    vs.ip_address,
    vs.fingerprint_hash,
    vr.entry_id,
    vr.points
FROM vote_sessions vs
JOIN vote_results vr 
    ON vs.id = vr.vote_session_id
ORDER BY vs.id, vr.entry_id;

--------------------------------------------------
-- select data for suspicion scoring
--------------------------------------------------

SELECT
    SUM(CASE 
        WHEN ip_address = ?
        AND fingerprint_hash = ?
        AND created_at > (NOW() - INTERVAL 3 SECOND)
        THEN 1 ELSE 0 END) AS fast_count,

    SUM(CASE 
        WHEN ip_address = ?
        AND fingerprint_hash = ?
        AND created_at > (NOW() - INTERVAL 5 MINUTE)
        THEN 1 ELSE 0 END) AS repeat_count,

    SUM(CASE 
        WHEN vote_signature = ?
        AND created_at > (NOW() - INTERVAL 5 MINUTE)
        THEN 1 ELSE 0 END) AS signature_count

FROM vote_sessions
WHERE created_at > (NOW() - INTERVAL 5 MINUTE);
