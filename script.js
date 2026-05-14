document.addEventListener('DOMContentLoaded', () => {
    const editorView = document.getElementById('editor-view');
    const resultView = document.getElementById('result-view');
    const visaForm = document.getElementById('visa-form');
    
    // Form Inputs
    const photoUpload = document.getElementById('photo-upload');
    const photoPreview = document.getElementById('photo-preview');
    
    // Buttons
    const btnEdit = document.getElementById('btn-edit');
    const btnPrint = document.getElementById('btn-print');
    const btnCopy = document.getElementById('btn-copy');
    const shareUrlInput = document.getElementById('share-url-input');
    
    let base64ImageHD = '';
    let base64ImageShare = ''; // Medium quality for cross-browser sharing via URL hash

    // Handle Photo Upload
    photoUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                // Full HD for local display
                base64ImageHD = event.target.result;
                
                const img = new Image();
                img.onload = function() {
                    // Medium quality image for URL hash (cross-browser sharing)
                    // Width: 120px is enough for a passport-style photo and keeps hash manageable
                    const canvasShare = document.createElement('canvas');
                    const MAX_WIDTH = 120;
                    const scale = MAX_WIDTH / img.width;
                    canvasShare.width = MAX_WIDTH;
                    canvasShare.height = img.height * scale;
                    const ctx = canvasShare.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvasShare.width, canvasShare.height);
                    base64ImageShare = canvasShare.toDataURL('image/jpeg', 0.5);
                    
                    // Show preview in form
                    photoPreview.src = base64ImageHD;
                    photoPreview.classList.remove('hidden');
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Form Submission
    visaForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!base64ImageHD) {
            alert('Please upload a photo first.');
            return;
        }

        const visaData = {
            visaNo: document.getElementById('in-visa-no').value,
            religion: document.getElementById('in-religion').value,
            passportExp: document.getElementById('in-passport-exp').value,
            issueDate: document.getElementById('in-issue-date').value,
            validUntil: document.getElementById('in-valid-until').value,
            nationality: document.getElementById('in-nationality').value,
            dob: document.getElementById('in-dob').value,
            sex: document.getElementById('in-sex').value,
            mrz1: document.getElementById('in-mrz-1').value,
            mrz2: document.getElementById('in-mrz-2').value,
            photoHD: base64ImageHD,
            photoShare: base64ImageShare
        };

        generateAndDisplay(visaData);
    });

    function generateAndDisplay(data) {
        // --- URL STRATEGY ---
        // 1. Query string (?data=...) = TEXT ONLY, short → used for QR code
        // 2. Hash fragment (#photo=...) = COMPRESSED PHOTO → unlimited, works in any browser
        
        const baseUrl = window.location.href.split('?')[0].split('#')[0];

        // Build short text-only payload for QR code
        const textData = {
            visaNo: data.visaNo,
            religion: data.religion,
            passportExp: data.passportExp,
            issueDate: data.issueDate,
            validUntil: data.validUntil,
            nationality: data.nationality,
            dob: data.dob,
            sex: data.sex,
            mrz1: data.mrz1,
            mrz2: data.mrz2
        };
        const encodedText = btoa(encodeURIComponent(JSON.stringify(textData)));

        // Short QR URL (text only)
        const qrUrl = `${baseUrl}?data=${encodedText}`;

        // Full share URL: text in query + photo in hash (works across ALL browsers)
        const encodedPhoto = btoa(data.photoShare || '');
        const shareUrl = `${baseUrl}?data=${encodedText}#photo=${encodedPhoto}`;

        // Populate the visa card locally (uses HD photo)
        populateVisaCard(data);

        // Generate QR code (short URL, text only)
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '';
        try {
            new QRCode(qrContainer, {
                text: qrUrl,
                width: 250,
                height: 250,
                colorDark: "#0F6B59",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (err) {
            console.error("QR Code generation failed:", err);
            qrContainer.innerHTML = '<p style="color:red;font-size:12px;">QR generation failed.</p>';
        }

        // Show full share URL (with photo in hash)
        shareUrlInput.value = shareUrl;

        // Switch to result view
        editorView.classList.remove('active');
        resultView.classList.remove('hidden');
        resultView.classList.add('active');
    }

    function populateVisaCard(data) {
        const outPhoto = document.getElementById('out-photo');

        // Priority: HD (local upload) → shared photo → placeholder
        const photoSrc = data.photoHD || data.photoShare;
        if (photoSrc) {
            outPhoto.src = photoSrc;
        } else {
            outPhoto.style.background = '#ddd';
        }

        document.getElementById('out-visa-no').textContent = data.visaNo || '';
        document.getElementById('out-religion').textContent = data.religion || '';
        document.getElementById('out-passport-exp').textContent = data.passportExp || '';
        document.getElementById('out-issue-date').textContent = data.issueDate || '';
        document.getElementById('out-valid-until').textContent = data.validUntil || '';
        document.getElementById('out-nationality').textContent = data.nationality || '';
        document.getElementById('out-dob').textContent = data.dob || '';
        document.getElementById('out-sex').textContent = data.sex || '';
        document.getElementById('out-mrz-1').textContent = data.mrz1 || '';
        document.getElementById('out-mrz-2').textContent = data.mrz2 || '';
    }

    // Back Button
    btnEdit.addEventListener('click', () => {
        resultView.classList.remove('active');
        resultView.classList.add('hidden');
        editorView.classList.add('active');
        window.history.pushState({}, document.title, window.location.pathname);
    });

    // Print Button
    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // Copy URL
    btnCopy.addEventListener('click', () => {
        shareUrlInput.select();
        navigator.clipboard.writeText(shareUrlInput.value).catch(() => {
            document.execCommand('copy');
        });
        const originalText = btnCopy.textContent;
        btnCopy.textContent = 'Copied!';
        setTimeout(() => { btnCopy.textContent = originalText; }, 2000);
    });

    // Load from URL on page open
    function checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');

        if (dataParam) {
            try {
                const decodedJson = decodeURIComponent(atob(dataParam));
                const data = JSON.parse(decodedJson);

                // Try to extract photo from URL hash (#photo=...)
                const hash = window.location.hash;
                const photoMatch = hash.match(/[#&]photo=([^&]*)/);
                if (photoMatch && photoMatch[1]) {
                    try {
                        data.photoShare = atob(photoMatch[1]);
                    } catch (e) {
                        console.warn('Could not decode photo from hash');
                    }
                }

                populateVisaCard(data);

                editorView.classList.remove('active');
                resultView.classList.remove('hidden');
                resultView.classList.add('active');

                // Hide QR & back button for viewer mode
                document.querySelector('.qr-container').style.display = 'none';
                btnEdit.style.display = 'none';
            } catch (e) {
                console.error("Failed to parse data parameter", e);
                alert("Invalid Visa Data URL");
            }
        }
    }

    checkUrlParameters();
});
