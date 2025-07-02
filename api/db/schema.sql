-- Clean Up --
DROP TABLE IF EXISTS `book_user`;

DROP TABLE IF EXISTS `transaction`;

DROP TABLE IF EXISTS `category`;

DROP TABLE IF EXISTS `total`;

DROP TABLE IF EXISTS `account`;

DROP TABLE IF EXISTS `book`;

DROP TABLE IF EXISTS `user`;

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

-- Books --
CREATE TABLE
  `book` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `note` TEXT NULL,
    `currency_symbol` VARCHAR(10) NOT NULL DEFAULT '$',
    `week_start` ENUM ('sunday', 'monday') NOT NULL DEFAULT 'monday',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
  ) ENGINE = InnoDB;

-- Book Users --
CREATE TABLE
  `book_user` (
    `book_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `role` ENUM ('viewer', 'collaborator', 'admin') NOT NULL DEFAULT 'viewer',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`book_id`, `user_id`),
    FOREIGN KEY (`book_id`) REFERENCES `book` (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
  ) ENGINE = InnoDB;

-- Account --
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