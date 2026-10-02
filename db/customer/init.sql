-- customer_db: chỉ chứa dữ liệu Customer & Membership (Database-per-Service).
-- customer.uid tham chiếu LOGIC tới auth_db.users.uid, nên KHÔNG có khoá ngoại chéo DB.
CREATE TABLE IF NOT EXISTS membership (
    mid   SMALLINT     PRIMARY KEY,
    mname VARCHAR(30)  NOT NULL UNIQUE,
    score INTEGER      NOT NULL CHECK (score >= 0)
);

INSERT INTO membership (mid, mname, score) VALUES
    (1, 'BRONZE', 0),
    (2, 'SILVER', 100),
    (3, 'GOLD', 500),
    (4, 'PLATINUM', 1000)
ON CONFLICT (mid) DO NOTHING;

CREATE TABLE IF NOT EXISTS customer (
    uid        INTEGER      PRIMARY KEY,
    fullname   VARCHAR(100) NOT NULL,
    mid        SMALLINT     NOT NULL DEFAULT 1 REFERENCES membership (mid),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);