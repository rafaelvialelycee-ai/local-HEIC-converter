document.addEventListener('DOMContentLoaded', () => {
    // --- Éléments du DOM ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadLink = document.getElementById('upload-link');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const fileListContainer = document.getElementById('file-list-container');
    const fileList = document.getElementById('file-list');
    const convertBtn = document.getElementById('convert-btn');
    const convertingSpinner = document.getElementById('converting-spinner');
    const convertText = document.getElementById('convert-text');
    const resultsList = document.getElementById('results-list');
    const downloadAllBtn = document.getElementById('download-all-btn');

    // Tableau pour stocker les objets File
    let filesToConvert = [];
    // Tableau pour stocker les résultats de conversion (Blob/URL)
    let convertedBlobs = [];

    // --- Fonctions utilitaires ---

    /** Formate la taille en octets de manière lisible. */
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    /** Affiche ou masque la liste des fichiers. */
    const toggleFileListVisibility = () => {
        if (filesToConvert.length > 0) {
            fileListContainer.classList.remove('hidden');
        } else {
            fileListContainer.classList.add('hidden');
            resultsList.innerHTML = '<p class="initial-message">Les résultats de conversion s\'afficheront ici.</p>';
            downloadAllBtn.classList.add('hidden');
        }
    };

    /** Affiche les fichiers dans la liste. */
    const renderFiles = () => {
        fileList.innerHTML = '';
        convertedBlobs = []; // Réinitialise les résultats

        filesToConvert.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.dataset.index = index;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'file-item-info';

            // Prévisualisation (miniature simple pour les types compatibles)
            const thumb = document.createElement('img');
            thumb.className = 'file-item-thumb';
            // Montre la vignette uniquement si c'est un format image natif
            if (file.type.startsWith('image/') && !file.type.includes('heic') && !file.type.includes('webp')) {
                const reader = new FileReader();
                reader.onload = (e) => thumb.src = e.target.result;
                reader.readAsDataURL(file);
            } else {
                // Placeholder pour HEIC/WebP ou autres
                thumb.alt = 'Preview not available';
                thumb.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUtaW1hZ2UiPjxwYXRoIGQ9Ik0xNSAxSDljLTIuMiAwLTMgLjgtMyAzdiAxOGMwIDIuMiAuOCAzIDMgM2gxMmMxLjEgMCAyLS45IDItMnYtMy4zNWEuNS41IDAgMCAwLS4xLS4zNkwxNy44NSAxOC4xYS41LjUgMCAwIDEtLjM1LS4xNTZsLTMuMi0zLjJhLjUuNSAwIDAgMC0uMS0uMUwxMiAxMWMtLjItLjItLjUtLjMtLjctLjNIMTBjLS41IDAtLjcgLjMtLjggLjdsLS45IDEtLjktMWEuOC44IDAgMCAwLS45LS4xWiIvPjwvZ3N2Zz4='; // Icône image simple
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-item-name';
            nameSpan.textContent = file.name;

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'file-item-size';
            sizeSpan.textContent = formatBytes(file.size);

            infoDiv.append(thumb, nameSpan);
            item.append(infoDiv, sizeSpan);

            // Bouton de suppression
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'btn btn-secondary';
            removeBtn.style.marginLeft = '10px';
            removeBtn.style.padding = '5px 10px';
            removeBtn.onclick = () => removeFile(index);
            item.append(removeBtn);

            fileList.append(item);
        });
        resultsList.innerHTML = '<p class="initial-message">Cliquez sur "Convertir" pour démarrer.</p>';
        downloadAllBtn.classList.add('hidden');
    };

    /** Supprime un fichier du tableau. */
    const removeFile = (indexToRemove) => {
        filesToConvert = filesToConvert.filter((_, index) => index !== indexToRemove);
        renderFiles();
        toggleFileListVisibility();
    };

    /** Gère l'ajout des fichiers (drag & drop ou sélection). */
    const handleFiles = (files) => {
        const newFiles = Array.from(files).filter(file => {
            // Filtrage basique des types supportés
            const mime = file.type.toLowerCase();
            const supported = mime.startsWith('image/') ||
                              file.name.toLowerCase().endsWith('.heic') ||
                              file.name.toLowerCase().endsWith('.heif') ||
                              file.name.toLowerCase().endsWith('.webp');
            if (!supported) {
                alert(`Format non supporté pour : ${file.name}`);
            }
            return supported;
        });

        filesToConvert.push(...newFiles);
        renderFiles();
        toggleFileListVisibility();
        fileInput.value = ''; // Réinitialise l'input file
    };

    // --- Logique Drag & Drop ---

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // --- Logique Input File ---
    uploadLink.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
    });

    selectFilesBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // --- Logique de Conversion ---

    /** Convertit un WebP Blob/File en un Image Blob (via Canvas, déjà décodé par libwebp). */
    const convertWebPToCanvas = (fileBlob) => {
        return new Promise((resolve, reject) => {
            try {
                // Utilise la fonction globale WebP.default.decode du script CDN
                WebP.default.decode(fileBlob).then(canvas => {
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.95); // Qualité JPG
                }).catch(err => reject(new Error('WebP decoding failed: ' + err)));
            } catch (err) {
                reject(new Error('WebP conversion failed: ' + err.message));
            }
        });
    };

    /** Convertit un HEIC/HEIF File en un Image Blob (via heic2any). */
    const convertHeicToCanvas = async (file) => {
        // heic2any fonctionne mieux avec un Blob
        const blob = file.slice(0, file.size, file.type);
        try {
            // Utilise la fonction globale heic2any du script CDN
            const convertedBlob = await heic2any({
                blob: blob,
                toType: "image/jpeg",
                quality: 0.95
            });
            // heic2any retourne un Blob ou un tableau de Blobs. On prend le premier.
            return Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        } catch (error) {
            throw new Error('HEIC/HEIF conversion failed: ' + error.message);
        }
    };

    /** Convertit les formats natifs (PNG, JPG) ou les formats déjà décodés (via Canvas). */
    const convertNativeToJPG = (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // toBlob pour la conversion JPG
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas toBlob failed (internal error).'));
                    }
                }, 'image/jpeg', 0.95);
            };
            img.onerror = () => {
                reject(new Error('Image failed to load (corrupt or unsupported format for FileReader).'));
            };

            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.onerror = (e) => reject(new Error('FileReader failed to read the file.'));
            reader.readAsDataURL(file); // Utilise Data URL pour charger l'image
        });
    };

    /** Fonction principale de conversion par fichier. */
    const convertFile = async (file) => {
        const name = file.name;
        const mime = file.type.toLowerCase();

        try {
            let jpgBlob;

            if (mime.includes('heic') || mime.includes('heif') || name.toLowerCase().endsWith('.heic') || name.toLowerCase().endsWith('.heif')) {
                jpgBlob = await convertHeicToCanvas(file);
            } else if (mime.includes('webp') || name.toLowerCase().endsWith('.webp')) {
                jpgBlob = await convertWebPToCanvas(file);
            } else if (mime.includes('png') || mime.includes('jpeg')) {
                // Pour PNG/JPG/JPEG, on utilise la conversion Canvas native
                jpgBlob = await convertNativeToJPG(file);
            } else {
                 throw new Error("Format non supporté par le convertisseur (devrait être filtré).");
            }

            // Stocke le résultat
            convertedBlobs.push({
                originalName: name,
                blob: jpgBlob,
                downloadName: name.replace(/\.[^/.]+$/, "") + '.jpg', // Remplace l'extension
                success: true
            });

        } catch (error) {
            console.error('Conversion failed for', name, error);
            // Stocke l'erreur
            convertedBlobs.push({
                originalName: name,
                error: error.message,
                success: false
            });
        }
    };

    /** Met à jour la zone de résultats. */
    const updateResults = () => {
        resultsList.innerHTML = '';

        convertedBlobs.forEach((result) => {
            const item = document.createElement('div');
            item.className = 'result-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'result-item-name';
            nameSpan.textContent = result.originalName;

            const statusSpan = document.createElement('span');
            statusSpan.className = 'result-status';

            item.append(nameSpan, statusSpan);

            if (result.success) {
                item.classList.add('success');
                statusSpan.className += ' status-ok';
                statusSpan.textContent = 'Converti ✅';

                // Bouton de téléchargement
                const downloadLink = document.createElement('a');
                downloadLink.textContent = 'Télécharger le JPG';
                downloadLink.className = 'btn btn-download';
                downloadLink.href = URL.createObjectURL(result.blob);
                downloadLink.download = result.downloadName;
                item.append(downloadLink);
            } else {
                item.classList.add('error');
                statusSpan.className += ' status-error';
                statusSpan.textContent = `Erreur : ${result.error || 'Erreur inconnue'}`;
            }

            resultsList.append(item);
        });

        // Afficher le bouton "Tout télécharger" si au moins une conversion a réussi
        const successfulConversions = convertedBlobs.filter(r => r.success).length;
        if (successfulConversions > 0) {
            downloadAllBtn.classList.remove('hidden');
        } else {
            downloadAllBtn.classList.add('hidden');
        }
    };

    /** Gestionnaire du bouton principal de conversion. */
    convertBtn.addEventListener('click', async () => {
        if (filesToConvert.length === 0) {
            alert('Veuillez d\'abord sélectionner des fichiers à convertir.');
            return;
        }

        convertBtn.disabled = true;
        convertText.textContent = 'Conversion...';
        convertingSpinner.classList.remove('hidden');
        resultsList.innerHTML = '<p class="initial-message">Conversion en cours, veuillez patienter...</p>';

        convertedBlobs = []; // Réinitialise les résultats

        // On utilise un simple for...of pour s'assurer que les conversions sont traitées séquentiellement (meilleure UX)
        for (const file of filesToConvert) {
            await convertFile(file);
            updateResults(); // Met à jour les résultats après chaque fichier
        }

        convertBtn.disabled = false;
        convertText.textContent = 'Convertir en JPG';
        convertingSpinner.classList.add('hidden');
    });

    // --- Logique ZIP (Télécharger Tout) ---
    // Nécessite une librairie externe pour le ZIP côté client.
    // J'utilise ici JSZip, une bibliothèque standard pour cette tâche.
    const addJSZipScript = () => {
        if (!window.JSZip) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            document.head.appendChild(script);
        }
    };

    // Ajoutez le script JSZip si le bouton est cliqué pour la première fois
    downloadAllBtn.addEventListener('click', () => {
        addJSZipScript();
        // Attendre que le script JSZip soit chargé si ce n'est pas le cas.
        if (window.JSZip) {
            downloadAll();
        } else {
            // Un petit délai pour le chargement du script si c'est la première fois.
            setTimeout(downloadAll, 500);
        }
    });

    const downloadAll = async () => {
        if (!window.JSZip) {
            alert("La librairie ZIP n'est pas encore chargée. Veuillez réessayer.");
            return;
        }

        downloadAllBtn.disabled = true;
        downloadAllBtn.textContent = 'Création du ZIP...';

        const zip = new window.JSZip();

        convertedBlobs.filter(r => r.success).forEach(result => {
            // Ajoute le Blob au ZIP. Le second argument 'data' doit être un ArrayBuffer/Blob
            // Ici, le .file gère automatiquement le Blob.
            zip.file(result.downloadName, result.blob);
        });

        const zipBlob = await zip.generateAsync({ type: "blob" });

        // Déclenche le téléchargement du ZIP
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = 'converted_images.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl); // Nettoyage

        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = 'Tout télécharger (ZIP)';
    };

    // Initialisation
    toggleFileListVisibility();
});
