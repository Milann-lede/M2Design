<?php
// Headers pour autoriser les requêtes POST depuis le site (CORS si nécessaire, sinon same origin)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["message" => "Méthode non autorisée"]);
    exit;
}

// Récupérer les données JSON
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["message" => "Données invalides"]);
    exit;
}

// Configuration
$admin_email_1 = "contact@modernweb.fr";
$admin_email_2 = "milann.lede@icloud.com";
$user_name = filter_var($data['user_name'] ?? '', FILTER_SANITIZE_STRING);
$user_email = filter_var($data['user_email'] ?? '', FILTER_VALIDATE_EMAIL);
$subject = "Nouveau projet : " . $user_name;

if (!$user_email) {
    http_response_code(400);
    echo json_encode(["message" => "Email invalide"]);
    exit;
}

// === NOTIFICATION ADMIN (envoi aux 2 adresses) ===
$admin_content = "
Nouveau cahier des charges reçu !

Client : $user_name ($user_email)
Téléphone : " . ($data['user_phone'] ?? 'Non renseigné') . "
Entreprise : " . ($data['user_company'] ?? 'Particulier') . "

Projet : " . ($data['project_type'] ?? '') . "
Budget : " . ($data['budget'] ?? '') . "
Délai : " . ($data['deadline'] ?? '') . "

PDF du brief : " . ($data['pdf_url'] ?? 'Non disponible') . "

Cordialement,
Ton Assistant ModernWeb
";

$headers_admin = "From: " . $user_email . "\r\n";
$headers_admin .= "Reply-To: " . $user_email . "\r\n";

// Envoyer aux deux adresses admin
$mail_admin_1 = mail($admin_email_1, "Nouveau Projet - $user_name", $admin_content, $headers_admin);
$mail_admin_2 = mail($admin_email_2, "Nouveau Projet - $user_name", $admin_content, $headers_admin);
$mail_admin = $mail_admin_1 || $mail_admin_2; // Succès si au moins un mail part


// === CONFIRMATION CLIENT ===
$client_content = "
Bonjour $user_name,

Nous avons bien reçu votre demande de projet ($data[project_type]).

Budget estimé : " . ($data['budget'] ?? '') . "
Délai souhaité : " . ($data['deadline'] ?? '') . "

Nous allons étudier votre cahier des charges (téléchargé automatiquement) et revenir vers vous sous 24h.

Cordialement,
L'équipe ModernWeb
contact@modernweb.fr
";

$headers_client = "From: $admin_email\r\n";
$headers_client .= "Reply-To: $admin_email\r\n";

$mail_client = mail($user_email, "Confirmation de réception - ModernWeb", $client_content, $headers_client);


if ($mail_admin && $mail_client) {
    http_response_code(200);
    echo json_encode(["message" => "Emails envoyés avec succès"]);
} else {
    // Si l'un des deux échoue, on renvoie quand même ok pour le client, mais on log l'erreur (idéalement)
    // Ici on simule le succès si au moins le mail admin part, sinon erreur
    if ($mail_admin) {
         echo json_encode(["message" => "Email admin envoyé, mais client échoué"]);
    } else {
         http_response_code(500);
         echo json_encode(["message" => "Erreur lors de l'envoi des emails"]);
    }
}
?>
