const teams = [
  "Cosmos", "Yandama Do’stlik", "Berlak", "Alpha Team",
  "Win Plast", "Usta Akaxon", "2-maktab", "Sevimli Lavash",
  "Mubashshir Avto", "Arsenal", "AkaUka Quruvchi", "Saad Paint",
  "Sanjar Chef", "Dominant", "Manchester United", "Jahon Qurilish Buildings",
  "Usta Pro Max", "Darko Plus", "Tunkafonchilar", "Al-Rizo mebel",
  "Marjon Iplari", "Bozorça", "Mister M", "Parfume 170",
  "ChinTech", "Zafar 17", "AT Truck", "Rovuston",
  "No Mercy", "Usta Tom Markazi", "Red Bull", "7Saber"
];

const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const groupContainer = document.getElementById('groups');
const teamSearch = document.getElementById('teamSearch');
const teamList = document.getElementById('teamList');
const logo = document.getElementById('logo');

// Data resets on refresh
let state = {
  remaining: [...teams],
  groups: Object.fromEntries(groups.map(g => [g, [null, null, null, null]]))
};

let selectedTeam = null;
let autoDownloaded = false;

function renderTeams(filter = '') {
  teamList.innerHTML = '';
  state.remaining.filter(t => t.toLowerCase().includes(filter.toLowerCase()))
    .forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      if (t === selectedTeam) li.classList.add('selected');
      li.addEventListener('click', () => { selectedTeam = t; renderTeams(); });
      teamList.appendChild(li);
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

function handleSlotClick(group, index) {
  const current = state.groups[group][index];
  if (current) {
    state.groups[group][index] = null;
    state.remaining.push(current);
    state.remaining.sort();
  } else if (selectedTeam) {
    state.groups[group][index] = selectedTeam;
    state.remaining = state.remaining.filter(t => t !== selectedTeam);
    selectedTeam = null;
  }
  renderTeams(teamSearch.value); renderGroups();
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
  if (confirm("Barchasini tozalash?")) {
    state = { remaining: [...teams], groups: Object.fromEntries(groups.map(g => [g, [null, null, null, null]])) };
    autoDownloaded = false;
    renderTeams(); renderGroups();
  }
}

teamSearch.addEventListener('input', e => renderTeams(e.target.value));
logo.addEventListener('click', resetAll);

renderTeams();
renderGroups();
