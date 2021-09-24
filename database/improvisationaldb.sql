-- phpMyAdmin SQL Dump
-- version 5.0.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Sep 23, 2021 at 10:32 AM
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
  `pop` int(12) NOT NULL DEFAULT 100,
  `food` double(16,4) NOT NULL DEFAULT 100.0000,
  `timber` double(16,4) NOT NULL DEFAULT 100.0000,
  `metals` double(16,4) NOT NULL DEFAULT 100.0000,
  `coal` double(16,4) NOT NULL DEFAULT 100.0000,
  `oil` double(16,4) NOT NULL DEFAULT 100.0000,
  `kerosene` double(16,4) NOT NULL DEFAULT 100.0000,
  `hydrogen` double(16,4) NOT NULL DEFAULT 0.0000,
  `uranium` double(16,4) NOT NULL DEFAULT 0.0000,
  `researched_techs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '\'[]\''
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`player_id`, `username`, `password`, `system_id`, `space_object_id`, `res_last_update`, `pop`, `food`, `timber`, `metals`, `coal`, `oil`, `kerosene`, `hydrogen`, `uranium`, `researched_techs`) VALUES
(23, 'Newstory', '$2b$10$3gMrZj1izC5qobr9qWiMvOsTOZlA.Pgwv1ieljZQhoD3zaKkdat22', 1, 2, 1632381284, 100, 100.0000, 4777.6467, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000, '[]'),
(24, 'Newstory2', '$2b$10$OlLYguojAwkwRvU1Qszi8ORRGC0LVG3J8O7txzHprWJy4xVL9AcQa', 1, 3, 1631020301, 100, 100.0000, 2494.5084, 100.0000, 100.0000, 100.0000, 100.0000, 0.0000, 0.0000, '[]');

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
  `update_start` int(11) UNSIGNED DEFAULT NULL,
  `downgrade` tinyint(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Dumping data for table `player_buildings`
--

INSERT INTO `player_buildings` (`player_id`, `building_id`, `level`, `update_start`, `downgrade`) VALUES
(23, 3, 2, NULL, 0),
(23, 2, 3, NULL, 0),
(23, 1, 2, NULL, 0),
(23, 4, 1, NULL, 0),
(24, 1, 1, NULL, 0),
(24, 2, 1, NULL, 0),
(24, 3, 1, NULL, 0),
(24, 4, 1, NULL, 0);

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

--
-- Dumping data for table `player_reports`
--

INSERT INTO `player_reports` (`player_id`, `report_id`, `title`, `text`, `isRead`, `gotDisplayed`, `timestamp`) VALUES
(23, '07f23618-0e55-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'We\'ve received a frantic message from our expedition that their systems are being taken over by some sort of a virus. Immediately after that, the contact with the fleet has been cut. We\'ve been unable to restore it since, despite our numerous attemps.', 0, 1, 1630851890),
(23, '0c6e3e1a-0d8d-11ec-9390-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, an entire fleet drifting through space can be seen. After closing in, the scan doesn\'t find any source of life. The ships are in good condition and so after sending some of their crew on board, they manage to get the ships to join our fleet', 1, 1, 1630765999),
(23, '1212e107-0e52-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'We\'ve received a frantic message from our expedition that their systems are being taken over by some sort of a virus. Immediately after that, the contact with the fleet has been cut. We\'ve been unable to restore it since, despite our numerous attemps.', 0, 1, 1630850619),
(23, '1257b031-0fe1-11ec-8ee1-00d861a9d1f0', 'Expedition Result', 'Scrapped event idea', 1, 1, 1631021987),
(23, '1956c7e6-0e6c-11ec-9a68-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, an entire fleet drifting through space can be seen. After closing in, the scan doesn\'t find any source of life. The ships are in good condition and so after sending some of their crew on board, they manage to get the ships to join our fleet', 0, 1, 1630861798),
(24, '27c95e0e-0ed4-11ec-9b1a-00d861a9d1f0', 'Attack result', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630906490),
(23, '27caf3fa-0ed4-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630906490),
(23, '287866aa-0e55-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Particle Storm', 0, 1, 1630851945),
(23, '29157fbf-0e52-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, an entire fleet drifting through space can be seen. After closing in, the scan doesn\'t find any source of life. The ships are in good condition and so after sending some of their crew on board, they manage to get the ships to join our fleet', 0, 1, 1630850658),
(23, '35d5aee2-0e52-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Scrapped event idea', 0, 1, 1630850679),
(23, '35e24c3c-0e55-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Particle Storm', 0, 1, 1630851968),
(23, '390e93eb-0e55-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature and the ships seem to be undamaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. Meanwhile, the sonsors have picked up on an uknown fleet closing in. This was clearly a trap. After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage. They\'ve been engaged by what has been identified as a pirate fleet shortly after', 0, 1, 1630851973),
(24, '398c365f-0ed3-11ec-9b1a-00d861a9d1f0', 'Attack result', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630906090),
(23, '398dd066-0ed3-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630906090),
(23, '3a7d63dd-099b-11ec-916b-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a very weak energy signature and has decided to move closer to inspect it. What at first glance appeared to be a small asteroid formation to the sensors has turned out to be an abandoned fleet flying aimlessly through space. After closer inspection, they found out that the ships have no fuel left and most of them have already ran out of their battery emergency reserves. Despite their thorough attempts, they\'ve been unable to figure out any clues as to what happened to the ships or where did the crew go. Nonetheless, most of the ships seem to be in an operable state. With enough fuel spare, it should be possible to refuel the ships and move some of the crew to man them so that they can be added to the expedition fleet', 1, 1, 1630332284),
(24, '3c72f68e-0ed5-11ec-9b1a-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, a single large cargo ship can be detected. The ship does not respond to any of their attempts to establish a communication channel. After closing in to scan for any signs of life, scans suddenly pick up on a previously undetected fleet closing it\'s way in from behind a nearby planet', 0, 1, 1630906954),
(24, '446287dc-0ed6-11ec-9b1a-00d861a9d1f0', 'Expedition Result', 'Particle Storm', 0, 1, 1630907397),
(23, '46b5df81-0fdf-11ec-8ee1-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature and the ships seem to be undamaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. Meanwhile, the sonsors have picked up on an uknown fleet closing in. This was clearly a trap. After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage. They\'ve been engaged by what has been identified as a pirate fleet shortly after', 0, 1, 1631021216),
(23, '48c557ff-0d89-11ec-9390-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature and the ships seem to be undamaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. Meanwhile, the sonsors have picked up on an uknown fleet closing in. This was clearly a trap. After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage. They\'ve been engaged by what has been identified as a pirate fleet shortly after', 1, 1, 1630764382),
(23, '4c9f7482-0e53-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Particle Storm', 0, 1, 1630851147),
(24, '4e33cac5-0ed6-11ec-9b1a-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, a single large cargo ship can be detected. The ship does not respond to any of their attempts to establish a communication channel. After closing in to scan for any signs of life, scans suddenly pick up on a previously undetected fleet closing it\'s way in from behind a nearby planet', 0, 1, 1630907413),
(23, '50f537e8-099b-11ec-916b-00d861a9d1f0', 'Expedition Result', 'We\'ve received a frantic message from our expedition that their systems are being taken over by some sort of a virus. Immediately after that, the contact with the fleet has been cut. We\'ve been unable to restore it since, despite our numerous attemps.', 1, 1, 1630332322),
(23, '5118ccdf-0d89-11ec-9390-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, a single large cargo ship can be detected. The ship does not respond to any of their attempts to establish a communication channel. After closing in to scan for any signs of life, scans suddenly pick up on a previously undetected fleet closing it\'s way in from behind a nearby planet', 1, 1, 1630764396),
(23, '553473f1-0d89-11ec-9390-00d861a9d1f0', 'Expedition Result', 'Scrapped event idea', 1, 1, 1630764403),
(24, '5c86d68c-0ed6-11ec-9b1a-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature however and most of the ships seem to be severely damaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships and search for anything worth of value left, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. This was clearly a set-up After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage.Some of the have been however rendered immobile, inoperable, unable to sustain it\'s crew or have caught fire and the efforts to contain it have failed and therefore will have to be abandoned. The return time will also be longer than expected due to the damage suffered.', 0, 1, 1630907437),
(24, '5c96e805-0ed5-11ec-9b1a-00d861a9d1f0', 'Attack result', 'Round 1: \n\n Fleet 1: Hull: 400 - 155 \n Fleet 2: Hull: 440 - 139 \n\nRound 2: \n\n Fleet 1: Hull: 245 - 155 \n Fleet 2: Hull: 301 - 139 \n\nRound 3: \n\n Fleet 1: Hull: 90 - 155 \n Fleet 2: Hull: 162 - 139 \n\n', 0, 1, 1630907008),
(23, '5c988a16-0ed5-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 400 - 155 \n Fleet 2: Hull: 440 - 139 \n\nRound 2: \n\n Fleet 1: Hull: 245 - 155 \n Fleet 2: Hull: 301 - 139 \n\nRound 3: \n\n Fleet 1: Hull: 90 - 155 \n Fleet 2: Hull: 162 - 139 \n\n', 1, 1, 1630907008),
(23, '5fc87b61-0e53-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Particle Storm', 0, 1, 1630851179),
(24, '632f3de5-0ed3-11ec-9b1a-00d861a9d1f0', 'Attack result', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630906160),
(23, '6330ddec-0ed3-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630906160),
(23, '7389c824-0e53-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Scrapped event idea', 0, 1, 1630851212),
(23, '7719f6e5-0e52-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a very weak energy signature and has decided to move closer to inspect it. What at first glance appeared to be a small asteroid formation to the sensors has turned out to be an abandoned fleet flying aimlessly through space. After closer inspection, they found out that the ships have no fuel left and most of them have already ran out of their battery emergency reserves. Despite their thorough attempts, they\'ve been unable to figure out any clues as to what happened to the ships or where did the crew go. Nonetheless, most of the ships seem to be in an operable state. With enough fuel spare, it should be possible to refuel the ships and move some of the crew to man them so that they can be added to the expedition fleet', 0, 1, 1630850788),
(23, '780f039f-0e53-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature however and most of the ships seem to be severely damaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships and search for anything worth of value left, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. This was clearly a set-up After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage.Some of the have been however rendered immobile, inoperable, unable to sustain it\'s crew or have caught fire and the efforts to contain it have failed and therefore will have to be abandoned. The return time will also be longer than expected due to the damage suffered.', 0, 1, 1630851220),
(24, '7b0ec9c2-0ed5-11ec-9b1a-00d861a9d1f0', 'Attack result', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630907059),
(23, '7b107684-0ed5-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630907059),
(24, '80649f37-0ed3-11ec-9b1a-00d861a9d1f0', 'Attack result', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630906209),
(23, '80663c4c-0ed3-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 400 - 1490 \n Fleet 2: Hull: 4000 - 50 \n\n', 0, 1, 1630906209),
(23, '8296ad80-0e53-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature and the ships seem to be undamaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. Meanwhile, the sonsors have picked up on an uknown fleet closing in. This was clearly a trap. After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage. They\'ve been engaged by what has been identified as a pirate fleet shortly after', 0, 1, 1630851237),
(23, '84ad2ed8-0fdf-11ec-8ee1-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, a single large cargo ship can be detected. The ship does not respond to any of their attempts to establish a communication channel. After closing in to scan for any signs of life, scans suddenly pick up on a previously undetected fleet closing it\'s way in from behind a nearby planet', 0, 1, 1631021319),
(23, '878bf937-0e55-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature however and most of the ships seem to be severely damaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships and search for anything worth of value left, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. This was clearly a set-up After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage.Some of the have been however rendered immobile, inoperable, unable to sustain it\'s crew or have caught fire and the efforts to contain it have failed and therefore will have to be abandoned. The return time will also be longer than expected due to the damage suffered.', 0, 1, 1630852105),
(23, '8c461b1c-0fdf-11ec-8ee1-00d861a9d1f0', 'Expedition Result', 'Scrapped event idea', 0, 1, 1631021332),
(23, '90a9244b-0e52-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, an entire fleet drifting through space can be seen. After closing in, the scan doesn\'t find any source of life. The ships are in good condition and so after sending some of their crew on board, they manage to get the ships to join our fleet', 0, 1, 1630850831),
(23, '919441bc-0fdf-11ec-8ee1-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature however and most of the ships seem to be severely damaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships and search for anything worth of value left, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. This was clearly a set-up After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage.Some of the have been however rendered immobile, inoperable, unable to sustain it\'s crew or have caught fire and the efforts to contain it have failed and therefore will have to be abandoned. The return time will also be longer than expected due to the damage suffered.', 0, 1, 1631021341),
(23, '97dfe933-0e51-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'We\'ve received a frantic message from our expedition that their systems are being taken over by some sort of a virus. Immediately after that, the contact with the fleet has been cut. We\'ve been unable to restore it since, despite our numerous attemps.', 0, 1, 1630850414),
(24, '9afa40c4-0ed2-11ec-9b1a-00d861a9d1f0', 'Attack result', 'Round 1: \n\n Fleet 1: Hull: 360 - 141 \n Fleet 2: Hull: 400 - 125 \n\nRound 2: \n\n Fleet 1: Hull: 219 - 141 \n Fleet 2: Hull: 275 - 125 \n\nRound 3: \n\n Fleet 1: Hull: 78 - 141 \n Fleet 2: Hull: 150 - 125 \n\n', 0, 1, 1630905824),
(23, '9afa77b5-0ed2-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 360 - 141 \n Fleet 2: Hull: 400 - 125 \n\nRound 2: \n\n Fleet 1: Hull: 219 - 141 \n Fleet 2: Hull: 275 - 125 \n\nRound 3: \n\n Fleet 1: Hull: 78 - 141 \n Fleet 2: Hull: 150 - 125 \n\n', 0, 1, 1630905824),
(23, 'a53666f4-0e53-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, a single large cargo ship can be detected. The ship does not respond to any of their attempts to establish a communication channel. After closing in to scan for any signs of life, scans suddenly pick up on a previously undetected fleet closing it\'s way in from behind a nearby planet', 0, 1, 1630851295),
(23, 'a874533f-0e53-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, an entire fleet drifting through space can be seen. After closing in, the scan doesn\'t find any source of life. The ships are in good condition and so after sending some of their crew on board, they manage to get the ships to join our fleet', 0, 1, 1630851301),
(23, 'ab6b77d4-0e53-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a very weak energy signature and has decided to move closer to inspect it. What at first glance appeared to be a small asteroid formation to the sensors has turned out to be an abandoned fleet flying aimlessly through space. After closer inspection, they found out that the ships have no fuel left and most of them have already ran out of their battery emergency reserves. Despite their thorough attempts, they\'ve been unable to figure out any clues as to what happened to the ships or where did the crew go. Nonetheless, most of the ships seem to be in an operable state. With enough fuel spare, it should be possible to refuel the ships and move some of the crew to man them so that they can be added to the expedition fleet', 0, 1, 1630851306),
(23, 'ae7d4b9c-0e51-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature and the ships seem to be undamaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. Meanwhile, the sonsors have picked up on an uknown fleet closing in. This was clearly a trap. After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage. They\'ve been engaged by what has been identified as a pirate fleet shortly after', 0, 1, 1630850452),
(24, 'c0a5fa47-0ed2-11ec-9b1a-00d861a9d1f0', 'Attack result', 'Round 1: \n\n Fleet 1: Hull: 400 - 65 \n Fleet 2: Hull: 200 - 145 \n\nRound 2: \n\n Fleet 1: Hull: 335 - 65 \n Fleet 2: Hull: 55 - 145 \n\n', 0, 1, 1630905887),
(23, 'c0a79eba-0ed2-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 400 - 65 \n Fleet 2: Hull: 200 - 145 \n\nRound 2: \n\n Fleet 1: Hull: 335 - 65 \n Fleet 2: Hull: 55 - 145 \n\n', 0, 1, 1630905887),
(24, 'c1c5bd6f-0ed3-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 4000 - 50 \n Fleet 2: Hull: 400 - 1490 \n\n', 0, 1, 1630906319),
(23, 'cca35acc-0e51-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'We\'ve received a frantic message from our expedition that their systems are being taken over by some sort of a virus. Immediately after that, the contact with the fleet has been cut. We\'ve been unable to restore it since, despite our numerous attemps.', 0, 1, 1630850503),
(23, 'd6abb1e1-0d84-11ec-9390-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, a single large cargo ship can be detected. The ship does not respond to any of their attempts to establish a communication channel. After closing in to scan for any signs of life, scans suddenly pick up on a previously undetected fleet closing it\'s way in from behind a nearby planet', 1, 1, 1630762473),
(23, 'd72f4ff7-0fe2-11ec-8ee1-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature however and most of the ships seem to be severely damaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships and search for anything worth of value left, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. This was clearly a set-up After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage.Some of the have been however rendered immobile, inoperable, unable to sustain it\'s crew or have caught fire and the efforts to contain it have failed and therefore will have to be abandoned. The return time will also be longer than expected due to the damage suffered.', 1, 1, 1631022746),
(23, 'ddb18433-0d82-11ec-9390-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature however and most of the ships seem to be severely damaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships and search for anything worth of value left, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. This was clearly a set-up After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage.Some of the have been however rendered immobile, inoperable, unable to sustain it\'s crew or have caught fire and the efforts to contain it have failed and therefore will have to be abandoned. The return time will also be longer than expected due to the damage suffered.', 1, 1, 1630761625),
(24, 'e5fa5ef7-0ed2-11ec-9b1a-00d861a9d1f0', 'Attack result', 'Round 1: \n\n Fleet 1: Hull: 400 - 140 \n Fleet 2: Hull: 400 - 140 \n\nRound 2: \n\n Fleet 1: Hull: 260 - 140 \n Fleet 2: Hull: 260 - 140 \n\nRound 3: \n\n Fleet 1: Hull: 120 - 140 \n Fleet 2: Hull: 120 - 140 \n\n', 0, 1, 1630905950),
(23, 'e5fbfbf4-0ed2-11ec-9b1a-00d861a9d1f0', 'Fleet attacked', 'Round 1: \n\n Fleet 1: Hull: 400 - 140 \n Fleet 2: Hull: 400 - 140 \n\nRound 2: \n\n Fleet 1: Hull: 260 - 140 \n Fleet 2: Hull: 260 - 140 \n\nRound 3: \n\n Fleet 1: Hull: 120 - 140 \n Fleet 2: Hull: 120 - 140 \n\n', 0, 1, 1630905950),
(23, 'ead70e80-0e54-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'We\'ve received a frantic message from our expedition that their systems are being taken over by some sort of a virus. Immediately after that, the contact with the fleet has been cut. We\'ve been unable to restore it since, despite our numerous attemps.', 0, 1, 1630851842),
(23, 'f394d882-0d84-11ec-9390-00d861a9d1f0', 'Expedition Result', 'Our expedition has detected a small fleet slowly drifting away nearby. They are detecting no energy signature however and most of the ships seem to be severely damaged. As they close in, no signs of life can be found aboard the ships. Once the fleet moves close enough to properly inspect the state of the ships and search for anything worth of value left, one of the ships is suddenly engulfed in a massive explosion, creating a chain reaction. This was clearly a set-up After receiving this report, the contact with the expedition has been cut. We\'ve been however able to restore it after a while, receiving the report that most of the ships have managed to survived the explosion, but a lot of them have suffered considerable damage.Some of the have been however rendered immobile, inoperable, unable to sustain it\'s crew or have caught fire and the efforts to contain it have failed and therefore will have to be abandoned. The return time will also be longer than expected due to the damage suffered.', 1, 1, 1630762521),
(23, 'fb665610-0e51-11ec-acdc-00d861a9d1f0', 'Expedition Result', 'Particle Storm', 0, 1, 1630850581),
(23, 'fb9011eb-0d82-11ec-9390-00d861a9d1f0', 'Expedition Result', 'Our expedition has picked up on a distress beacon and has made it\'s way towards it. After arriving at the coordinates of the beacon\'s distress signal, a single large cargo ship can be detected. The ship does not respond to any of their attempts to establish a communication channel. After closing in to scan for any signs of life, scans suddenly pick up on a previously undetected fleet closing it\'s way in from behind a nearby planet', 1, 1, 1630761675);

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
(23, 1, 1091),
(23, 2, 200),
(24, 1, 10),
(24, 2, 0);

-- --------------------------------------------------------

--
-- Table structure for table `player_unit_ques`
--

CREATE TABLE `player_unit_ques` (
  `player_id` int(9) NOT NULL,
  `unit_id` int(3) NOT NULL,
  `count` int(8) NOT NULL,
  `calculated_timestamp` int(11) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `player_unit_ques`
--

INSERT INTO `player_unit_ques` (`player_id`, `unit_id`, `count`, `calculated_timestamp`) VALUES
(23, 1, 0, 1626286456),
(23, 2, 0, 4294967295),
(24, 1, 0, 1630905867),
(24, 2, 0, NULL);

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
  ADD PRIMARY KEY (`player_id`,`unit_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `player_id` mediumint(9) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
