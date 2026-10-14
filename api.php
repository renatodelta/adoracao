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
    $configPath = $dataDir . '/site_config.json';
    $siteConfig = file_exists($configPath) ? json_decode(file_get_contents($configPath), true) : [];
    $custodiaFile = __DIR__ . '/assets/custodia.jpg';
    $custodiaTime = file_exists($custodiaFile) ? filemtime($custodiaFile) : time();
    $data['custodia_version'] = $custodiaTime;
    $data['custodia_fit'] = isset($siteConfig['custodia_fit']) ? $siteConfig['custodia_fit'] : 'contain';

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
        if (!isset($data['quote_text'])) {
            $data['quote_text'] = "Se desejas progredir na vida espiritual, aproxima-te frequentemente da Eucaristia.";
            $data['quote_author'] = "São Boaventura";
        }
    } else {
        $data = [
            "date" => $date,
            "title" => "Quinta-feira de Adoração",
            "community" => "Comunidade do Formoso",
            "quote_text" => "Se desejas progredir na vida espiritual, aproxima-te frequentemente da Eucaristia.",
            "quote_author" => "São Boaventura",
            "slots" => getDefaultSlots(),
            "last_updated" => date('c')
        ];
    }

    if ($action === 'save_quote') {
        $data['quote_text'] = trim(isset($input['quote_text']) ? $input['quote_text'] : '');
        $data['quote_author'] = trim(isset($input['quote_author']) ? $input['quote_author'] : '');
        $data['last_updated'] = date('c');
        file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["status" => "success", "message" => "Frase atualizada com sucesso!", "data" => $data]);
        exit;
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

    if ($action === 'add_general_intention') {
        $name = trim(isset($input['name']) ? $input['name'] : 'Anônimo');
        $intention = trim(isset($input['intention']) ? $input['intention'] : '');

        if (empty($intention)) {
            echo json_encode(["status" => "error", "message" => "O pedido de oração não pode estar vazio."]);
            exit;
        }

        if (!isset($data['general_intentions']) || !is_array($data['general_intentions'])) {
            $data['general_intentions'] = [];
        }

        $data['general_intentions'][] = [
            "name" => empty($name) ? "Anônimo" : $name,
            "intention" => $intention,
            "created_at" => date('c')
        ];

        $data['last_updated'] = date('c');
        file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["status" => "success", "message" => "Pedido de oração adicionado com sucesso!", "data" => $data]);
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

    if ($action === 'upload_custodia') {
        $saved = false;
        $targetPath = __DIR__ . '/assets/custodia.jpg';
        $backupPath = __DIR__ . '/assets/custodia_backup.jpg';

        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $tmpName = $_FILES['photo']['tmp_name'];
            $imgInfo = @getimagesize($tmpName);
            if ($imgInfo !== false) {
                if (!file_exists($backupPath) && file_exists($targetPath)) {
                    copy($targetPath, $backupPath);
                }
                if (move_uploaded_file($tmpName, $targetPath)) {
                    $saved = true;
                }
            }
        } elseif (isset($input['image_data']) && !empty($input['image_data'])) {
            $raw = $input['image_data'];
            if (preg_match('/^data:image\/(\w+);base64,/', $raw, $matches)) {
                $raw = substr($raw, strpos($raw, ',') + 1);
                $decoded = base64_decode($raw);
                if ($decoded !== false) {
                    if (!file_exists($backupPath) && file_exists($targetPath)) {
                        copy($targetPath, $backupPath);
                    }
                    if (file_put_contents($targetPath, $decoded)) {
                        $saved = true;
                    }
                }
            }
        }

        if ($saved) {
            $fitMode = isset($input['fit_mode']) ? $input['fit_mode'] : 'contain';
            $configPath = $dataDir . '/site_config.json';
            $siteConfig = file_exists($configPath) ? json_decode(file_get_contents($configPath), true) : [];
            $siteConfig['custodia_fit'] = $fitMode;
            $siteConfig['custodia_updated_at'] = time();
            file_put_contents($configPath, json_encode($siteConfig, JSON_PRETTY_PRINT));

            echo json_encode([
                "status" => "success",
                "message" => "Foto da Custódia atualizada com sucesso!",
                "custodia_version" => time(),
                "custodia_fit" => $fitMode
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Não foi possível salvar a imagem da Custódia."]);
        }
        exit;
    }

    if ($action === 'reset_custodia') {
        $targetPath = __DIR__ . '/assets/custodia.jpg';
        $backupPath = __DIR__ . '/assets/custodia_backup.jpg';
        if (file_exists($backupPath)) {
            copy($backupPath, $targetPath);
        }
        $configPath = $dataDir . '/site_config.json';
        if (file_exists($configPath)) {
            $siteConfig = json_decode(file_get_contents($configPath), true);
            unset($siteConfig['custodia_fit']);
            $siteConfig['custodia_updated_at'] = time();
            file_put_contents($configPath, json_encode($siteConfig, JSON_PRETTY_PRINT));
        }
        echo json_encode([
            "status" => "success",
            "message" => "Foto original da Custódia restaurada com sucesso!",
            "custodia_version" => time(),
            "custodia_fit" => "contain"
        ]);
        exit;
    }

    echo json_encode(["status" => "error", "message" => "Ação desconhecida."]);
    exit;
}
