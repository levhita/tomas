DROP TABLE IF EXISTS account;

CREATE TABLE
  account (
    id INTEGER NOT NULL,
    name TEXT NOT NULL,
    note TEXT,
    type TEXT CHECK (type IN ('debit', 'credit')) NOT NULL DEFAULT 'debit',
    starting_amount NUMERIC NOT NULL DEFAULT 0,
    created_at NUMERIC DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  );

DROP TABLE IF EXISTS category;

CREATE TABLE
  category (
    id INTEGER NOT NULL,
    name TEXT NOT NULL,
    note TEXT,
    parent_category_id INTEGER DEFAULT null,
    created_at NUMERIC NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (parent_category_id) REFERENCES category (id)
  );

-- Transactions --
DROP TABLE IF EXISTS "transaction";

CREATE TABLE
  "transaction" (
    id INTEGER NOT NULL,
    description TEXT NOT NULL,
    note TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    "date" NUMERIC NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exercised INTEGER DEFAULT FALSE,
    account_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    created_at NUMERIC NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (account_id) REFERENCES account (id),
    FOREIGN KEY (category_id) REFERENCES category (id)
  );
