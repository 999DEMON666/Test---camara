// ========= VARIABLES GLOBALES Y DE ESTADO =========
let html5QrCodeCounter;
let codigosEscaneados = []; // Array para guardar los códigos del contador
const LOCAL_STORAGE_KEY = 'qr_counter_codes'; // Clave para localStorage

document.addEventListener('DOMContentLoaded', (event) => {
    // Cargar códigos guardados al iniciar la página
    cargarCodigosGuardados(); 
    // Iniciar el escáner del contador cuando la página carga
    iniciarContadorQR();
});

// Cuando la página se cierra o se navega fuera, detener el escáner
window.addEventListener('beforeunload', () => {
    if (html5QrCodeCounter && html5QrCodeCounter.isScanning) {
        html5QrCodeCounter.stop().catch(err => console.error("Error al detener el escáner del contador al salir:", err));
    }
});

// ========= FUNCIONALIDAD: PERSISTENCIA DE DATOS (NUEVO) =========

/**
 * Guarda los códigos escaneados en localStorage.
 */
function guardarCodigos() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(codigosEscaneados));
    } catch (e) {
        console.error("Error al guardar en localStorage:", e);
        // Podrías mostrar un mensaje al usuario si el almacenamiento está lleno o hay otros problemas
    }
}

/**
 * Carga los códigos escaneados desde localStorage al inicio.
 */
function cargarCodigosGuardados() {
    try {
        const storedCodes = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedCodes) {
            codigosEscaneados = JSON.parse(storedCodes);
            actualizarContadorUI();
        }
    } catch (e) {
        console.error("Error al cargar desde localStorage:", e);
        // Si hay un error al parsear, es mejor empezar con una lista vacía
        codigosEscaneados = [];
    }
}


// ========= FUNCIONALIDAD: NUEVO CONTADOR DE QR =========

function iniciarContadorQR() {
    // Ya no reiniciamos codigosEscaneados aquí, se hace en cargarCodigosGuardados()
    // Si quieres que el contador siempre empiece de cero, puedes descomentar la línea de abajo
    // codigosEscaneados = []; 
    actualizarContadorUI();
    
    const mensajesElement = document.getElementById('mensajes-contador');
    html5QrCodeCounter = new Html5Qrcode("qr-reader-counter");
    const config = { fps: 5, qrbox: { width: 250, height: 250 } };

    startCamera(html5QrCodeCounter, config, onScanSuccessCounter, onScanFailure, mensajesElement)
        .then(() => {
            setupAdvancedControls(html5QrCodeCounter, 'counter');
        });
}

function onScanSuccessCounter(decodedText, decodedResult) {
    try {
        const datosQR = JSON.parse(decodedText);
        if (datosQR && typeof datosQR.carrier_data === 'string') {
            const codigoExtraido = datosQR.carrier_data.split('|')[0].trim();
            
            if (codigoExtraido && !codigosEscaneados.includes(codigoExtraido)) {
                playBeep();
                codigosEscaneados.push(codigoExtraido);
                actualizarContadorUI();
                guardarCodigos(); // Guardar después de cada escaneo exitoso
            }
        }
    } catch (e) { 
        // Si no es un JSON o el formato no es el esperado, aún se puede intentar procesar el texto directamente
        const codigoExtraido = decodedText.trim();
        if (codigoExtraido && !codigosEscaneados.includes(codigoExtraido)) {
            playBeep();
            codigosEscaneados.push(codigoExtraido);
            actualizarContadorUI();
            guardarCodigos(); // Guardar después de cada escaneo exitoso
        }
    }
}

function actualizarContadorUI() {
    const contadorDisplay = document.getElementById('contador-display');
    const listaCodigos = document.getElementById('lista-codigos');
    
    contadorDisplay.innerText = codigosEscaneados.length;
    
    listaCodigos.innerHTML = '';
    codigosEscaneados.forEach(codigo => {
        const li = document.createElement('li');
        li.textContent = codigo;
        listaCodigos.appendChild(li);
    });
    listaCodigos.scrollTop = listaCodigos.scrollHeight; // Asegura que se desplace al final
}

function enviarPorCorreo() {
    if (codigosEscaneados.length === 0) {
        alert("No se ha escaneado ningún código para enviar.");
        return;
    }
    const asunto = "Listado de Guías Escaneadas";
    const cuerpo = "Se adjunta el listado de guías escaneadas:\n\n" + codigosEscaneados.join("\n");
    const mailtoLink = `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.location.href = mailtoLink;
}

/**
 * Función para borrar todos los códigos escaneados del contador.
 */
function borrarContador() {
    if (confirm("¿Estás seguro de que quieres borrar la lista completa de códigos escaneados?")) {
        codigosEscaneados = []; // Vacía el array
        actualizarContadorUI(); // Actualiza la interfaz de usuario
        guardarCodigos(); // Guardar el estado vacío
        document.getElementById('mensajes-contador').innerText = "Lista de códigos borrada.";
        setTimeout(() => {
            document.getElementById('mensajes-contador').innerText = "";
        }, 3000); // Borra el mensaje después de 3 segundos
    }
}

/**
 * Función para borrar el último código escaneado de la lista. (NUEVA FUNCIÓN)
 */
function borrarUltimoQr() {
    if (codigosEscaneados.length === 0) {
        document.getElementById('mensajes-contador').innerText = "No hay códigos para borrar.";
        setTimeout(() => {
            document.getElementById('mensajes-contador').innerText = "";
        }, 2000);
        return;
    }

    if (confirm("¿Estás seguro de que quieres borrar el último código escaneado?")) {
        codigosEscaneados.pop(); // Elimina el último elemento del array
        actualizarContadorUI(); // Actualiza la interfaz de usuario
        guardarCodigos(); // Guardar el estado actualizado
        document.getElementById('mensajes-contador').innerText = "Último código borrado.";
        setTimeout(() => {
            document.getElementById('mensajes-contador').innerText = "";
        }, 3000);
    }
}


// ========= FUNCIONES AUXILIARES COMUNES (Cámara, Sonido, Controles) =========
let audioContext;
function playBeep() {
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioContext.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(750, audioContext.currentTime);
        o.connect(audioContext.destination);
        o.start();
        o.stop(audioContext.currentTime + 0.15);
    } catch (e) {
        console.warn("No se pudo reproducir el sonido de beep:", e);
    }
}

function onScanFailure(error) { /* Se ignora, errores menores de escaneo */ }

function startCamera(scannerInstance, config, scanSuccessCallback, scanFailureCallback, messageElement) {
    return Html5Qrcode.getCameras().then(cameras => {
        if (!cameras || cameras.length === 0) {
            messageElement.innerText = "No se encontró ninguna cámara.";
            return Promise.reject("No hay cámaras");
        }
        // Preferir la cámara trasera si está disponible
        const rearCamera = cameras.find(c => c.label.toLowerCase().includes('back')) || cameras[0];
        
        // Es importante detener cualquier escáner previo antes de iniciar uno nuevo
        if (scannerInstance && scannerInstance.isScanning) {
            scannerInstance.stop().catch(err => console.error("Error al detener escáner existente:", err));
        }

        return scannerInstance.start(rearCamera.id, config, scanSuccessCallback, scanFailureCallback);
    }).catch(err => {
        messageElement.innerText = "No se pudo iniciar la cámara. Revisa los permisos.";
        console.error("Error al iniciar la cámara:", err);
    });
}

// -- FUNCIÓN DE CONTROLES AVANZADOS --
function setupAdvancedControls(scannerInstance, suffix) {
    const qrReaderId = `qr-reader-${suffix}`;
    const zoomControlsId = `zoom-controls-${suffix}`;
    const qrReaderElement = document.getElementById(qrReaderId);

    // Es crucial que el scannerInstance ya esté escaneando para obtener las capacidades
    if (!scannerInstance || !scannerInstance.isScanning) {
        setTimeout(() => setupAdvancedControls(scannerInstance, suffix), 500); 
        return;
    }
    
    try {
        const capabilities = scannerInstance.getRunningTrackCapabilities();

        // Control de Linterna
        if (capabilities.torch && !qrReaderElement.querySelector('.torch-button')) {
            const torchButton = document.createElement('button');
            torchButton.className = 'torch-button';
            torchButton.innerHTML = '🔦 Linterna';
            qrReaderElement.appendChild(torchButton);
            let torchOn = false;
            torchButton.addEventListener('click', () => {
                torchOn = !torchOn;
                scannerInstance.applyVideoConstraints({ advanced: [{ torch: torchOn }] })
                    .then(() => torchButton.classList.toggle('torch-on', torchOn))
                    .catch(err => console.error("Error al controlar la linterna:", err));
            });
        }

        // Control de Zoom
        if (capabilities.zoom) {
            const zoomControls = document.getElementById(zoomControlsId);
            zoomControls.style.display = 'flex'; // Asegurarse de que el contenedor de zoom sea visible
            
            // Remover listeners previos para evitar duplicados si se llama varias veces
            document.querySelectorAll(`#${zoomControlsId} .zoom-button`).forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
            });

            [1, 1.5, 2].forEach(level => {
                const zoomButton = document.getElementById(`zoom-${level}x-${suffix}`);
                if (zoomButton) { // Asegurarse de que el botón existe
                    zoomButton.addEventListener('click', () => {
                        scannerInstance.applyVideoConstraints({ advanced: [{ zoom: level }] })
                            .then(() => {
                                document.querySelectorAll(`#${zoomControlsId} .zoom-button`).forEach(btn => btn.classList.remove('active'));
                                zoomButton.classList.add('active');
                            })
                            .catch(err => console.error("Error al aplicar zoom:", err));
                    });
                }
            });
        }
    } catch (e) {
        console.error("Error al configurar controles avanzados (setupAdvancedControls): ", e);
    }
}
