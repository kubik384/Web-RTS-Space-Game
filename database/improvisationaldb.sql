-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3308
-- Generation Time: Oct 28, 2020 at 09:34 PM
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
  `res_last_update` timestamp NOT NULL,
  `wood` double(16,4) UNSIGNED NOT NULL DEFAULT '100.0000',
  `wood_prod` double(16,4) UNSIGNED NOT NULL DEFAULT '0.0050',
  `dirt` double(16,4) UNSIGNED NOT NULL DEFAULT '100.0000',
  `dirt_prod` double(16,4) UNSIGNED NOT NULL DEFAULT '0.0100',
  `iron` double(16,4) UNSIGNED NOT NULL DEFAULT '100.0000',
  `iron_prod` double(16,4) UNSIGNED NOT NULL DEFAULT '0.0005',
  `pop` double(16,4) UNSIGNED NOT NULL DEFAULT '100.0000',
  `pop_prod` double(16,4) UNSIGNED NOT NULL DEFAULT '0.0010',
  PRIMARY KEY (`player_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=MyISAM AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`player_id`, `username`, `password`, `res_last_update`, `wood`, `wood_prod`, `dirt`, `dirt_prod`, `iron`, `iron_prod`, `pop`, `pop_prod`) VALUES
(17, 'Newstory', '$2b$10$f7I6ge.NFp/ojqzQjw0DvOLEXpE79xwBxxsyrdzI303xS8PKPqeei', '2020-10-28 21:32:59', 7298.9250, 0.0050, 20041.8700, 0.0100, 18565.4955, 0.0005, 19594.9860, 0.0010);

--
-- Triggers `players`
--
DROP TRIGGER IF EXISTS `Create buildings after player insert`;
DELIMITER $$
CREATE TRIGGER `Create buildings after player insert` AFTER INSERT ON `players` FOR EACH ROW BEGIN
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `upgradeStart`) VALUES (new.player_id, '1', '1', NULL);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `upgradeStart`) VALUES (new.player_id, '2', '1', NULL);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `upgradeStart`) VALUES (new.player_id, '3', '0', NULL);
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `Delete player_buildings on player delete`;
DELIMITER $$
CREATE TRIGGER `Delete player_buildings on player delete` AFTER DELETE ON `players` FOR EACH ROW BEGIN
	DELETE FROM `player_buildings` WHERE `player_id` = old.player_id;
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
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `player_buildings`
--

INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES
(17, 3, 1, NULL, 0),
(17, 2, 0, NULL, 0),
(17, 1, 0, NULL, 0);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
