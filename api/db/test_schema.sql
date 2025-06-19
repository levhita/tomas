-- Test Database Schema with Test Data
-- This file creates the same schema as schema.sql but with additional test data
-- Disable foreign key checks to allow table drops
SET
  FOREIGN_KEY_CHECKS = 0;

-- Clean Up --
DROP TABLE IF EXISTS `workspace_user`;

DROP TABLE IF EXISTS `transaction`;

DROP TABLE IF EXISTS `category`;

DROP TABLE IF EXISTS `total`;

DROP TABLE IF EXISTS `account`;

DROP TABLE IF EXISTS `workspace`;

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
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_username` (`username`)
  ) ENGINE = InnoDB;

-- Workspaces --
CREATE TABLE
  `workspace` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `currency_symbol` VARCHAR(10) NOT NULL DEFAULT '$',
    `week_start` ENUM ('sunday', 'monday') NOT NULL DEFAULT 'monday',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
  ) ENGINE = InnoDB;

-- Workspace Users --
CREATE TABLE
  `workspace_user` (
    `workspace_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `role` ENUM ('viewer', 'collaborator', 'admin') NOT NULL DEFAULT 'viewer',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`workspace_id`, `user_id`),
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
  ) ENGINE = InnoDB;

-- Accounts --
CREATE TABLE
  `account` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `note` TEXT NULL,
    `type` ENUM ('debit', 'credit') NOT NULL DEFAULT 'debit',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `workspace_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`)
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
    `workspace_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`parent_category_id`) REFERENCES `category` (`id`),
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`)
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
  `user` (`id`, `username`, `password_hash`, `superadmin`)
VALUES
  (
    1,
    'superadmin',
    '$2b$10$sVuIfubxXJ5tjznQuDuV6.wwfM5PMm2uGHTtHBNwNFlJm4vWYabkq',
    TRUE
  ),
  (
    2,
    'testuser1',
    '$2b$10$sVuIfubxXJ5tjznQuDuV6.wwfM5PMm2uGHTtHBNwNFlJm4vWYabkq',
    FALSE
  ),
  (
    3,
    'testuser2',
    '$2b$10$sVuIfubxXJ5tjznQuDuV6.wwfM5PMm2uGHTtHBNwNFlJm4vWYabkq',
    FALSE
  ),
  (
    4,
    'regularuser',
    '$2b$10$sVuIfubxXJ5tjznQuDuV6.wwfM5PMm2uGHTtHBNwNFlJm4vWYabkq',
    FALSE
  );

-- Test Workspaces
INSERT INTO
  `workspace` (`id`, `name`, `description`, `currency_symbol`)
VALUES
  (
    1,
    'Test Workspace 1',
    'Main testing workspace',
    '$'
  ),
  (
    2,
    'Test Workspace 2',
    'Secondary testing workspace',
    '€'
  ),
  (
    3,
    'Search Test Workspace',
    'Workspace for search testing',
    '£'
  ),
  (
    4,
    'Inactive Workspace',
    'Workspace for deletion testing',
    '$'
  ),
  (
    5,
    'No Superadmin Workspace',
    'Workspace where superadmin has no access',
    '¥'
  );

-- Test Workspace Users
INSERT INTO
  `workspace_user` (`workspace_id`, `user_id`, `role`)
VALUES
  (1, 1, 'admin'), -- superadmin is admin of workspace 1
  (1, 2, 'collaborator'), -- testuser1 is collaborator of workspace 1
  (1, 3, 'viewer'), -- testuser2 is viewer of workspace 1
  (2, 1, 'admin'), -- superadmin is admin of workspace 2
  (2, 2, 'admin'), -- testuser1 is admin of workspace 2
  (3, 1, 'admin'), -- superadmin is admin of workspace 3
  (4, 1, 'admin'), -- superadmin is admin of workspace 4
  (5, 2, 'admin'), -- testuser1 is admin of workspace 5 (superadmin is NOT a member)
  (5, 4, 'collaborator');

-- regularuser is collaborator of workspace 5
-- superadmin is admin of workspace 4
-- Test Accounts
INSERT INTO
  `account` (`id`, `name`, `note`, `type`, `workspace_id`)
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
    'Savings account in workspace 2',
    'debit',
    2
  ),
  (
    4,
    'Workspace 5 Account',
    'Account in workspace without superadmin',
    'debit',
    5
  );

-- Test Categories
INSERT INTO
  `category` (`name`, `note`, `type`, `workspace_id`)
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
    'Workspace 5 Category',
    'Category in workspace without superadmin',
    'expense',
    5
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
    'Workspace 5 transaction',
    'Transaction in workspace without superadmin access',
    -30.00,
    '2024-12-05',
    TRUE,
    4,
    4
  );