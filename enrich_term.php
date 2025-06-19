<?php
// Set the content type to JSON for the response.
header('Content-Type: application/json');

// --- Configuration & API Key Loading ---
$knowledgeBasePath = './knowledge_base.json';
$apiKeyPath = '/var/www/private/data/gptkey.txt';
$apiKey = '';
if (file_exists($apiKeyPath) && is_readable($apiKeyPath)) {
    $apiKey = trim(file_get_contents($apiKeyPath));
} else {
    error_log("API key file not found at: " . $apiKeyPath);
}

// --- Helper Function: Enriches existing term data ---
function getAiEnrichedData($term, $existingData, $apiKey) {
    if (empty($apiKey)) return ['error' => 'API key is not configured on the server.'];

    $apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    // Define all possible keys for a complete ontology
    $all_keys = [
        'three_word_definition', 'essence', 'one_word_example', 'one_word_poison-antidote', 'one_word_verb',
        'parents', 'hypernyms', 'hyponyms', 'siblings', 'children', 'cousins', 'key_concept', 'related_concept',
        'antagonistic_concepts', 'foundational_problems', 'pivotal_figures', 'domain',
        'components', 'applications', 'tools_and_methods', 'manifestations'
    ];

    $array_keys_to_expand = [
        'parents', 'hypernyms', 'hyponyms', 'siblings', 'children', 'cousins', 'related_concept',
        'antagonistic_concepts', 'foundational_problems', 'pivotal_figures', 'domain',
        'components', 'applications', 'tools_and_methods', 'manifestations'
    ];
    
    $keys_to_create = [];
    $keys_to_expand = [];

    // Check for keys that are missing entirely
    foreach ($all_keys as $key) {
        if (!isset($existingData[$key]) || empty($existingData[$key])) {
            $keys_to_create[] = $key;
        }
    }
    
    // Determine which existing arrays can be expanded
    foreach ($array_keys_to_expand as $key) {
        // If the key was already determined to be missing, we don't need to expand it yet.
        if (!in_array($key, $keys_to_create)) {
            $keys_to_expand[] = $key;
        }
    }

    if (empty($keys_to_create) && empty($keys_to_expand)) {
        return ['message' => 'Term is already fully populated, and no further relationships were generated.'];
    }

    $existing_data_json = json_encode($existingData);
    $prompt = "You are an expert ontologist. For the term '{$term}', its existing data is: {$existing_data_json}. ";
    $instructions = [];
    if (!empty($keys_to_create)) {
        $instructions[] = "It is missing values for the following keys: [" . implode(', ', $keys_to_create) . "]. Please generate them.";
    }
    if (!empty($keys_to_expand)) {
        $instructions[] = "Also, suggest up to 3 *additional* distinct values for these existing array keys: [" . implode(', ', $keys_to_expand) . "]. Do not suggest values that are already present in the existing data.";
    }
    
    $prompt .= implode(' ', $instructions);
    $prompt .= " Your response must be a valid JSON object containing *only* the new keys and values you have generated. If you have no new suggestions for a key, omit it from the response.";

    $payload = json_encode(['model' => 'gpt-4o', 'messages' => [['role' => 'user', 'content' => $prompt]], 'response_format' => ['type' => 'json_object']]);
    $headers = ['Content-Type: application/json', 'Authorization: Bearer ' . $apiKey];

    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload, CURLOPT_HTTPHEADER => $headers]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if ($curl_error) return ['error' => 'cURL Error: ' . $curl_error];
    if ($http_code !== 200) return ['error' => "API responded with HTTP {$http_code}"];

    $jsonText = json_decode($response, true)['choices'][0]['message']['content'] ?? null;
    if (!$jsonText) return ['error' => 'Received an unexpected response format from AI.'];

    $structuredData = json_decode($jsonText, true);
    if (json_last_error() !== JSON_ERROR_NONE) return ['error' => 'AI service returned invalid JSON.'];
    
    return $structuredData;
}

// --- Main Execution ---
try {
    $input = json_decode(file_get_contents('php://input'), true);
    $termToEnrich = $input['term'] ?? null;

    if (!$termToEnrich) {
        throw new Exception('No term provided to enrich.', 400);
    }

    $knowledgeBase = json_decode(file_get_contents($knowledgeBasePath), true);
    if (!isset($knowledgeBase[$termToEnrich])) {
        throw new Exception("Term '{$termToEnrich}' not found in knowledge base.", 404);
    }

    $existingTermData = $knowledgeBase[$termToEnrich];

    // 1. Get the new, enriched data from the AI
    $enrichedData = getAiEnrichedData($termToEnrich, $existingTermData, $apiKey);
    if (isset($enrichedData['error'])) {
        throw new Exception("AI data enrichment failed: " . $enrichedData['error'], 500);
    }
    
    if (isset($enrichedData['message']) || empty($enrichedData)) {
        $message = $enrichedData['message'] ?? 'AI had no new data to add.';
        echo json_encode(['success' => true, 'message' => $message, 'updatedKnowledgeBase' => $knowledgeBase]);
        exit;
    }

    // 2. Merge the new data with the existing data
    $updatedTermData = $existingTermData;
    foreach ($enrichedData as $key => $value) {
        // If the key is for an array, merge and keep unique values
        if (is_array($value)) {
            if (!isset($updatedTermData[$key]) || !is_array($updatedTermData[$key])) {
                $updatedTermData[$key] = [];
            }
            $updatedTermData[$key] = array_values(array_unique(array_merge($updatedTermData[$key], $value)));
        } else { // For strings, simply overwrite if the new value is not empty
            if (!empty($value)) {
                $updatedTermData[$key] = $value;
            }
        }
    }
    $knowledgeBase[$termToEnrich] = $updatedTermData;

    // 3. Save the updated knowledge base.
    $newIndexJsonData = json_encode($knowledgeBase, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if (file_put_contents($knowledgeBasePath, $newIndexJsonData, LOCK_EX) === false) {
        throw new Exception('Failed to write to knowledge base file.', 500);
    }

    // 4. Respond with success.
    echo json_encode([
        'success' => true,
        'message' => "Term '{$termToEnrich}' was successfully enriched.",
        'updatedKnowledgeBase' => $knowledgeBase
    ]);

} catch (Exception $e) {
    http_response_code($e->getCode() > 0 ? $e->getCode() : 500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}
?>

