<?php
header('Content-Type: application/json');

// Define the path to the data file
$dataFile = 'player_data.json';

// Get the input from the POST request
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON input.'
    ]);
    exit;
}

// Validate input
if (!isset($input['playerName']) || empty(trim($input['playerName']))) {
    echo json_encode([
        'success' => false,
        'message' => 'Player name is required.'
    ]);
    exit;
}
if (!isset($input['gameName']) || empty(trim($input['gameName']))) {
    echo json_encode([
        'success' => false,
        'message' => 'Game name is required.'
    ]);
    exit;
}

$playerName = trim($input['playerName']);
$gameName = trim($input['gameName']);
$timestamp = isset($input['timestamp']) ? $input['timestamp'] : date('c'); // ISO 8601 date

// Prepare the new player entry
$newEntry = [
    'playerName' => $playerName,
    'game' => $gameName,
    'time' => $timestamp,
    // Use 'gameSpecificData' to store stats or other game-related info.
    // Ensure it's an object (even if empty) for consistency.
    'gameSpecificData' => isset($input['gameSpecificData']) && is_array($input['gameSpecificData']) ? (object)$input['gameSpecificData'] : new stdClass()
];

// Read existing data
$players = [];
if (file_exists($dataFile)) {
    $jsonData = file_get_contents($dataFile);
    if ($jsonData === false) {
        echo json_encode([
            'success' => false,
            'message' => 'Error reading player data file.'
        ]);
        exit;
    }
    // Only try to decode if jsonData is not empty
    if (!empty($jsonData)) {
        $players = json_decode($jsonData, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            echo json_encode([
                'success' => false,
                'message' => 'Error decoding player data JSON: ' . json_last_error_msg()
            ]);
            exit;
        }
        // Ensure $players is an array if the file had content but was malformed (e.g. just "null" or a string)
        if (!is_array($players)) {
            $players = [];
        }
    }
}


// Add the new entry
$players[] = $newEntry;

// Write data back to the file
// JSON_UNESCAPED_SLASHES is good for URLs if they appear in data.
// JSON_INVALID_UTF8_SUBSTITUTE can help if there are encoding issues, though ideally input is clean UTF-8.
if (file_put_contents($dataFile, json_encode($players, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE))) {
    echo json_encode([
        'success' => true,
        'message' => 'Player data for game ' . $gameName . ' saved successfully for ' . $playerName . '.',
        'dataFile' => $dataFile,
        'savedEntry' => $newEntry
    ]);
} else {
    error_log("Failed to write to $dataFile. Check permissions and path."); // Log server-side
    echo json_encode([
        'success' => false,
        'message' => 'Error writing player data to file. Please check server logs and file permissions for ' . basename($dataFile) . '.'
    ]);
}
?>

