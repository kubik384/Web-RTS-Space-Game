-- phpMyAdmin SQL Dump
-- version 5.0.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 23, 2021 at 10:28 AM
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
  `space_object_id` int(11) UNSIGNED NOT NULL,
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

INSERT INTO `players` (`player_id`, `username`, `password`, `space_object_id`, `res_last_update`, `pop`, `food`, `timber`, `metals`, `coal`, `oil`, `kerosene`, `hydrogen`, `uranium`) VALUES
(23, 'Newstory', '$2b$10$3gMrZj1izC5qobr9qWiMvOsTOZlA.Pgwv1ieljZQhoD3zaKkdat22', 2, '2021-05-22 19:57:11', 100, 100.0000, 24112.2286, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000),
(24, 'Newstory3', '$2b$10$45Xqd8HMR6eXC0Qd0Zon6OjCiURwKPr.L1kov8paKM/PHysoTv73i', 2, '2021-05-15 15:26:08', 100, 100.0000, 100.1161, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000),
(25, 'Newstory4', '$2b$10$wZ3MZv3qDQwf6PJs.CpYhenRe5vH5szRNHbHLdUbcIOdhauDo8fQy', 2, '2021-05-15 15:23:00', 100, 100.0000, 100.0369, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000),
(26, 'Newstory5', '$2b$10$BilA0DGgMCbUUgS7biW0HubgrhEuhL/.Sl9n9BzoE6/t0OmjCIaK2', 2, '2021-05-15 15:22:21', 100, 100.0000, 100.0057, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000),
(27, 'Newstory2', '$2b$10$XIPv0VZUN64/zpFrpM4jy.EJb56Sw/SbSt8W/BSn4IJACYHVnwHX2', 2, '2021-05-15 15:24:02', 100, 100.0000, 100.0009, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000);

--
-- Triggers `players`
--
DELIMITER $$
CREATE TRIGGER `Create buildings and space_objects after player insert` AFTER INSERT ON `players` FOR EACH ROW BEGIN
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '1', '1', NULL, 0);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '2', '1', NULL, 0);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '3', '0', NULL, 0);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '4', '0', NULL, 0);
    INSERT INTO `player_units` (`player_id`, `unit_id`, `count`) VALUES (new.player_id, '1','0');
    INSERT INTO `player_units` (`player_id`, `unit_id`, `count`) VALUES (new.player_id, '2','0');
    INSERT INTO `player_unit_ques` (`player_id`, `unit_id`, `count`) VALUES (new.player_id, '1','0');
    INSERT INTO `player_unit_ques` (`player_id`, `unit_id`, `count`) VALUES (new.player_id, '2','0');
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `Delete buildings and space objects on player delete` AFTER DELETE ON `players` FOR EACH ROW BEGIN
	DELETE FROM `player_buildings` WHERE `player_id` = old.player_id;
    DELETE FROM `player_units` WHERE `player_id` = old.player_id;
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
(23, 3, 2, NULL, 0),
(23, 2, 2, NULL, 0),
(23, 1, 2, NULL, 0),
(23, 4, 1, NULL, 0),
(24, 1, 1, NULL, 0),
(24, 2, 1, NULL, 0),
(24, 3, 0, NULL, 0),
(24, 4, 0, NULL, 0),
(25, 1, 1, NULL, 0),
(25, 2, 1, NULL, 0),
(25, 3, 0, NULL, 0),
(25, 4, 0, NULL, 0),
(26, 1, 1, NULL, 0),
(26, 2, 1, NULL, 0),
(26, 3, 0, NULL, 0),
(26, 4, 0, NULL, 0),
(27, 1, 1, NULL, 0),
(27, 2, 1, NULL, 0),
(27, 3, 0, NULL, 0),
(27, 4, 0, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_units`
--

CREATE TABLE `player_units` (
  `player_id` int(9) UNSIGNED NOT NULL,
  `unit_id` int(3) UNSIGNED NOT NULL,
  `count` int(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `player_units`
--

INSERT INTO `player_units` (`player_id`, `unit_id`, `count`) VALUES
(23, 1, 12959),
(23, 2, 1116),
(24, 1, 0),
(24, 2, 0),
(25, 1, 0),
(25, 2, 0),
(26, 1, 0),
(26, 2, 0),
(27, 1, 0),
(27, 2, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_unit_ques`
--

CREATE TABLE `player_unit_ques` (
  `player_id` int(9) UNSIGNED NOT NULL,
  `unit_id` int(3) UNSIGNED NOT NULL,
  `count` int(8) NOT NULL,
  `calculated_timestamp` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `player_unit_ques`
--

INSERT INTO `player_unit_ques` (`player_id`, `unit_id`, `count`, `calculated_timestamp`) VALUES
(23, 1, 0, '2021-03-13 09:44:04'),
(23, 2, 0, '2021-03-13 08:53:06'),
(24, 1, 0, NULL),
(24, 2, 0, NULL),
(25, 1, 0, NULL),
(25, 2, 0, NULL),
(26, 1, 0, NULL),
(26, 2, 0, NULL),
(27, 1, 0, NULL),
(27, 2, 0, NULL);

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
-- Indexes for table `player_units`
--
ALTER TABLE `player_units`
  ADD PRIMARY KEY (`player_id`,`unit_id`);

--
-- Indexes for table `player_unit_ques`
--
ALTER TABLE `player_unit_ques`
  ADD PRIMARY KEY (`player_id`,`unit_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `player_id` mediumint(9) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
