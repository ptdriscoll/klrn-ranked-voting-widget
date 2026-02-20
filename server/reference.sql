-- Reference SQL for schema and queries
-- Not executed directly by the application

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
