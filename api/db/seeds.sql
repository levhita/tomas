-- Create users --
INSERT INTO
  `user` (id, username, password_hash, superadmin, active)
VALUES
  (
    1,
    "superadmin",
    "$2b$10$JKCPXyZ3LWZ0Rbc8Aa/.4.cKIhGsGvOTw1RmWVEBZLqvzVX8b8zSS", -- Password: 'admin'
    true,
    true
  ),
  (
    2,
    "admin",
    "$2b$10$JKCPXyZ3LWZ0Rbc8Aa/.4.cKIhGsGvOTw1RmWVEBZLqvzVX8b8zSS", -- Password: 'admin'
    false,
    true
  ),
  (
    3,
    "collaborator",
    "$2b$10$JKCPXyZ3LWZ0Rbc8Aa/.4.cKIhGsGvOTw1RmWVEBZLqvzVX8b8zSS", -- Password: 'admin'
    false,
    true
  ),
  (
    4,
    "viewer",
    "$2b$10$JKCPXyZ3LWZ0Rbc8Aa/.4.cKIhGsGvOTw1RmWVEBZLqvzVX8b8zSS", -- Password: 'admin'
    false,
    true
  );

-- Create teams --
INSERT INTO
  `team` (id, name)
VALUES
  (1, "Personal Finance Team"),
  (2, "Business Operations Team");

-- Add users to teams with roles --
INSERT INTO
  `team_user` (team_id, user_id, role)
VALUES
  -- Personal Finance Team
  (1, 2, 'admin'), -- admin user is admin of Personal Finance Team
  (1, 3, 'collaborator'), -- collaborator user is collaborator in Personal Finance Team
  (1, 4, 'viewer'), -- viewer user is viewer in Personal Finance Team
  -- Business Operations Team
  (2, 2, 'admin'), -- admin user is admin of Business Operations Team
  (2, 3, 'viewer');

-- collaborator user is viewer in Business Operations Team
-- Create books --
-- Create books --
INSERT INTO
  `book` (
    id,
    name,
    note,
    currency_symbol,
    week_start,
    team_id
  )
VALUES
  -- Personal Finance Team books
  (
    1,
    "Personal Budget",
    "Main personal finance tracking",
    "$",
    "monday",
    1
  ),
  (
    2,
    "Savings Goals",
    "Track savings and investment goals",
    "$",
    "monday",
    1
  ),
  (
    3,
    "Vacation Fund",
    "Planning and saving for vacations",
    "$",
    "sunday",
    1
  ),
  -- Business Operations Team books
  (
    4,
    "Company Expenses",
    "Business operational expenses",
    "$",
    "monday",
    2
  ),
  (
    5,
    "Marketing Budget",
    "Marketing and advertising spend",
    "$",
    "monday",
    2
  ),
  (
    6,
    "Q4 Projects",
    "Fourth quarter project budgets",
    "$",
    "sunday",
    2
  );

-- Categories --
INSERT INTO
  category (id, name, type, book_id)
VALUES
  -- Categories for Personal Budget (book 1)
  (1, "Housing", "expense", 1),
  (2, "Transportation", "expense", 1),
  (3, "Food", "expense", 1),
  (4, "Utilities", "expense", 1),
  (5, "Entertainment", "expense", 1),
  (6, "Salary", "income", 1),
  (7, "Freelance", "income", 1),
  -- Categories for Savings Goals (book 2)
  (8, "Emergency Fund", "expense", 2),
  (9, "Retirement", "expense", 2),
  (10, "House Down Payment", "expense", 2),
  (11, "Investment Returns", "income", 2),
  -- Categories for Vacation Fund (book 3)
  (12, "Travel Savings", "expense", 3),
  (13, "Flight Expenses", "expense", 3),
  (14, "Hotel Expenses", "expense", 3),
  (15, "Vacation Income", "income", 3),
  -- Categories for Company Expenses (book 4)
  (16, "Office Rent", "expense", 4),
  (17, "Utilities", "expense", 4),
  (18, "Equipment", "expense", 4),
  (19, "Business Revenue", "income", 4),
  -- Categories for Marketing Budget (book 5)
  (20, "Digital Ads", "expense", 5),
  (21, "Print Marketing", "expense", 5),
  (22, "Events", "expense", 5),
  (23, "Marketing ROI", "income", 5),
  -- Categories for Q4 Projects (book 6)
  (24, "Development Costs", "expense", 6),
  (25, "Consulting", "expense", 6),
  (26, "Project Revenue", "income", 6);

-- Accounts with book_id --
INSERT INTO
  account (id, name, type, book_id)
VALUES
  -- Accounts for Personal Budget (book 1)
  (1, "Personal Checking", "debit", 1),
  (2, "Personal Credit Card", "credit", 1),
  -- Accounts for Savings Goals (book 2)
  (3, "High Yield Savings", "debit", 2),
  (4, "Investment Account", "debit", 2),
  -- Accounts for Vacation Fund (book 3)
  (5, "Vacation Savings", "debit", 3),
  (6, "Travel Credit Card", "credit", 3),
  -- Accounts for Company Expenses (book 4)
  (7, "Business Checking", "debit", 4),
  (8, "Corporate Credit", "credit", 4),
  -- Accounts for Marketing Budget (book 5)
  (9, "Marketing Account", "debit", 5),
  (10, "Ad Spend Card", "credit", 5),
  -- Accounts for Q4 Projects (book 6)
  (11, "Project Account", "debit", 6),
  (12, "Contractor Payments", "debit", 6);

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
  -- Personal Budget transactions
  (
    1,
    "Monthly Salary",
    5000,
    "2025-01-01",
    true,
    1,
    6
  ),
  (
    2,
    "Rent Payment",
    -1200,
    "2025-01-01",
    true,
    1,
    1
  ),
  (3, "Groceries", -150, "2025-01-02", true, 2, 3),
  -- Savings Goals transactions
  (
    4,
    "Emergency Fund Deposit",
    -500,
    "2025-01-01",
    true,
    3,
    8
  ),
  (
    5,
    "Investment Return",
    200,
    "2025-01-05",
    true,
    4,
    11
  ),
  -- Vacation Fund transactions
  (
    6,
    "Vacation Savings",
    -300,
    "2025-01-01",
    true,
    5,
    12
  ),
  -- Company Expenses transactions
  (
    7,
    "Office Rent",
    -2500,
    "2025-01-01",
    true,
    7,
    16
  ),
  (
    8,
    "Business Revenue",
    15000,
    "2025-01-01",
    true,
    7,
    19
  ),
  -- Marketing Budget transactions
  (9, "Google Ads", -800, "2025-01-02", true, 10, 20),
  (
    10,
    "Marketing ROI",
    1200,
    "2025-01-05",
    true,
    9,
    23
  ),
  -- Q4 Projects transactions
  (
    11,
    "Development Costs",
    -5000,
    "2025-01-01",
    true,
    11,
    24
  ),
  (
    12,
    "Project Revenue",
    8000,
    "2025-01-03",
    true,
    11,
    26
  );

-- Original comprehensive category list for future category suggestions feature
/*
-- Main Categories --
INSERT INTO
category (id, name, type, book_id)
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
category (name, parent_category_id, type, book_id)
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
 */