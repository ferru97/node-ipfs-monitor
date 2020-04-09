-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3308
-- Creato il: Apr 09, 2020 alle 22:16
-- Versione del server: 8.0.18
-- Versione PHP: 7.3.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ipfs_monitor`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `dhtt_bucket`
--

DROP TABLE IF EXISTS `dhtt_bucket`;
CREATE TABLE IF NOT EXISTS `dhtt_bucket` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_check` int(11) NOT NULL,
  `bucket` int(11) NOT NULL,
  `peers_num` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_check` (`id_check`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dhtt_check`
--

DROP TABLE IF EXISTS `dhtt_check`;
CREATE TABLE IF NOT EXISTS `dhtt_check` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `data` datetime NOT NULL,
  `total_peer` int(11) NOT NULL,
  `distinct_peer` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `dhtt_peer`
--

DROP TABLE IF EXISTS `dhtt_peer`;
CREATE TABLE IF NOT EXISTS `dhtt_peer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_bucket` int(11) NOT NULL,
  `cid` varchar(500) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_bucket` (`id_bucket`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `swarm_connection`
--

DROP TABLE IF EXISTS `swarm_connection`;
CREATE TABLE IF NOT EXISTS `swarm_connection` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `peer` varchar(500) NOT NULL,
  `multi_add` varchar(500) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `ip_family` varchar(50) NOT NULL,
  `ip_address` varchar(50) NOT NULL,
  `ip_port` varchar(50) NOT NULL,
  `location` varchar(50) NOT NULL,
  `latency` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `peerID` (`peer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struttura della tabella `swarm_peer`
--

DROP TABLE IF EXISTS `swarm_peer`;
CREATE TABLE IF NOT EXISTS `swarm_peer` (
  `cid` varchar(500) NOT NULL,
  PRIMARY KEY (`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `dhtt_bucket`
--
ALTER TABLE `dhtt_bucket`
  ADD CONSTRAINT `dhtt_bucket_ibfk_1` FOREIGN KEY (`id_check`) REFERENCES `dhtt_check` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `dhtt_peer`
--
ALTER TABLE `dhtt_peer`
  ADD CONSTRAINT `dhtt_peer_ibfk_1` FOREIGN KEY (`id_bucket`) REFERENCES `dhtt_bucket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `swarm_connection`
--
ALTER TABLE `swarm_connection`
  ADD CONSTRAINT `swarm_connection_ibfk_1` FOREIGN KEY (`peer`) REFERENCES `swarm_peer` (`cid`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
