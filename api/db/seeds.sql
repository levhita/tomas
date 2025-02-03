-- Categories --
INSERT INTO
  category (id, name, type)
VALUES
  (1, "Housing", "expense"),
  (2, "Transportation", "expense"),
  (3, "Food", "expense"),
  (4, "Utilities", "expense"),
  (5, "Clothing", "expense"),
  (6, "Healthcare", "expense"),
  (7, "Insurance", "expense"),
  (8, "Household Items/Supplies", "expense"),
  (9, "Personal", "expense"),
  (10, "Debt", "expense"),
  (11, "Retirement", "expense"),
  (12, "Education", "expense"),
  (13, "Savings", "expense"),
  (14, "Gifts/Donations", "expense"),
  (15, "Entertainment", "expense"),
  (16, "Wages", "income"),
  (17, "Rents", "income"),
  (18, "Dividens", "income"),
  (19, "Commissions", "income"),
  (20, "Gifts", "income"),
  (21, "Loans", "income"),
  (22, "Interests", "income");

-- Sub Categories --
INSERT INTO
  category (name, parent_category_id, type)
VALUES
  -- Housing --
  ("Mortgage", 1, "expense"),
  ("House Rent", 1, "expense"),
  ("Property Taxes", 1, "expense"),
  ("Home Repairs", 1, "expense"),
  ("Managment Fees", 1, "expense"),
  -- Transportation --
  ("Car Payment", 2, "expense"),
  ("Car Warranty", 2, "expense"),
  ("Car Taxes", 2, "expense"),
  ("Gas", 2, "expense"),
  ("Tires", 2, "expense"),
  ("Maintenance", 2, "expense"),
  ("Repairs", 2, "expense"),
  ("Parking", 2, "expense"),
  ("Tickets", 2, "expense"),
  -- Food --
  ("Groceries", 3, "expense"),
  ("Restaurants", 3, "expense"),
  ("Pet food", 3, "expense"),
  ("Take Out", 3, "expense"),
  -- Utilities --
  ("Electricity", 4, "expense"),
  ("Water", 4, "expense"),
  ("Garbage", 4, "expense"),
  ("Phones", 4, "expense"),
  ("Cable", 4, "expense"),
  ("Internet", 4, "expense"),
  -- Clothing --
  ("Adults' clothing", 5, "expense"),
  ("Adults' shoes", 5, "expense"),
  ("Children's clothing", 5, "expense"),
  ("Children's shoes", 5, "expense"),
  -- Healtcare --
  ("Primary care", 6, "expense"),
  ("Dental care", 6, "expense"),
  ("Specialist", 6, "expense"),
  ("Urgent care", 6, "expense"),
  ("Medications", 6, "expense"),
  ("Medical devices", 6, "expense"),
  -- Insurance --
  ("Health insurance", 7, "expense"),
  ("Homeowner's Insurance", 7, "expense"),
  ("Renter's Insurance", 7, "expense"),
  ("Home warranty", 7, "expense"),
  ("Home protection plan", 7, "expense"),
  ("Car insurance", 7, "expense"),
  ("Life insurance", 7, "expense"),
  ("Disability insurance", 7, "expense"),
  -- Household supplies --
  ("Toiletries", 8, "expense"),
  ("Laundry detergent", 8, "expense"),
  ("Dishwasher detergent", 8, "expense"),
  ("Cleaning supplies", 8, "expense"),
  ("Tools", 8, "expense"),
  -- Personal --
  ("Gym memberships", 9, "expense"),
  ("Haircuts", 9, "expense"),
  ("Salon services", 9, "expense"),
  ("Cosmetics", 9, "expense"),
  ("Babysitter", 9, "expense"),
  ("Subscriptions", 9, "expense"),
  -- Debt --
  ("Personal loans", 10, "expense"),
  ("Student loans", 10, "expense"),
  ("Credit cards", 10, "expense"),
  -- Retirement --
  ("Financial planning", 11, "expense"),
  ("Investing", 11, "expense"),
  -- Education --
  ("Children's college", 12, "expense"),
  ("Your college", 12, "expense"),
  ("School supplies", 12, "expense"),
  ("Books", 12, "expense"),
  -- Savings --
  ("Emergency fund", 13, "expense"),
  ("Big purchases", 13, "expense"),
  ("Other savings", 13, "expense"),
  -- Gifts and Donations --
  ("Birthday", 14, "expense"),
  ("Anniversary", 14, "expense"),
  ("Wedding", 14, "expense"),
  ("Christmas", 14, "expense"),
  ("Special occasion", 14, "expense"),
  ("Charities", 14, "expense"),
  -- Entertainment --
  ("Alcohol and/or bars", 15, "expense"),
  ("Games", 15, "expense"),
  ("Movies", 15, "expense"),
  ("Concerts", 15, "expense"),
  ("Vacations", 15, "expense"),
  ("Subscriptions", 15, "expense");

INSERT INTO
  account (id, name, type, opening_date)
VALUES
  (1, "Debit Card", "debit", "2025-01-01"),
  (2, "Savings", "debit", "2025-01-01"),
  (3, "Credit Card", "credit", "2025-01-01"),
  (4, "Car Loan", "credit", "2025-01-01");

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
    "Starting amount",
    10000,
    "2025-01-01",
    true,
    3,
    10
  ),
  (
    4,
    "Starting amount",
    120000,
    "2025-01-01",
    true,
    4,
    10
  );

-- Income Taxes --
-- Profesional services accounting --
-- Remove so many categories  for gifts donations --
-- Education in general is absent --