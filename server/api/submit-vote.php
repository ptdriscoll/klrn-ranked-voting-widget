<?php
header('Content-Type: application/json');

//validate that POST is used 
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

//load config, set timezone and connect db
if (!isset($config)) $config = require(__DIR__ . '/../config.php');
date_default_timezone_set($config['timezone']);
require('../includes/database-conn.php');

//parse incoming JSON
$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['votes'], $data['token'])) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid request']);
  exit;
}
$votes = $data['votes']; //array of {id: int, voted: bool}
$zip = substr($data['zip'] ?? '', 0, 5);
$token = $data['token'];
$fingerprint = $data['fingerprint'] ?? '';

//hash sensitive values
$token_hash = hash('sha256', $token);
$fingerprint_hash = hash('sha256', $fingerprint);

//parse server config.json 
$configJson = file_get_contents(__DIR__ . '/../includes/config.json');
$configData = json_decode($configJson, true);
if (!$configData || !isset($configData['entries'], $configData['points'], $configData['votingPeriods'])) {
  http_response_code(500);
  echo json_encode(['error' => 'Server configuration error']);
  exit;
}
$configVotes = $configData['entries']; //array of {id: int, voted: bool}
$pointsLadder = $configData['points'];
$votingPeriods = $configData['votingPeriods']; // array of arrays

//remove spaces in $votingPeriods string dates
foreach ($votingPeriods as &$period) { 
  $period[0] = str_replace(' ', '', $period[0]);
  $period[1] = str_replace(' ', '', $period[1]);
}
unset($period);

//validate that a voting periord is active
$now = new DateTime();
$activePeriod = null;

foreach ($votingPeriods as $period) {
  [$startStr, $endStr] = $period;
  $start = new DateTime($startStr);
  $end   = new DateTime($endStr);
  
  if ($now >= $start && $now <= $end) {
    $activePeriod = [
      'start' => $start,
      'end' => $end
    ];
    break;
  }
}

if (!$activePeriod) {
  http_response_code(403);
  echo json_encode(['error' => 'Voting is not currently open.']);
  exit;
}

//validate that vote IDs exist in config.json
$validEntryIds = array_column($configVotes, 'id');
$validLookup = array_flip($validEntryIds);

foreach ($votes as $vote) {
  if (!isset($validLookup[$vote['id']])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid entry']);
    exit;
  }
}

//get ip, IPv4 or IPv6
$ip_address = inet_pton($_SERVER['REMOTE_ADDR']); 

//prepare to assign points by deduping $vote, keeping highest ranks
$voteLookup = [];

foreach ($votes as $index => $vote) {
  $id = $vote['id'];
  if (!isset($voteLookup[$id])) {
    $voteLookup[$id] = $index;
  } else {
    // duplicate entry → keep highest ranking (lowest index)
    $voteLookup[$id] = min($voteLookup[$id], $index);
  }
}

//assign points
$rankedVotes = [];
$unrankedPoints = end($pointsLadder);

foreach ($configVotes as $entry) {
  $entryId = $entry['id'];

  if (isset($voteLookup[$entryId])) {
    $rankIndex = $voteLookup[$entryId];
    $points = $pointsLadder[$rankIndex] ?? $unrankedPoints;
  } else {
    $points = $unrankedPoints;
  }

  $rankedVotes[] = [
    'entry_id' => $entryId,
    'points' => $points,
  ];
}

$conn->begin_transaction();
try {
  //insert vote session
  $stmt = $conn->prepare("
    INSERT INTO vote_sessions (token_hash, zip, ip_address, fingerprint_hash) 
    VALUES (?, ?, ?, ?)");
  $stmt->bind_param('ssss', $token_hash, $zip, $ip_address, $fingerprint_hash);
  
  if (!$stmt->execute()) {
    if ($conn->errno === 1062) throw new Exception('Duplicate token');
    throw new Exception('Session insert failed');
  }
  
  $vote_session_id = $stmt->insert_id;
  $stmt->close();

  //insert vote results
  $stmt = $conn->prepare("
    INSERT INTO vote_results (vote_session_id, entry_id, points) 
    VALUES (?, ?, ?)");

  foreach ($rankedVotes as $v) {
    $stmt->bind_param('iii', $vote_session_id, $v['entry_id'], $v['points']);
    if (!$stmt->execute()) throw new Exception('Vote insert failed');
  }  
  
  $stmt->close();
  $conn->commit();
} 
catch (Exception $e) {
  $conn->rollback();
  error_log('Vote submission error: ' . $e->getMessage());
  
  if ($e->getMessage() === 'Duplicate token') {
    http_response_code(409);
    echo json_encode(['error' => 'Token already used']);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Vote could not be saved']);
  }
  exit;
}

//respond success
echo json_encode(['success' => true]);
exit;
