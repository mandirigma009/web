-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 13, 2026 at 03:18 AM
-- Server version: 10.6.23-MariaDB-0ubuntu0.22.04.1
-- PHP Version: 8.1.2-1ubuntu2.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

DROP DATABASE IF EXISTS myapp;
CREATE DATABASE myapp;
USE myapp;


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
(1, 'Main Building', '2026-02-09 04:20:04');

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



-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `created_at`) VALUES
(1, 'BSIS', '2026-04-06 12:24:02'),
(2, 'HRS BUNDLE', '2026-04-06 12:24:29'),
(3, 'BTVTED', '2026-04-06 12:24:45'),
(4, 'ACT', '2026-04-09 09:38:35');

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
(47, '101', 'RM101', 'Regular Classroom', 1, 1, '2026-02-22 14:26:09', 40, 1, 1, 1, 1, 45),
(55, '102', 'RM102', 'Regular Classroom', 1, 3, '2026-02-22 14:31:18', 30, 0, 0, 0, 1, 30),
(56, '103', 'RM103', 'Regular Classroom', 1, 4, '2026-02-22 14:31:46', 0, 1, 0, 1, 1, 0),
(57, '201', 'RM201', 'Regular Classroom', 2, 1, '2026-02-22 14:32:46', 35, 1, 0, 1, 1, 35),
(58, '104', 'RM104', 'Regular Classroom', 1, 1, '2026-02-22 14:33:40', 40, 1, 1, 0, 1, 40),
(59, '202', 'RM202', 'Laboratory', 2, 1, '2026-02-22 14:34:37', 35, 1, 1, 1, 1, 35),
(60, '203', 'RM203', 'Regular Classroom', 2, 1, '2026-02-22 14:35:33', 35, 0, 0, 1, 1, 40);

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
  `subject` varchar(99) NOT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `year_id` int(11) DEFAULT NULL,
  `section_id` int(11) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `room_number` varchar(50) DEFAULT NULL,
  `room_name` varchar(100) DEFAULT NULL,
  `room_description` text DEFAULT NULL,
  `building_name` varchar(100) DEFAULT NULL,
  `floor_number` int(11) DEFAULT NULL,
  `assigned_by` varchar(100) NOT NULL,
  `status` enum('pending','approved','cancelled','rejected') DEFAULT 'pending',
  `is_archived` tinyint(1) DEFAULT 0,
  `approved_at` datetime DEFAULT NULL,
  `reject_reason` varchar(255) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_bookings`
--

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
-- Table structure for table `sections`
--

CREATE TABLE `sections` (
  `id` int(11) NOT NULL,
  `year_id` int(11) NOT NULL,
  `section_name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sections`
--

INSERT INTO `sections` (`id`, `year_id`, `section_name`, `created_at`) VALUES
(1, 1, '1A', '2026-04-07 01:50:37'),
(2, 1, '1B', '2026-04-07 01:50:51'),
(3, 1, '1C', '2026-04-07 01:51:01'),
(4, 1, '1D', '2026-04-07 01:51:12'),
(5, 2, '2A', '2026-04-09 09:39:00'),
(6, 2, '2B', '2026-04-09 09:39:06'),
(7, 2, '2C', '2026-04-09 09:39:10'),
(8, 3, '3A', '2026-04-09 09:41:03'),
(9, 3, '3B', '2026-04-09 09:41:14'),
(10, 3, '3C', '2026-04-09 09:41:21'),
(11, 3, '3D', '2026-04-09 09:41:34'),
(12, 3, '3E', '2026-04-09 09:41:40');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `year_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `name`, `created_at`, `year_id`) VALUES
(1, 'MATH', '2026-04-07 01:51:34', 1),
(2, 'English', '2026-04-07 02:01:25', 1),
(3, 'RLW', '2026-04-07 02:01:45', 1),
(4, 'IS-Mot', '2026-04-09 09:41:54', 3),
(5, 'IS-ePc', '2026-04-09 09:43:09', 3),
(6, 'IS- eFM', '2026-04-09 09:43:18', 3),
(7, 'IS-ISP', '2026-04-09 09:43:29', 3),
(8, 'IS-WeBa', '2026-04-09 09:43:35', 3);

-- --------------------------------------------------------

--
-- Table structure for table `teacher_subject_assignments`
--

CREATE TABLE `teacher_subject_assignments` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `year_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teacher_subject_assignments`
--



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
  `locked_until` datetime DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `year_id` int(11) DEFAULT NULL,
  `section_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `created_at`, `role`, `reset_code`, `reset_expires`, `status`, `verified`, `verification_token`, `verification_token_created_at`, `failed_attempts`, `locked_until`, `department_id`) VALUES
(1, 'Juan Dela Cruz', 'admintest@mail.com', '$2b$10$HcDZfJr3B0xrC5z6MNOcGuTJbusqW2AWQXjAt2jltB2glomBN42I.', '2026-04-06 09:50:21', 1, NULL, NULL, 'active', 1, NULL, NULL, 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `last_active` datetime DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `years`
--

CREATE TABLE `years` (
  `id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `year_level` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `years`
--

INSERT INTO `years` (`id`, `department_id`, `year_level`, `created_at`) VALUES
(1, 1, '1', '2026-04-07 01:48:52'),
(2, 1, '2', '2026-04-07 01:52:43'),
(3, 1, '3', '2026-04-09 09:40:46'),
(4, 1, '4', '2026-04-09 09:54:09');

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
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `departments_name_unique` (`name`);

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
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `room_bookings_archive`
--
ALTER TABLE `room_bookings_archive`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room_id` (`room_id`);

--
-- Indexes for table `sections`
--
ALTER TABLE `sections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sections_year_section_unique` (`year_id`,`section_name`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `subjects_year_name_unique` (`year_id`,`name`);

--
-- Indexes for table `teacher_subject_assignments`
--
ALTER TABLE `teacher_subject_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `teacher_subject_unique` (`teacher_id`,`subject_id`),
  ADD KEY `teacher_subject_department_fk` (`department_id`),
  ADD KEY `teacher_subject_year_fk` (`year_id`),
  ADD KEY `teacher_subject_subject_fk` (`subject_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `department_id` (`department_id`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD UNIQUE KEY `unique_session` (`user_id`,`session_token`);

--
-- Indexes for table `years`
--
ALTER TABLE `years`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `years_department_year_unique` (`department_id`,`year_level`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `buildings`
--
ALTER TABLE `buildings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

--
-- AUTO_INCREMENT for table `room_bookings`
--
ALTER TABLE `room_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `room_bookings_archive`
--
ALTER TABLE `room_bookings_archive`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=249;

--
-- AUTO_INCREMENT for table `sections`
--
ALTER TABLE `sections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `teacher_subject_assignments`
--
ALTER TABLE `teacher_subject_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `years`
--
ALTER TABLE `years`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `sections`
--
ALTER TABLE `sections`
  ADD CONSTRAINT `sections_ibfk_1` FOREIGN KEY (`year_id`) REFERENCES `years` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sections_year_fk` FOREIGN KEY (`year_id`) REFERENCES `years` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `fk_subject_year` FOREIGN KEY (`year_id`) REFERENCES `years` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subjects_year_fk` FOREIGN KEY (`year_id`) REFERENCES `years` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_subject_assignments`
--
ALTER TABLE `teacher_subject_assignments`
  ADD CONSTRAINT `teacher_subject_department_fk` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teacher_subject_subject_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teacher_subject_teacher_fk` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teacher_subject_year_fk` FOREIGN KEY (`year_id`) REFERENCES `years` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`);

--
-- Constraints for table `years`
--
ALTER TABLE `years`
  ADD CONSTRAINT `years_department_fk` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `years_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
