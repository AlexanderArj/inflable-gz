// --- ESTADO DE LA APLICACIÓN ---
let participants = [];
let dailyTotalCount = 0; // Nueva variable para el acumulado histórico
const DEFAULT_MINUTES = 16;
let timerInterval;

// --- ELEMENTOS DEL DOM ---
// (Mantenemos los mismos selectores...)
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
    loadData(); // Cambiado de loadParticipants a loadData para cargar ambos valores
    renderAllParticipants();
    updateTotalCountUI();
    
    timerInterval = setInterval(tick, 1000);

    themeToggleBtn.addEventListener('click', toggleTheme);
    showAddFormBtn.addEventListener('click', () => {
        addForm.classList.toggle('hidden');
        if (!addForm.classList.contains('hidden')) {
            participantNameInput.focus();
        }
    });
    
    startBtn.addEventListener('click', handleAddParticipant);
}

// --- PERSISTENCIA DE DATOS ---
function loadData() {
    // Cargamos la lista de participantes activos
    const savedParticipants = localStorage.getItem('gameTrackerParticipants');
    if (savedParticipants) {
        participants = JSON.parse(savedParticipants);
    }

    // Cargamos el contador histórico del día
    const savedCount = localStorage.getItem('gameTrackerTotalCount');
    if (savedCount) {
        dailyTotalCount = parseInt(savedCount, 10);
    }
}

function saveData() {
    // Guardamos ambos valores de forma independiente
    localStorage.setItem('gameTrackerParticipants', JSON.stringify(participants));
    localStorage.setItem('gameTrackerTotalCount', dailyTotalCount.toString());
    updateTotalCountUI();
}

function updateTotalCountUI() {
    // Ahora mostramos el acumulado histórico, no el largo del array
    countNumberEl.textContent = dailyTotalCount;
}

// --- LOGICA DE PARTICIPANTES ---

function handleAddParticipant() {
    const name = participantNameInput.value.trim();
    if (!name) return;

    const newParticipant = {
        id: Date.now().toString(),
        name: name,
        endTime: Date.now() + (DEFAULT_MINUTES * 60 * 1000)
    };

    // 1. Añadimos al participante a la lista activa
    participants.unshift(newParticipant); 
    
    // 2. Aumentamos el contador histórico (esto no bajará nunca al borrar)
    dailyTotalCount++; 
    
    // 3. Guardamos todo
    saveData();
    
    participantNameInput.value = '';
    addForm.classList.add('hidden');
    renderAllParticipants();
}

function removeParticipant(id) {
    // Al filtrar, solo afectamos la visibilidad en la lista, 
    // pero no tocamos 'dailyTotalCount'
    participants = participants.filter(p => p.id !== id);
    saveData();
    renderAllParticipants();
}

// ... (Resto de funciones: addTimeToParticipant, toggleTheme, tick, renderAllParticipants, etc., se mantienen igual que en la versión anterior)

// Asegúrate de incluir las funciones de renderizado y el bucle de tiempo que definimos antes
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

function addTimeToParticipant(id, minutesToAdd) {
    const pIndex = participants.findIndex(p => p.id === id);
    if (pIndex > -1) {
        const now = Date.now();
        if (participants[pIndex].endTime < now) {
            participants[pIndex].endTime = now + (minutesToAdd * 60 * 1000);
        } else {
            participants[pIndex].endTime += (minutesToAdd * 60 * 1000);
        }
        saveData();
        updateParticipantCardDOM(participants[pIndex], document.getElementById(`card-${id}`));
    }
}

function tick() {
    const now = Date.now();
    participants.forEach(p => {
        const cardEl = document.getElementById(`card-${p.id}`);
        if (cardEl) {
            updateParticipantCardDOM(p, cardEl, now);
        }
    });
}

function updateParticipantCardDOM(participant, cardElement, currentTime = Date.now()) {
    const timerEl = cardElement.querySelector(`#timer-${participant.id}`);
    const timeDiff = participant.endTime - currentTime;
    
    if (timeDiff <= 0) {
        timerEl.textContent = "00:00";
        if (!cardElement.classList.contains('time-up')) {
            cardElement.classList.add('time-up');
        }
    } else {
        if (cardElement.classList.contains('time-up')) {
            cardElement.classList.remove('time-up');
        }
        const totalSeconds = Math.floor(timeDiff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

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

document.addEventListener('DOMContentLoaded', init);