-- DANGER: Drops all tables to ensure a clean start for development
DROP TABLE IF EXISTS offline_queue CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_members CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS users CASCADE;


------------------------------
-- CORE USER/AUTH SERVICE TABLES
------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------
-- CHAT STRUCTURE TABLES
------------------------------
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_members (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    chat_id INT REFERENCES chats(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, chat_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    chat_id INT REFERENCES chats(id) ON DELETE CASCADE,
    sender_id INT REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------
-- OFFLINE DELIVERY MECHANISM
------------------------------
-- Stores messages pending delivery to offline recipients.
CREATE TABLE IF NOT EXISTS offline_queue (
    message_id INT REFERENCES messages(id) ON DELETE CASCADE,
    recipient_id INT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'pending', 
    PRIMARY KEY (message_id, recipient_id)
);


------------------------------
-- SAMPLE DATA INSERTS
------------------------------

-- Sample users (password 'batata' for all)
INSERT INTO users (username, password_hash) VALUES
('alice', '$argon2id$v=19$m=65536,t=3,p=4$0tobY6y1do6RstZai3GudQ$zBXND/C5ZPQ2JXFaNTgNbtE/kAA9diRhJZPm0mtWyR4'), -- ID 1
('bob', '$argon2id$v=19$m=65536,t=3,p=4$0tobY6y1do6RstZai3GudQ$zBXND/C5ZPQ2JXFaNTgNbtE/kAA9diRhJZPm0mtWyR4'),   -- ID 2
('carol', '$argon2id$v=19$m=65536,t=3,p=4$0tobY6y1do6RstZai3GudQ$zBXND/C5ZPQ2JXFaNTgNbtE/kAA9diRhJZPm0mtWyR4'); -- ID 3

INSERT INTO chats (name, is_group) VALUES
('General', TRUE);

INSERT INTO chats (name, is_group) VALUES
('Random', TRUE); 

INSERT INTO chats (name, is_group) VALUES
('Alice and Carol Vibe', FALSE); 

INSERT INTO chat_members (user_id, chat_id) VALUES
(1, 1),
(2, 1),
(3, 1);

INSERT INTO chat_members (user_id, chat_id) VALUES
(1, 2),
(2, 2);

INSERT INTO chat_members (user_id, chat_id) VALUES
(1, 3),
(3, 3);


INSERT INTO messages (chat_id, sender_id, content) VALUES
(1, 1, 'Heyoo!'),
(2, 2, 'Batata?'),
(3, 3, 'Mekie.');

INSERT INTO messages (chat_id, sender_id, content) VALUES
(1, 2, 'Offline');

INSERT INTO offline_queue (message_id, recipient_id) VALUES
(4, 1);