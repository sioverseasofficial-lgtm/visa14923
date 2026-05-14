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
    let base64ImageQR = '';

    // Handle Photo Upload with Dual Compression
    photoUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                // 1. PERFECT HD Image for immediate local display (Raw Upload)
                base64ImageHD = event.target.result;
                
                const img = new Image();
                img.onload = function() {
                    // 2. Tiny Image exclusively for URL/QR Code
                    const canvasQR = document.createElement('canvas');
                    const MAX_WIDTH = 60; // Extremely small width
                    const scaleQR = MAX_WIDTH / img.width;
                    canvasQR.width = MAX_WIDTH;
                    canvasQR.height = img.height * scaleQR;
                    const ctxQR = canvasQR.getContext('2d');
                    ctxQR.drawImage(img, 0, 0, canvasQR.width, canvasQR.height);
                    base64ImageQR = canvasQR.toDataURL('image/jpeg', 0.3); // High compression
                    
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
            photoQR: base64ImageQR
        };

        generateAndDisplay(visaData);
    });

    function generateAndDisplay(data) {
        // Save the HD photo to localStorage so it can be loaded locally without being in the URL
        if (data.photoHD) {
            localStorage.setItem('visaPhoto', data.photoHD);
        }

        // Create a payload explicitly for the URL
        const urlData = { ...data };
        delete urlData.photoHD; // Remove large photo
        delete urlData.photoQR; // Remove small photo to keep URL short and ensure QR generation
        
        const jsonString = JSON.stringify(urlData);
        // Encode the payload
        const encodedData = btoa(encodeURIComponent(jsonString));
        
        // Generate the URL
        let currentUrl = window.location.href.split('?')[0];
        const generatedUrl = `${currentUrl}?data=${encodedData}`;
        
        // Populate view with the full data (prioritizes photoHD)
        populateVisaCard(data);
        
        // Update QR Code
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = ''; // Clear old QR
        
        try {
            new QRCode(qrContainer, {
                text: generatedUrl,
                width: 250, // Slightly larger QR code to handle dense data
                height: 250,
                colorDark : "#0F6B59",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.L
            });
        } catch (e) {
            console.error("QR Code generation failed, data might still be too long.", e);
            qrContainer.innerHTML = '<p style="color:red;font-size:12px;">Data size exceeded QR limit. Photo excluded.</p>';
        }
        
        shareUrlInput.value = generatedUrl;

        // Switch View
        editorView.classList.remove('active');
        resultView.classList.remove('hidden');
        resultView.classList.add('active');
    }

    function populateVisaCard(data) {
        // Use HD if available, otherwise fallback to the tiny QR photo or localStorage
        let photoSrc = data.photoHD || data.photoQR;
        
        // If photo isn't in data (e.g. loaded from URL), try getting it from localStorage
        if (!photoSrc) {
            photoSrc = localStorage.getItem('visaPhoto');
        }

        const outPhoto = document.getElementById('out-photo');
        if (photoSrc) {
            outPhoto.src = photoSrc;
        } else {
            // Placeholder if completely missing
            outPhoto.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; 
        }
        document.getElementById('out-visa-no').textContent = data.visaNo;
        document.getElementById('out-religion').textContent = data.religion;
        document.getElementById('out-passport-exp').textContent = data.passportExp;
        document.getElementById('out-issue-date').textContent = data.issueDate;
        document.getElementById('out-valid-until').textContent = data.validUntil;
        document.getElementById('out-nationality').textContent = data.nationality;
        document.getElementById('out-dob').textContent = data.dob;
        document.getElementById('out-sex').textContent = data.sex;
        document.getElementById('out-mrz-1').textContent = data.mrz1;
        document.getElementById('out-mrz-2').textContent = data.mrz2;
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
        document.execCommand('copy');
        
        const originalText = btnCopy.textContent;
        btnCopy.textContent = 'Copied!';
        setTimeout(() => {
            btnCopy.textContent = originalText;
        }, 2000);
    });

    // Initialization check for URL parameters
    function checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');
        
        if (dataParam) {
            try {
                const decodedJson = decodeURIComponent(atob(dataParam));
                const data = JSON.parse(decodedJson);
                
                populateVisaCard(data);
                
                editorView.classList.remove('active');
                resultView.classList.remove('hidden');
                resultView.classList.add('active');
                
                document.querySelector('.qr-container').style.display = 'none';
                btnEdit.style.display = 'none';
            } catch (e) {
                console.error("Failed to parse data parameter", e);
                alert("Invalid Visa Data URL");
            }
        }
    }

    // Run check on load
    checkUrlParameters();
});
