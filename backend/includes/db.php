<?php
// BrahmnMitra — Database Connection Helper (Hostinger MySQL / PDO)

if (!defined("BM_OK")) {
    http_response_code(403);
    exit("Forbidden");
}

/**
 * Returns a shared PDO instance for database interactions.
 * Returns null if database connection cannot be established.
 *
 * @return PDO|null
 */
function bm_get_db()
{
    static $pdo = null;
    static $hasFailed = false;

    if ($pdo !== null) {
        return $pdo;
    }

    if ($hasFailed) {
        return null;
    }

    if (!defined("DB_HOST") || !defined("DB_NAME") || empty(DB_NAME)) {
        return null;
    }

    try {
        if (!class_exists('PDO') || !in_array('mysql', PDO::getAvailableDrivers(), true)) {
            $hasFailed = true;
            error_log("[BM_DB_ERROR] PDO MySQL driver is not installed or enabled in PHP environment.");
            return null;
        }

        $dsn = sprintf(
            "mysql:host=%s;port=%d;dbname=%s;charset=%s",
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        if (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
            $options[constant('PDO::MYSQL_ATTR_INIT_COMMAND')] = "SET NAMES " . DB_CHARSET;
        }

        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (Throwable $e) {
        $hasFailed = true;
        error_log("[BM_DB_ERROR] Database connection failed: " . $e->getMessage());
        return null;
    }
}

/**
 * Check if the database connection is currently active and reachable.
 *
 * @return bool
 */
function bm_db_is_available()
{
    $db = bm_get_db();
    if (!$db) {
        return false;
    }
    try {
        $db->query("SELECT 1");
        return true;
    } catch (Exception $e) {
        return false;
    }
}
