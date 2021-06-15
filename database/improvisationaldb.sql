-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3308
-- Generation Time: Jun 04, 2021 at 03:30 PM
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
  `system_id` int(11) NOT NULL,
  `space_object_id` int(11) NOT NULL,
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
) ENGINE=MyISAM AUTO_INCREMENT=25 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`player_id`, `username`, `password`, `system_id`, `space_object_id`, `res_last_update`, `pop`, `food`, `timber`, `metals`, `coal`, `oil`, `kerosene`, `hydrogen`, `uranium`) VALUES
(23, 'Newstory', '$2b$10$3gMrZj1izC5qobr9qWiMvOsTOZlA.Pgwv1ieljZQhoD3zaKkdat22', 1, 2, '2021-06-03 16:08:07', 100, 100.0000, 24572.6038, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000),
(24, 'Newstory2', '$2b$10$OlLYguojAwkwRvU1Qszi8ORRGC0LVG3J8O7txzHprWJy4xVL9AcQa', 1, 3, '2021-05-15 07:58:33', 100, 100.0000, 114.2425, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000);

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
  PRIMARY KEY (`building_id`,`player_id`)
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
(24, 4, 0, NULL, 0);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `player_units`
--

INSERT INTO `player_units` (`player_id`, `unit_id`, `count`) VALUES
(23, 1, 12959),
(23, 2, 1116),
(24, 1, 0),
(24, 2, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_unit_ques`
--

DROP TABLE IF EXISTS `player_unit_ques`;
CREATE TABLE IF NOT EXISTS `player_unit_ques` (
  `player_id` int(9) NOT NULL,
  `unit_id` int(3) NOT NULL,
  `count` int(8) NOT NULL,
  `calculated_timestamp` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`player_id`,`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `player_unit_ques`
--

INSERT INTO `player_unit_ques` (`player_id`, `unit_id`, `count`, `calculated_timestamp`) VALUES
(23, 1, 0, '2021-03-13 09:44:04'),
(23, 2, 0, '2021-03-13 08:53:06'),
(24, 1, 0, NULL),
(24, 2, 0, NULL);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
