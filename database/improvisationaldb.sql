-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3308
-- Generation Time: Nov 10, 2020 at 07:18 PM
-- Server version: 8.0.18
-- PHP Version: 7.3.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
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

DROP TABLE IF EXISTS `players`;
CREATE TABLE IF NOT EXISTS `players` (
  `player_id` mediumint(9) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(32) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `password` varchar(128) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `res_last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `pop` int(12) NOT NULL DEFAULT '100',
  `food` double(16,4) NOT NULL DEFAULT '100.0000',
  `timber` double(16,4) NOT NULL DEFAULT '100.0000',
  `metals` double(16,4) NOT NULL DEFAULT '100.0000',
  `coal` double(16,4) NOT NULL DEFAULT '100.0000',
  `oil` double(16,4) NOT NULL DEFAULT '100.0000',
  `kerosene` double(16,4) NOT NULL DEFAULT '100.0000',
  `hydrogen` double(16,4) NOT NULL DEFAULT '0.0000',
  `uranium` double(16,4) NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`player_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=MyISAM AUTO_INCREMENT=24 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`player_id`, `username`, `password`, `res_last_update`, `pop`, `food`, `timber`, `metals`, `coal`, `oil`, `kerosene`, `hydrogen`, `uranium`) VALUES
(23, 'Newstory', '$2b$10$3gMrZj1izC5qobr9qWiMvOsTOZlA.Pgwv1ieljZQhoD3zaKkdat22', '2020-11-10 19:18:02', 100, 100.0000, 204.7958, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000);

--
-- Triggers `players`
--
DROP TRIGGER IF EXISTS `Create buildings and space_objects after player insert`;
DELIMITER $$
CREATE TRIGGER `Create buildings and space_objects after player insert` AFTER INSERT ON `players` FOR EACH ROW BEGIN
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '1', '1', NULL, 0);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '2', '1', NULL, 0);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES (new.player_id, '3', '0', NULL, 0);
    INSERT INTO `player_space_objects` (`player_id`, `space_object_id`, `x`, `y`, `rot`, `width`, `height`) VALUES (new.player_id, '1', 0, 0, 0, 160, 160);
    INSERT INTO `player_space_objects` (`player_id`, `space_object_id`, `x`, `y`, `rot`, `width`, `height`) VALUES (new.player_id, '2', RAND()*(210-140)+140, 0, RAND()*(360), 10, 10);
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `Delete buildings and space objects on player delete`;
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

DROP TABLE IF EXISTS `player_buildings`;
CREATE TABLE IF NOT EXISTS `player_buildings` (
  `player_id` mediumint(8) UNSIGNED NOT NULL,
  `building_id` smallint(5) UNSIGNED NOT NULL,
  `level` int(11) NOT NULL,
  `update_start` timestamp NULL DEFAULT NULL,
  `downgrade` tinyint(1) NOT NULL,
  PRIMARY KEY (`building_id`,`player_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `player_buildings`
--

INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES
(23, 3, 3, NULL, 0),
(23, 2, 3, NULL, 0),
(23, 1, 2, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_space_objects`
--

DROP TABLE IF EXISTS `player_space_objects`;
CREATE TABLE IF NOT EXISTS `player_space_objects` (
  `player_id` int(11) UNSIGNED NOT NULL,
  `space_object_id` int(11) UNSIGNED NOT NULL,
  `x` int(8) NOT NULL,
  `y` int(8) NOT NULL,
  `rot` int(3) NOT NULL,
  `width` int(3) UNSIGNED NOT NULL,
  `height` int(3) UNSIGNED NOT NULL,
  PRIMARY KEY (`player_id`,`space_object_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `player_space_objects`
--

INSERT INTO `player_space_objects` (`player_id`, `space_object_id`, `x`, `y`, `rot`, `width`, `height`) VALUES
(23, 1, 0, 0, 0, 160, 160),
(23, 2, 171, 0, 19, 10, 10);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
