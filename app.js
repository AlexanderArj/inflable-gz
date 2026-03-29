// --- ESTADO DE LA APLICACIÓN ---
let participants = [];
const DEFAULT_MINUTES = 16;
let timerInterval;

// --- ELEMENTOS DEL DOM ---
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const currentDateEl = document.getElementById('current-date');
const countNumberEl = document.getElementById('count-number');
const showAddFormBtn = document.getElementById('show-add-form-btn');
const addForm = document.getElementById('add-form');
const participantNameInput = document.getElementById('participant-name');
const startBtn = document.getElementById('start-btn');
const participantListEl = document.getElementById('participant-list');

// --- INICIALIZACIÓN ---
function init() {
    setupDate();
    loadTheme();
    loadParticipants();
    renderAllParticipants();
    updateTotalCount();
    
    // Iniciar el bucle principal del reloj (se ejecuta cada segundo)
    timerInterval = setInterval(tick, 1000);

    // Event Listeners
    themeToggleBtn.addEventListener('click', toggleTheme);
    showAddFormBtn.addEventListener('click', () => {
        addForm.classList.toggle('hidden');
        if (!addForm.classList.contains('hidden')) {
            participantNameInput.focus();
        }
    });
    
    startBtn.addEventListener('click', handleAddParticipant);
}

// --- FUNCIONES DE FECHA Y TEMA ---
function setupDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('es-ES', options);
}

function toggleTheme() {
    const htmlEl = document.documentElement;
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    htmlEl.setAttribute('data-theme', newTheme);
    themeIcon.textContent = newTheme === 'light' ? 'dark_mode' : 'light_mode';
    localStorage.setItem('gameTrackerTheme', newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('gameTrackerTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeIcon.textContent = savedTheme === 'light' ? 'dark_mode' : 'light_mode';
}

// --- LOGICA DE PARTICIPANTES ---
function loadParticipants() {
    const savedData = localStorage.getItem('gameTrackerParticipants');
    if (savedData) {
        participants = JSON.parse(savedData);
    }
}

function saveParticipants() {
    localStorage.setItem('gameTrackerParticipants', JSON.stringify(participants));
    updateTotalCount();
}

function updateTotalCount() {
    // Cuenta los participantes del día (los que están en el arreglo)
    countNumberEl.textContent = participants.length;
}

function handleAddParticipant() {
    const name = participantNameInput.value.trim();
    if (!name) return;

    const newParticipant = {
        id: Date.now().toString(), // ID único
        name: name,
        endTime: Date.now() + (DEFAULT_MINUTES * 60 * 1000) // Timestamp exacto de finalización
    };

    participants.unshift(newParticipant); // Añadir al principio de la lista
    saveParticipants();
    
    // Resetear formulario
    participantNameInput.value = '';
    addForm.classList.add('hidden');
    
    // Re-renderizar
    renderAllParticipants();
}

function removeParticipant(id) {
    participants = participants.filter(p => p.id !== id);
    saveParticipants();
    renderAllParticipants();
}

function addTimeToParticipant(id, minutesToAdd) {
    const pIndex = participants.findIndex(p => p.id === id);
    if (pIndex > -1) {
        const now = Date.now();
        // Si el tiempo ya había terminado, calculamos a partir de AHORA.
        // Si aún tenía tiempo, se lo sumamos a su tiempo restante (endTime).
        if (participants[pIndex].endTime < now) {
            participants[pIndex].endTime = now + (minutesToAdd * 60 * 1000);
        } else {
            participants[pIndex].endTime += (minutesToAdd * 60 * 1000);
        }
        
        saveParticipants();
        // Forzar una actualización de la tarjeta inmediatamente
        updateParticipantCardDOM(participants[pIndex], document.getElementById(`card-${id}`));
    }
}

// --- RENDERIZADO Y BUCLE DE TIEMPO ---

// Renderiza la lista inicial
function renderAllParticipants() {
    participantListEl.innerHTML = '';
    participants.forEach(p => {
        const li = document.createElement('li');
        li.id = `card-${p.id}`;
        li.className = 'participant-card';
        
        li.innerHTML = `
            <div class="card-header">
                <span class="p-name">${p.name}</span>
                <span class="p-timer" id="timer-${p.id}">--:--</span>
            </div>
            <div class="card-actions">
                <div class="time-btns">
                    <button class="time-btn" onclick="addTimeToParticipant('${p.id}', 5)">+5m</button>
                    <button class="time-btn" onclick="addTimeToParticipant('${p.id}', 10)">+10m</button>
                    <button class="time-btn" onclick="addTimeToParticipant('${p.id}', 16)">+16m</button>
                </div>
                <button class="delete-btn" onclick="removeParticipant('${p.id}')">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `;
        
        participantListEl.appendChild(li);
        updateParticipantCardDOM(p, li);
    });
}

// Bucle que se ejecuta cada segundo
function tick() {
    const now = Date.now();
    participants.forEach(p => {
        const cardEl = document.getElementById(`card-${p.id}`);
        if (cardEl) {
            updateParticipantCardDOM(p, cardEl, now);
        }
    });
}

// Actualiza solo el texto del temporizador y las clases CSS
function updateParticipantCardDOM(participant, cardElement, currentTime = Date.now()) {
    const timerEl = cardElement.querySelector(`#timer-${participant.id}`);
    
    const timeDiff = participant.endTime - currentTime;
    
    if (timeDiff <= 0) {
        // Tiempo terminado
        timerEl.textContent = "00:00";
        if (!cardElement.classList.contains('time-up')) {
            cardElement.classList.add('time-up');
        }
    } else {
        // Aún hay tiempo
        if (cardElement.classList.contains('time-up')) {
            cardElement.classList.remove('time-up');
        }
        
        // Formatear a MM:SS
        const totalSeconds = Math.floor(timeDiff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        
        timerEl.textContent = `${formattedMinutes}:${formattedSeconds}`;
    }
}

// Iniciar app
document.addEventListener('DOMContentLoaded', init);