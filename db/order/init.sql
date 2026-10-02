-- Order DB (Order Management): orders, order_details, outbox_events.
CREATE TABLE orders (
    oid      SERIAL PRIMARY KEY,
    uid      INT NOT NULL,                       -- tham chieu logic toi Customer/User (khong co FK lien DB)
    discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0)
);

CREATE TABLE order_details (
    oid        INT NOT NULL REFERENCES orders(oid) ON DELETE CASCADE,
    pid        INT NOT NULL,                     -- tham chieu logic toi Product (MongoDB)
    qty        INT NOT NULL CHECK (qty > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (oid, pid)
);

-- Outbox: ghi cung transaction voi Order de khong mat su kien OrderCreated.
CREATE TABLE outbox_events (
    id           BIGSERIAL PRIMARY KEY,
    event_type   VARCHAR(100) NOT NULL,
    payload      JSONB NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PUBLISHED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);
CREATE INDEX idx_outbox_pending ON outbox_events (id) WHERE status = 'PENDING';
