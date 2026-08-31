<?php
// BrahmnMitra — Authentication & Authorization Helper Functions

if (!defined("BM_OK")) {
    http_response_code(403);
    exit("Forbidden");
}

require_once __DIR__ . "/config.php";
require_once __DIR__ . "/db.php";

/**
 * Generate a cryptographically secure auth token.
 *
 * @return string
 */
function bm_generate_token()
{
    return bin2hex(random_bytes(32));
}

/**
 * Extract Bearer token from the incoming request Authorization header or $_GET/$_POST.
 *
 * @return string|null
 */
function bm_get_bearer_token()
{
    $headers = [];
    if (function_exists('getallheaders')) {
        $headers = getallheaders() ?: [];
    }

    $authHeader = '';
    foreach ($headers as $k => $v) {
        if (strtolower($k) === 'authorization') {
            $authHeader = trim($v);
            break;
        }
    }

    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = trim($_SERVER['HTTP_AUTHORIZATION']);
    }

    if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
        return $matches[1];
    }

    if (isset($_REQUEST['auth_token']) && !empty($_REQUEST['auth_token'])) {
        return trim((string)$_REQUEST['auth_token']);
    }

    return null;
}

/**
 * Authenticate the current request using Bearer token.
 * Returns the user array on success or null on failure.
 *
 * @param string|null $requiredRole
 * @return array|null
 */
function bm_authenticate($requiredRole = null)
{
    $token = bm_get_bearer_token();
    if (!$token) {
        return null;
    }

    $db = bm_get_db();
    if (!$db) {
        return null;
    }

    try {
        $stmt = $db->prepare("
            SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at, t.id AS token_id, t.expires_at
            FROM auth_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token = :token AND t.expires_at > NOW() AND u.status = 'active'
            LIMIT 1
        ");
        $stmt->execute([':token' => $token]);
        $user = $stmt->fetch();

        if (!$user) {
            return null;
        }

        if ($requiredRole !== null) {
            if ($requiredRole === 'admin' && $user['role'] !== 'admin') {
                return null;
            }
            if ($requiredRole === 'staff' && !in_array($user['role'], ['admin', 'staff'], true)) {
                return null;
            }
        }

        return $user;
    } catch (PDOException $e) {
        error_log("[BM_AUTH_ERROR] " . $e->getMessage());
        return null;
    }
}

/**
 * Require valid authentication or terminate with 401 Unauthorized.
 *
 * @param string|null $requiredRole
 * @return array
 */
function bm_require_auth($requiredRole = null)
{
    $user = bm_authenticate($requiredRole);
    if (!$user) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => false,
            'error' => 'Unauthorized: Invalid, expired, or insufficient permissions.'
        ]);
        exit;
    }
    return $user;
}

/**
 * Require Admin role or terminate with 403 Forbidden.
 *
 * @return array
 */
function bm_require_admin()
{
    return bm_require_auth('admin');
}

/**
 * Create a new user session and return the generated auth token.
 *
 * @param int $userId
 * @return array ['token' => string, 'expires_at' => string]
 */
function bm_create_session($userId)
{
    $db = bm_get_db();
    if (!$db) {
        throw new Exception("Database unavailable");
    }

    $token = bm_generate_token();
    $ttlHours = defined('AUTH_TOKEN_TTL_HOURS') ? AUTH_TOKEN_TTL_HOURS : 72;
    $expiresAt = date('Y-m-d H:i:s', time() + ($ttlHours * 3600));
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 250) : '';

    $stmt = $db->prepare("
        INSERT INTO auth_tokens (user_id, token, ip_address, user_agent, expires_at)
        VALUES (:user_id, :token, :ip, :ua, :expires_at)
    ");
    $stmt->execute([
        ':user_id' => $userId,
        ':token' => $token,
        ':ip' => $ip,
        ':ua' => $ua,
        ':expires_at' => $expiresAt
    ]);

    return [
        'token' => $token,
        'expires_at' => $expiresAt
    ];
}

/**
 * Invalidate an active session token.
 *
 * @param string $token
 * @return bool
 */
function bm_revoke_session($token)
{
    $db = bm_get_db();
    if (!$db) {
        return false;
    }
    try {
        $stmt = $db->prepare("DELETE FROM auth_tokens WHERE token = :token");
        return $stmt->execute([':token' => $token]);
    } catch (PDOException $e) {
        return false;
    }
}
