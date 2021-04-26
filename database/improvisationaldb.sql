-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3308
-- Generation Time: Apr 26, 2021 at 07:02 PM
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
-- Table structure for table `galaxies`
--

DROP TABLE IF EXISTS `galaxies`;
CREATE TABLE IF NOT EXISTS `galaxies` (
  `galaxy_id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `x` int(9) NOT NULL,
  `y` int(9) NOT NULL,
  `width` int(3) NOT NULL,
  `height` int(3) NOT NULL,
  `image_id` int(3) NOT NULL,
  PRIMARY KEY (`galaxy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=MyISAM AUTO_INCREMENT=24 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`player_id`, `username`, `password`, `res_last_update`, `pop`, `food`, `timber`, `metals`, `coal`, `oil`, `kerosene`, `hydrogen`, `uranium`) VALUES
(23, 'Newstory', '$2b$10$3gMrZj1izC5qobr9qWiMvOsTOZlA.Pgwv1ieljZQhoD3zaKkdat22', '2021-04-26 19:00:25', 100, 100.0000, 21596.1647, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000);

--
-- Triggers `players`
--
DROP TRIGGER IF EXISTS `Create buildings and space_objects after player insert`;
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
DROP TRIGGER IF EXISTS `Delete buildings and space objects on player delete`;
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

DROP TABLE IF EXISTS `player_buildings`;
CREATE TABLE IF NOT EXISTS `player_buildings` (
  `player_id` mediumint(8) UNSIGNED NOT NULL,
  `building_id` smallint(5) UNSIGNED NOT NULL,
  `level` int(11) NOT NULL,
  `update_start` timestamp NULL DEFAULT NULL,
  `downgrade` tinyint(1) NOT NULL,
  PRIMARY KEY (`player_id`,`building_id`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `player_buildings`
--

INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES
(23, 3, 3, NULL, 0),
(23, 2, 3, NULL, 0),
(23, 1, 2, NULL, 0),
(23, 4, 2, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_fleets`
--

DROP TABLE IF EXISTS `player_fleets`;
CREATE TABLE IF NOT EXISTS `player_fleets` (
  `player_id` mediumint(9) UNSIGNED NOT NULL,
  `fleet_id` int(11) UNSIGNED NOT NULL,
  `x` double NOT NULL,
  `y` double NOT NULL,
  `acceleration` double NOT NULL,
  `velocity_x` double NOT NULL,
  `velocity_y` double NOT NULL,
  `move_x` double DEFAULT NULL,
  `move_y` double DEFAULT NULL,
  `destroyed` tinyint(1) NOT NULL,
  PRIMARY KEY (`player_id`,`fleet_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `player_fleets`
--

INSERT INTO `player_fleets` (`player_id`, `fleet_id`, `x`, `y`, `acceleration`, `velocity_x`, `velocity_y`, `move_x`, `move_y`, `destroyed`) VALUES
(23, 1, 161.6836764274832, 55.672154412173796, 0.03, 0, 0, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_units`
--

DROP TABLE IF EXISTS `player_units`;
CREATE TABLE IF NOT EXISTS `player_units` (
  `player_id` int(9) NOT NULL,
  `unit_id` int(3) NOT NULL,
  `count` int(8) NOT NULL,
  PRIMARY KEY (`player_id`,`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `player_units`
--

INSERT INTO `player_units` (`player_id`, `unit_id`, `count`) VALUES
(23, 1, 13984),
(23, 2, 1349);

-- --------------------------------------------------------

--
-- Table structure for table `player_unit_ques`
--

DROP TABLE IF EXISTS `player_unit_ques`;
CREATE TABLE IF NOT EXISTS `player_unit_ques` (
  `player_id` int(9) NOT NULL,
  `unit_id` int(3) NOT NULL,
  `count` int(8) NOT NULL,
  `calculated_timestamp` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`player_id`,`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `player_unit_ques`
--

INSERT INTO `player_unit_ques` (`player_id`, `unit_id`, `count`, `calculated_timestamp`) VALUES
(23, 1, 0, 1618749749),
(23, 2, 0, 1618749752);

-- --------------------------------------------------------

--
-- Table structure for table `space_objects`
--

DROP TABLE IF EXISTS `space_objects`;
CREATE TABLE IF NOT EXISTS `space_objects` (
  `space_object_id` int(11) UNSIGNED NOT NULL,
  `galaxy_id` int(11) NOT NULL,
  `x` int(8) NOT NULL,
  `y` int(8) NOT NULL,
  `rot` int(3) NOT NULL,
  `width` int(3) UNSIGNED NOT NULL,
  `height` int(3) UNSIGNED NOT NULL,
  `image_id` int(3) NOT NULL,
  PRIMARY KEY (`space_object_id`,`galaxy_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `space_objects`
--

INSERT INTO `space_objects` (`space_object_id`, `galaxy_id`, `x`, `y`, `rot`, `width`, `height`, `image_id`) VALUES
(1, 1, 0, 0, 0, 160, 160, 1),
(2, 1, 171, 0, 19, 10, 10, 2);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
