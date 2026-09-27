<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

function getFilePath($date) {
    global $dataDir;
    // Sanitize date string YYYY-MM-DD
    $cleanDate = preg_replace('/[^0-9\-]/', '', $date);
    if (empty($cleanDate)) {
        $cleanDate = date('Y-m-d');
    }
    return $dataDir . '/adoracao_' . $cleanDate . '.json';
}

function getDefaultSlots() {
    return [
        ["time" => "05:00", "adorers" => [["name" => "Rosário", "phone" => ""]], "notes" => ""],
        ["time" => "06:00", "adorers" => [["name" => "Rosário", "phone" => ""]], "notes" => ""],
        ["time" => "07:00", "adorers" => [], "notes" => ""],
        ["time" => "08:00", "adorers" => [], "notes" => ""],
        ["time" => "09:00", "adorers" => [], "notes" => ""],
        ["time" => "10:00", "adorers" => [], "notes" => ""],
        ["time" => "11:00", "adorers" => [], "notes" => ""],
        ["time" => "12:00", "adorers" => [], "notes" => ""],
        ["time" => "13:00", "adorers" => [], "notes" => ""],
        ["time" => "14:00", "adorers" => [], "notes" => ""],
        ["time" => "15:00", "adorers" => [], "notes" => ""],
        ["time" => "16:00", "adorers" => [], "notes" => ""],
        ["time" => "17:00", "adorers" => [], "notes" => ""],
        ["time" => "18:00", "adorers" => [], "notes" => ""],
        ["time" => "19:00", "adorers" => [["name" => "Encerramento", "phone" => ""]], "notes" => "Missa / Encerramento"]
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    $filePath = getFilePath($date);

    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        $data = json_decode($content, true);
    } else {
        $data = [
            "date" => $date,
            "title" => "Quinta-feira de Adoração",
            "community" => "Comunidade do Formoso",
            "slots" => getDefaultSlots(),
            "last_updated" => date('c')
        ];
        file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    echo json_encode(["status" => "success", "data" => $data]);
    exit;
}

if ($method === 'POST') {
    $inputRaw = file_get_contents('php://input');
    $input = json_decode($inputRaw, true);

    if (!$input) {
        $input = $_POST;
    }

    $action = isset($input['action']) ? $input['action'] : '';
    $date = isset($input['date']) ? $input['date'] : date('Y-m-d');
    $filePath = getFilePath($date);

    if (file_exists($filePath)) {
        $data = json_decode(file_get_contents($filePath), true);
    } else {
        $data = [
            "date" => $date,
            "title" => "Quinta-feira de Adoração",
            "community" => "Comunidade do Formoso",
            "slots" => getDefaultSlots(),
            "last_updated" => date('c')
        ];
    }

    if ($action === 'book') {
        $time = isset($input['time']) ? $input['time'] : '';
        $name = trim(isset($input['name']) ? $input['name'] : '');
        $phone = trim(isset($input['phone']) ? $input['phone'] : '');
        $intention = trim(isset($input['intention']) ? $input['intention'] : '');

        if (empty($name) || empty($time)) {
            echo json_encode(["status" => "error", "message" => "Nome e horário são obrigatórios."]);
            exit;
        }

        $updated = false;
        foreach ($data['slots'] as &$slot) {
            if ($slot['time'] === $time) {
                // If existing default was empty or Encerramento replacement
                if (!isset($slot['adorers'])) {
                    $slot['adorers'] = [];
                }
                $slot['adorers'][] = [
                    "name" => $name,
                    "phone" => $phone,
                    "intention" => $intention,
                    "created_at" => date('c')
                ];
                $updated = true;
                break;
            }
        }

        if ($updated) {
            $data['last_updated'] = date('c');
            file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo json_encode(["status" => "success", "message" => "Horário agendado com sucesso!", "data" => $data]);
        } else {
            echo json_encode(["status" => "error", "message" => "Horário não encontrado."]);
        }
        exit;
    }

    if ($action === 'remove') {
        $time = isset($input['time']) ? $input['time'] : '';
        $index = isset($input['index']) ? intval($input['index']) : 0;

        foreach ($data['slots'] as &$slot) {
            if ($slot['time'] === $time) {
                if (isset($slot['adorers'][$index])) {
                    array_splice($slot['adorers'], $index, 1);
                    break;
                }
            }
        }

        $data['last_updated'] = date('c');
        file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["status" => "success", "message" => "Adorador removido com sucesso!", "data" => $data]);
        exit;
    }

    if ($action === 'reset_day') {
        $data['slots'] = getDefaultSlots();
        $data['last_updated'] = date('c');
        file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["status" => "success", "message" => "Horários reiniciados para o padrão!", "data" => $data]);
        exit;
    }

    if ($action === 'save_all') {
        if (isset($input['slots']) && is_array($input['slots'])) {
            $data['slots'] = $input['slots'];
            $data['last_updated'] = date('c');
            file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo json_encode(["status" => "success", "message" => "Escala salva com sucesso!", "data" => $data]);
        } else {
            echo json_encode(["status" => "error", "message" => "Dados inválidos."]);
        }
        exit;
    }

    echo json_encode(["status" => "error", "message" => "Ação desconhecida."]);
    exit;
}
