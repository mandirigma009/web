-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 11, 2026 at 10:25 AM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.2.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `myapp`
--

CREATE DATABASE IF NOT EXISTS `myapp`;
USE `myapp`;

-- --------------------------------------------------------

--
-- Table structure for table `buildings`
--

CREATE TABLE `buildings` (
  `id` int(11) NOT NULL,
  `building_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `buildings`
--

INSERT INTO `buildings` (`id`, `building_name`, `created_at`) VALUES
(1, 'Test Building 1', '2026-01-09 12:21:21'),
(2, 'Test Building 2', '2026-01-09 13:25:05'),
(3, 'Test Building 3', '2026-01-09 14:56:32');

-- --------------------------------------------------------

--
-- Table structure for table `cron_last_run`
--

CREATE TABLE `cron_last_run` (
  `id` int(11) NOT NULL DEFAULT 1,
  `last_processed` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cron_last_run`
--

INSERT INTO `cron_last_run` (`id`, `last_processed`) VALUES
(1, '2026-01-11 17:25:00');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(11) NOT NULL,
  `room_number` varchar(10) NOT NULL,
  `room_name` varchar(100) NOT NULL,
  `room_description` text DEFAULT NULL,
  `floor_number` int(11) DEFAULT NULL,
  `status` tinyint(4) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `chairs` int(11) DEFAULT 0,
  `has_tv` tinyint(1) DEFAULT 0,
  `has_projector` tinyint(1) DEFAULT 0,
  `has_table` tinyint(1) DEFAULT 0,
  `building_id` int(11) NOT NULL,
  `max_capacity` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `room_number`, `room_name`, `room_description`, `floor_number`, `status`, `created_at`, `chairs`, `has_tv`, `has_projector`, `has_table`, `building_id`, `max_capacity`) VALUES
(1, '125', 'R125', 'Classroom', 1, 1, '2025-09-21 23:16:26', 0, 0, 1, 1, 1, 0),
(2, '412', 'R412', 'Classroom', 4, 3, '2025-09-22 21:12:51', 0, 0, 1, 0, 2, 0),
(3, '317', 'R317', 'Classroom', 3, 1, '2025-10-05 09:51:38', 0, 0, 0, 1, 3, 0),
(4, '314', 'R314', 'Classroom', 3, 1, '2025-10-06 00:38:10', 30, 1, 1, 1, 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `room_bookings`
--

CREATE TABLE `room_bookings` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `reserved_by` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `date_reserved` date NOT NULL,
  `reservation_start` time NOT NULL,
  `reservation_end` time NOT NULL,
  `notes` text DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `room_number` varchar(50) DEFAULT NULL,
  `room_name` varchar(100) DEFAULT NULL,
  `room_description` text DEFAULT NULL,
  `building_name` varchar(100) DEFAULT NULL,
  `floor_number` int(11) DEFAULT NULL,
  `assigned_by` varchar(100) NOT NULL,
  `status` enum('pending','approved','cancelled','rejected_by_admin','cancelled_not_approved_before_start') DEFAULT 'pending',
  `is_archived` tinyint(1) DEFAULT 0,
  `approved_at` datetime DEFAULT NULL,
  `reject_reason` varchar(255) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_bookings`
--

INSERT INTO `room_bookings` (`id`, `room_id`, `reserved_by`, `user_id`, `email`, `date_reserved`, `reservation_start`, `reservation_end`, `notes`, `subject`, `created_at`, `room_number`, `room_name`, `room_description`, `building_name`, `floor_number`, `assigned_by`, `status`, `is_archived`, `approved_at`, `reject_reason`, `rejected_at`) VALUES
(1, 30, 'test teacher', 4, 'yiyeujifoinau-7319@yopmail.com', '2026-01-16', '01:16:00', '01:30:00', 'test with subject', 'math1', '2026-01-09 15:42:22', '211', 'test room capacity', 'testing room capacity 2', 'test building 3', 2, 'Admin1 test', 'cancelled', 0, NULL, 'this is sample cancel', '2026-01-11 17:10:36');
-- --------------------------------------------------------

--
-- Table structure for table `room_bookings_archive`
--

CREATE TABLE `room_bookings_archive` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `reserved_by` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `date_reserved` date NOT NULL,
  `reservation_start` time NOT NULL,
  `reservation_end` time NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `room_number` varchar(50) DEFAULT NULL,
  `room_name` varchar(100) DEFAULT NULL,
  `room_description` text DEFAULT NULL,
  `building_name` varchar(100) DEFAULT NULL,
  `floor_number` int(11) DEFAULT NULL,
  `assigned_by` varchar(100) NOT NULL,
  `status` enum('pending','approved','cancelled','rejected_by_admin','cancelled_not_approved_before_start') DEFAULT 'pending',
  `is_archived` tinyint(1) DEFAULT 0,
  `approved_at` datetime DEFAULT NULL,
  `reject_reason` varchar(255) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `role` int(11) NOT NULL DEFAULT 4,
  `reset_code` varchar(6) DEFAULT NULL,
  `reset_expires` timestamp NULL DEFAULT NULL,
  `status` enum('active','pending','rejected') NOT NULL DEFAULT 'active',
  `verified` tinyint(1) NOT NULL DEFAULT 0,
  `verification_token` varchar(255) DEFAULT NULL,
  `verification_token_created_at` datetime DEFAULT NULL,
  `failed_attempts` int(11) DEFAULT 0,
  `locked_until` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `created_at`, `role`, `reset_code`, `reset_expires`, `status`, `verified`, `verification_token`, `verification_token_created_at`, `failed_attempts`, `locked_until`) VALUES
(1, 'Admin1 test', 'AdminTest@mail.com', '$2b$10$7Pmq0nBpg8D2FZAXdZbHcOLsy8NnkSDdfJE01vPdma.ywGGSeqVcm', '2025-09-20 02:03:05', 1, NULL, NULL, 'active', 1, NULL, NULL, 0, NULL);
--
-- Indexes for dumped tables
--

--
-- Indexes for table `buildings`
--
ALTER TABLE `buildings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `building_name` (`building_name`);

--
-- Indexes for table `cron_last_run`
--
ALTER TABLE `cron_last_run`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_room_location` (`building_id`,`floor_number`,`room_number`),
  ADD KEY `idx_rooms_capacity` (`max_capacity`);

--
-- Indexes for table `room_bookings`
--
ALTER TABLE `room_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room_id` (`room_id`);

--
-- Indexes for table `room_bookings_archive`
--
ALTER TABLE `room_bookings_archive`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room_id` (`room_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `buildings`
--
ALTER TABLE `buildings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `room_bookings`
--
ALTER TABLE `room_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `room_bookings_archive`
--
ALTER TABLE `room_bookings_archive`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `fk_rooms_building` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
