const teams = [
  "Allwood", "Chin Tech FC", "FC Adim", "FC Birdamlik",
  "FC Elite", "FC Favorit", "FC Kosonsoy", "FC Marjon",
  "FC Nurobod", "FC Partsezd", "FC Ravnaq", "FC Turan",
  "FC Winners", "FC Xonobod", "FC Yoshlik", "FC Zenix",
  "FC Ziyokor", "Mubashshir Avto", "Nam United", "Pov Jivoy FC",
  "Red Dragons", "Seven Boys", "Tosh Sement", "Usta Tom Markazi"
];


const groups = ['A', 'B', 'C', 'D', 'E', 'F'];
const groupContainer = document.getElementById('groups');
const teamSearch = document.getElementById('teamSearch');
const teamList = document.getElementById('teamList');
const downloadBtn = document.getElementById('downloadExcel');
const resetBtn = document.getElementById('resetBtn');
const logo = document.getElementById('logo');
const title = document.getElementById('title');

let state = JSON.parse(localStorage.getItem('drawState'));

// Reset state if not valid or doesn't match the configuration
if (!state || Object.keys(state.groups).length !== groups.length || (state.remaining.length + Object.values(state.groups).flat().filter(Boolean).length) !== teams.length) {
  state = {
    remaining: [...teams],
    groups: Object.fromEntries(groups.map(g => [g, [null, null, null, null]]))
  };
}

let selectedTeam = null;

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
  groupContainer.innerHTML = '';
  for (const g of groups) {
    const div = document.createElement('div'); div.className = 'group';
    const title = document.createElement('h3'); title.textContent = `Group ${g}`;
    div.appendChild(title);
    state.groups[g].forEach((team, i) => {
      const slot = document.createElement('div'); slot.className = 'slot';
      slot.textContent = team || '...';
      if (team) slot.classList.add('filled');
      slot.addEventListener('click', () => handleSlotClick(g, i));
      div.appendChild(slot);
    });
    groupContainer.appendChild(div);
  }
}

function handleSlotClick(group, index) {
  const current = state.groups[group][index];
  if (current) {
    state.groups[group][index] = null;
    state.remaining.push(current);
  } else if (selectedTeam) {
    state.groups[group][index] = selectedTeam;
    state.remaining = state.remaining.filter(t => t !== selectedTeam);
    selectedTeam = null;
  }
  saveState(); renderTeams(teamSearch.value); renderGroups();
}

function saveState() {
  localStorage.setItem('drawState', JSON.stringify(state));
}

teamSearch.addEventListener('input', e => renderTeams(e.target.value));

downloadBtn.addEventListener('click', exportExcel);
title.addEventListener('click', exportExcel);
resetBtn.addEventListener('click', resetAll);
logo.addEventListener('click', resetAll);

function exportExcel() {
  let html = "<table border='1'><tr><th>Group</th><th>Teams</th></tr>";
  for (const g of groups) {
    const members = state.groups[g].filter(Boolean).join('<br>');
    html += `<tr><td>${g}</td><td>${members}</td></tr>`;
  }
  html += "</table>";
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'draw_results.xls';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function resetAll() {
  if (confirm("Barchasini tozalash?")) {
    state = { remaining: [...teams], groups: Object.fromEntries(groups.map(g => [g, [null, null, null, null]])) };
    saveState(); renderTeams(); renderGroups();
  }
}

window.addEventListener('beforeunload', (e) => {
  e.preventDefault(); e.returnValue = '';
});

renderTeams();
renderGroups();
