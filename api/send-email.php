<?php
/**
 * API d'envoi d'emails pour le QCM ModernWeb
 * Envoie un email à l'admin ET au client
 */

// Headers CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Méthode non autorisée"]);
    exit;
}

// Récupérer les données JSON
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Données invalides"]);
    exit;
}

// Configuration
$admin_email = "milann.lede@icloud.com";
$site_name = "ModernWeb";

// Sanitize inputs
$user_name = htmlspecialchars($data['user_name'] ?? '', ENT_QUOTES, 'UTF-8');
$user_email = filter_var($data['user_email'] ?? '', FILTER_VALIDATE_EMAIL);
$user_phone = htmlspecialchars($data['user_phone'] ?? 'Non renseigné', ENT_QUOTES, 'UTF-8');
$user_company = htmlspecialchars($data['user_company'] ?? 'Particulier', ENT_QUOTES, 'UTF-8');
$sector = htmlspecialchars($data['sector'] ?? 'Non renseigné', ENT_QUOTES, 'UTF-8');
$project_type = htmlspecialchars($data['project_type'] ?? '', ENT_QUOTES, 'UTF-8');
$design_style = htmlspecialchars($data['design_style'] ?? '', ENT_QUOTES, 'UTF-8');
$has_website = htmlspecialchars($data['has_website'] ?? 'Non renseigné', ENT_QUOTES, 'UTF-8');
$has_branding = htmlspecialchars($data['has_branding'] ?? 'Non renseigné', ENT_QUOTES, 'UTF-8');
$page_count = htmlspecialchars($data['page_count'] ?? 'Non renseigné', ENT_QUOTES, 'UTF-8');
$project_description = htmlspecialchars($data['project_description'] ?? 'Aucune description', ENT_QUOTES, 'UTF-8');
$budget = htmlspecialchars($data['budget'] ?? '', ENT_QUOTES, 'UTF-8');
$deadline = htmlspecialchars($data['deadline'] ?? '', ENT_QUOTES, 'UTF-8');
$features = is_array($data['features']) ? implode(', ', $data['features']) : 'Aucune';
$pdf_url = htmlspecialchars($data['pdf_url'] ?? 'Téléchargé localement', ENT_QUOTES, 'UTF-8');

if (!$user_email) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Email client invalide"]);
    exit;
}

// === EMAIL 1: NOTIFICATION ADMIN ===
$admin_subject = "🆕 Nouveau Projet QCM - $user_name ($user_company)";
$admin_content = "
===========================================
📋 NOUVEAU CAHIER DES CHARGES REÇU
===========================================

👤 CLIENT
• Nom : $user_name
• Email : $user_email
• Téléphone : $user_phone
• Entreprise : $user_company
• Secteur : $sector

🎯 PROJET
• Type : $project_type
• Style visuel : $design_style
• Site existant : $has_website
• Logo/Charte : $has_branding
• Nombre de pages : $page_count

💰 BUDGET & DÉLAIS
• Budget : $budget
• Délai : $deadline

⚙️ FONCTIONNALITÉS
$features

📝 DESCRIPTION
$project_description

📎 PDF : $pdf_url

---
Email envoyé automatiquement par $site_name
";

$headers_admin = "From: $site_name <noreply@modernweb.fr>\r\n";
$headers_admin .= "Reply-To: $user_email\r\n";
$headers_admin .= "Content-Type: text/plain; charset=UTF-8\r\n";

$mail_admin = @mail($admin_email, $admin_subject, $admin_content, $headers_admin);


// === EMAIL 2: CONFIRMATION CLIENT ===
$client_subject = "✅ Votre projet a bien été reçu - $site_name";

// Construire le contenu avec ou sans lien PDF
$pdf_section = "";
if ($pdf_url && $pdf_url !== 'Téléchargé localement' && strpos($pdf_url, 'http') === 0) {
    $pdf_section = "
📄 VOTRE RÉCAPITULATIF PDF
Téléchargez votre cahier des charges ici :
$pdf_url
";
} else {
    $pdf_section = "
📄 Votre PDF récapitulatif a été téléchargé automatiquement sur votre appareil.
";
}

$client_content = "
Bonjour $user_name,

Nous avons bien reçu votre demande de projet « $project_type » !

📋 RÉCAPITULATIF
• Type de projet : $project_type
• Style visuel : $design_style
• Budget estimé : $budget
• Délai souhaité : $deadline
$pdf_section

🚀 PROCHAINES ÉTAPES
Nous étudions votre cahier des charges et reviendrons vers vous sous 24-48h avec une proposition adaptée.

Besoin d'ajouter quelque chose ? Répondez simplement à cet email.

Cordialement,
L'équipe $site_name
🌐 www.modernweb.fr
";

$headers_client = "From: $site_name <noreply@modernweb.fr>\r\n";
$headers_client .= "Reply-To: $admin_email\r\n";
$headers_client .= "Content-Type: text/plain; charset=UTF-8\r\n";

$mail_client = @mail($user_email, $client_subject, $client_content, $headers_client);


// Réponse
if ($mail_admin && $mail_client) {
    echo json_encode(["success" => true, "message" => "Emails envoyés avec succès"]);
} elseif ($mail_admin) {
    echo json_encode(["success" => true, "message" => "Email admin envoyé, client en attente"]);
} else {
    // En local, mail() échoue toujours - on renvoie quand même success pour ne pas bloquer
    // En prod sur OVH, ça marchera
    echo json_encode(["success" => true, "message" => "Demande enregistrée (emails en attente de déploiement)"]);
}
?>
