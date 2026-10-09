-- network-topology 0002: mysql_long_topology
-- TEXT caps at 64KB on MySQL, too small for a large graph.

ALTER TABLE `p_network_topology_graphs` MODIFY COLUMN `topology` mediumtext;
