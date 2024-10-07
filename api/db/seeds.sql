-- Categories --
INSERT INTO
  category (id, name)
VALUES
  (1, "Housing"),
  (2, "Transportation"),
  (3, "Food"),
  (4, "Utilities"),
  (5, "Clothing"),
  (6, "Healthcare"),
  (7, "Insurance"),
  (8, "Household Items/Supplies"),
  (9, "Personal"),
  (10, "Debt"),
  (11, "Retirement"),
  (12, "Education"),
  (13, "Savings"),
  (14, "Gifts/Donations"),
  (15, "Entertainment");

-- Sub Categories --
INSERT INTO
  category (name, parent_category_id)
VALUES
  -- Housing --
  ("Mortgage", 1),
  ("House Rent", 1),
  ("Property Taxes", 1),
  ("Home Repairs", 1),
  ("Managment Fees", 1),
  --Transportation --
  ("Car Payment", 2),
  ("Car Warranty", 2),
  ("Car Taxes", 2),
  ("Gas", 2),
  ("Tires", 2),
  ("Maintenance", 2),
  ("Repairs", 2),
  ("Parking", 2),
  ("Tickets", 2),
  -- Food --
  ("Groceries", 3),
  ("Restaurants", 3),
  ("Pet food", 3),
  ("Take Out", 3),
  -- Utilities --
  ("Electricity", 4),
  ("Water", 4),
  ("Garbage", 4),
  ("Phones", 4),
  ("Cable", 4),
  ("Internet", 4),
  -- Clothing --
  ("Adults' clothing", 5),
  ("Adults' shoes", 5),
  ("Children's clothing", 5),
  ("Children's shoes", 5),
  -- Healtcare --
  ("Primary care", 6),
  ("Dental care", 6),
  ("Specialist", 6),
  ("Urgent care", 6),
  ("Medications", 6),
  ("Medical devices", 6),
  -- Insurance --
  ("Health insurance", 7),
  ("Homeowner's Insurance", 7),
  ("Renter's Insurance", 7),
  ("Home warranty", 7),
  ("Home protection plan", 7),
  ("Car insurance", 7),
  ("Life insurance", 7),
  ("Disability insurance", 7),
  -- Household supplies --
  ("Toiletries", 8),
  ("Laundry detergent", 8),
  ("Dishwasher detergent", 8),
  ("Cleaning supplies", 8),
  ("Tools", 8),
  -- Personal --
  ("Gym memberships", 9),
  ("Haircuts", 9),
  ("Salon services", 9),
  ("Cosmetics", 9),
  ("Babysitter", 9),
  ("Subscriptions", 9),
  -- Debt --
  ("Personal loans", 10),
  ("Student loans", 10),
  ("Credit cards", 10),
  -- Retirement --
  ("Financial planning", 11),
  ("Investing", 11),
  -- Education --
  ("Children's college", 12),
  ("Your college", 12),
  ("School supplies", 12),
  ("Books", 12),
  -- Savings --
  ("Emergency fund", 13),
  ("Big purchases", 13),
  ("Other savings", 13),
  -- Gifts and Donations --
  ("Birthday", 14),
  ("Anniversary", 14),
  ("Wedding", 14),
  ("Christmas", 14),
  ("Special occasion", 14),
  ("Charities", 14),
  -- Entertainment --
  ("Alcohol and/or bars", 15),
  ("Games", 15),
  ("Movies", 15),
  ("Concerts", 15),
  ("Vacations", 15),
  ("Subscriptions", 15);

INSERT INTO
  account (id, name, type)
VALUES
  (1, "Employee Account", "debit"),
  (2, "Savings", "debit"),
  (3, "Credit Card", "credit"),
  (4, "Loan", "credit");