-- Database cleanup script for tests
-- This script is designed to be executed before running tests to ensure a clean state

-- Temporarily disable foreign key checks to handle circular references
SET FOREIGN_KEY_CHECKS = 0;

-- Clear self-referencing fields first
UPDATE `category` SET `parent_category_id` = NULL WHERE `parent_category_id` IS NOT NULL;

-- Delete all data from tables in reverse dependency order
DELETE FROM `transaction`;
DELETE FROM `total`;
DELETE FROM `category`;
DELETE FROM `account`;
DELETE FROM `book`;
DELETE FROM `team_user`;
DELETE FROM `team`;
DELETE FROM `user`;

-- Reset auto-increment counters
ALTER TABLE `transaction` AUTO_INCREMENT = 1;
ALTER TABLE `total` AUTO_INCREMENT = 1;
ALTER TABLE `category` AUTO_INCREMENT = 1;
ALTER TABLE `account` AUTO_INCREMENT = 1;
ALTER TABLE `book` AUTO_INCREMENT = 1;
ALTER TABLE `team` AUTO_INCREMENT = 1;
ALTER TABLE `team_user` AUTO_INCREMENT = 1;
ALTER TABLE `user` AUTO_INCREMENT = 0;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
