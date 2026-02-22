<?php
session_start();

if (!isset($_SESSION['is_logged']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('location: ./');
    die();
}

//load config.php as $config, and connect db
require('../includes/database-conn.php');

//load JSON config
$configJson = json_decode(file_get_contents('../includes/config.json'), true);
$contestants_arr = array_column($configJson['entries'], 'name', 'id');

//disable browser caching
$now = gmdate("D, d M Y H:i:s") . " GMT";
header("Expires: $now");
header("Last-Modified: $now");
header("Pragma: no-cache");
header("Cache-Control: no-cache, must-revalidate");

//CSV download
header('Content-Type: application/csv; charset=UTF-8');
header('Content-Disposition: attachment; filename="City-Showdown-Results.csv";');
echo pack("CCC", 0xef, 0xbb, 0xbf);

//set up CSV header
$header_row = ['Date and Time'];
foreach ($contestants_arr as $key => $val) {
    $header_row[] = $key . ' - ' . $val;
}
array_push($header_row, 'Zip Code', 'IP', 'Fingerprint');

//output CSV header
$output = fopen('php://output', 'w');
fputcsv($output, $header_row);

//get data
$sql = '
    SELECT 
        vs.id AS session_id,
        vs.created_at,
        vs.zip,
        vs.ip_address,
        vs.fingerprint_hash,
        vr.entry_id,
        vr.points
    FROM vote_sessions vs
    JOIN vote_results vr 
        ON vs.id = vr.vote_session_id
    ORDER BY vs.id, vr.entry_id;
';

$result = $conn->query($sql);

//group by session
$current_session = null;
$session = null;

while ($row = $result->fetch_assoc()) {  

    if ($current_session !== $row['session_id']) {
      
        //output previous session row, unless this is the first session
        if ($session !== null) { 
            outputSessionRow($session, $contestants_arr, $output, $config);
        }

        //start new session row
        $current_session = $row['session_id'];
        $session = [
            'created_at' => $row['created_at'],
            'zip' => $row['zip'],
            'ip' => inet_ntop($row['ip_address']),
            'fingerprint' => $row['fingerprint_hash'],
            'points' => []
        ];
    }
    
    $session['points'][$row['entry_id']] = $row['points'];
}

//output last session row
if ($session) {
    outputSessionRow($session, $contestants_arr, $output, $config);
}

$conn->close();
fclose($output);
exit();

function outputSessionRow($session, $contestants_arr, $output, $config)
{
    //convert to local timezone
    $utc = new DateTime($session['created_at'], new DateTimeZone('UTC'));
    $utc->setTimezone(new DateTimeZone($config['local_timezone']));    
    $localTime = $utc->format('Y-m-d H:i:s');
    
    $row = [$localTime];

    foreach ($contestants_arr as $id => $name) {
        $row[] = $session['points'][$id] ?? null;
    }

    $row[] = $session['zip'];
    $row[] = $session['ip'];
    $row[] = $session['fingerprint'];
    
    //output CSV row
    fputcsv($output, $row);
}
