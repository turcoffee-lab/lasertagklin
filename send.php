<?php
/**
 * Обработчик заявок с сайта. PHP 7.4+, один файл.
 * Работает ТОЛЬКО на хостинге с PHP. На статическом хостинге (Cloudflare Pages и т.п.)
 * файл не выполняется, а показывается как текст: не размещайте его там.
 * Проверка: откройте https://ДОМЕН/send.php, должен появиться JSON «Метод не поддерживается».
 */

$CONFIG = [
    'to'               => ['info@your-domain.ru'],      // ЗАМЕНИТЬ: адрес(а) получателя
    'from'             => 'noreply@your-domain.ru',     // ЗАМЕНИТЬ: ящик на домене сайта
    'site_name'        => 'Лазертаг-клуб «Клинский»',
    'timezone'         => 'Europe/Moscow',
    'telegram_token'   => '',                           // по желанию
    'telegram_chat_id' => '',                           // по желанию
    'allowed_hosts'    => [],                           // например ['your-domain.ru','www.your-domain.ru']; пусто = не проверять
    'min_interval'     => 30,                           // секунд между заявками с одного IP
    'max_per_hour'     => 5,
    'ip_header'        => '',                           // например 'HTTP_X_FORWARDED_FOR' за прокси; пусто = REMOTE_ADDR
];

ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
date_default_timezone_set($CONFIG['timezone']);

function out($code, $ok, $error = null)
{
    http_response_code($code);
    $r = ['ok' => $ok];
    if ($error !== null) { $r['error'] = $error; }
    echo json_encode($r, JSON_UNESCAPED_UNICODE);
    exit;
}

function clean($s, $max)
{
    $s = is_string($s) ? $s : '';
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s);
    if ($s === null) { $s = ''; }
    $s = trim($s);
    return mb_substr($s, 0, $max, 'UTF-8');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    out(405, false, 'Метод не поддерживается');
}

// не настроено
foreach ($CONFIG['to'] as $t) {
    if (stripos($t, 'your-domain') !== false) {
        error_log('send.php: не настроен адрес получателя (to)');
        out(500, false, 'Форма не настроена');
    }
}

// проверка источника
if ($CONFIG['allowed_hosts']) {
    $src = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    $host = $src !== '' ? parse_url($src, PHP_URL_HOST) : '';
    if (!$host || !in_array(strtolower($host), array_map('strtolower', $CONFIG['allowed_hosts']), true)) {
        out(403, false, 'Домен не разрешён');
    }
}

// тело запроса
$raw = file_get_contents('php://input', false, null, 0, 20481);
if ($raw !== false && strlen($raw) > 20480) {
    out(413, false, 'Слишком большой запрос');
}
$data = json_decode((string)$raw, true);
if (!is_array($data)) { $data = $_POST; }
if (!is_array($data)) { $data = []; }

// ловушка для ботов
if (!empty($data['website'])) {
    out(200, true);
}

$name    = clean($data['name'] ?? '', 100);
$contact = clean($data['contact'] ?? '', 150);
$type    = clean($data['type'] ?? '', 80);
$message = clean($data['message'] ?? '', 3000);
$name    = preg_replace('/\s+/u', ' ', $name);
$contact = preg_replace('/\s+/u', ' ', $contact);
$type    = preg_replace('/\s+/u', ' ', $type);

if ($name === '' || $contact === '') {
    out(422, false, 'Укажите имя и контакт');
}

$isEmail = (bool)filter_var($contact, FILTER_VALIDATE_EMAIL);
$digits  = preg_replace('/\D+/', '', $contact);
$isPhone = !$isEmail && preg_match('/^[+\d\s().\-]+$/', $contact) && strlen($digits) >= 6 && strlen($digits) <= 15;
$isTg    = (bool)preg_match('/^@[A-Za-z0-9_]{5,32}$/', $contact);
if (!$isEmail && !$isPhone && !$isTg) {
    out(422, false, 'Укажите телефон, email или Telegram вида @name');
}

// лимит по IP
$ipRaw = $CONFIG['ip_header'] !== '' ? ($_SERVER[$CONFIG['ip_header']] ?? '') : ($_SERVER['REMOTE_ADDR'] ?? '');
$ip = trim(explode(',', (string)$ipRaw)[0]);
if ($ip === '') { $ip = 'unknown'; }
$file = sys_get_temp_dir() . '/lt_rate_' . md5($ip) . '.json';
$fp = @fopen($file, 'c+');
if ($fp && flock($fp, LOCK_EX)) {
    $now = time();
    $st = json_decode((string)stream_get_contents($fp), true);
    $times = (is_array($st) && isset($st['t']) && is_array($st['t'])) ? $st['t'] : [];
    $times = array_values(array_filter($times, function ($x) use ($now) { return $now - (int)$x < 3600; }));
    $last = $times ? max($times) : 0;
    if (($last && $now - $last < $CONFIG['min_interval']) || count($times) >= $CONFIG['max_per_hour']) {
        flock($fp, LOCK_UN); fclose($fp);
        out(429, false, 'Слишком часто. Попробуйте позже или позвоните нам.');
    }
    $times[] = $now;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode(['t' => $times]));
    fflush($fp); flock($fp, LOCK_UN);
}
if ($fp) { fclose($fp); }

// текст заявки
$when = date('d.m.Y H:i');
$body = "Новая заявка с сайта {$CONFIG['site_name']}\n"
      . "Время: {$when}\n\n"
      . "Имя: {$name}\n"
      . "Контакт: {$contact}\n"
      . "Тип: {$type}\n\n"
      . "Сообщение:\n{$message}\n";

$sent = false;

// почта
$subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта: ' . ($type !== '' ? $type : 'без типа')) . '?=';
$fromName = '=?UTF-8?B?' . base64_encode($CONFIG['site_name']) . '?=';
$headers  = "MIME-Version: 1.0\r\n"
          . "Content-Type: text/plain; charset=UTF-8\r\n"
          . "Content-Transfer-Encoding: base64\r\n"
          . "From: {$fromName} <{$CONFIG['from']}>\r\n";
if ($isEmail) { $headers .= "Reply-To: {$contact}\r\n"; }
$encoded = chunk_split(base64_encode($body));
foreach ($CONFIG['to'] as $to) {
    if (@mail($to, $subject, $encoded, $headers, '-f' . $CONFIG['from'])) { $sent = true; }
}

// Telegram
if ($CONFIG['telegram_token'] !== '' && $CONFIG['telegram_chat_id'] !== '') {
    $text = mb_substr($body, 0, 4000, 'UTF-8');
    $url = 'https://api.telegram.org/bot' . $CONFIG['telegram_token'] . '/sendMessage';
    $post = http_build_query(['chat_id' => $CONFIG['telegram_chat_id'], 'text' => $text]);
    $res = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $post, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
        $res = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($res !== false && $http === 200) { $sent = true; }
    } else {
        $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: application/x-www-form-urlencoded\r\n", 'content' => $post, 'timeout' => 8]]);
        $res = @file_get_contents($url, false, $ctx);
        if ($res !== false) { $sent = true; }
    }
}

if (!$sent) {
    error_log('send.php: не удалось отправить заявку ни одним каналом');
    out(500, false, 'Не удалось отправить');
}
out(200, true);
