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

            // Récupérer le breakdown depuis l'affichage HTML pour l'inclure dans le PDF
            const breakdownItems = [];
            document.querySelectorAll('#estimation-breakdown li').forEach(li => {
                const spans = li.querySelectorAll('span');
                if (spans.length >= 2) {
                    breakdownItems.push({
                        label: spans[0].textContent.trim(),
                        value: spans[1].textContent.trim()
                    });
                }
            });
            data.breakdown = breakdownItems;

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

        let baseBudget = 550; // Base "Low Cost / Démarrage"
        let baseDays = 7; // Délai rapide
        let breakdown = [];

        // === 1. TYPE DE PROJET ===
        const projectTypePricing = {
            'Site Vitrine': { budget: 0, days: 0, label: 'Site Vitrine' },
            'E-commerce': { budget: 400, days: 6, label: 'Option E-commerce' },
            'Portfolio': { budget: 50, days: 1, label: 'Option Portfolio' },
            'Blog/Média': { budget: 80, days: 2, label: 'Option Blog' }
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
            'Moderne & Tech': { budget: 40, days: 1 },
            'Luxe & Élégant': { budget: 150, days: 3 },
            'Coloré & Dynamique': { budget: 40, days: 1 }
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
            baseBudget += 100;
            baseDays += 2;
            breakdown.push({ label: 'Installation (Nouveau site)', value: '+100€ / +2j' });
        } else if (hasWebsite === "Oui, c'est une refonte") {
            baseBudget -= 50; // Remise Refonte
            breakdown.push({ label: 'Remise Refonte', value: '<span style="color:#22c55e">-50€</span>' });
        }

        // === 5. LOGO / CHARTE GRAPHIQUE ===
        const brandingPricing = {
            'Oui, logo + charte': { budget: 0, days: 0 },
            'Juste un logo': { budget: 120, days: 3, label: 'Création Logo' },
            'Non, à créer': { budget: 300, days: 5, label: 'Pack Identité Simple' }
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
            '5-10 pages': { budget: 120, days: 2, label: '5 à 10 pages' },
            '10-20 pages': { budget: 250, days: 4, label: '10 à 20 pages' },
            'Plus de 20 pages': { budget: 450, days: 7, label: 'Plus de 20 pages' }
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
        // Utilsiation d'espaces simples pour éviter les problèmes de caractères dans le PDF
        const budgetText = `${finalBudget.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}€`;

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
        breakdownList.innerHTML = `<li><span>Base technique & Design</span><span>550€ / 7j</span></li>`;

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

    // --- Beautiful PDF Generation (jsPDF) - Charte ModernWeb - UNE SEULE PAGE ---
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
        };

        // === HEADER COMPACT ===
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, 210, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text("ModernWeb", 15, 15);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text("Cahier des Charges", 15, 22);

        doc.setTextColor(200, 220, 255);
        doc.setFontSize(9);
        doc.text(new Date().toLocaleDateString('fr-FR'), 175, 15);

        let y = 35;

        // === 1. CLIENT INFO - COMPACT ===
        doc.setFillColor(...colors.primary);
        doc.rect(15, y, 3, 10, 'F');
        doc.setTextColor(...colors.secondary);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Client", 22, y + 7);

        y += 14;
        doc.setFillColor(...colors.background);
        doc.roundedRect(15, y, 180, 22, 3, 3, 'F');

        doc.setFontSize(7);
        doc.setTextColor(...colors.textLight);
        doc.setFont('helvetica', 'normal');
        doc.text("NOM", 20, y + 6);
        doc.text("EMAIL", 65, y + 6);
        doc.text("TEL", 125, y + 6);
        doc.text("ENTREPRISE", 160, y + 6);

        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.setFont('helvetica', 'bold');
        doc.text((data.user_name || "-").substring(0, 15), 20, y + 14);
        doc.setTextColor(...colors.primary);
        doc.text((data.user_email || "-").substring(0, 22), 65, y + 14);
        doc.setTextColor(...colors.secondary);
        doc.text((data.user_phone || "-").substring(0, 12), 125, y + 14);
        doc.text((data.user_company || "-").substring(0, 15), 160, y + 14);

        y += 28;

        // === 2. DETAILS PROJET - GRILLE COMPACTE ===
        doc.setFillColor(...colors.primary);
        doc.rect(15, y, 3, 10, 'F');
        doc.setTextColor(...colors.secondary);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Projet", 22, y + 7);

        y += 14;

        const drawMiniCard = (label, value, x, yPos, w) => {
            doc.setFillColor(...colors.surface);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, yPos, w, 18, 2, 2, 'FD');

            doc.setFontSize(6);
            doc.setTextColor(...colors.textLight);
            doc.setFont('helvetica', 'normal');
            doc.text(label, x + 3, yPos + 5);

            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            doc.setFont('helvetica', 'bold');
            const val = value && value.length > 18 ? value.substring(0, 16) + ".." : value;
            doc.text(val || "-", x + 3, yPos + 13);
        };

        // Ligne 1 : 3 cartes
        drawMiniCard("TYPE", data.project_type, 15, y, 60);
        drawMiniCard("SECTEUR", data.sector, 77, y, 60);
        drawMiniCard("STYLE", data.design_style, 139, y, 56);

        y += 20;

        // Ligne 2 : 3 cartes
        drawMiniCard("SITE EXISTANT", data.has_website, 15, y, 60);
        drawMiniCard("BRANDING", data.has_branding, 77, y, 60);
        drawMiniCard("NB PAGES", data.page_count, 139, y, 56);

        y += 26;

        // === 3. ESTIMATION - BANDEAU + DÉTAIL ===
        doc.setFillColor(...colors.primary);
        doc.rect(15, y, 3, 10, 'F');
        doc.setTextColor(...colors.secondary);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Estimation", 22, y + 7);

        y += 14;

        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, y, 180, 20, 3, 3, 'FD');

        // Budget
        doc.setFillColor(...colors.primary);
        doc.circle(28, y + 10, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text("€", 28, y + 12.5, { align: 'center' });

        doc.setTextColor(...colors.textLight);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text("BUDGET ESTIME", 38, y + 7);
        doc.setTextColor(...colors.primary);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(data.budget || "A definir", 38, y + 15);

        // Délai
        doc.setFillColor(...colors.primary);
        doc.circle(118, y + 10, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text("J", 118, y + 12.5, { align: 'center' });

        doc.setTextColor(...colors.textLight);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text("DELAI ESTIME", 128, y + 7);
        doc.setTextColor(...colors.primary);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(data.deadline || "A definir", 128, y + 15);

        y += 26;

        // === 3b. DÉTAIL DU BREAKDOWN (uniquement les éléments avec prix) ===
        // Filtrer pour ne garder que les éléments avec des prix (pas les "Inclus")
        const pricedItems = (data.breakdown || []).filter(item =>
            item.value.toLowerCase() !== 'inclus'
        );

        if (pricedItems.length > 0) {
            doc.setFillColor(...colors.background);
            doc.roundedRect(15, y, 180, 6 + pricedItems.length * 6, 3, 3, 'F');

            let bY = y + 5;
            doc.setFontSize(7);

            pricedItems.forEach((item, index) => {
                // Ligne alternée pour lisibilité
                if (index % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(16, bY - 3, 178, 6, 'F');
                }

                // Label à gauche
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colors.textMain);
                doc.text(item.label.substring(0, 40), 20, bY);

                // Prix à droite en bleu
                doc.setTextColor(...colors.primary);
                doc.setFont('helvetica', 'bold');
                doc.text(item.value, 190, bY, { align: 'right' });

                bY += 6;
            });

            y += 8 + pricedItems.length * 6;
        }

        // === 4. FONCTIONNALITÉS - LISTE HORIZONTALE ===
        doc.setFillColor(...colors.primary);
        doc.rect(15, y, 3, 10, 'F');
        doc.setTextColor(...colors.secondary);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Fonctionnalites", 22, y + 7);

        y += 12;

        if (data.features && data.features.length > 0) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.textMain);

            // Afficher en 3 colonnes
            const col1 = data.features.filter((_, i) => i % 3 === 0);
            const col2 = data.features.filter((_, i) => i % 3 === 1);
            const col3 = data.features.filter((_, i) => i % 3 === 2);

            let featY = y;
            col1.forEach((feat, i) => {
                doc.setFillColor(...colors.success);
                doc.circle(18, featY + i * 6, 1.2, 'F');
                doc.text(feat.substring(0, 20), 22, featY + 2 + i * 6);
            });

            col2.forEach((feat, i) => {
                doc.setFillColor(...colors.success);
                doc.circle(80, featY + i * 6, 1.2, 'F');
                doc.text(feat.substring(0, 20), 84, featY + 2 + i * 6);
            });

            col3.forEach((feat, i) => {
                doc.setFillColor(...colors.success);
                doc.circle(142, featY + i * 6, 1.2, 'F');
                doc.text(feat.substring(0, 20), 146, featY + 2 + i * 6);
            });

            y += Math.max(col1.length, col2.length, col3.length) * 6 + 6;
        } else {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(...colors.textLight);
            doc.text("Aucune fonctionnalite selectionnee", 20, y + 2);
            y += 8;
        }

        // === 5. DESCRIPTION - COMPACT ===
        if (data.project_description && data.project_description.trim()) {
            y += 4;
            doc.setFillColor(...colors.primary);
            doc.rect(15, y, 3, 10, 'F');
            doc.setTextColor(...colors.secondary);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text("Description", 22, y + 7);

            y += 12;

            doc.setFillColor(...colors.background);
            doc.roundedRect(15, y, 180, 30, 3, 3, 'F');

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.textMain);

            const splitDesc = doc.splitTextToSize(data.project_description, 170);
            doc.text(splitDesc.slice(0, 5), 20, y + 7); // Max 5 lignes
        }

        // === FOOTER ===
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.line(15, 275, 195, 275);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text("ModernWeb", 15, 282);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.textLight);
        doc.text("Creation de sites web - Lille", 40, 282);

        doc.setFontSize(7);
        doc.text("contact@modernweb.fr | Ce document est une estimation indicative.", 120, 282);

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
