-- Test Data Seeds
-- This file contains test data for use in testing environment
-- Test Users (passwords are 'password123' hashed with bcryptjs)
INSERT INTO
  `user` (
    `id`,
    `username`,
    `password_hash`,
    `superadmin`,
    `active`
  )
VALUES
  (
    1,
    'superadmin',
    '$2b$10$sVuIfubxXJ5tjznQuDuV6.wwfM5PMm2uGHTtHBNwNFlJm4vWYabkq',
    TRUE,
    TRUE
  ),
  (
    2,
    'admin',
    '$2b$10$sVuIfubxXJ5tjznQuDuV6.wwfM5PMm2uGHTtHBNwNFlJm4vWYabkq',
    FALSE,
    TRUE
  ),
  (
    3,
    'collaborator',
    '$2b$10$sVuIfubxXJ5tjznQuDuV6.wwfM5PMm2uGHTtHBNwNFlJm4vWYabkq',
    FALSE,
    TRUE
  ),
  (
    4,
    'viewer',
    '$2b$10$sVuIfubxXJ5tjznQuDuV6.wwfM5PMm2uGHTtHBNwNFlJm4vWYabkq',
    FALSE,
    TRUE
  ),
  (
    5,
    'noaccess',
    '$2b$10$sVuIfubxXJ5tjznQuDuV6.wwfM5PMm2uGHTtHBNwNFlJm4vWYabkq',
    FALSE,
    TRUE
  );

-- Test Teams
INSERT INTO
  `team` (`id`, `name`, `deleted_at`)
VALUES
  (1, 'Test Team 1', NULL),
  (2, 'Test Team 2', NULL);

-- Team User Assignments
INSERT INTO
  `team_user` (`team_id`, `user_id`, `role`)
VALUES
  (1, 2, 'admin'), -- admin is admin of team 1
  (1, 3, 'collaborator'), -- collaborator is collaborator of team 1
  (1, 4, 'viewer'), -- viewer is viewer of team 1
  (2, 2, 'viewer'), -- admin is viewer of team 2 (cross-permission test)
  (2, 3, 'admin'), -- collaborator is admin of team 2 (cross-permission test)
  (2, 4, 'collaborator');

-- viewer is collaborator of team 2 (cross-permission test)
-- Test Books
INSERT INTO
  `book` (
    `id`,
    `name`,
    `note`,
    `currency_symbol`,
    `team_id`,
    `deleted_at`
  )
VALUES
  (
    1,
    'Test Book 1',
    'Main testing book',
    '$',
    1,
    NULL
  ),
  (
    2,
    'Test Book 2',
    'Secondary testing book',
    '€',
    2,
    NULL
  ),
  (
    3,
    'Test Book 3',
    'Third book in team 1 for testing',
    '£',
    1,
    NULL
  );

-- Test Accounts
INSERT INTO
  `account` (`id`, `name`, `note`, `type`, `book_id`)
VALUES
  (
    1,
    'Test Checking Account',
    'Main checking account for testing',
    'debit',
    1
  ),
  (
    2,
    'Test Credit Card',
    'Credit card for testing',
    'credit',
    1
  ),
  (
    3,
    'Savings Account',
    'Savings account in book 2',
    'debit',
    2
  ),
  (
    4,
    'Investment Account',
    'Investment account in book 3',
    'debit',
    3
  );

-- Test Categories
INSERT INTO
  `category` (`name`, `note`, `type`, `book_id`)
VALUES
  (
    'Food & Dining',
    'Restaurant and grocery expenses',
    'expense',
    1
  ),
  (
    'Transportation',
    'Car, gas, and public transport',
    'expense',
    1
  ),
  (
    'Entertainment',
    'Movies, games, and fun activities',
    'expense',
    2
  ),
  (
    'Investment Income',
    'Category for investment returns',
    'income',
    3
  );

-- Test Transactions
INSERT INTO
  `transaction` (
    `description`,
    `note`,
    `amount`,
    `date`,
    `exercised`,
    `account_id`,
    `category_id`
  )
VALUES
  (
    'Lunch at restaurant',
    'Test transaction note',
    -25.50,
    '2024-12-01',
    TRUE,
    1,
    1
  ),
  (
    'Gas for car',
    NULL,
    -45.00,
    '2024-12-02',
    TRUE,
    1,
    2
  ),
  (
    'Grocery shopping payment',
    'Credit card payment',
    75.25,
    '2024-12-03',
    FALSE,
    2,
    1
  ),
  (
    'Movie ticket',
    NULL,
    -12.99,
    '2024-12-04',
    TRUE,
    3,
    3
  ),
  (
    'Investment dividend',
    'Dividend payment from investment account',
    50.00,
    '2024-12-05',
    TRUE,
    4,
    4
  );