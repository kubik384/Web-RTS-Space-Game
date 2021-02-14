-- phpMyAdmin SQL Dump
-- version 5.0.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 14, 2021 at 12:13 PM
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
-- Table structure for table `galaxies`
--

CREATE TABLE `galaxies` (
  `galaxy_id` int(11) UNSIGNED NOT NULL,
  `x` int(9) NOT NULL,
  `y` int(9) NOT NULL,
  `width` int(3) NOT NULL,
  `height` int(3) NOT NULL,
  `image_id` int(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `galaxies`
--

INSERT INTO `galaxies` (`galaxy_id`, `x`, `y`, `width`, `height`, `image_id`) VALUES
(1, 0, 0, 50, 50, 1),
(2, -200, -350, 35, 35, 1),
(3, 300, 100, 40, 40, 1),
(4, -280, 195, 60, 60, 1);

-- --------------------------------------------------------

--
-- Table structure for table `players`
--

CREATE TABLE `players` (
  `player_id` mediumint(9) UNSIGNED NOT NULL,
  `username` varchar(32) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `password` varchar(128) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `res_last_update` timestamp NOT NULL DEFAULT current_timestamp(),
  `pop` int(12) NOT NULL DEFAULT 100,
  `food` double(16,4) NOT NULL DEFAULT 100.0000,
  `timber` double(16,4) NOT NULL DEFAULT 100.0000,
  `metals` double(16,4) NOT NULL DEFAULT 100.0000,
  `coal` double(16,4) NOT NULL DEFAULT 100.0000,
  `oil` double(16,4) NOT NULL DEFAULT 100.0000,
  `kerosene` double(16,4) NOT NULL DEFAULT 100.0000,
  `hydrogen` double(16,4) NOT NULL DEFAULT 0.0000,
  `uranium` double(16,4) NOT NULL DEFAULT 0.0000
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`player_id`, `username`, `password`, `res_last_update`, `pop`, `food`, `timber`, `metals`, `coal`, `oil`, `kerosene`, `hydrogen`, `uranium`) VALUES
(23, 'Newstory', '$2b$10$3gMrZj1izC5qobr9qWiMvOsTOZlA.Pgwv1ieljZQhoD3zaKkdat22', '2021-02-14 11:08:52', 100, 100.0000, 5162.8202, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000);

--
-- Triggers `players`
--
DELIMITER $$
CREATE TRIGGER `Create buildings and space_objects after player insert` AFTER INSERT ON `players` FOR EACH ROW BEGIN
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '1', '1', NULL, 0);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '2', '1', NULL, 0);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '3', '0', NULL, 0);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '4', '0', NULL, 0);
    INSERT INTO `player_space_objects` (`player_id`, `space_object_id`, `x`, `y`, `rot`, `width`, `height`) VALUES (new.player_id, '1', 0, 0, 0, 160, 160);
    INSERT INTO `player_space_objects` (`player_id`, `space_object_id`, `x`, `y`, `rot`, `width`, `height`) VALUES (new.player_id, '2', RAND()*(210-140)+140, 0, RAND()*(360), 10, 10);
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `Delete buildings and space objects on player delete` AFTER DELETE ON `players` FOR EACH ROW BEGIN
	DELETE FROM `player_buildings` WHERE `player_id` = old.player_id;
    DELETE FROM `player_space_objects` WHERE `player_id` = old.player_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `player_buildings`
--

CREATE TABLE `player_buildings` (
  `player_id` mediumint(8) UNSIGNED NOT NULL,
  `building_id` smallint(5) UNSIGNED NOT NULL,
  `level` int(11) NOT NULL,
  `update_start` timestamp NULL DEFAULT NULL,
  `downgrade` tinyint(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `player_buildings`
--

INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES
(23, 3, 3, NULL, 0),
(23, 2, 3, NULL, 0),
(23, 1, 2, NULL, 0),
(23, 4, 0, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_units`
--

CREATE TABLE `player_units` (
  `player_id` int(9) NOT NULL,
  `unit_id` int(3) NOT NULL,
  `count` int(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `player_units`
--

INSERT INTO `player_units` (`player_id`, `unit_id`, `count`) VALUES
(23, 1, 0),
(23, 2, 0);

-- --------------------------------------------------------

--
-- Table structure for table `space_objects`
--

CREATE TABLE `space_objects` (
  `space_object_id` int(11) UNSIGNED NOT NULL,
  `galaxy_id` int(11) NOT NULL,
  `x` int(8) NOT NULL,
  `y` int(8) NOT NULL,
  `rot` int(3) NOT NULL,
  `width` int(3) UNSIGNED NOT NULL,
  `height` int(3) UNSIGNED NOT NULL,
  `image_id` int(3) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `space_objects`
--

INSERT INTO `space_objects` (`space_object_id`, `galaxy_id`, `x`, `y`, `rot`, `width`, `height`, `image_id`) VALUES
(1, 1, 0, 0, 0, 160, 160, 1),
(2, 1, 171, 0, 19, 10, 10, 2);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `galaxies`
--
ALTER TABLE `galaxies`
  ADD PRIMARY KEY (`galaxy_id`);

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
-- Indexes for table `player_units`
--
ALTER TABLE `player_units`
  ADD PRIMARY KEY (`player_id`,`unit_id`);

--
-- Indexes for table `space_objects`
--
ALTER TABLE `space_objects`
  ADD PRIMARY KEY (`space_object_id`,`galaxy_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `galaxies`
--
ALTER TABLE `galaxies`
  MODIFY `galaxy_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `player_id` mediumint(9) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
