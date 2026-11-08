-- Schema for chat-db: owned exclusively by the chat-service.
-- User ids are plain integers (no foreign keys): the users table lives in
-- auth-db and is only reachable through the auth-service API.

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
    user_id INT NOT NULL,
    chat_id INT REFERENCES chats(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, chat_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    chat_id INT REFERENCES chats(id) ON DELETE CASCADE,
    sender_id INT,
    -- Denormalized at send time (from the JWT) so message listings need no
    -- lookup against the auth-service.
    sender_username VARCHAR(50) NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

------------------------------
-- OFFLINE DELIVERY MECHANISM
------------------------------
-- Stores messages pending delivery to offline recipients.
CREATE TABLE IF NOT EXISTS offline_queue (
    message_id INT REFERENCES messages(id) ON DELETE CASCADE,
    recipient_id INT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending',
    PRIMARY KEY (message_id, recipient_id)
);
