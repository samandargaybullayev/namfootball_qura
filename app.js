const pots = [
  // Slot 1
  [
    "Usta Tom Markazi", "Marjon Iplari", "ChinTech", "Parfume 170",
    "Bozorça", "Mubashshir Avto", "No Mercy", "Mister M"
  ],
  // Slot 2
  [
    "Al-Rizo mebel", "Zafar 17", "AT Truck", "Cosmos",
    "Yandama Do’stlik", "Tunkafonchilar", "Rovuston", "Sanjar Chef"
  ],
  // Slot 3
  [
    "Usta Pro Max", "Arsenal", "AkaUka Quruvchi", "Saad Paint",
    "Berlak", "Alpha Team", "Darko Plus", "Usta Akaxon"
  ],
  // Slot 4
  [
    "Win Plast", "2-maktab", "Sevimli Lavash", "Dominant",
    "Manchester United", "Jahon Qurilish Buildings", "Red Bull", "7Saber"
  ]
];

const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const groupContainer = document.getElementById('groups');
const teamSearch = document.getElementById('teamSearch');
const teamList = document.getElementById('teamList');
const logo = document.getElementById('logo');

let state = {
  remainingPots: pots.map(pot => [...pot]),
  groups: Object.fromEntries(groups.map(g => [g, [null, null, null, null]]))
};

let isRolling = false;
let autoDownloaded = false;

function renderTeams(filter = '') {
  teamList.innerHTML = '';
  state.remainingPots.forEach((pot, potIndex) => {
    pot.filter(t => t.toLowerCase().includes(filter.toLowerCase())).forEach(t => {
      const li = document.createElement('li');
      li.textContent = `${t} (Slot ${potIndex + 1})`;
      teamList.appendChild(li);
    });
  });
}

function renderGroups() {
  if (groupContainer.children.length === 0) {
    for (const g of groups) {
      const div = document.createElement('div'); div.className = 'group';
      const title = document.createElement('h3'); title.textContent = `Guruh ${g}`;
      div.appendChild(title);
      const slotsContainer = document.createElement('div');
      slotsContainer.className = 'slots-container';
      state.groups[g].forEach((team, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.id = `slot-${g}-${i}`;
        slot.addEventListener('click', () => handleSlotClick(g, i));
        slotsContainer.appendChild(slot);
      });
      div.appendChild(slotsContainer);
      groupContainer.appendChild(div);
    }
  }

  for (const g of groups) {
    state.groups[g].forEach((team, i) => {
      const slot = document.getElementById(`slot-${g}-${i}`);
      if (slot) {
        slot.textContent = team || '...';
        if (team) slot.classList.add('filled');
        else slot.classList.remove('filled');
      }
    });
  }

  checkAutoDownload();
}

function handleSlotClick(group, potIndex) {
  if (isRolling) return;
  const current = state.groups[group][potIndex];
  if (current) {
    // Undo: if slot is already filled, click to remove it and return to remaining pot
    state.groups[group][potIndex] = null;
    state.remainingPots[potIndex].push(current);
    renderTeams(teamSearch.value);
    renderGroups();
  } else {
    // Random draw with 5-second rolling animation
    const pot = state.remainingPots[potIndex];
    if (pot.length > 0) {
      isRolling = true;
      const slotEl = document.getElementById(`slot-${group}-${potIndex}`);
      slotEl.classList.add('filled');
      
      const randomIdx = Math.floor(Math.random() * pot.length);
      const pickedTeam = pot.splice(randomIdx, 1)[0];
      
      // Update sidebar immediately to show it's "taken" from pot
      renderTeams(teamSearch.value);
      
      const visualPool = [...pot, pickedTeam];
      
      const rollInterval = setInterval(() => {
        const visualRandom = Math.floor(Math.random() * visualPool.length);
        slotEl.textContent = visualPool[visualRandom];
      }, 100);

      setTimeout(() => {
        clearInterval(rollInterval);
        state.groups[group][potIndex] = pickedTeam;
        slotEl.textContent = pickedTeam;
        isRolling = false;
        renderGroups();
      }, 5000);
    }
  }
}

function checkAutoDownload() {
  const allFilled = groups.every(g => state.groups[g].every(team => team !== null));
  if (allFilled && !autoDownloaded) {
    autoDownloaded = true;
    setTimeout(exportExcel, 1000);
  }
}

function exportExcel() {
  let html = "<table border='1'><tr><th>Group</th><th>Teams</th></tr>";
  for (const g of groups) {
    const members = state.groups[g].filter(Boolean).join('<br>');
    html += `<tr><td>${g}</td><td>${members}</td></tr>`;
  }
  html += "</table>";
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'qura_natijalari.xls';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function resetAll() {
  if (isRolling) return;
  if (confirm("Barchasini tozalash?")) {
    state = {
      remainingPots: pots.map(pot => [...pot]),
      groups: Object.fromEntries(groups.map(g => [g, [null, null, null, null]]))
    };
    autoDownloaded = false;
    renderTeams(); renderGroups();
  }
}

teamSearch.addEventListener('input', e => renderTeams(e.target.value));
logo.addEventListener('click', resetAll);

renderTeams();
renderGroups();
