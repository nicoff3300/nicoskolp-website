<?php
/**
 * Skolp Lab - API di Sincronizzazione Palette Colori
 * Gestisce la lettura pubblica e il salvataggio autorizzato su hosting Aruba Linux
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Skolp-Admin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$storageFile = __DIR__ . '/custom_palettes.json';

$defaultPalettes = [
    'Skolp_01' => [
        '#1d1d1d',
        '#ec5555',
        '#e189d9',
        '#6c8cd5',
        '#39c6a3',
        '#d4f070',
        '#fff2e0'
    ]
];

// Metodo GET: Lettura palette
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($storageFile)) {
        $content = file_get_contents($storageFile);
        $decoded = json_decode($content, true);
        if (is_array($decoded) && !empty($decoded)) {
            echo json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }
    echo json_encode($defaultPalettes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Metodo POST: Salvataggio palette (riservato)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Controllo autorizzazione
    $hasCookie = isset($_COOKIE['skolp_admin']) && $_COOKIE['skolp_admin'] === '1';
    $hasHeader = isset($_SERVER['HTTP_X_SKOLP_ADMIN']) && $_SERVER['HTTP_X_SKOLP_ADMIN'] === '1';
    $hasToken = isset($_GET['token']) && $_GET['token'] === 'skolp';

    if (!$hasCookie && !$hasHeader && !$hasToken) {
        http_response_code(403);
        echo json_encode(['error' => 'Non autorizzato. Accesso consentito solo in Skolp Master Mode.']);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);

    if (!is_array($payload) || empty($payload)) {
        http_response_code(400);
        echo json_encode(['error' => 'Dati palette non validi o vuoti.']);
        exit;
    }

    // Sanitizzazione e validazione dei dati
    $cleanPalettes = [];
    
    // Assicura che Skolp_01 sia sempre definita
    $cleanPalettes['Skolp_01'] = $defaultPalettes['Skolp_01'];

    foreach ($payload as $name => $colors) {
        $cleanName = trim(preg_replace('/[^a-zA-Z0-9_\- ]/', '', $name));
        if (empty($cleanName)) continue;

        if (is_array($colors)) {
            $validColors = [];
            foreach ($colors as $c) {
                $c = trim((string)$c);
                if (preg_match('/^#[0-9a-fA-F]{3,8}$/', $c)) {
                    $validColors[] = strtolower($c);
                }
            }
            if (count($validColors) >= 2) {
                $cleanPalettes[$cleanName] = $validColors;
            }
        }
    }

    $saved = @file_put_contents($storageFile, json_encode($cleanPalettes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

    if ($saved === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Impossibile scrivere il file delle palette sul server.']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Palette salvate con successo sul server!',
        'count' => count($cleanPalettes),
        'palettes' => $cleanPalettes
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Metodo non consentito.']);
