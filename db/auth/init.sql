CREATE TABLE roles (
    roleid   SERIAL PRIMARY KEY,
    rolename VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (roleid, rolename) VALUES
    (1, 'ADMIN'), (2, 'CUSTOMER'), (3, 'SHIPMENT_STAFF');
SELECT setval('roles_roleid_seq', 3);

CREATE TABLE users (
    uid        SERIAL PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    email      VARCHAR(100) NOT NULL UNIQUE,
    phone      VARCHAR(20),
    password   VARCHAR(255) NOT NULL,
    roleid     INT NOT NULL REFERENCES roles(roleid),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bước 4 sẽ dùng bảng này để phát sự kiện UserRegistered tới Kafka (thêm sẵn để khỏi phải tạo lại DB).
CREATE TABLE outbox_events (
    id           BIGSERIAL PRIMARY KEY,
    event_type   VARCHAR(100) NOT NULL,
    payload      JSONB NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PUBLISHED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);
CREATE INDEX idx_auth_outbox_pending ON outbox_events (id) WHERE status = 'PENDING';