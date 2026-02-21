<?php
if (!ISSET($config)) $config = require(__DIR__ . '/../config.php');
$servername = $config['db_host'];
$username = $config['db_user'];
$password = $config['db_pass'];
$dbname = $config['db_name'];

//connect to db
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) die('Connection failed: ' . $conn->connect_error);

//set session timezone to UTC
$conn->query("SET time_zone = '{$config['db_timezone']}'");
