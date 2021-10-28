-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Oct 26, 2021 at 11:50 AM
-- Server version: 10.4.17-MariaDB
-- PHP Version: 8.0.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `improvisationaldb`
--

-- --------------------------------------------------------

--
-- Table structure for table `players`
--

CREATE TABLE `players` (
  `player_id` mediumint(9) UNSIGNED NOT NULL,
  `username` varchar(32) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `password` varchar(128) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `system_id` int(11) NOT NULL,
  `space_object_id` int(11) NOT NULL,
  `res_last_update` int(11) UNSIGNED NOT NULL,
  `reserved_pop` double(14,6) NOT NULL DEFAULT 0.000000,
  `metal` double(14,6) NOT NULL DEFAULT 100.000000,
  `kerosene` double(14,6) NOT NULL DEFAULT 100.000000,
  `hydrogen` double(14,6) NOT NULL DEFAULT 0.000000,
  `uranium` double(14,6) NOT NULL DEFAULT 0.000000,
  `research` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{"researched_techs": []}'
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`player_id`, `username`, `password`, `system_id`, `space_object_id`, `res_last_update`, `reserved_pop`, `metal`, `kerosene`, `hydrogen`, `uranium`, `research`) VALUES
(1, 'Newstory', '$2b$10$jqoTtwOPhOALYsS7VtZ90eOLuj0/HFlyLzlfWLsaSLaQDHZpcw3uG', 1, 2, 1635235331, 3.000000, 0.774750, 100.000000, 0.000000, 0.000000, '{\"researched_techs\":[\"1\",\"2\",\"3\"]}');

-- --------------------------------------------------------

--
-- Table structure for table `player_buildings`
--

CREATE TABLE `player_buildings` (
  `player_id` mediumint(8) UNSIGNED NOT NULL,
  `building_id` smallint(5) UNSIGNED NOT NULL,
  `level` int(11) NOT NULL,
  `update_start` int(11) UNSIGNED DEFAULT NULL,
  `downgrade` tinyint(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `player_buildings`
--

INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES
(1, 5, 1, NULL, 0),
(1, 1, 3, NULL, 0),
(1, 6, 2, NULL, 0),
(1, 3, 2, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_reports`
--

CREATE TABLE `player_reports` (
  `player_id` int(11) NOT NULL,
  `report_id` varchar(36) NOT NULL,
  `title` text NOT NULL,
  `text` text NOT NULL,
  `isRead` tinyint(1) NOT NULL,
  `gotDisplayed` tinyint(1) NOT NULL,
  `timestamp` int(11) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `player_units`
--

CREATE TABLE `player_units` (
  `player_id` int(9) NOT NULL,
  `unit_id` int(3) NOT NULL,
  `count` int(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `player_units`
--

INSERT INTO `player_units` (`player_id`, `unit_id`, `count`) VALUES
(1, 1, 1093),
(1, 2, 211),
(1, 3, 200),
(1, 4, 200),
(1, 5, 200),
(1, 6, 200),
(1, 7, 200),
(1, 8, 200),
(1, 9, 200),
(1, 10, 200),
(1, 11, 200),
(1, 12, 200),
(1, 13, 0),
(1, 14, 0),
(1, 15, 0),
(1, 16, 0),
(1, 17, 0),
(1, 18, 0),
(1, 19, 0),
(1, 20, 0),
(1, 21, 0),
(1, 22, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_unit_ques`
--

CREATE TABLE `player_unit_ques` (
  `unit_que_id` int(8) UNSIGNED NOT NULL,
  `player_id` int(9) NOT NULL,
  `unit_id` int(3) NOT NULL,
  `count` int(8) NOT NULL,
  `calculated_timestamp` int(11) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `players`
--
ALTER TABLE `players`
  ADD PRIMARY KEY (`player_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `player_buildings`
--
ALTER TABLE `player_buildings`
  ADD PRIMARY KEY (`building_id`,`player_id`);

--
-- Indexes for table `player_reports`
--
ALTER TABLE `player_reports`
  ADD PRIMARY KEY (`report_id`);

--
-- Indexes for table `player_units`
--
ALTER TABLE `player_units`
  ADD PRIMARY KEY (`player_id`,`unit_id`);

--
-- Indexes for table `player_unit_ques`
--
ALTER TABLE `player_unit_ques`
  ADD PRIMARY KEY (`unit_que_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `player_id` mediumint(9) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `player_unit_ques`
--
ALTER TABLE `player_unit_ques`
  MODIFY `unit_que_id` int(8) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
