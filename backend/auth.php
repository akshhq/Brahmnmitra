<?php
// BrahmnMitra — Authentication API Endpoint (Hostinger MySQL)

define("BM_OK", true);

require_once __DIR__ . "/includes/config.php";
require_once __DIR__ . "/includes/helpers.php";
require_once __DIR__ . "/includes/db.php";
require_once __DIR__ . "/includes/auth_helper.php";

bm_handle_cors();

header("Content-Type: application/json; charset=utf-8");

$action = isset($_GET['action']) ? trim($_GET['action']) : '';
if (empty($action) && isset($_POST['action'])) {
    $action = trim($_POST['action']);
}

$rawInput = file_get_contents("php://input");
$req = json_decode($rawInput, true) ?: $_POST;
if (empty($action) && isset($req['action'])) {
    $action = trim($req['action']);
}

// ---------------------------------------------------------
// 1. User Login (Admin, Staff, Customer)
// ---------------------------------------------------------
if ($action === "login" && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = isset($req['email']) ? strtolower(trim($req['email'])) : '';
    $password = isset($req['password']) ? (string)$req['password'] : '';

    if (empty($email) || empty($password)) {
        bm_respond(false, "Email and password are required.", 422);
    }

    $db = bm_get_db();
    if (!$db) {
        // Fallback emergency administrator authentication if database is unreachable
        if ($email === 'admin@brahmnmitra.com' && $password === 'Admin@Brahmnmitra2026!') {
            $secret = defined('AUTH_SECRET') ? AUTH_SECRET : 'bm_sec_fallback_2026';
            $emergencyToken = 'bm_emg_' . hash_hmac('sha256', 'admin@brahmnmitra.com_' . date('Ymd'), $secret);
            echo json_encode([
                'ok' => true,
                'token' => $emergencyToken,
                'expires_at' => date('Y-m-d H:i:s', time() + 86400),
                'user' => [
                    'id' => 1,
                    'name' => 'BrahmnMitra Administrator',
                    'email' => 'admin@brahmnmitra.com',
                    'phone' => '+91 92117 61885',
                    'role' => 'admin'
                ],
                'standby_mode' => true
            ], JSON_PRETTY_PRINT);
            exit;
        }

        bm_respond(false, "Database connection error. Hostinger MySQL is unreachable from this server.", 503);
    }

    try {
        $stmt = $db->prepare("SELECT id, name, email, phone, password_hash, role, status FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            bm_respond(false, "Invalid email or password.", 401);
        }

        if ($user['status'] !== 'active') {
            bm_respond(false, "Your account is currently " . $user['status'] . ". Please contact support.", 403);
        }

        $session = bm_create_session((int)$user['id']);

        // Log audit event
        try {
            $logStmt = $db->prepare("INSERT INTO audit_logs (log_id, actor, category, action, details_json, ip_address) VALUES (:lid, :actor, 'AUTH', 'LOGIN_SUCCESS', :details, :ip)");
            $logStmt->execute([
                ':lid' => 'log-' . microtime(true),
                ':actor' => $user['email'],
                ':details' => json_encode(['role' => $user['role'], 'user_id' => $user['id']]),
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (Exception $e) {}

        echo json_encode([
            'ok' => true,
            'token' => $session['token'],
            'expires_at' => $session['expires_at'],
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'role' => $user['role']
            ]
        ], JSON_PRETTY_PRINT);
        exit;
    } catch (PDOException $e) {
        error_log("[BM_AUTH_ERROR] " . $e->getMessage());
        bm_respond(false, "An error occurred during login.", 500);
    }
}

// ---------------------------------------------------------
// 2. Customer Registration
// ---------------------------------------------------------
if ($action === "register" && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = isset($req['name']) ? trim($req['name']) : '';
    $email = isset($req['email']) ? strtolower(trim($req['email'])) : '';
    $phone = isset($req['phone']) ? trim($req['phone']) : '';
    $password = isset($req['password']) ? (string)$req['password'] : '';

    if (empty($name) || strlen($name) < 2) {
        bm_respond(false, "Please provide your full name.", 422);
    }
    if (!bm_valid_email($email)) {
        bm_respond(false, "Please provide a valid email address.", 422);
    }
    if (strlen($password) < 6) {
        bm_respond(false, "Password must be at least 6 characters long.", 422);
    }

    $db = bm_get_db();
    if (!$db) {
        bm_respond(false, "Database unavailable.", 500);
    }

    try {
        // Check if email already registered
        $stmt = $db->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        if ($stmt->fetch()) {
            bm_respond(false, "An account with this email address already exists.", 409);
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $role = 'customer'; // Default registration role

        $insertStmt = $db->prepare("
            INSERT INTO users (name, email, phone, password_hash, role, status)
            VALUES (:name, :email, :phone, :hash, :role, 'active')
        ");
        $insertStmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':phone' => $phone,
            ':hash' => $passwordHash,
            ':role' => $role
        ]);

        $userId = (int)$db->lastInsertId();
        $session = bm_create_session($userId);

        echo json_encode([
            'ok' => true,
            'message' => 'Account created successfully.',
            'token' => $session['token'],
            'expires_at' => $session['expires_at'],
            'user' => [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'role' => $role
            ]
        ], JSON_PRETTY_PRINT);
        exit;
    } catch (PDOException $e) {
        error_log("[BM_AUTH_REGISTER_ERROR] " . $e->getMessage());
        bm_respond(false, "Unable to complete registration.", 500);
    }
}

// ---------------------------------------------------------
// 3. Get Current User Session (Me)
// ---------------------------------------------------------
if ($action === "me") {
    $user = bm_authenticate();
    if (!$user) {
        bm_respond(false, "Unauthenticated or session expired.", 401);
    }

    echo json_encode([
        'ok' => true,
        'user' => [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'role' => $user['role'],
            'status' => $user['status'],
            'created_at' => $user['created_at']
        ]
    ], JSON_PRETTY_PRINT);
    exit;
}

// ---------------------------------------------------------
// 4. Logout / Session Invalidation
// ---------------------------------------------------------
if ($action === "logout" && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = bm_get_bearer_token();
    if ($token) {
        bm_revoke_session($token);
    }
    echo json_encode(['ok' => true, 'message' => 'Logged out successfully.'], JSON_PRETTY_PRINT);
    exit;
}

// ---------------------------------------------------------
// 5. Change Password
// ---------------------------------------------------------
if ($action === "change_password" && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = bm_require_auth();
    $currentPassword = isset($req['current_password']) ? (string)$req['current_password'] : '';
    $newPassword = isset($req['new_password']) ? (string)$req['new_password'] : '';

    if (strlen($newPassword) < 6) {
        bm_respond(false, "New password must be at least 6 characters.", 422);
    }

    $db = bm_get_db();
    $stmt = $db->prepare("SELECT password_hash FROM users WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $user['id']]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
        bm_respond(false, "Incorrect current password.", 401);
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    $updateStmt = $db->prepare("UPDATE users SET password_hash = :hash WHERE id = :id");
    $updateStmt->execute([':hash' => $newHash, ':id' => $user['id']]);

    echo json_encode(['ok' => true, 'message' => 'Password updated successfully.'], JSON_PRETTY_PRINT);
    exit;
}

// ---------------------------------------------------------
// 6. List Users (Admin Only)
// ---------------------------------------------------------
if ($action === "list_users" && $_SERVER['REQUEST_METHOD'] === 'GET') {
    bm_require_admin();
    $db = bm_get_db();
    $stmt = $db->query("SELECT id, name, email, phone, role, status, created_at, updated_at FROM users ORDER BY id DESC LIMIT 200");
    $users = $stmt->fetchAll();

    echo json_encode(['ok' => true, 'users' => $users], JSON_PRETTY_PRINT);
    exit;
}

// Default response
echo json_encode([
    'ok' => false,
    'error' => 'Invalid action or method.',
    'available_actions' => [
        'POST ?action=login' => 'Authenticate user and receive token',
        'POST ?action=register' => 'Create new customer account',
        'GET ?action=me' => 'Retrieve authenticated profile',
        'POST ?action=logout' => 'Invalidate current session token',
        'POST ?action=change_password' => 'Update user password',
        'GET ?action=list_users' => 'Admin view user accounts'
    ]
], JSON_PRETTY_PRINT);
