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
    `workspace_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM ('debit', 'credit') NOT NULL DEFAULT 'debit',
    `description` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`)
  ) ENGINE = InnoDB;

-- Categories --
CREATE TABLE
  `category` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `color` VARCHAR(7) NOT NULL DEFAULT '#007bff',
    `description` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`)
  ) ENGINE = InnoDB;

-- Transactions --
CREATE TABLE
  `transaction` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `account_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` TEXT NULL,
    `date` DATE NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
    FOREIGN KEY (`account_id`) REFERENCES `account` (`id`),
    FOREIGN KEY (`category_id`) REFERENCES `category` (`id`)
  ) ENGINE = InnoDB;

-- Totals --
CREATE TABLE
  `total` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workspace_id` INT UNSIGNED NOT NULL,
    `account_id` INT UNSIGNED NOT NULL,
    `date` DATE NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_account_date` (`account_id`, `date`),
    FOREIGN KEY (`workspace_id`) REFERENCES `workspace` (`id`),
    FOREIGN KEY (`account_id`) REFERENCES `account` (`id`)
  ) ENGINE = InnoDB;

-- Test Data --
-- Test Users (passwords are 'password123' hashed with bcryptjs)
INSERT INTO
  `user` (`username`, `password_hash`, `superadmin`)
VALUES
  (
    'superadmin',
    '$2b$10$NiA4WKu8pQZg4Np7wM5RNOlC2Gwi3osF12Lu90d33eQ40VKp4Zg3G',
    TRUE
  ),
  (
    'testuser1',
    '$2b$10$NiA4WKu8pQZg4Np7wM5RNOlC2Gwi3osF12Lu90d33eQ40VKp4Zg3G',
    FALSE
  ),
  (
    'testuser2',
    '$2b$10$NiA4WKu8pQZg4Np7wM5RNOlC2Gwi3osF12Lu90d33eQ40VKp4Zg3G',
    FALSE
  ),
  (
    'regularuser',
    '$2b$10$NiA4WKu8pQZg4Np7wM5RNOlC2Gwi3osF12Lu90d33eQ40VKp4Zg3G',
    FALSE
  );

-- Test Workspaces
INSERT INTO
  `workspace` (`name`, `description`, `currency_symbol`)
VALUES
  ('Test Workspace 1', 'Main testing workspace', '$'),
  (
    'Test Workspace 2',
    'Secondary testing workspace',
    '€'
  ),
  (
    'Search Test Workspace',
    'Workspace for search testing',
    '£'
  ),
  (
    'Inactive Workspace',
    'Workspace for deletion testing',
    '$'
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
  (4, 1, 'admin');

-- superadmin is admin of workspace 4
-- Test Accounts
INSERT INTO
  `account` (`workspace_id`, `name`, `type`, `description`)
VALUES
  (
    1,
    'Test Checking Account',
    'debit',
    'Main checking account for testing'
  ),
  (
    1,
    'Test Credit Card',
    'credit',
    'Credit card for testing'
  ),
  (
    2,
    'Savings Account',
    'debit',
    'Savings account in workspace 2'
  );

-- Test Categories
INSERT INTO
  `category` (`workspace_id`, `name`, `color`, `description`)
VALUES
  (
    1,
    'Food & Dining',
    '#ff6b6b',
    'Restaurant and grocery expenses'
  ),
  (
    1,
    'Transportation',
    '#4ecdc4',
    'Car, gas, and public transport'
  ),
  (
    2,
    'Entertainment',
    '#45b7d1',
    'Movies, games, and fun activities'
  );

-- Test Transactions
INSERT INTO
  `transaction` (
    `workspace_id`,
    `account_id`,
    `category_id`,
    `amount`,
    `description`,
    `date`
  )
VALUES
  (
    1,
    1,
    1,
    -25.50,
    'Lunch at restaurant',
    '2024-12-01'
  ),
  (1, 1, 2, -45.00, 'Gas for car', '2024-12-02'),
  (
    1,
    2,
    1,
    75.25,
    'Grocery shopping payment',
    '2024-12-03'
  ),
  (2, 3, 3, -12.99, 'Movie ticket', '2024-12-04');