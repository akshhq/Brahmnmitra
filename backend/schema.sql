-- =========================================================
-- BrahmnMitra Database Schema for Hostinger MySQL
-- Database: u844555645_brahmnmitra
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table (Admin, Staff, Customer Accounts)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(25) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'staff', 'customer') NOT NULL DEFAULT 'customer',
  `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  `metadata_json` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Auth Session Tokens
CREATE TABLE IF NOT EXISTS `auth_tokens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_auth_token` (`token`),
  INDEX `idx_auth_user_id` (`user_id`),
  INDEX `idx_auth_expires` (`expires_at`),
  CONSTRAINT `fk_auth_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Enquiries Table (Customer Leads & MICE RFPs)
CREATE TABLE IF NOT EXISTS `enquiries` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `service` VARCHAR(50) NOT NULL,
  `service_name` VARCHAR(100) DEFAULT NULL,
  `destination` VARCHAR(100) DEFAULT NULL,
  `travel_date` DATE DEFAULT NULL,
  `company` VARCHAR(100) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `status` ENUM('new', 'contacted', 'quoted', 'converted', 'closed') NOT NULL DEFAULT 'new',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `assigned_to` INT UNSIGNED DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_enquiries_status` (`status`),
  INDEX `idx_enquiries_created` (`created_at`),
  INDEX `idx_enquiries_service` (`service`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Payments & Transactions Ledger Table
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `transaction_id` VARCHAR(100) NOT NULL UNIQUE,
  `order_id` VARCHAR(100) DEFAULT NULL,
  `booking_id` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_email` VARCHAR(150) DEFAULT NULL,
  `customer_phone` VARCHAR(25) DEFAULT NULL,
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT '0.00',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'UPI',
  `utr_reference` VARCHAR(100) DEFAULT NULL,
  `invoice_number` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('pending', 'verified', 'failed', 'refunded') NOT NULL DEFAULT 'verified',
  `notes` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payments_txn` (`transaction_id`),
  INDEX `idx_payments_booking` (`booking_id`),
  INDEX `idx_payments_status` (`status`),
  INDEX `idx_payments_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Catalog Items (Packages, Curated Stays, Destinations)
CREATE TABLE IF NOT EXISTS `catalog_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category` ENUM('package', 'hotel', 'destination') NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `region` VARCHAR(100) DEFAULT NULL,
  `destination` VARCHAR(100) DEFAULT NULL,
  `duration` VARCHAR(50) DEFAULT NULL,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT '0.00',
  `stars` TINYINT UNSIGNED NOT NULL DEFAULT '5',
  `type` VARCHAR(50) DEFAULT NULL,
  `tagline` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `highlights_json` JSON DEFAULT NULL,
  `amenities_json` JSON DEFAULT NULL,
  `places_json` JSON DEFAULT NULL,
  `image` VARCHAR(255) NOT NULL DEFAULT 'assets/images/sample.webp',
  `is_active` TINYINT(1) NOT NULL DEFAULT '1',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_cat_slug` (`category`, `slug`),
  INDEX `idx_cat_category` (`category`),
  INDEX `idx_cat_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Audit Trail & Activity Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `log_id` VARCHAR(100) NOT NULL,
  `actor` VARCHAR(100) NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
  `action` VARCHAR(100) NOT NULL,
  `details_json` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_logs_actor` (`actor`),
  INDEX `idx_logs_category` (`category`),
  INDEX `idx_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
