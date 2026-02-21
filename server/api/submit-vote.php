<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

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

//load config, db connection, and setting of timezone to 'America/Chicago'
$config = require(__DIR__ . '/../config.php');
require('../includes/database-conn.php');

//check if token already exists (enforce one vote per token)
$stmt = $conn->prepare("SELECT id FROM vote_sessions WHERE token_hash = ?");
$stmt->bind_param('s', $token_hash);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'Token already used']);
    exit;
}
$stmt->close();

//parse config.json 
$configJson = file_get_contents(__DIR__ . '/../includes/config.json');
$configData = json_decode($configJson, true);
$configVotes = $configData['entries']; //array of {id: int, voted: bool}
$pointsLadder = $configData['points'];
$votingPeriods = $configData['votingPeriods']; // array of arrays

//check that a valid voting perior is active
$now = new DateTime();
$activePeriod = null;

foreach ($votingPeriods as $period) {
    $startStr = str_replace(' ', '', $period[0]);
    $endStr   = str_replace(' ', '', $period[1]);
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
foreach ($votes as $vote) {
    if (!in_array($vote['id'], $validEntryIds, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid entry']);
        exit;
    }
}

//get ip, IPv4 or IPv6
$ip_address = inet_pton($_SERVER['REMOTE_ADDR']); 

//insert vote session
$stmt = $conn->prepare("
  INSERT INTO vote_sessions (token_hash, zip, ip_address, fingerprint_hash) 
  VALUES (?, ?, ?, ?)");
$stmt->bind_param('ssss', $token_hash, $zip, $ip_address, $fingerprint_hash);

//execute, and handle duplicate token race condition
if (!$stmt->execute()) {
    if ($conn->errno === 1062) {
        http_response_code(409);
        echo json_encode(['error' => 'Token already used']);
        exit;
    }
}

$vote_session_id = $stmt->insert_id;
$stmt->close();

//assign points
$rankedVotes = [];
$unrankedPoints = $pointsLadder[count($pointsLadder) - 1]; //points for false/unranked entries

foreach ($votes as $index => $vote) {
    $points = $vote['voted'] ? ($pointsLadder[$index] ?? $unrankedPoints) : $unrankedPoints;
    $rankedVotes[] = [
        'entry_id' => $vote['id'],
        'points' => $points,
    ];
}

//insert vote results
$stmt = $conn->prepare("
  INSERT INTO vote_results (vote_session_id, entry_id, points) 
  VALUES (?, ?, ?)");

foreach ($rankedVotes as $v) {
    $stmt->bind_param('iii', $vote_session_id, $v['entry_id'], $v['points']);
    $stmt->execute();
}
$stmt->close();
$conn->close();

//respond success
echo json_encode(['success' => true]);
exit;
