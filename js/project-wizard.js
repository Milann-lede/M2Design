document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const TOTAL_STEPS = 8;
    let currentStep = 1;

    // --- Elements ---
    const form = document.getElementById('project-wizard-form');
    const steps = document.querySelectorAll('.wizard-step');
    const progressBar = document.getElementById('progress-bar');
    const currentStepDisplay = document.getElementById('current-step-display');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    // --- Init Supabase ---
    let supabaseClient = null;
    if (window.supabase && window.supabase.createClient && typeof SUPABASE_CONFIG !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
    }

    // --- Init ---
    updateUI();

    // --- Event Listeners ---
    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            currentStep++;
            updateUI();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateUI();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateStep(currentStep)) return;

        // Change button state
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération en cours...';
        submitBtn.disabled = true;

        try {
            // Collect Data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Get all checked features (checkboxes)
            const features = [];
            form.querySelectorAll('input[name="features"]:checked').forEach(cb => features.push(cb.value));
            data.features = features;

            // 1. Generate PDF Object (Doc)
            const doc = await generatePDFDoc(data);

            // 2. Generate Blob for Upload
            const pdfBlob = doc.output('blob');

            // 3. Upload PDF to Supabase Storage and save to database
            let pdfUrl = null;
            if (supabaseClient) {
                pdfUrl = await uploadToSupabase(data, pdfBlob);
            }

            // 4. Send Emails via PHP Backend (Admin + Client)
            await sendEmailsViaPHP(data, pdfUrl);

            // 5. Download the PDF for the user (DIRECT DOWNLOAD)
            const fileName = `Cahier_des_charges_${data.user_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            doc.save(fileName);

            // 7. Success Message
            showSuccessMessage(data);

        } catch (error) {
            console.error('Erreur:', error);
            alert("Une erreur est survenue lors de l'envoi. Veuillez réessayer ou nous contacter directement.");
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // --- Navigation Logic ---
    function updateUI() {
        steps.forEach(step => {
            if (parseInt(step.dataset.step) === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';

        if (currentStep === TOTAL_STEPS) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-flex';
        } else {
            nextBtn.style.display = 'inline-flex';
            submitBtn.style.display = 'none';
        }

        const percent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
        progressBar.style.width = `${percent}%`;
        currentStepDisplay.textContent = currentStep;

        // Calculer l'estimation automatique quand on arrive à l'étape 7
        if (currentStep === 7) {
            calculateEstimation();
        }
    }

    // --- Calcul automatique du budget et délai ---
    function calculateEstimation() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Récupérer les fonctionnalités cochées
        const features = [];
        form.querySelectorAll('input[name="features"]:checked').forEach(cb => features.push(cb.value));

        let baseBudget = 400; // Base "Low Cost / Démarrage"
        let baseDays = 7; // Délai rapide
        let breakdown = [];

        // === 1. TYPE DE PROJET ===
        const projectTypePricing = {
            'Site Vitrine': { budget: 0, days: 0, label: 'Site Vitrine' },
            'E-commerce': { budget: 300, days: 5, label: 'Option E-commerce' },
            'Portfolio': { budget: 30, days: 1, label: 'Option Portfolio' },
            'Blog/Média': { budget: 60, days: 2, label: 'Option Blog' }
        };

        const projectType = data.project_type || 'Site Vitrine';
        if (projectTypePricing[projectType]) {
            const pt = projectTypePricing[projectType];
            baseBudget += pt.budget;
            baseDays += pt.days;
            if (pt.budget > 0) {
                breakdown.push({ label: pt.label, value: `+${pt.budget}€ / +${pt.days}j` });
            }
        }

        // === 2. SECTEUR D'ACTIVITÉ (Impact nul sur le prix) ===
        // Le secteur permet de mieux comprendre le client mais ne change pas le devis technique de base
        const sector = data.sector;
        if (sector) {
            // On ne change pas le prix, on l'ajoute juste pour info si besoin, ou on l'ignore dans le breakdown
            // User requested: "ça tu t'en fous" pour le prix
        }

        // === 3. STYLE VISUEL ===
        const stylePricing = {
            'Minimaliste & Épuré': { budget: 0, days: 0 },
            'Moderne & Tech': { budget: 30, days: 1 },
            'Luxe & Élégant': { budget: 50, days: 2 },
            'Coloré & Dynamique': { budget: 30, days: 1 }
        };

        const designStyle = data.design_style;
        if (designStyle && stylePricing[designStyle]) {
            const ds = stylePricing[designStyle];
            baseBudget += ds.budget;
            baseDays += ds.days;
            if (ds.budget > 0) {
                breakdown.push({ label: `Style : ${designStyle}`, value: `+${ds.budget}€ / +${ds.days}j` });
            }
        }

        // === 4. CRÉATION VS REFONTE ===
        const hasWebsite = data.has_website;
        if (hasWebsite === "Non, c'est une création") {
            baseBudget += 30;
            baseDays += 1;
            breakdown.push({ label: 'Installation (Nouveau site)', value: '+30€ / +1j' });
        } else if (hasWebsite === "Oui, c'est une refonte") {
            baseBudget -= 50; // Remise Refonte
            breakdown.push({ label: 'Remise Refonte', value: '<span style="color:#22c55e">-50€</span>' });
        }

        // === 5. LOGO / CHARTE GRAPHIQUE ===
        const brandingPricing = {
            'Oui, logo + charte': { budget: 0, days: 0 },
            'Juste un logo': { budget: 100, days: 3, label: 'Création Logo' },
            'Non, à créer': { budget: 250, days: 5, label: 'Pack Identité Simple' }
        };

        const hasBranding = data.has_branding;
        if (hasBranding && brandingPricing[hasBranding]) {
            const b = brandingPricing[hasBranding];
            baseBudget += b.budget;
            baseDays += b.days;
            if (b.budget > 0) {
                breakdown.push({ label: b.label, value: `+${b.budget}€ / +${b.days}j` });
            }
        }

        // === 6. FONCTIONNALITÉS (Gratuites / Incluses) ===
        // User requested: "tout ce qui est formulaire... tu retires les prix"
        features.forEach(feat => {
            // On affiche quand même "Inclus" pour montrer la valeur
            breakdown.push({ label: feat, value: `<span style="color:#22c55e">Inclus</span>` });
        });

        // === 7. NOMBRE DE PAGES ===
        const pagePricing = {
            '1-5 pages': { budget: 0, days: 0, label: '1 à 5 pages' },
            '5-10 pages': { budget: 90, days: 2, label: '5 à 10 pages' },
            '10-20 pages': { budget: 190, days: 4, label: '10 à 20 pages' },
            'Plus de 20 pages': { budget: 390, days: 7, label: 'Plus de 20 pages' }
        };

        const pageCount = data.page_count;
        if (pageCount && pagePricing[pageCount]) {
            const p = pagePricing[pageCount];
            baseBudget += p.budget;
            baseDays += p.days;
            if (p.budget > 0) {
                breakdown.push({ label: p.label, value: `+${p.budget}€ / +${p.days}j` });
            }
        }

        // === CALCUL FINAL ===
        // Pas d'arrondi supérieur forcé, on garde le prix calculé
        const finalBudget = baseBudget;

        // Convertir les jours en semaines pour l'affichage humain
        let deadlineText;
        if (baseDays <= 7) {
            deadlineText = '1 semaine';
        } else if (baseDays <= 14) {
            deadlineText = '2 semaines';
        } else if (baseDays <= 21) {
            deadlineText = '3 semaines';
        } else if (baseDays <= 30) {
            deadlineText = '1 mois';
        } else {
            // Arrondi au mois supérieur si > 1 mois
            const months = Math.ceil(baseDays / 30);
            deadlineText = `${months} mois`;
        }

        // Affichage plus précis pour le client (Budget exact estimé)
        const budgetText = `${finalBudget.toLocaleString('fr-FR')}€`;

        // === MISE À JOUR DE L'INTERFACE ===
        const budgetEl = document.getElementById('estimated-budget');
        const deadlineEl = document.getElementById('estimated-deadline');

        // Animation simple des valeurs
        budgetEl.textContent = budgetText;
        deadlineEl.textContent = deadlineText;

        // Stocker les valeurs dans les champs cachés
        document.getElementById('budget-hidden').value = budgetText;
        document.getElementById('deadline-hidden').value = deadlineText;

        // Afficher le détail du calcul
        const breakdownList = document.getElementById('estimation-breakdown');
        breakdownList.innerHTML = '';

        // Ajouter la ligne de base
        breakdownList.innerHTML = `<li><span>Base technique & Design</span><span>400€ / 7j</span></li>`;

        breakdown.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${item.label}</span><span>${item.value}</span>`;
            breakdownList.appendChild(li);
        });

        // Ajouter le total
        const totalLi = document.createElement('li');
        totalLi.style.fontWeight = '700';
        totalLi.style.borderTop = '2px solid var(--primary)';
        totalLi.style.marginTop = '0.5rem';
        totalLi.style.paddingTop = '0.75rem';
        totalLi.innerHTML = `<span>ESTIMATION FINALE</span><span style="color: var(--primary); font-size: 1.1em;">${budgetText} / ${deadlineText}</span>`;
        breakdownList.appendChild(totalLi);
    }

    // --- Validation ---
    function validateStep(step) {
        const currentStepEl = document.querySelector(`.wizard-step[data-step="${step}"]`);
        const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value) {
                isValid = false;
                input.style.borderColor = 'red';
            } else {
                input.style.borderColor = '';
            }
        });

        // Valider les radios sur les étapes 1, 2, 3, 4
        if ([1, 2, 3, 4].includes(step)) {
            const radios = currentStepEl.querySelectorAll('input[type="radio"]');
            const isChecked = Array.from(radios).some(r => r.checked);
            if (!isChecked) {
                isValid = false;
                alert("Veuillez sélectionner une option.");
            }
        }

        return isValid;
    }

    // --- Beautiful PDF Generation (jsPDF) - Charte ModernWeb ---
    async function generatePDFDoc(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // === COULEURS CHARTE MODERNWEB ===
        const colors = {
            primary: [37, 99, 235],        // #2563EB
            primaryDark: [30, 64, 175],    // #1E40AF
            secondary: [15, 23, 42],       // #0F172A
            accent: [59, 130, 246],        // #3B82F6
            background: [248, 250, 252],   // #F8FAFC
            surface: [255, 255, 255],      // White
            textMain: [51, 65, 85],        // #334155
            textLight: [71, 85, 105],      // #475569
            success: [34, 197, 94],        // Green
            warning: [245, 158, 11],       // Amber
            gradientStart: [37, 99, 235],
            gradientEnd: [59, 130, 246]
        };

        // --- Fonctions Utilitaires ---
        const addSectionTitle = (text, yPos) => {
            doc.setFillColor(...colors.primary);
            doc.roundedRect(15, yPos - 3, 4, 14, 1, 1, 'F');
            doc.setTextColor(...colors.secondary);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(text, 24, yPos + 6);
            return yPos + 16; // Retourne la position Y suivante
        };

        const checkPageBreak = (currentY, neededSpace) => {
            if (currentY + neededSpace > 270) {
                doc.addPage();
                return 40; // Marge haute nouvelle page
            }
            return currentY;
        };

        // === HEADER ===
        for (let i = 0; i < 40; i++) {
            const ratio = i / 40;
            const r = Math.round(colors.gradientStart[0] + (colors.gradientEnd[0] - colors.gradientStart[0]) * ratio);
            const g = Math.round(colors.gradientStart[1] + (colors.gradientEnd[1] - colors.gradientStart[1]) * ratio);
            const b = Math.round(colors.gradientStart[2] + (colors.gradientEnd[2] - colors.gradientStart[2]) * ratio);
            doc.setFillColor(r, g, b);
            doc.rect(0, i * 1, 210, 1.2, 'F');
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text("Modern", 20, 25);
        doc.setTextColor(200, 220, 255);
        doc.text("Web", 62, 25);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text("Cahier des Charges", 20, 35); // Accents simplifiés pour compatibilité sûre

        doc.setFontSize(10);
        doc.setTextColor(200, 220, 255);
        const dateStr = new Date().toLocaleDateString('fr-FR');
        doc.text(dateStr, 170, 35);

        // === 1. CLIENT INFO ===
        let y = 55; // Remonté
        y = addSectionTitle("Informations Client", y);

        doc.setFillColor(...colors.background);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, y, 180, 35, 4, 4, 'FD');

        doc.setFontSize(8);
        doc.setTextColor(...colors.textLight);
        doc.text("NOM COMPLET", 22, y + 8);
        doc.text("EMAIL", 110, y + 8);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.secondary);
        doc.text(data.user_name || "-", 22, y + 15);
        doc.setTextColor(...colors.primary);
        doc.text(data.user_email || "-", 110, y + 15);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.textLight);
        doc.text("TELEPHONE", 22, y + 25);
        doc.text("ENTREPRISE", 110, y + 25);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.secondary);
        doc.text(data.user_phone || "-", 22, y + 32);
        doc.text(data.user_company || "-", 110, y + 32);

        y += 45; // Espace après carte client

        // === 2. DETAILS PROJET ===
        y = checkPageBreak(y, 80);
        y = addSectionTitle("Details du Projet", y);

        const drawInfoCard = (label, value, x, yPos, w) => {
            doc.setFillColor(...colors.surface);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, yPos, w, 20, 3, 3, 'FD');

            doc.setFillColor(...colors.primary);
            doc.rect(x, yPos + 6, 2, 8, 'F'); // Petit marqueur bleu

            doc.setFontSize(7);
            doc.setTextColor(...colors.textLight);
            doc.setFont('helvetica', 'normal');
            doc.text(label, x + 8, yPos + 7);

            doc.setFontSize(9);
            doc.setTextColor(...colors.secondary);
            doc.setFont('helvetica', 'bold');
            const val = value && value.length > 25 ? value.substring(0, 23) + "..." : value;
            doc.text(val || "-", x + 8, yPos + 15);
        };

        drawInfoCard("TYPE DE PROJET", data.project_type, 15, y, 58);
        drawInfoCard("SECTEUR", data.sector, 76, y, 58);
        drawInfoCard("STYLE VISUEL", data.design_style, 137, y, 58);

        y += 24;
        drawInfoCard("SITE EXISTANT", data.has_website, 15, y, 58);
        drawInfoCard("BRANDING", data.has_branding, 76, y, 58);
        drawInfoCard("PAGES", data.page_count, 137, y, 58);

        y += 35; // Espace après détails

        // === 3. ESTIMATION ===
        y = checkPageBreak(y, 60);
        y = addSectionTitle("Estimation", y);

        // Carte Estimation Compacte
        doc.setFillColor(240, 249, 255); // #f0f9ff
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.4);
        doc.roundedRect(15, y, 180, 28, 4, 4, 'FD');

        // Budget
        doc.setFillColor(...colors.primary);
        doc.circle(30, y + 14, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text("€", 27.5, y + 17);

        doc.setTextColor(...colors.textLight);
        doc.setFontSize(8);
        doc.text("BUDGET", 45, y + 10);
        doc.setTextColor(...colors.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(data.budget || "NC", 45, y + 20);

        // Délai
        doc.setFillColor(...colors.primary);
        doc.circle(120, y + 14, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text("J", 118.5, y + 17);

        doc.setTextColor(...colors.textLight);
        doc.setFontSize(8);
        doc.text("DELAI", 135, y + 10);
        doc.setTextColor(...colors.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(data.deadline || "NC", 135, y + 20);

        y += 38; // Espace après estimation

        // === 4. FONCTIONNALITÉS ===
        y = checkPageBreak(y, 40);
        y = addSectionTitle("Fonctionnalites", y);

        if (data.features && data.features.length > 0) {
            const featureYStart = y;
            let currentX = 20;
            let currentY = featureYStart;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.textMain);

            // Affichage en mode "Tags" ou liste compacte 2 colonnes
            data.features.forEach((feat, index) => {
                if (index % 2 === 0) currentX = 20;
                else currentX = 110;

                if (index > 0 && index % 2 === 0) currentY += 7;

                doc.setFillColor(...colors.success);
                doc.circle(currentX, currentY - 1, 1.5, 'F');
                doc.text(feat, currentX + 5, currentY);
            });
            y = currentY + 12;
        } else {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(...colors.textLight);
            doc.text("Aucune selectionnee.", 20, y);
            y += 10;
        }

        // === 5. DESCRIPTION ===
        y += 5;
        if (data.project_description) {
            y = checkPageBreak(y, 40);
            y = addSectionTitle("Description", y);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.textMain);

            const splitDesc = doc.splitTextToSize(data.project_description, 175);
            doc.text(splitDesc, 20, y);
        }

        // === FOOTER (Fixe en bas de page) ===
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(200, 200, 200);
            doc.line(15, 280, 195, 280);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("ModernWeb Lille - Devis & Cahier des Charges", 15, 286);
            doc.text("Page " + i + "/" + pageCount, 185, 286);
        }

        return doc;
    }
    // --- Upload to Supabase Storage & Database ---
    async function uploadToSupabase(data, pdfBlob) {
        if (!supabaseClient) return null;

        try {
            // Upload PDF to storage
            const fileName = `brief_${Date.now()}_${data.user_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

            const { error: uploadError } = await supabaseClient.storage
                .from('project-images')
                .upload(`briefs/${fileName}`, pdfBlob, { contentType: 'application/pdf' });

            if (uploadError) console.error('Upload error:', uploadError);

            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from('project-images')
                .getPublicUrl(`briefs/${fileName}`);

            const pdfUrl = urlData?.publicUrl || '';

            // Save to database
            const { error: dbError } = await supabaseClient
                .from('client_briefs')
                .insert([{
                    client_name: data.user_name,
                    client_email: data.user_email,
                    project_type: data.project_type,
                    pdf_url: pdfUrl,
                    status: 'nouveau',
                    notes: JSON.stringify({
                        phone: data.user_phone || '',
                        company: data.user_company || '',
                        sector: data.sector || '',
                        design_style: data.design_style,
                        has_website: data.has_website || '',
                        has_branding: data.has_branding || '',
                        page_count: data.page_count || '',
                        project_description: data.project_description || '',
                        budget: data.budget,
                        deadline: data.deadline,
                        features: data.features
                    })
                }]);

            if (dbError) console.error('Database error:', dbError);

            return pdfUrl;
        } catch (err) {
            console.error('Supabase error:', err);
            return null;
        }
    }

    // --- Email Sending via PHP Backend ---
    async function sendEmailsViaPHP(data, pdfUrl) {
        // Préparation des données pour l'API PHP
        const payload = {
            user_name: data.user_name,
            user_email: data.user_email,
            user_phone: data.user_phone,
            user_company: data.user_company,
            sector: data.sector,
            project_type: data.project_type,
            design_style: data.design_style,
            has_website: data.has_website,
            has_branding: data.has_branding,
            page_count: data.page_count,
            project_description: data.project_description,
            budget: data.budget,
            deadline: data.deadline,
            features: data.features && data.features.length > 0 ? data.features : [],
            pdf_url: pdfUrl
        };

        try {
            const response = await fetch('../api/send-email.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('📧 Réponse email:', result.message);

        } catch (error) {
            console.error('Erreur envoi email:', error);
            // On ne bloque pas le flux utilisateur même si l'email échoue
        }
    }

    // --- Success Message ---
    function showSuccessMessage(data) {
        const wizardCard = document.querySelector('.wizard-card');
        wizardCard.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    <i class="fas fa-check" style="font-size: 2.5rem; color: white;"></i>
                </div>
                <h2 style="color: #1e293b; margin-bottom: 1rem;">Votre projet a été défini ! 🎉</h2>
                <p style="color: #64748b; margin-bottom: 2rem; line-height: 1.6;">
                    Merci <strong>${data.user_name}</strong> !<br>
                    Le PDF récapitulatif a été téléchargé.<br>
                    Nous avons bien reçu votre demande.
                </p>
                <a href="../index.html" class="btn btn-primary">
                    Retour à l'accueil <i class="fas fa-home ml-2"></i>
                </a>
            </div>
        `;
    }
});
