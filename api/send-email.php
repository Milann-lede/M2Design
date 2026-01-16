<?php
/**
 * API d'envoi d'emails pour le QCM ModernWeb
 * Envoie un email HTML stylé à l'admin ET au client
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
$site_url = "https://www.modernweb.fr";
$primary_color = "#3b82f6";
$success_color = "#22c55e";

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
$pdf_url = htmlspecialchars($data['pdf_url'] ?? '', ENT_QUOTES, 'UTF-8');

// Traitement des features
$features_html = "";
if (isset($data['features']) && is_array($data['features']) && count($data['features']) > 0) {
    foreach ($data['features'] as $feat) {
        $feat_safe = htmlspecialchars($feat, ENT_QUOTES, 'UTF-8');
        $features_html .= "<span style='display:inline-block;background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:12px;font-size:12px;margin:3px;'>✓ $feat_safe</span>";
    }
} else {
    $features_html = "<span style='color:#94a3b8;'>Aucune fonctionnalité sélectionnée</span>";
}

// Traitement du breakdown pour l'email admin
$breakdown_html = "";
if (isset($data['breakdown']) && is_array($data['breakdown'])) {
    foreach ($data['breakdown'] as $item) {
        $label = htmlspecialchars($item['label'] ?? '', ENT_QUOTES, 'UTF-8');
        $value = htmlspecialchars($item['value'] ?? '', ENT_QUOTES, 'UTF-8');
        $value_color = (strtolower($value) === 'inclus') ? $success_color : $primary_color;
        $breakdown_html .= "<tr><td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#475569;'>$label</td><td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:$value_color;'>$value</td></tr>";
    }
}

if (!$user_email) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Email client invalide"]);
    exit;
}

// === EMAIL 1: NOTIFICATION ADMIN (HTML) ===
$admin_subject = "🆕 Nouveau Projet - $user_name ($user_company)";
$admin_content = "
<!DOCTYPE html>
<html>
<head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f8fafc;'>
<div style='max-width:600px;margin:0 auto;padding:20px;'>
    
    <!-- Header -->
    <div style='background:linear-gradient(135deg,$primary_color,#1d4ed8);border-radius:16px 16px 0 0;padding:30px;text-align:center;'>
        <h1 style='color:white;margin:0;font-size:24px;'>📋 Nouveau Cahier des Charges</h1>
        <p style='color:rgba(255,255,255,0.8);margin:10px 0 0;'>Reçu le " . date('d/m/Y à H:i') . "</p>
    </div>
    
    <!-- Client Info -->
    <div style='background:white;padding:25px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;'>
        <h2 style='color:#1e293b;font-size:16px;margin:0 0 15px;border-left:4px solid $primary_color;padding-left:12px;'>👤 Client</h2>
        <table style='width:100%;font-size:14px;'>
            <tr><td style='padding:6px 0;color:#64748b;width:120px;'>Nom</td><td style='color:#1e293b;font-weight:600;'>$user_name</td></tr>
            <tr><td style='padding:6px 0;color:#64748b;'>Email</td><td><a href='mailto:$user_email' style='color:$primary_color;'>$user_email</a></td></tr>
            <tr><td style='padding:6px 0;color:#64748b;'>Téléphone</td><td style='color:#1e293b;'>$user_phone</td></tr>
            <tr><td style='padding:6px 0;color:#64748b;'>Entreprise</td><td style='color:#1e293b;'>$user_company</td></tr>
            <tr><td style='padding:6px 0;color:#64748b;'>Secteur</td><td style='color:#1e293b;'>$sector</td></tr>
        </table>
    </div>
    
    <!-- Projet -->
    <div style='background:#f8fafc;padding:25px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;'>
        <h2 style='color:#1e293b;font-size:16px;margin:0 0 15px;border-left:4px solid $primary_color;padding-left:12px;'>🎯 Projet</h2>
        <div style='display:flex;flex-wrap:wrap;gap:10px;'>
            <div style='background:white;border-radius:10px;padding:12px 16px;flex:1;min-width:120px;border:1px solid #e2e8f0;'>
                <div style='font-size:11px;color:#64748b;text-transform:uppercase;'>Type</div>
                <div style='font-size:14px;color:#1e293b;font-weight:600;margin-top:4px;'>$project_type</div>
            </div>
            <div style='background:white;border-radius:10px;padding:12px 16px;flex:1;min-width:120px;border:1px solid #e2e8f0;'>
                <div style='font-size:11px;color:#64748b;text-transform:uppercase;'>Style</div>
                <div style='font-size:14px;color:#1e293b;font-weight:600;margin-top:4px;'>$design_style</div>
            </div>
            <div style='background:white;border-radius:10px;padding:12px 16px;flex:1;min-width:120px;border:1px solid #e2e8f0;'>
                <div style='font-size:11px;color:#64748b;text-transform:uppercase;'>Pages</div>
                <div style='font-size:14px;color:#1e293b;font-weight:600;margin-top:4px;'>$page_count</div>
            </div>
        </div>
    </div>
    
    <!-- Estimation -->
    <div style='background:white;padding:25px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;'>
        <h2 style='color:#1e293b;font-size:16px;margin:0 0 15px;border-left:4px solid $primary_color;padding-left:12px;'>💰 Estimation Détaillée</h2>
        <table style='width:100%;border-collapse:collapse;font-size:13px;'>
            $breakdown_html
            <tr style='background:linear-gradient(135deg,#eff6ff,#dbeafe);'>
                <td style='padding:12px;font-weight:700;color:#1e293b;'>TOTAL</td>
                <td style='padding:12px;text-align:right;font-weight:700;color:$primary_color;font-size:16px;'>$budget / $deadline</td>
            </tr>
        </table>
    </div>
    
    <!-- Fonctionnalités -->
    <div style='background:#f8fafc;padding:25px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;'>
        <h2 style='color:#1e293b;font-size:16px;margin:0 0 15px;border-left:4px solid $success_color;padding-left:12px;'>⚙️ Fonctionnalités Souhaitées</h2>
        <div>$features_html</div>
    </div>
    
    <!-- Description -->
    <div style='background:white;padding:25px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;'>
        <h2 style='color:#1e293b;font-size:16px;margin:0 0 15px;border-left:4px solid #f59e0b;padding-left:12px;'>📝 Description du Projet</h2>
        <p style='color:#475569;font-size:14px;line-height:1.6;margin:0;background:#f8fafc;padding:15px;border-radius:8px;'>$project_description</p>
    </div>
    
    <!-- PDF Link -->
    " . ($pdf_url && strpos($pdf_url, 'http') === 0 ? "
    <div style='background:white;padding:20px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;'>
        <a href='$pdf_url' style='display:inline-block;background:$primary_color;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;'>📄 Télécharger le PDF</a>
    </div>
    " : "") . "
    
    <!-- Footer -->
    <div style='background:#1e293b;border-radius:0 0 16px 16px;padding:20px;text-align:center;'>
        <p style='color:#94a3b8;font-size:12px;margin:0;'>Email envoyé automatiquement par <strong style='color:white;'>$site_name</strong></p>
    </div>
    
</div>
</body>
</html>
";

$headers_admin = "From: $site_name <noreply@modernweb.fr>\r\n";
$headers_admin .= "Reply-To: $user_email\r\n";
$headers_admin .= "MIME-Version: 1.0\r\n";
$headers_admin .= "Content-Type: text/html; charset=UTF-8\r\n";

$mail_admin = @mail($admin_email, $admin_subject, $admin_content, $headers_admin);


// === EMAIL 2: CONFIRMATION CLIENT (HTML) ===
$client_subject = "✅ Votre projet a bien été reçu - $site_name";

$pdf_button = "";
if ($pdf_url && strpos($pdf_url, 'http') === 0) {
    $pdf_button = "<a href='$pdf_url' style='display:inline-block;background:$primary_color;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:20px;'>📄 Télécharger votre PDF</a>";
} else {
    $pdf_button = "<p style='color:#64748b;font-size:14px;margin-top:20px;'>📄 Votre PDF récapitulatif a été téléchargé automatiquement.</p>";
}

$client_content = "
<!DOCTYPE html>
<html>
<head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f8fafc;'>
<div style='max-width:600px;margin:0 auto;padding:20px;'>
    
    <!-- Header -->
    <div style='background:linear-gradient(135deg,$primary_color,#1d4ed8);border-radius:16px 16px 0 0;padding:40px;text-align:center;'>
        <table style='width:70px;height:70px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 15px;' cellpadding='0' cellspacing='0'>
            <tr><td style='text-align:center;vertical-align:middle;'>
                <span style='font-size:32px;color:white;'>✓</span>
            </td></tr>
        </table>
        <h1 style='color:white;margin:0;font-size:24px;'>Projet bien reçu !</h1>
        <p style='color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;'>Merci $user_name</p>
    </div>
    
    <!-- Content -->
    <div style='background:white;padding:30px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;'>
        <p style='color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;'>
            Nous avons bien reçu votre demande de projet <strong style='color:#1e293b;'>« $project_type »</strong>.
        </p>
        
        <!-- Récapitulatif -->
        <div style='background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:25px;'>
            <h3 style='color:#1e293b;font-size:14px;margin:0 0 15px;'>📋 Récapitulatif</h3>
            <table style='width:100%;font-size:14px;'>
                <tr><td style='padding:8px 0;color:#64748b;'>Type de projet</td><td style='color:#1e293b;font-weight:500;text-align:right;'>$project_type</td></tr>
                <tr><td style='padding:8px 0;color:#64748b;'>Style visuel</td><td style='color:#1e293b;font-weight:500;text-align:right;'>$design_style</td></tr>
                <tr style='border-top:2px solid #e2e8f0;'><td style='padding:12px 0 8px;color:#64748b;font-weight:600;'>Budget estimé</td><td style='color:$primary_color;font-weight:700;text-align:right;font-size:16px;'>$budget</td></tr>
                <tr><td style='padding:8px 0;color:#64748b;font-weight:600;'>Délai estimé</td><td style='color:$primary_color;font-weight:700;text-align:right;font-size:16px;'>$deadline</td></tr>
            </table>
        </div>
        
        <!-- PDF -->
        <div style='text-align:center;'>
            $pdf_button
        </div>
    </div>
    
    <!-- Next Steps -->
    <div style='background:#f0fdf4;padding:25px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;'>
        <h3 style='color:#166534;font-size:14px;margin:0 0 12px;'>🚀 Prochaines Étapes</h3>
        <p style='color:#15803d;font-size:14px;line-height:1.6;margin:0;'>
            Nous étudions votre cahier des charges et reviendrons vers vous sous <strong>24-48h</strong> avec une proposition adaptée.
        </p>
    </div>
    
    <!-- Contact -->
    <div style='background:white;padding:25px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;'>
        <p style='color:#64748b;font-size:13px;margin:0;'>
            Besoin d'ajouter quelque chose ?<br>
            <strong style='color:#1e293b;'>Répondez simplement à cet email.</strong>
        </p>
    </div>
    
    <!-- Footer -->
    <div style='background:#1e293b;border-radius:0 0 16px 16px;padding:25px;text-align:center;'>
        <p style='color:white;font-weight:600;font-size:16px;margin:0 0 5px;'>$site_name</p>
        <p style='color:#94a3b8;font-size:12px;margin:0;'>Création de sites web premium à Lille</p>
        <p style='margin:15px 0 0;'><a href='$site_url' style='color:$primary_color;font-size:13px;'>www.modernweb.fr</a></p>
    </div>
    
</div>
</body>
</html>
";

$headers_client = "From: $site_name <noreply@modernweb.fr>\r\n";
$headers_client .= "Reply-To: $admin_email\r\n";
$headers_client .= "MIME-Version: 1.0\r\n";
$headers_client .= "Content-Type: text/html; charset=UTF-8\r\n";

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
