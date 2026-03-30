let participants = [];
let dailyTotalCount = 0;
let timerInterval;

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
    
    timerInterval = setInterval(tick, 1000);

    themeToggleBtn.addEventListener('click', toggleTheme);
    resetBtn.addEventListener('click', handleResetApp);
    
    showAddFormBtn.addEventListener('click', () => {
        addForm.classList.toggle('hidden');
        if (!addForm.classList.contains('hidden')) participantNameInput.focus();
    });

    paidStatusRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if(e.target.value === 'si') {
                paymentMethodSection.classList.remove('hidden');
            } else {
                paymentMethodSection.classList.add('hidden');
            }
        });
    });

    start15Btn.addEventListener('click', () => handleAddParticipant(15));
    start20Btn.addEventListener('click', () => handleAddParticipant(20));
}

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
}

function updateCountsUI() {
    countNumberEl.textContent = dailyTotalCount;
    
    const now = Date.now();
    const activeCount = participants.filter(p => p.endTime > now).length;
    activeNumberEl.textContent = activeCount;
}

function handleAddParticipant(minutes) {
    const name = participantNameInput.value.trim();
    if (!name) return;

    const isPaid = document.querySelector('input[name="paid-status"]:checked').value === 'si';
    const paymentStatus = isPaid ? paymentMethodSelect.value : 'pendiente';

    const newParticipant = {
        id: Date.now().toString(),
        name: name,
        initialTime: minutes,
        paymentStatus: paymentStatus,
        endTime: Date.now() + (minutes * 60 * 1000)
    };

    participants.unshift(newParticipant); 
    dailyTotalCount++; 
    saveData();
    
    participantNameInput.value = '';
    document.querySelector('input[name="paid-status"][value="si"]').checked = true;
    paymentMethodSection.classList.remove('hidden');
    paymentMethodSelect.value = 'efectivo';
    addForm.classList.add('hidden');
    
    renderAllParticipants();
}

function removeParticipant(id) {
    participants = participants.filter(p => p.id !== id);
    saveData();
    renderAllParticipants();
}

function handleResetApp() {
    const confirmDelete = confirm("¿Estás seguro de que quieres reiniciar la aplicación? Se borrarán todos los participantes y el contador volverá a 0.");
    if (confirmDelete) {
        participants = [];
        dailyTotalCount = 0;
        saveData();
        renderAllParticipants();
    }
}

window.toggleResolveMethod = function(id, isChecked) {
    const box = document.getElementById(`resolve-box-${id}`);
    if(isChecked) {
        box.classList.remove('hidden');
    } else {
        box.classList.add('hidden');
    }
}

window.confirmPayment = function(id) {
    const methodSelect = document.getElementById(`resolve-method-${id}`);
    const pIndex = participants.findIndex(p => p.id === id);
    if (pIndex > -1) {
        participants[pIndex].paymentStatus = methodSelect.value;
        saveData();
        renderAllParticipants();
    }
}

function renderAllParticipants() {
    participantListEl.innerHTML = '';
    participants.forEach(p => {
        const li = document.createElement('li');
        li.id = `card-${p.id}`;
        li.className = 'participant-card';
        
        let pendingHtml = '';
        if (p.paymentStatus === 'pendiente') {
            pendingHtml = `
                <div class="pending-box">
                    <label><input type="checkbox" onchange="toggleResolveMethod('${p.id}', this.checked)"> Confirmar pago realizado</label>
                    <div id="resolve-box-${p.id}" class="hidden resolve-flex">
                        <select id="resolve-method-${p.id}" class="custom-select" style="flex:1; padding:8px;">
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                        </select>
                        <button class="small-btn" onclick="confirmPayment('${p.id}')">Guardar</button>
                    </div>
                </div>
            `;
        }

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
            <div class="card-actions">
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
    let requiresActiveCountUpdate = false;

    participants.forEach(p => {
        const cardEl = document.getElementById(`card-${p.id}`);
        if (cardEl) {
            const changed = updateParticipantCardDOM(p, cardEl, now);
            if (changed) requiresActiveCountUpdate = true;
        }
    });

    updateCountsUI();
}

function updateParticipantCardDOM(participant, cardElement, currentTime = Date.now()) {
    const timerEl = cardElement.querySelector(`#timer-${participant.id}`);
    const timeDiff = participant.endTime - currentTime;
    let stateChanged = false;
    
    if (timeDiff <= 0) {
        timerEl.textContent = "00:00";
        if (!cardElement.classList.contains('time-up')) {
            cardElement.classList.add('time-up');
            stateChanged = true;
        }
    } else {
        if (cardElement.classList.contains('time-up')) {
            cardElement.classList.remove('time-up');
            stateChanged = true;
        }
        const totalSeconds = Math.floor(timeDiff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    return stateChanged;
}

function setupDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
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