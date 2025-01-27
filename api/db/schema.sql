DROP TABLE IF EXISTS `transaction`;

DROP TABLE IF EXISTS account;

CREATE TABLE
  `account` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `note` TEXT NULL,
    `type` ENUM ('debit', 'credit') NOT NULL DEFAULT 'debit',
    `starting_amount` DECIMAL(10, 2) NOT NULL DEFAULT '0',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
  ) ENGINE = InnoDB;

DROP TABLE IF EXISTS `category`;

CREATE TABLE
  `category` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `note` TEXT NULL,
    `parent_category_id` INT UNSIGNED DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`parent_category_id`) REFERENCES `category` (`id`)
  );

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
    `category_id` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`account_id`) REFERENCES `account` (`id`),
    FOREIGN KEY (`category_id`) REFERENCES `category` (`id`)
  );