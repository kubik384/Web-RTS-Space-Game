-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3308
-- Generation Time: Jul 30, 2020 at 04:33 PM
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
-- Table structure for table `buildings`
--

DROP TABLE IF EXISTS `buildings`;
CREATE TABLE IF NOT EXISTS `buildings` (
  `building_id` smallint(5) UNSIGNED NOT NULL,
  `level` smallint(5) UNSIGNED NOT NULL,
  `name` tinytext CHARACTER SET utf8 COLLATE utf8_bin,
  `upgrade_time` mediumint(8) UNSIGNED NOT NULL,
  `cost` text CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  PRIMARY KEY (`building_id`,`level`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `players`
--

DROP TABLE IF EXISTS `players`;
CREATE TABLE IF NOT EXISTS `players` (
  `player_id` mediumint(9) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(32) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `password` varchar(128) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `resources` text CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `resource_production` text CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `res_last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`player_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Triggers `players`
--
DROP TRIGGER IF EXISTS `Create buildings and set resources with production`;
DELIMITER $$
CREATE TRIGGER `Create buildings and set resources with production` AFTER INSERT ON `players` FOR EACH ROW BEGIN
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `upgradeStart`) VALUES (new.player_id, '1', '1', NULL);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `upgradeStart`) VALUES (new.player_id, '2', '1', NULL);
    INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `upgradeStart`) VALUES (new.player_id, '3', '0', NULL);
    
    UPDATE `players` SET 
    `resources` = `{"wood":100,"dirt":100,"iron":100,"pop":100}`, 
    `resource_production` = `{"wood":100,"dirt":100,"iron":100,"pop":100}` 	
    WHERE `player_id` = new.player_id;
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
  `upgradeStart` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`building_id`,`player_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
