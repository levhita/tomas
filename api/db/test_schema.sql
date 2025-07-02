-- Test Database Schema with Test Data
-- This file creates the same schema as schema.sql but with additional test data
-- Disable foreign key checks to allow table drops
SET
  FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `transaction`;

DROP TABLE IF EXISTS `category`;

DROP TABLE IF EXISTS `total`;

DROP TABLE IF EXISTS `account`;

DROP TABLE IF EXISTS `book`;

DROP TABLE IF EXISTS `team_user`;

DROP TABLE IF EXISTS `team`;

DROP TABLE IF EXISTS `user`;

-- Re-enable foreign key checks
SET
  FOREIGN_KEY_CHECKS = 1;

-- Users --
CREATE TABLE
  `user` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `superadmin` BOOLEAN DEFAULT FALSE,
    `active` BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_username` (`username`)
  ) ENGINE = InnoDB;

-- Teams --
CREATE TABLE
  `team` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
  ) ENGINE = InnoDB;

-- Team Users --
CREATE TABLE
  `team_user` (
    `team_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `role` ENUM ('viewer', 'collaborator', 'admin') NOT NULL DEFAULT 'viewer',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`team_id`, `user_id`),
    FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB;

-- Books --
CREATE TABLE
  `book` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `note` TEXT NULL,
    `currency_symbol` VARCHAR(10) NOT NULL DEFAULT '$',
    `week_start` ENUM ('sunday', 'monday') NOT NULL DEFAULT 'monday',
    `team_id` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB;

-- Accounts --
CREATE TABLE
  `account` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `note` TEXT NULL,
    `type` ENUM ('debit', 'credit') NOT NULL DEFAULT 'debit',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `book_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`book_id`) REFERENCES `book` (`id`)
  ) ENGINE = InnoDB;

-- Categories --
CREATE TABLE
  `category` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `note` TEXT NULL,
    `type` ENUM ('expense', 'income') NOT NULL DEFAULT 'expense',
    `parent_category_id` INT UNSIGNED DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `book_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`parent_category_id`) REFERENCES `category` (`id`),
    FOREIGN KEY (`book_id`) REFERENCES `book` (`id`)
  ) ENGINE = InnoDB;

-- Transactions --
CREATE TABLE
  `transaction` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(255) NOT NULL,
    `note` TEXT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    `date` DATE NOT NULL,
    `exercised` BOOLEAN DEFAULT FALSE,
    `account_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`account_id`) REFERENCES `account` (`id`),
    FOREIGN KEY (`category_id`) REFERENCES `category` (`id`)
  ) ENGINE = InnoDB;

-- Totals --
CREATE TABLE
  `total` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    `date` DATE NOT NULL,
    `account_id` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`account_id`) REFERENCES `account` (`id`)
  ) ENGINE = InnoDB;

-- Test Data --
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
  );

-- Test Teams
INSERT INTO
  `team` (`id`, `name`, `description`)
VALUES
  (1, 'Test Team 1', 'Main testing team'),
  (
    2,
    'Test Team 2',
    'Secondary testing team for cross-permission tests'
  );

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
    `team_id`
  )
VALUES
  (1, 'Test Book 1', 'Main testing book', '$', 1),
  (
    2,
    'Test Book 2',
    'Secondary testing book',
    '€',
    2
  ),
  (
    3,
    'Test Book 3',
    'Third book in team 1 for testing',
    '£',
    1
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