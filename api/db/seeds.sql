-- Create default user --
INSERT INTO
  `user` (id, username, password_hash, admin)
VALUES
  (
    1,
    "admin",
    "$2b$10$JKCPXyZ3LWZ0Rbc8Aa/.4.cKIhGsGvOTw1RmWVEBZLqvzVX8b8zSS",
    true -- Password: 'admin'
  );

-- Create a regular user for demo
INSERT INTO
  `user` (id, username, password_hash, admin)
VALUES
  (
    2,
    "user",
    "$2b$10$JKCPXyZ3LWZ0Rbc8Aa/.4.cKIhGsGvOTw1RmWVEBZLqvzVX8b8zSS", -- Password: 'admin'
    false
  );

-- Create default workspace --
INSERT INTO
  `workspace` (
    id,
    name,
    description,
    currency_symbol,
    week_start
  )
VALUES
  (
    1,
    "Default Workspace",
    "Default workspace for demo purposes",
    "$",
    "monday"
  );

-- Create additional demo workspaces
INSERT INTO
  `workspace` (
    id,
    name,
    description,
    currency_symbol,
    week_start
  )
VALUES
  (
    2,
    "European Business",
    "Euro-based finances",
    "€",
    "monday"
  ),
  (
    3,
    "UK Investments",
    "British pound investments",
    "£",
    "monday"
  ),
  (
    4,
    "Japan Office",
    "Japanese yen expenses",
    "¥",
    "sunday"
  ),
  (
    5,
    "Mexico Branch",
    "Mexican peso finances",
    "MX$",
    "sunday"
  );

-- Add users to workspaces with appropriate roles --
INSERT INTO
  `workspace_user` (workspace_id, user_id, role)
VALUES
  (1, 1, 'owner'), -- Admin user is owner of Default workspace
  (2, 1, 'owner'), -- Admin user is owner of European Business
  (3, 1, 'owner'), -- Admin user is owner of UK Investments
  (4, 1, 'owner'), -- Admin user is owner of Japan Office
  (5, 1, 'owner'), -- Admin user is owner of Mexico Branch
  (1, 2, 'collaborator'), -- Regular user is collaborator in Default workspace
  (3, 2, 'collaborator');

-- Regular user is collaborator in UK Investments
-- Categories --
INSERT INTO
  category (id, name, type, workspace_id)
VALUES
  (1, "Housing", "expense", 1),
  (2, "Transportation", "expense", 1),
  (3, "Food", "expense", 1),
  (4, "Utilities", "expense", 1),
  (5, "Clothing", "expense", 1),
  (6, "Healthcare", "expense", 1),
  (7, "Insurance", "expense", 1),
  (8, "Household Items/Supplies", "expense", 1),
  (9, "Personal", "expense", 1),
  (10, "Debt", "expense", 1),
  (11, "Retirement", "expense", 1),
  (12, "Education", "expense", 1),
  (13, "Savings", "expense", 1),
  (14, "Gifts/Donations", "expense", 1),
  (15, "Entertainment", "expense", 1),
  (16, "Wages", "income", 1),
  (17, "Rents", "income", 1),
  (18, "Dividends", "income", 1),
  (19, "Commissions", "income", 1),
  (20, "Gifts", "income", 1),
  (21, "Loans", "income", 1),
  (22, "Interests", "income", 1);

-- Sub Categories --
INSERT INTO
  category (name, parent_category_id, type, workspace_id)
VALUES
  -- Housing --
  ("Mortgage", 1, "expense", 1),
  ("House Rent", 1, "expense", 1),
  ("Property Taxes", 1, "expense", 1),
  ("Home Repairs", 1, "expense", 1),
  ("Management Fees", 1, "expense", 1),
  -- Transportation --
  ("Car Payment", 2, "expense", 1),
  ("Car Warranty", 2, "expense", 1),
  ("Car Taxes", 2, "expense", 1),
  ("Gas", 2, "expense", 1),
  ("Tires", 2, "expense", 1),
  ("Maintenance", 2, "expense", 1),
  ("Repairs", 2, "expense", 1),
  ("Parking", 2, "expense", 1),
  ("Tickets", 2, "expense", 1),
  -- Food --
  ("Groceries", 3, "expense", 1),
  ("Restaurants", 3, "expense", 1),
  ("Pet food", 3, "expense", 1),
  ("Take Out", 3, "expense", 1),
  -- Utilities --
  ("Electricity", 4, "expense", 1),
  ("Water", 4, "expense", 1),
  ("Garbage", 4, "expense", 1),
  ("Phones", 4, "expense", 1),
  ("Cable", 4, "expense", 1),
  ("Internet", 4, "expense", 1),
  -- Clothing --
  ("Adults' clothing", 5, "expense", 1),
  ("Adults' shoes", 5, "expense", 1),
  ("Children's clothing", 5, "expense", 1),
  ("Children's shoes", 5, "expense", 1),
  -- Healthcare --
  ("Primary care", 6, "expense", 1),
  ("Dental care", 6, "expense", 1),
  ("Specialist", 6, "expense", 1),
  ("Urgent care", 6, "expense", 1),
  ("Medications", 6, "expense", 1),
  ("Medical devices", 6, "expense", 1),
  -- Insurance --
  ("Health insurance", 7, "expense", 1),
  ("Homeowner's Insurance", 7, "expense", 1),
  ("Renter's Insurance", 7, "expense", 1),
  ("Home warranty", 7, "expense", 1),
  ("Home protection plan", 7, "expense", 1),
  ("Car insurance", 7, "expense", 1),
  ("Life insurance", 7, "expense", 1),
  ("Disability insurance", 7, "expense", 1),
  -- Household supplies --
  ("Toiletries", 8, "expense", 1),
  ("Laundry detergent", 8, "expense", 1),
  ("Dishwasher detergent", 8, "expense", 1),
  ("Cleaning supplies", 8, "expense", 1),
  ("Tools", 8, "expense", 1),
  -- Personal --
  ("Gym memberships", 9, "expense", 1),
  ("Haircuts", 9, "expense", 1),
  ("Salon services", 9, "expense", 1),
  ("Cosmetics", 9, "expense", 1),
  ("Babysitter", 9, "expense", 1),
  ("Subscriptions", 9, "expense", 1),
  -- Debt --
  ("Personal loans", 10, "expense", 1),
  ("Student loans", 10, "expense", 1),
  ("Credit cards", 10, "expense", 1),
  -- Retirement --
  ("Financial planning", 11, "expense", 1),
  ("Investing", 11, "expense", 1),
  -- Education --
  ("Children's college", 12, "expense", 1),
  ("Your college", 12, "expense", 1),
  ("School supplies", 12, "expense", 1),
  ("Books", 12, "expense", 1),
  -- Savings --
  ("Emergency fund", 13, "expense", 1),
  ("Big purchases", 13, "expense", 1),
  ("Other savings", 13, "expense", 1),
  -- Gifts and Donations --
  ("Birthday", 14, "expense", 1),
  ("Anniversary", 14, "expense", 1),
  ("Wedding", 14, "expense", 1),
  ("Christmas", 14, "expense", 1),
  ("Special occasion", 14, "expense", 1),
  ("Charities", 14, "expense", 1),
  -- Entertainment --
  ("Alcohol and/or bars", 15, "expense", 1),
  ("Games", 15, "expense", 1),
  ("Movies", 15, "expense", 1),
  ("Concerts", 15, "expense", 1),
  ("Vacations", 15, "expense", 1),
  ("Subscriptions", 15, "expense", 1);

-- Accounts with workspace_id --
INSERT INTO
  account (id, name, type, workspace_id)
VALUES
  (1, "Debit Card", "debit", 1),
  (2, "Credit Card", "credit", 1),
  (3, "Euro Bank", "debit", 2),
  (4, "UK Savings", "debit", 3),
  (5, "Japan Checking", "debit", 4),
  (6, "Mexico Account", "debit", 5);

-- Transactions --
INSERT INTO
  transaction (
    id,
    description,
    amount,
    date,
    exercised,
    account_id,
    category_id
  )
VALUES
  (
    1,
    "Starting amount",
    5000,
    "2025-01-01",
    true,
    1,
    1
  ),
  (
    2,
    "Starting amount",
    20000,
    "2025-01-01",
    true,
    2,
    13
  ),
  (
    3,
    "Euro initial balance",
    10000,
    "2025-01-01",
    true,
    3,
    NULL
  ),
  (
    4,
    "Pounds initial balance",
    8000,
    "2025-01-01",
    true,
    4,
    NULL
  ),
  (
    5,
    "Yen initial balance",
    500000,
    "2025-01-01",
    true,
    5,
    NULL
  ),
  (
    6,
    "Pesos initial balance",
    50000,
    "2025-01-01",
    true,
    6,
    NULL
  );