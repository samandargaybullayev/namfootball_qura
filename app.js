// 24 ta jamoa ro'yxati
const ALL_TEAMS = [
  "Bozorça",
  "Everest",
  "Granit Elite",
  "Jahon Qurilish mebel",
  "Usta Tom",
  "Mubashshir Avto",
  "Usta Pro Max",
  "Sevimli Lavash",
  "Manchester United",
  "Marjon Iplari",
  "Dorixona 404",
  "Arsenal",
  "Parfume",
  "Darko Plus",
  "Elegant",
  "Berlak",
  "Zafar 17",
  "Bohoka",
  "Olvalizor",
  "Mister M",
  "Yandama",
  "Oromgoh Bakery",
  "Zarbdor",
  "Ziyokor"
];

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SLOTS_PER_GROUP = 4;
const STORAGE_KEY = 'namfootball_draw_state_24_v1';

// DOM elementlar
const teamCardList = document.getElementById('teamCardList');
const groupsContainer = document.getElementById('groups');
const teamSearch = document.getElementById('teamSearch');
const clearSearch = document.getElementById('clearSearch');
const remainingBadge = document.getElementById('remainingBadge');
const placedCountEl = document.getElementById('placedCount');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const soundToggle = document.getElementById('soundToggle');
const toastEl = document.getElementById('toast');

// Holat (State)
let state = {
  groups: Object.fromEntries(GROUPS.map(g => [g, [null, null, null, null]]))
};

let selectedTeam = null;
let soundEnabled = true;
let draggedItem = null; // { type: 'sidebar' | 'slot', team: string, group?: string, slotIndex?: number }
let celebrationFired = false;

// Audio Context (Web Audio API orqali toza va tezkor ovozlar)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'select') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'place') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'remove') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'fanfare') {
      // 3 qisqa nota
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.15, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.35);
      });
    }
  } catch (e) {
    console.warn("Audio error:", e);
  }
}

// Xabarnoma (Toast)
let toastTimer = null;
function showToast(message, icon = 'info') {
  if (toastTimer) clearTimeout(toastTimer);
  const icons = {
    info: '<i class="fa-solid fa-circle-info" style="color:#00f2ff"></i>',
    success: '<i class="fa-solid fa-circle-check" style="color:#10b981"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b"></i>'
  };
  toastEl.innerHTML = `${icons[icon] || icons.info} <span>${message}</span>`;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2600);
}

// Saqlash va yuklash (LocalStorage)
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.groups) {
        state = parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load state, starting fresh", e);
  }
}

// Qayerda joylashganini aniqlash
function findTeamPlacement(teamName) {
  for (const g of GROUPS) {
    const slotIdx = state.groups[g].indexOf(teamName);
    if (slotIdx !== -1) {
      return { group: g, slotIndex: slotIdx };
    }
  }
  return null;
}

// Jamoani slotga joylash
function placeTeam(teamName, targetGroup, targetSlotIndex) {
  if (!teamName) return;

  // Agar bu jamoa boshqa slotda turgan bo'lsa, avvalgi slotini bo'shatamiz
  const prev = findTeamPlacement(teamName);
  if (prev) {
    state.groups[prev.group][prev.slotIndex] = null;
  }

  // Agar target slotda allaqachon boshqa jamoa turgan bo'lsa
  const currentOccupant = state.groups[targetGroup][targetSlotIndex];
  if (currentOccupant && prev) {
    // Agar oldingi joyi bo'lsa (swap)
    state.groups[prev.group][prev.slotIndex] = currentOccupant;
  }

  // Yangi slotga joylashtiramiz
  state.groups[targetGroup][targetSlotIndex] = teamName;

  selectedTeam = null;
  document.body.classList.remove('has-selected');

  playSound('place');
  saveState();
  renderAll();
  showToast(`<strong>${teamName}</strong> -> Guruh ${targetGroup} ga joylandi!`, 'success');
  checkFullCompletion();
}

// Slotdan jamoani chiqarish
function removeTeam(group, slotIndex, e) {
  if (e) e.stopPropagation();
  const teamName = state.groups[group][slotIndex];
  if (!teamName) return;

  state.groups[group][slotIndex] = null;
  playSound('remove');
  saveState();
  renderAll();
  showToast(`<strong>${teamName}</strong> guruhdan qaytarildi`, 'info');
}

// Chap tomondagi kartochkalarni render qilish
function renderSidebar() {
  const query = (teamSearch.value || '').trim().toLowerCase();
  clearSearch.style.display = query.length > 0 ? 'block' : 'none';

  teamCardList.innerHTML = '';

  let placedTotal = 0;

  ALL_TEAMS.forEach((team) => {
    const placement = findTeamPlacement(team);
    const isPlaced = !!placement;
    if (isPlaced) placedTotal++;

    // Qidiruv filtri
    if (query && !team.toLowerCase().includes(query)) {
      return;
    }

    const card = document.createElement('div');
    card.className = `team-card ${isPlaced ? 'placed' : ''} ${selectedTeam === team ? 'selected' : ''}`;
    card.draggable = true;
    card.setAttribute('data-team', team);

    // Qisqartma (Initials)
    const initials = team.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    card.innerHTML = `
      <div class="team-info">
        <div class="team-avatar">${initials}</div>
        <div class="team-name" title="${team}">${team}</div>
      </div>
      <div class="team-card-actions">
        ${isPlaced ? `<span class="team-badge-group">Guruh ${placement.group}</span>` : ''}
      </div>
    `;

    // Click handler
    card.addEventListener('click', () => {
      if (selectedTeam === team) {
        // Deselect
        selectedTeam = null;
        document.body.classList.remove('has-selected');
        playSound('select');
      } else {
        selectedTeam = team;
        document.body.classList.add('has-selected');
        playSound('select');
        showToast(`<strong>${team}</strong> tanlandi. Endi guruh slotini bosing!`, 'info');
      }
      renderSidebar();
    });

    // Drag handlers
    card.addEventListener('dragstart', (e) => {
      draggedItem = { type: 'sidebar', team: team };
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', team);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedItem = null;
      document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
    });

    teamCardList.appendChild(card);
  });

  const remaining = ALL_TEAMS.length - placedTotal;
  remainingBadge.textContent = `${remaining} ta qoldi`;
  placedCountEl.textContent = placedTotal;
}

// Guruhlarni (Groups) render qilish
function renderGroups() {
  groupsContainer.innerHTML = '';

  GROUPS.forEach(g => {
    const groupEl = document.createElement('div');
    groupEl.className = 'group';

    const placedInGroup = state.groups[g].filter(Boolean).length;
    const isComplete = placedInGroup === SLOTS_PER_GROUP;

    // Header
    const headerEl = document.createElement('div');
    headerEl.className = 'group-header';
    headerEl.innerHTML = `
      <div class="group-title">
        <div class="group-letter-badge">${g}</div>
        <h3>Guruh ${g}</h3>
      </div>
      <span class="group-count ${isComplete ? 'complete' : ''}">${placedInGroup}/${SLOTS_PER_GROUP}</span>
    `;
    groupEl.appendChild(headerEl);

    // Slots container
    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'slots-container';

    state.groups[g].forEach((team, slotIdx) => {
      const slot = document.createElement('div');
      slot.className = `slot ${team ? 'filled' : ''}`;
      slot.id = `slot-${g}-${slotIdx}`;

      if (team) {
        slot.draggable = true;
        slot.innerHTML = `
          <div class="slot-content">
            <span class="slot-order">${slotIdx + 1}</span>
            <span class="slot-team-title" title="${team}">${team}</span>
          </div>
          <button class="slot-remove-btn" title="Guruhdan chiqarish" aria-label="Chiqarish">
            <i class="fa-solid fa-xmark"></i>
          </button>
        `;

        // Remove button
        const removeBtn = slot.querySelector('.slot-remove-btn');
        removeBtn.addEventListener('click', (e) => removeTeam(g, slotIdx, e));

        // Dragging already placed team to another slot
        slot.addEventListener('dragstart', (e) => {
          draggedItem = { type: 'slot', team: team, group: g, slotIndex: slotIdx };
          slot.classList.add('dragging');
          e.dataTransfer.setData('text/plain', team);
          e.dataTransfer.effectAllowed = 'move';
        });

        slot.addEventListener('dragend', () => {
          slot.classList.remove('dragging');
          draggedItem = null;
          document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
        });

      } else {
        // Empty slot
        slot.innerHTML = `
          <div class="slot-placeholder">
            <span class="slot-number">${slotIdx + 1}</span>
            <span>Slot ${slotIdx + 1} (bo'sh)</span>
          </div>
        `;
      }

      // Slot Click Handler
      slot.addEventListener('click', () => {
        if (selectedTeam) {
          placeTeam(selectedTeam, g, slotIdx);
        } else if (team) {
          // If already filled and no new selection, clicking selects this team to move it
          selectedTeam = team;
          document.body.classList.add('has-selected');
          playSound('select');
          showToast(`<strong>${team}</strong> tanlandi. Boshqa slotga o'tkazishingiz mumkin.`, 'info');
          renderSidebar();
        } else {
          showToast("Avval chap tomondan jamoani tanlang yoki sudrab keling", 'warning');
        }
      });

      // Drag over / drop
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        slot.classList.add('drag-over');
      });

      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        const teamName = e.dataTransfer.getData('text/plain') || (draggedItem && draggedItem.team);
        if (teamName) {
          placeTeam(teamName, g, slotIdx);
        }
      });

      slotsContainer.appendChild(slot);
    });

    groupEl.appendChild(slotsContainer);
    groupsContainer.appendChild(groupEl);
  });
}

function renderAll() {
  renderSidebar();
  renderGroups();
}

// Barcha 24 ta jamoa joylashtirilganda bayramona konfetti
function checkFullCompletion() {
  const allPlaced = GROUPS.every(g => state.groups[g].every(t => t !== null));
  if (allPlaced && !celebrationFired) {
    celebrationFired = true;
    playSound('fanfare');
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 }
        });
      }, 400);
    }
    showToast("🎉 Barcha 24 ta jamoa muvaffaqiyatli guruhlandi!", 'success');
  } else if (!allPlaced) {
    celebrationFired = false;
  }
}

// Excel ga yuklab olish
function exportExcel() {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Qura Natijalari</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        th { background-color: #1e293b; color: #ffffff; font-size: 14px; font-weight: bold; padding: 10px; border: 1px solid #cbd5e1; }
        td { font-size: 13px; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
        .group-header { background-color: #3b82f6; color: #ffffff; font-weight: bold; text-align: center; }
      </style>
    </head>
    <body>
      <h2>NamFootball - 24 Ta Jamoa Guruhlash Qura Natijalari</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead>
          <tr>
            <th>Guruh</th>
            <th>Slot 1</th>
            <th>Slot 2</th>
            <th>Slot 3</th>
            <th>Slot 4</th>
          </tr>
        </thead>
        <tbody>
  `;

  GROUPS.forEach(g => {
    const [t1, t2, t3, t4] = state.groups[g].map(t => t || "-");
    html += `
      <tr>
        <td class="group-header">Guruh ${g}</td>
        <td>${t1}</td>
        <td>${t2}</td>
        <td>${t3}</td>
        <td>${t4}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `namfootball_qura_24_natijalari_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Excel fayli yuklab olindi!", 'success');
}

// Barchasini tozalash (Reset)
function resetAll() {
  const hasAnyPlaced = GROUPS.some(g => state.groups[g].some(t => t !== null));
  if (!hasAnyPlaced) {
    showToast("Jamoalar allaqachon toza holatda", 'info');
    return;
  }

  if (confirm("Haqiqatan ham barcha guruhlarni tozalab, boshidan boshlamoqchimisiz?")) {
    state.groups = Object.fromEntries(GROUPS.map(g => [g, [null, null, null, null]]));
    selectedTeam = null;
    document.body.classList.remove('has-selected');
    celebrationFired = false;
    saveState();
    renderAll();
    playSound('remove');
    showToast("Barcha guruhlar tozalandi", 'info');
  }
}

// Qidiruv hodisalari
teamSearch.addEventListener('input', () => renderSidebar());
clearSearch.addEventListener('click', () => {
  teamSearch.value = '';
  renderSidebar();
  teamSearch.focus();
});

// Ovoz tugmasi
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.classList.toggle('active', soundEnabled);
  soundToggle.innerHTML = soundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
  showToast(soundEnabled ? "Ovoz yoqildi" : "Ovoz o'chirildi", 'info');
});

// Tugmalar
resetBtn.addEventListener('click', resetAll);
exportBtn.addEventListener('click', exportExcel);

// Boshlang'ich yuklash
loadState();
renderAll();
