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

    // --- Beautiful PDF Generation (jsPDF) ---
    async function generatePDFDoc(data) {
        // Ensure jsPDF is loaded correctly
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const primaryColor = [37, 99, 235];
        const darkColor = [30, 41, 59];
        const grayColor = [100, 116, 139];
        const lightGray = [241, 245, 249];

        // === HEADER ===
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text("ModernWeb", 20, 25);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text("Cahier des Charges - Projet Web", 20, 35);

        doc.setFontSize(10);
        doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, 140, 35);

        // === CLIENT INFO SECTION ===
        let y = 60;

        doc.setFillColor(...lightGray);
        doc.roundedRect(15, y - 5, 180, 45, 3, 3, 'F');

        doc.setTextColor(...primaryColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Informations Client", 20, y + 5);

        doc.setTextColor(...darkColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        y += 15;

        doc.text(`Nom : ${data.user_name}`, 25, y);
        doc.text(`Email : ${data.user_email}`, 110, y);
        y += 8;

        if (data.user_phone) doc.text(`Telephone : ${data.user_phone}`, 25, y);
        if (data.user_company) doc.text(`Entreprise : ${data.user_company}`, 110, y);
        y += 8;
        if (data.sector) doc.text(`Secteur : ${data.sector}`, 25, y);

        // === PROJECT DETAILS SECTION ===
        y = 115;

        doc.setTextColor(...primaryColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Details du Projet", 20, y);

        y += 12;
        doc.setTextColor(...darkColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        // Boxes
        const drawBox = (label, value, x, bgColor, textColor) => {
            doc.setFillColor(...bgColor);
            doc.roundedRect(x, y - 5, 80, 20, 2, 2, 'F');
            doc.setTextColor(...textColor);
            doc.setFont('helvetica', 'normal');
            doc.text(label, x + 5, y + 2);
            doc.setFont('helvetica', 'bold');
            doc.text(value, x + 5, y + 10);
        };

        drawBox("Type de projet", data.project_type, 20, [236, 253, 245], [22, 101, 52]);
        drawBox("Style visuel", data.design_style, 105, [239, 246, 255], [30, 64, 175]);

        y += 30;

        drawBox("Budget estime", data.budget, 20, [254, 249, 195], [161, 98, 7]);
        drawBox("Delai souhaite", data.deadline, 105, [254, 226, 226], [185, 28, 28]);

        y += 30;

        // Nouvelle ligne avec site existant et logo
        if (data.has_website) drawBox("Site existant", data.has_website, 20, [243, 232, 255], [107, 33, 168]);
        if (data.has_branding) drawBox("Logo/Charte", data.has_branding, 105, [254, 243, 199], [180, 83, 9]);

        y += 25;

        // Nombre de pages
        if (data.page_count) {
            doc.setTextColor(...grayColor);
            doc.setFontSize(10);
            doc.text(`Envergure : ${data.page_count}`, 20, y);
        }

        // === FEATURES SECTION ===
        y = 210;

        doc.setTextColor(...primaryColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Fonctionnalites Demandees", 20, y);

        y += 12;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        if (data.features && data.features.length > 0) {
            doc.setTextColor(...darkColor);
            data.features.forEach(feat => {
                doc.setFillColor(...primaryColor);
                doc.circle(23, y - 1, 1.5, 'F');
                doc.text(feat, 30, y);
                y += 8;
            });
        } else {
            doc.setTextColor(...grayColor);
            doc.text("Aucune fonctionnalite specifique selectionnee.", 25, y);
        }

        // === DESCRIPTION DU PROJET ===
        if (data.project_description && data.project_description.trim()) {
            y += 15;
            doc.setTextColor(...primaryColor);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text("Description du Projet", 20, y);

            y += 10;
            doc.setTextColor(...darkColor);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            // Wrap text to fit page width
            const splitText = doc.splitTextToSize(data.project_description, 170);
            doc.text(splitText, 20, y);
        }

        // === FOOTER ===
        doc.setFillColor(...lightGray);
        doc.rect(0, 270, 210, 30, 'F');

        doc.setTextColor(...grayColor);
        doc.setFontSize(9);
        doc.text("ModernWeb - Creation de sites web sur mesure", 20, 280);
        doc.text("contact@modernweb.fr", 20, 286);
        doc.text("Ce document est un recapitulatif automatique.", 130, 283);

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
