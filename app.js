let participants = [];
let dailyTotalCount = 0;
let timerInterval;

// --- NUEVAS VARIABLES GLOBALES ---
let isMuted = false;
const muteToggleBtn = document.getElementById('mute-toggle');
const muteIcon = document.getElementById('mute-icon');
const alarmSound = document.getElementById('alarm-sound');

const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const currentDateEl = document.getElementById('current-date');
const countNumberEl = document.getElementById('count-number');
const activeNumberEl = document.getElementById('active-number');
const resetBtn = document.getElementById('reset-btn');
const showAddFormBtn = document.getElementById('show-add-form-btn');
const addForm = document.getElementById('add-form');
const participantNameInput = document.getElementById('participant-name');
const paidStatusRadios = document.querySelectorAll('input[name="paid-status"]');
const paymentMethodSection = document.getElementById('payment-method-section');
const paymentMethodSelect = document.getElementById('payment-method');
const start15Btn = document.getElementById('start-15-btn');
const start20Btn = document.getElementById('start-20-btn');
const participantListEl = document.getElementById('participant-list');

function init() {
    setupDate();
    loadTheme();
    loadData();
    renderAllParticipants();
    updateCountsUI();
    loadMuteStatus();
    
    timerInterval = setInterval(tick, 1000);

    themeToggleBtn.addEventListener('click', toggleTheme);
    resetBtn.addEventListener('click', handleResetApp);

    const cleanOldBtn = document.getElementById('clean-old-btn');
    if (cleanOldBtn) {
        cleanOldBtn.addEventListener('click', clearCompletedParticipants);
    }
    
    muteToggleBtn.addEventListener('click', toggleMute);
    
    showAddFormBtn.addEventListener('click', () => {
        addForm.classList.toggle('hidden');
        if (!addForm.classList.contains('hidden')) participantNameInput.focus();
    });

    paidStatusRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            paymentMethodSection.classList.toggle('hidden', e.target.value !== 'si');
        });
    });

    start15Btn.addEventListener('click', () => handleAddParticipant(15));
    start20Btn.addEventListener('click', () => handleAddParticipant(20));
}

// --- LOGICA DE DATOS ---
function loadData() {
    const savedParticipants = localStorage.getItem('gameTrackerParticipants');
    if (savedParticipants) participants = JSON.parse(savedParticipants);
    const savedCount = localStorage.getItem('gameTrackerTotalCount');
    if (savedCount) dailyTotalCount = parseInt(savedCount, 10);
}

function saveData() {
    localStorage.setItem('gameTrackerParticipants', JSON.stringify(participants));
    localStorage.setItem('gameTrackerTotalCount', dailyTotalCount.toString());
    updateCountsUI();
    
    checkStorageQuota(); 
}

function updateCountsUI() {
    countNumberEl.textContent = dailyTotalCount;
    const now = Date.now();
    const activeCount = participants.filter(p => p.endTime > now).length;
    activeNumberEl.textContent = activeCount;
}

// --- ACCIONES ---
function handleAddParticipant(minutes) {
    const name = participantNameInput.value.trim();
    if (!name) return;

    const isPaid = document.querySelector('input[name="paid-status"]:checked').value === 'si';
    if (isPaid && !paymentMethodSelect.value) {
        alert("Por favor, selecciona un método de pago.");
        return;
    }

    const newParticipant = {
        id: Date.now().toString(),
        name: name,
        initialTime: minutes,
        startTime: Date.now(),
        paymentStatus: isPaid ? paymentMethodSelect.value : 'pendiente',
        endTime: Date.now() + (minutes * 60 * 1000),
        hasLeft: false,
        alarmPlayed: false // NUEVA PROPIEDAD: Evita que la alarma suene múltiples veces
    };

    participants.unshift(newParticipant); 
    dailyTotalCount++; 
    saveData();
    
    // Reset form
    participantNameInput.value = '';
    paymentMethodSelect.value = '';
    addForm.classList.add('hidden');
    renderAllParticipants();
}

window.confirmExit = function(id, isChecked) {
    if (!isChecked) return; 

    if (confirm("¿Confirmar que el participante salió del inflable?")) {
        const pIndex = participants.findIndex(p => p.id === id);
        if (pIndex > -1) {
            participants[pIndex].hasLeft = true;
            saveData();
            
            const card = document.getElementById(`card-${id}`);
            if (card) card.classList.add('completed');
            
            const checkbox = document.getElementById(`exit-checkbox-${id}`);
            if (checkbox) checkbox.disabled = true;
        }
    } else {
        const checkbox = document.getElementById(`exit-checkbox-${id}`);
        if (checkbox) checkbox.checked = false;
    }
}

window.toggleResolveMethod = function(id, isChecked) {
    const box = document.getElementById(`resolve-box-${id}`);
    box.classList.toggle('hidden', !isChecked);
}

window.confirmPayment = function(id) {
    const methodSelect = document.getElementById(`resolve-method-${id}`);
    if (!methodSelect.value) { alert("Selecciona método"); return; }
    const pIndex = participants.findIndex(p => p.id === id);
    if (pIndex > -1) {
        participants[pIndex].paymentStatus = methodSelect.value;
        saveData();
        renderAllParticipants();
    }
}

function removeParticipant(id) {
    if (confirm("¿Eliminar registro?")) {
        participants = participants.filter(p => p.id !== id);
        saveData();
        renderAllParticipants();
    }
}

function handleResetApp() {
    if (confirm("¿Reiniciar todo el día? Se borran todos los datos")) {
        participants = [];
        dailyTotalCount = 0;
        saveData();
        renderAllParticipants();
    }
}

function renderAllParticipants() {
    participantListEl.innerHTML = '';
    participants.forEach(p => {
        const li = document.createElement('li');
        li.id = `card-${p.id}`;
        li.className = `participant-card ${p.hasLeft ? 'completed' : ''}`;

            let startTimestamp = p.startTime || (p.endTime - (p.initialTime * 60 * 1000));
            let startTimeString = new Date(startTimestamp).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });
                
        // Bloque de Pago Pendiente
        let pendingHtml = p.paymentStatus === 'pendiente' ? `
            <div class="pending-box">
                <label><input type="checkbox" onchange="toggleResolveMethod('${p.id}', this.checked)"> Confirmar pago</label>
                <div id="resolve-box-${p.id}" class="hidden resolve-flex">
                    <select id="resolve-method-${p.id}" class="custom-select">
                        <option value="" disabled selected>Método</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                    </select>
                    <button class="small-btn" onclick="confirmPayment('${p.id}')">OK</button>
                </div>
            </div>` : '';

        let exitHtml = `
                <div id="exit-control-${p.id}" class="exit-box hidden">
                    <label class="exit-label">
                        <input type="checkbox" id="exit-checkbox-${p.id}" ${p.hasLeft ? 'checked disabled' : ''} onchange="confirmExit('${p.id}', this.checked)">
                        <span class="material-icons">logout</span> ¿Salió del inflable?
                    </label>
                </div>
            `;

            li.innerHTML = `
                <div class="card-header">
                    <div class="p-info">
                        <span class="p-name">${p.name}</span>
                        <div class="badges">
                            <span class="badge b-time">${p.initialTime} min</span>
                            <span class="badge b-${p.paymentStatus}">${p.paymentStatus}</span>
                        </div>
                    </div>
                    <span class="p-timer" id="timer-${p.id}">--:--</span>
                </div>
                ${pendingHtml}
                ${exitHtml}
                <div class="card-actions">
                    <span class="start-time-label">Hora Inicio: ${startTimeString}</span>
                    <button class="delete-btn" onclick="removeParticipant('${p.id}')">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            `;

        participantListEl.appendChild(li);
        updateParticipantCardDOM(p, li);
    });
}

function tick() {
    const now = Date.now();
    participants.forEach(p => {
        const cardEl = document.getElementById(`card-${p.id}`);
        if (cardEl) updateParticipantCardDOM(p, cardEl, now);
    });
    updateCountsUI();
}

function updateParticipantCardDOM(participant, cardElement, currentTime = Date.now()) {
    const timerEl = cardElement.querySelector(`#timer-${participant.id}`);
    const exitControl = cardElement.querySelector(`#exit-control-${participant.id}`);
    const timeDiff = participant.endTime - currentTime;
    
    if (timeDiff <= 0) {
        timerEl.textContent = "00:00";

        if (!cardElement.classList.contains('time-up')) {
            cardElement.classList.add('time-up');
            if (exitControl) exitControl.classList.remove('hidden');
        }

        // NUEVA LÓGICA: Solo suena si no ha sonado antes para este participante
        if (!participant.alarmPlayed) {
            participant.alarmPlayed = true;
            saveData(); // Guardamos para que al recargar la página no vuelva a sonar
            
            playAlarm();
            if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        }
    } else {
        cardElement.classList.remove('time-up');
        if(exitControl && !participant.hasLeft) exitControl.classList.add('hidden');
        
        const totalSeconds = Math.floor(timeDiff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function setupDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('es-ES', options);
}

function toggleTheme() {
    const htmlEl = document.documentElement;
    const newTheme = htmlEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    htmlEl.setAttribute('data-theme', newTheme);
    themeIcon.textContent = newTheme === 'light' ? 'dark_mode' : 'light_mode';
    localStorage.setItem('gameTrackerTheme', newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('gameTrackerTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeIcon.textContent = savedTheme === 'light' ? 'dark_mode' : 'light_mode';
}

// --- LOGICA DE SONIDO Y MUTE ---

function loadMuteStatus() {
    const savedMute = localStorage.getItem('gameTrackerMuted');
    isMuted = savedMute === 'true';
    updateMuteUI();
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('gameTrackerMuted', isMuted);
    updateMuteUI();
}

function updateMuteUI() {
    muteIcon.textContent = isMuted ? 'volume_off' : 'volume_up';
    muteToggleBtn.classList.toggle('is-muted', isMuted);
}

function playAlarm() {
    if (!isMuted) {
        alarmSound.currentTime = 0; // Reinicia el audio por si suena seguido
        alarmSound.play().catch(e => console.log("El navegador bloqueó el audio hasta que haya interacción."));
    }
}


function checkStorageQuota() {
    let totalBytes = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalBytes += ((localStorage[key].length + key.length) * 2); 
        }
    }
    
    const maxBytes = 5 * 1024 * 1024; // Límite estándar de 5MB
    const warningThreshold = maxBytes * 0.8; // Advertir al 80% (4MB)
    
    if (totalBytes > warningThreshold) {
        alert("⚠️ ATENCIÓN: La memoria del navegador está casi llena. Por favor, elimina a los participantes que ya salieron para evitar que la aplicación deje de guardar.");
    }
}

function clearCompletedParticipants() {
    const initialCount = participants.length;
    const activeParticipants = participants.filter(p => !p.hasLeft);
    
    const removedCount = initialCount - activeParticipants.length;
    
    if (removedCount === 0) {
        alert("No hay registros completados para limpiar.");
        return;
    }

    if (confirm(`¿Deseas borrar los ${removedCount} registros de los niños que ya salieron del inflable para liberar espacio?`)) {
        participants = activeParticipants;
        saveData(); // Esto actualizará el localStorage
        renderAllParticipants();
        alert("✅ Limpieza de memoria exitosa.");
    }
}

document.addEventListener('DOMContentLoaded', init);