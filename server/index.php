<?php 
session_start(); 
$home = true;

if (!ISSET($_SESSION['is_logged'])) {
	if ($_SERVER['REQUEST_METHOD'] == 'POST') {
		$config = require('config.php');
		$username = htmlspecialchars(trim($_POST['username']));
		$password = htmlspecialchars(trim($_POST['password']));

		if (array_key_exists($username, $config['users']) 
			&& $password == $config['users'][$username]) {
			$_SESSION['is_logged'] = true;
			header('Location: ./');
            exit();
		} else {
			readfile('assets/html/index_top.html');
			readfile('assets/html/index_login.html');
			echo('<p class="center error" style="margin-top: 0;">The username or password or both are not valid</p>');
		}   
	} else {
		readfile('assets/html/index_top.html');
		readfile('assets/html/index_login.html');
	}
} else {
	//unset($_SESSION['user']);
	readfile('assets/html/index_top.html');
    include('api/display-results.php');  
	readfile('assets/html/index_download.html');
}
readfile('assets/html/index_bottom.html');
