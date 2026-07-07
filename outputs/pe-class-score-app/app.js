const STORAGE_KEY = "sports-match-board:v2";

const palette = [
  "#0f766e",
  "#d9480f",
  "#2563eb",
  "#b7791f",
  "#7c3aed",
  "#15803d",
  "#be123c",
  "#0369a1",
];

const typeLabels = {
  league: "리그",
  tournament: "토너먼트",
  free: "단일",
};

let activeView = "league";
let activeFilter = "all";
let activeLeagueRound = 1;
let state = loadState();

const els = {
  eventTitle: document.querySelector("#event-title"),
  sportSelect: document.querySelector("#sport-select"),
  pointsMode: document.querySelector("#points-mode"),
  standardPoints: document.querySelector("#standard-points"),
  setPoints: document.querySelector("#set-points"),
  winPoints: document.querySelector("#win-points"),
  drawPoints: document.querySelector("#draw-points"),
  lossPoints: document.querySelector("#loss-points"),
  setClearWinPoints: document.querySelector("#set-clear-win-points"),
  setClearLossPoints: document.querySelector("#set-clear-loss-points"),
  setCloseWinPoints: document.querySelector("#set-close-win-points"),
  setCloseLossPoints: document.querySelector("#set-close-loss-points"),
  rankingPreset: document.querySelector("#ranking-preset"),
  drawResolver: document.querySelector("#draw-resolver"),
  awayGoals: document.querySelector("#away-goals"),
  tournamentMode: document.querySelector("#tournament-mode"),
  teamName: document.querySelector("#team-name"),
  teamColor: document.querySelector("#team-color"),
  teamList: document.querySelector("#team-list"),
  leagueRounds: document.querySelector("#league-rounds"),
  courtCount: document.querySelector("#court-count"),
  quickHome: document.querySelector("#quick-home"),
  quickAway: document.querySelector("#quick-away"),
  leagueBoard: document.querySelector("#league-board"),
  leagueLabel: document.querySelector("#league-label"),
  leagueRoundTabs: document.querySelector("#league-round-tabs"),
  matchList: document.querySelector("#match-list"),
  matchCountLabel: document.querySelector("#match-count-label"),
  standingLabel: document.querySelector("#standing-label"),
  standingsBody: document.querySelector("#standings-body"),
  bracketLabel: document.querySelector("#bracket-label"),
  bracketBoard: document.querySelector("#bracket-board"),
  statTeams: document.querySelector("#stat-teams"),
  statMatches: document.querySelector("#stat-matches"),
  statComplete: document.querySelector("#stat-complete"),
  statLeader: document.querySelector("#stat-leader"),
  importFile: document.querySelector("#import-file"),
};

document.querySelector("#team-form").addEventListener("submit", addTeam);
document.querySelector("#quick-form").addEventListener("submit", addQuickMatch);
document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);

render();

function createInitialState() {
  const teams = [
    { id: uid("team"), name: "A팀", color: "#d9480f" },
    { id: uid("team"), name: "B팀", color: "#2563eb" },
    { id: uid("team"), name: "C팀", color: "#0f766e" },
    { id: uid("team"), name: "D팀", color: "#b7791f" },
  ];

  return {
    title: "주말 스포츠 매치",
    sport: "축구",
    settings: createDefaultSettings(),
    teams,
    matches: createLeagueMatches(teams, 1, 1),
  };
}

function createDefaultSettings() {
  return {
    pointsMode: "standard",
    win: 3,
    draw: 1,
    loss: 0,
    setClearWin: 3,
    setClearLoss: 0,
    setCloseWin: 2,
    setCloseLoss: 1,
    rankingPreset: "standard",
    tournamentMode: "single",
    drawResolver: "none",
    awayGoals: false,
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    return normalizeState(JSON.parse(saved));
  } catch {
    return createInitialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeState(source) {
  const defaults = createDefaultSettings();
  const next = {
    title: source?.title || "스포츠 경기 보드판",
    sport: source?.sport || "축구",
    settings: {
      pointsMode: source?.settings?.pointsMode || defaults.pointsMode,
      win: numberOr(source?.settings?.win, defaults.win),
      draw: numberOr(source?.settings?.draw, defaults.draw),
      loss: numberOr(source?.settings?.loss, defaults.loss),
      setClearWin: numberOr(source?.settings?.setClearWin, defaults.setClearWin),
      setClearLoss: numberOr(source?.settings?.setClearLoss, defaults.setClearLoss),
      setCloseWin: numberOr(source?.settings?.setCloseWin, defaults.setCloseWin),
      setCloseLoss: numberOr(source?.settings?.setCloseLoss, defaults.setCloseLoss),
      rankingPreset: source?.settings?.rankingPreset || defaults.rankingPreset,
      tournamentMode: source?.settings?.tournamentMode || defaults.tournamentMode,
      drawResolver: source?.settings?.drawResolver || defaults.drawResolver,
      awayGoals: Boolean(source?.settings?.awayGoals),
    },
    teams: Array.isArray(source?.teams) ? source.teams : [],
    matches: Array.isArray(source?.matches) ? source.matches : [],
  };

  next.teams = next.teams.map((team, index) => ({
    id: team.id || uid("team"),
    name: String(team.name || `팀 ${index + 1}`).slice(0, 18),
    color: team.color || palette[index % palette.length],
  }));

  next.matches = next.matches.map((match, index) => ({
    id: match.id || uid("match"),
    type: match.type || "free",
    round: numberOr(match.round, 1),
    matchNo: numberOr(match.matchNo, index + 1),
    court: numberOr(match.court, 1),
    leg: numberOr(match.leg, 1),
    tieId: match.tieId || (match.type === "tournament" ? uid("tie") : null),
    nextTieId: match.nextTieId || null,
    nextSlot: match.nextSlot || null,
    homeId: match.homeId || null,
    awayId: match.awayId || null,
    homeScore: scoreOrNull(match.homeScore),
    awayScore: scoreOrNull(match.awayScore),
  }));

  return next;
}

function render() {
  state = normalizeState(state);
  propagateTournament();
  renderControls();
  renderStats();
  renderTeams();
  renderQuickSelectors();
  renderLeague();
  renderBracket();
  renderStandings();
  renderMatches();
  syncTabs();
  saveState();
}

function renderControls() {
  els.eventTitle.value = state.title;
  els.sportSelect.value = optionExists(els.sportSelect, state.sport) ? state.sport : "기타";
  els.pointsMode.value = state.settings.pointsMode;
  els.winPoints.value = state.settings.win;
  els.drawPoints.value = state.settings.draw;
  els.lossPoints.value = state.settings.loss;
  els.setClearWinPoints.value = state.settings.setClearWin;
  els.setClearLossPoints.value = state.settings.setClearLoss;
  els.setCloseWinPoints.value = state.settings.setCloseWin;
  els.setCloseLossPoints.value = state.settings.setCloseLoss;
  els.rankingPreset.value = state.settings.rankingPreset;
  renderPointsModeControls();
  els.drawResolver.value = state.settings.drawResolver;
  els.awayGoals.checked = state.settings.awayGoals;
  els.tournamentMode.value = state.settings.tournamentMode;
}

function renderStats() {
  const standings = getStandings();
  const complete = state.matches.filter(isCompleteMatch).length;
  els.statTeams.textContent = state.teams.length;
  els.statMatches.textContent = state.matches.length;
  els.statComplete.textContent = complete;
  els.statLeader.textContent = standings[0]?.name || "-";
}

function renderTeams() {
  if (!state.teams.length) {
    els.teamList.innerHTML = `<div class="empty-state">팀 없음</div>`;
    return;
  }

  els.teamList.innerHTML = state.teams
    .map(
      (team) => `
        <div class="team-item" data-team-id="${team.id}">
          <span class="team-swatch" style="background:${escapeAttr(team.color)}"></span>
          <input class="team-name-input" data-team-name="${team.id}" value="${escapeAttr(team.name)}" maxlength="18" aria-label="${escapeAttr(team.name)} 이름" />
          <button class="icon-button small delete-match" type="button" data-action="delete-team" data-team-id="${team.id}" title="팀 삭제" aria-label="팀 삭제">
            <svg><use href="#icon-trash"></use></svg>
          </button>
        </div>
      `,
    )
    .join("");
}

function renderQuickSelectors() {
  const options = state.teams
    .map((team) => `<option value="${team.id}">${escapeHTML(team.name)}</option>`)
    .join("");

  els.quickHome.innerHTML = options;
  els.quickAway.innerHTML = options;

  if (state.teams[0]) els.quickHome.value = state.teams[0].id;
  if (state.teams[1]) els.quickAway.value = state.teams[1].id;
}
function renderLeague() {
  const leagueMatches = state.matches.filter((match) => match.type === "league");
  const rounds = uniqueRounds(leagueMatches);

  if (rounds.length && !rounds.includes(activeLeagueRound)) {
    activeLeagueRound = rounds[0];
  }

  els.leagueLabel.textContent = leagueMatches.length
    ? `${rounds.length}회전 · ${leagueMatches.length}경기`
    : "리그 경기 없음";

  els.leagueRoundTabs.innerHTML = rounds
    .map(
      (round) => `
        <button class="chip ${round === activeLeagueRound ? "is-active" : ""}" type="button" data-league-round="${round}">
          ${round}회전
        </button>
      `,
    )
    .join("");

  if (!leagueMatches.length) {
    els.leagueBoard.innerHTML = `<div class="empty-state">리그표 없음</div>`;
    return;
  }

  const teams = state.teams;
  const header = teams.map((team) => `<th>${renderTeamHeading(team)}</th>`).join("");
  const rows = teams
    .map((home) => {
      const cells = teams.map((away) => renderLeagueCell(home, away, leagueMatches)).join("");
      return `<tr><th>${renderTeamHeading(home)}</th>${cells}</tr>`;
    })
    .join("");

  els.leagueBoard.innerHTML = `
    <table class="league-table">
      <thead><tr><th>홈 \ 원정</th>${header}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderLeagueCell(home, away, matches) {
  if (home.id === away.id) {
    return `<td class="league-cell empty">-</td>`;
  }

  const match = matches.find(
    (item) => item.round === activeLeagueRound && item.homeId === home.id && item.awayId === away.id,
  );

  if (!match) {
    return `<td class="league-cell empty">-</td>`;
  }

  const complete = isCompleteMatch(match);
  return `
    <td class="league-cell ${complete ? "done" : ""}">
      <div class="league-score">
        ${scoreInput(match, "homeScore", "small")}
        <span>:</span>
        ${scoreInput(match, "awayScore", "small")}
      </div>
      <div class="cell-meta">코트 ${match.court}</div>
    </td>
  `;
}

function renderTeamHeading(team) {
  return `
    <div class="team-heading">
      <span class="team-swatch" style="background:${escapeAttr(team.color)}"></span>
      <span>${escapeHTML(team.name)}</span>
    </div>
  `;
}

function renderBracket() {
  const ties = getTournamentTies();
  const rounds = groupTiesByRound(ties);
  const finalTie = ties.slice().sort((a, b) => b.round - a.round || b.matchNo - a.matchNo)[0];
  const champion = finalTie ? getTieOutcome(finalTie).winnerId : null;
  const championTeam = state.teams.find((team) => team.id === champion);
  const modeLabel = state.settings.tournamentMode === "twoLeg" ? "홈앤드어웨이" : "단판";
  const awayLabel = state.settings.awayGoals ? " · 원정 다득점" : "";

  els.bracketLabel.textContent = championTeam ? `우승: ${championTeam.name}` : `${ties.length}대진 · ${modeLabel}${awayLabel}`;

  if (!ties.length) {
    els.bracketBoard.innerHTML = `<div class="empty-state">토너먼트 없음</div>`;
    return;
  }

  els.bracketBoard.innerHTML = Array.from(rounds.entries())
    .map(([round, roundTies]) => `
      <div class="bracket-round">
        <div class="round-title">${getRoundTitle(round, rounds.size)}</div>
        ${roundTies.map(renderTie).join("")}
      </div>
    `)
    .join("");
}

function renderTie(tie) {
  const outcome = getTieOutcome(tie);
  const winner = state.teams.find((team) => team.id === outcome.winnerId);
  const reason = outcome.reason ? ` · ${outcome.reason}` : "";

  return `
    <article class="bracket-tie" data-tie-id="${tie.tieId}">
      <div class="tie-title">
        <span>${tie.round}R-${tie.matchNo}</span>
        <span>코트 ${tie.matches[0]?.court || 1}</span>
      </div>
      ${tie.matches.map(renderLeg).join("")}
      <div class="tie-winner ${winner ? "" : "pending"}">
        <span>${winner ? `승자 ${escapeHTML(winner.name)}` : "승자 대기"}</span>
        <span>${escapeHTML(reason)}</span>
      </div>
    </article>
  `;
}

function renderLeg(match) {
  const home = getTeam(match.homeId);
  const away = getTeam(match.awayId);
  const locked = !home || !away;
  const label = state.settings.tournamentMode === "twoLeg" ? `${match.leg}차전` : "단판";

  return `
    <div class="leg-row">
      <div class="leg-label">${label}</div>
      <div class="bracket-score-row">
        ${renderBracketTeam(home, false)}
        <div class="bracket-score-box">
          ${scoreInput(match, "homeScore", "small", locked)}
          <span>:</span>
          ${scoreInput(match, "awayScore", "small", locked)}
        </div>
        ${renderBracketTeam(away, true)}
      </div>
    </div>
  `;
}

function renderBracketTeam(team, isAway) {
  return `
    <div class="bracket-team-name ${isAway ? "away" : ""} ${team ? "" : "pending"}">
      ${!isAway ? `<span class="team-swatch" style="background:${escapeAttr(team?.color || "#b8c3bd")}"></span>` : ""}
      <span>${escapeHTML(team?.name || "대기")}</span>
      ${isAway ? `<span class="team-swatch" style="background:${escapeAttr(team?.color || "#b8c3bd")}"></span>` : ""}
    </div>
  `;
}

function renderStandings() {
  const standings = getStandings();
  const complete = state.matches.filter(isCompleteMatch).length;
  els.standingLabel.textContent = `${complete}경기 완료 기준`;

  if (!standings.length) {
    els.standingsBody.innerHTML = `<tr><td colspan="10">팀 없음</td></tr>`;
    return;
  }

  els.standingsBody.innerHTML = standings
    .map(
      (team, index) => `
        <tr>
          <td><span class="rank-badge ${index === 0 ? "top" : ""}">${index + 1}</span></td>
          <td>
            <div class="standings-team">
              <span class="team-swatch" style="background:${escapeAttr(team.color)}"></span>
              <strong>${escapeHTML(team.name)}</strong>
            </div>
          </td>
          <td>${team.played}</td>
          <td>${team.wins}</td>
          <td>${team.draws}</td>
          <td>${team.losses}</td>
          <td>${team.for}</td>
          <td>${team.against}</td>
          <td>${team.diff}</td>
          <td class="points-cell">${team.points}</td>
        </tr>
      `,
    )
    .join("");
}

function renderMatches() {
  const teamMap = getTeamMap();
  const filtered = state.matches.filter((match) => activeFilter === "all" || match.type === activeFilter);
  els.matchCountLabel.textContent = `${filtered.length}경기`;

  if (!filtered.length) {
    els.matchList.innerHTML = `<div class="empty-state">경기 없음</div>`;
    return;
  }

  els.matchList.innerHTML = filtered
    .map((match) => {
      const home = teamMap.get(match.homeId);
      const away = teamMap.get(match.awayId);
      const complete = isCompleteMatch(match);
      const homeName = home?.name || (match.type === "tournament" ? "대기" : "팀 없음");
      const awayName = away?.name || (match.type === "tournament" ? "대기" : "팀 없음");
      const locked = !home || !away;
      const legLabel = match.type === "tournament" && state.settings.tournamentMode === "twoLeg" ? ` · ${match.leg}차전` : "";

      return `
        <article class="match-card ${match.type} ${complete ? "done" : ""}" data-match-id="${match.id}">
          <div class="match-meta">
            <strong>${typeLabels[match.type] || "경기"} ${match.round}R-${match.matchNo}${legLabel}</strong>
            <span>${escapeHTML(state.sport)} · 코트 ${match.court}</span>
            ${complete ? `<span class="status-pill"><svg><use href="#icon-check"></use></svg>완료</span>` : ""}
          </div>
          <div class="team-side">
            <span class="team-swatch" style="background:${escapeAttr(home?.color || "#b8c3bd")}"></span>
            <span class="team-label ${home ? "" : "pending"}">${escapeHTML(homeName)}</span>
          </div>
          <div class="score-box" aria-label="점수">
            ${scoreInput(match, "homeScore", "", locked)}
            <span>:</span>
            ${scoreInput(match, "awayScore", "", locked)}
          </div>
          <div class="team-side away">
            <span class="team-label ${away ? "" : "pending"}">${escapeHTML(awayName)}</span>
            <span class="team-swatch" style="background:${escapeAttr(away?.color || "#b8c3bd")}"></span>
          </div>
          <button class="icon-button small delete-match" type="button" data-action="delete-match" data-match-id="${match.id}" title="경기 삭제" aria-label="경기 삭제">
            <svg><use href="#icon-trash"></use></svg>
          </button>
        </article>
      `;
    })
    .join("");
}

function scoreInput(match, side, size = "", disabled = false) {
  const team = side === "homeScore" ? getTeam(match.homeId) : getTeam(match.awayId);
  const label = `${team?.name || "대기"} 점수`;
  return `
    <input class="score-input ${size}" data-match-score="${match.id}" data-side="${side}" type="number" min="0" max="999" inputmode="numeric" value="${formatScore(match[side])}" ${disabled ? "disabled" : ""} aria-label="${escapeAttr(label)}" />
  `;
}
function handleInput(event) {
  const target = event.target;

  if (target === els.eventTitle) {
    state.title = target.value.trim() || "스포츠 경기 보드판";
    saveState();
    return;
  }

  if ([els.winPoints, els.drawPoints, els.lossPoints, els.setClearWinPoints, els.setClearLossPoints, els.setCloseWinPoints, els.setCloseLossPoints].includes(target)) {
    updatePointSettings();
    renderStats();
    renderStandings();
    saveState();
    return;
  }

  if (target.matches("[data-team-name]")) {
    const team = state.teams.find((item) => item.id === target.dataset.teamName);
    if (team) {
      team.name = target.value.trim() || "이름 없음";
      renderQuickSelectors();
      renderLeague();
      renderBracket();
      renderStandings();
      renderMatches();
      saveState();
    }
    return;
  }

  if (target.matches("[data-match-score]")) {
    const match = state.matches.find((item) => item.id === target.dataset.matchScore);
    if (match) {
      const side = target.dataset.side;
      match[side] = scoreOrNull(target.value);
      propagateTournament();
      renderStats();
      renderLeague();
      renderBracket();
      renderStandings();
      renderMatches();
      restoreScoreFocus(match.id, side);
      saveState();
    }
  }
}

function handleChange(event) {
  const target = event.target;

  if (target === els.sportSelect) {
    state.sport = target.value;
    renderLeague();
    renderBracket();
    renderMatches();
    saveState();
    return;
  }

  if (target === els.pointsMode) {
    state.settings.pointsMode = target.value;
    renderPointsModeControls();
    renderStats();
    renderStandings();
    saveState();
    return;
  }

  if (target === els.rankingPreset) {
    state.settings.rankingPreset = target.value;
    renderStandings();
    renderStats();
    saveState();
    return;
  }

  if (target === els.drawResolver) {
    state.settings.drawResolver = target.value;
    render();
    return;
  }

  if (target === els.awayGoals) {
    state.settings.awayGoals = target.checked;
    render();
    return;
  }

  if (target === els.tournamentMode) {
    state.settings.tournamentMode = target.value;
    saveState();
    return;
  }

  if (target === els.importFile) {
    importData(target.files?.[0]);
    target.value = "";
  }
}

function handleClick(event) {
  const actionButton = event.target.closest("[data-action]");
  const viewButton = event.target.closest("[data-view]");
  const filterButton = event.target.closest("[data-filter]");
  const leagueRoundButton = event.target.closest("[data-league-round]");

  if (viewButton) {
    activeView = viewButton.dataset.view;
    syncTabs();
    return;
  }

  if (filterButton) {
    activeFilter = filterButton.dataset.filter;
    renderMatches();
    syncTabs();
    return;
  }

  if (leagueRoundButton) {
    activeLeagueRound = numberOr(leagueRoundButton.dataset.leagueRound, 1);
    renderLeague();
    return;
  }

  if (!actionButton) return;

  const action = actionButton.dataset.action;
  if (action === "generate-league") generateLeague();
  if (action === "generate-tournament") generateTournament();
  if (action === "delete-team") deleteTeam(actionButton.dataset.teamId);
  if (action === "delete-match") deleteMatch(actionButton.dataset.matchId);
  if (action === "clear-scores") clearScores();
  if (action === "shuffle-teams") shuffleTeams();
  if (action === "reset-all") resetAll();
  if (action === "export") exportData();
  if (action === "print") window.print();
}

function addTeam(event) {
  event.preventDefault();
  const name = els.teamName.value.trim();
  if (!name) return;

  state.teams.push({
    id: uid("team"),
    name,
    color: els.teamColor.value || palette[state.teams.length % palette.length],
  });

  els.teamName.value = "";
  els.teamColor.value = palette[state.teams.length % palette.length];
  render();
}

function addQuickMatch(event) {
  event.preventDefault();
  const homeId = els.quickHome.value;
  const awayId = els.quickAway.value;
  if (!homeId || !awayId || homeId === awayId) return;

  const freeCount = state.matches.filter((match) => match.type === "free").length;
  state.matches.push({
    id: uid("match"),
    type: "free",
    round: 1,
    matchNo: freeCount + 1,
    court: 1,
    leg: 1,
    tieId: null,
    nextTieId: null,
    nextSlot: null,
    homeId,
    awayId,
    homeScore: null,
    awayScore: null,
  });

  activeView = "matches";
  activeFilter = "all";
  render();
}

function generateLeague() {
  if (state.teams.length < 2) return;
  const rounds = clamp(numberOr(els.leagueRounds.value, 1), 1, 3);
  const courts = clamp(numberOr(els.courtCount.value, 1), 1, 12);
  state.matches = state.matches.filter((match) => match.type !== "league");
  state.matches.push(...createLeagueMatches(state.teams, rounds, courts));
  activeView = "league";
  activeLeagueRound = 1;
  render();
}

function createLeagueMatches(teams, repeatRounds, courts) {
  const matches = [];
  let matchNo = 1;

  for (let repeat = 1; repeat <= repeatRounds; repeat += 1) {
    for (let i = 0; i < teams.length; i += 1) {
      for (let j = i + 1; j < teams.length; j += 1) {
        const flip = repeat % 2 === 0;
        matches.push({
          id: uid("match"),
          type: "league",
          round: repeat,
          matchNo,
          court: ((matchNo - 1) % courts) + 1,
          leg: 1,
          tieId: null,
          nextTieId: null,
          nextSlot: null,
          homeId: flip ? teams[j].id : teams[i].id,
          awayId: flip ? teams[i].id : teams[j].id,
          homeScore: null,
          awayScore: null,
        });
        matchNo += 1;
      }
    }
  }

  return matches;
}

function generateTournament() {
  if (state.teams.length < 2) return;
  state.settings.tournamentMode = els.tournamentMode.value;
  state.matches = state.matches.filter((match) => match.type !== "tournament");

  const teams = [...state.teams];
  const size = nextPowerOfTwo(teams.length);
  const byeCount = size - teams.length;
  const pairs = [];

  for (let i = 0; i < byeCount; i += 1) {
    pairs.push([teams[i]?.id || null, null]);
  }

  const remaining = teams.slice(byeCount).map((team) => team.id);
  while (remaining.length) {
    const home = remaining.shift() || null;
    const away = remaining.pop() || null;
    pairs.push([home, away]);
  }

  while (pairs.length < size / 2) {
    pairs.push([null, null]);
  }

  const rounds = Math.log2(size);
  const tiesByRound = [];
  const courts = clamp(numberOr(els.courtCount.value, 1), 1, 12);

  for (let round = 1; round <= rounds; round += 1) {
    const tieCount = size / 2 ** round;
    tiesByRound[round - 1] = [];

    for (let index = 0; index < tieCount; index += 1) {
      const pair = round === 1 ? pairs[index] : [null, null];
      const tieId = uid("tie");
      const court = (index % courts) + 1;
      const base = {
        type: "tournament",
        round,
        matchNo: index + 1,
        court,
        tieId,
        nextTieId: null,
        nextSlot: null,
        homeScore: null,
        awayScore: null,
      };
      const tieMatches = [
        {
          ...base,
          id: uid("match"),
          leg: 1,
          homeId: pair[0],
          awayId: pair[1],
        },
      ];

      if (state.settings.tournamentMode === "twoLeg") {
        tieMatches.push({
          ...base,
          id: uid("match"),
          leg: 2,
          homeId: pair[1],
          awayId: pair[0],
        });
      }

      tiesByRound[round - 1].push(tieMatches);
    }
  }

  for (let round = 0; round < tiesByRound.length - 1; round += 1) {
    tiesByRound[round].forEach((tieMatches, index) => {
      const nextTie = tiesByRound[round + 1][Math.floor(index / 2)];
      const slot = index % 2 === 0 ? "homeId" : "awayId";
      tieMatches.forEach((match) => {
        match.nextTieId = nextTie[0].tieId;
        match.nextSlot = slot;
      });
    });
  }

  state.matches.push(...tiesByRound.flat(2));
  activeView = "bracket";
  render();
}
function deleteTeam(teamId) {
  const team = state.teams.find((item) => item.id === teamId);
  if (!team) return;
  if (!confirm(`${team.name} 삭제`)) return;

  state.teams = state.teams.filter((item) => item.id !== teamId);
  state.matches = state.matches.filter((match) => match.homeId !== teamId && match.awayId !== teamId);
  render();
}

function deleteMatch(matchId) {
  state.matches = state.matches.filter((match) => match.id !== matchId);
  render();
}

function clearScores() {
  if (!state.matches.some((match) => match.homeScore !== null || match.awayScore !== null)) return;
  if (!confirm("모든 점수 비우기")) return;

  state.matches.forEach((match) => {
    match.homeScore = null;
    match.awayScore = null;
  });
  render();
}

function shuffleTeams() {
  for (let i = state.teams.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.teams[i], state.teams[j]] = [state.teams[j], state.teams[i]];
  }
  render();
}

function resetAll() {
  if (!confirm("현재 보드를 새 보드로 바꿀까요?")) return;
  state = createInitialState();
  activeView = "league";
  activeFilter = "all";
  activeLeagueRound = 1;
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `${state.title || "스포츠경기보드판"}`.replace(/[\\/:*?"<>|]/g, "_");
  link.href = url;
  link.download = `${fileName}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      state = normalizeState(JSON.parse(String(reader.result)));
      activeView = "league";
      activeFilter = "all";
      activeLeagueRound = 1;
      render();
    } catch {
      alert("불러올 수 없는 파일입니다.");
    }
  });
  reader.readAsText(file);
}

function getStandings() {
  const stats = new Map();
  state.teams.forEach((team) => {
    stats.set(team.id, {
      ...team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      for: 0,
      against: 0,
      diff: 0,
      points: 0,
    });
  });

  state.matches.forEach((match) => {
    if (!isCompleteMatch(match)) return;
    const home = stats.get(match.homeId);
    const away = stats.get(match.awayId);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.for += match.homeScore;
    home.against += match.awayScore;
    away.for += match.awayScore;
    away.against += match.homeScore;

    applyMatchResult(match, home, away);
  });

  return Array.from(stats.values())
    .map((team) => ({
      ...team,
      diff: team.for - team.against,
    }))
    .sort(compareStandingRows);
}

function renderPointsModeControls() {
  const mode = state.settings.pointsMode;
  els.standardPoints.hidden = mode === "setRatio";
  els.setPoints.hidden = mode !== "setRatio";
  els.standardPoints.classList.toggle("winner-only", mode === "winnerOnly");
}

function updatePointSettings() {
  state.settings.win = numberOr(els.winPoints.value, 3);
  state.settings.draw = numberOr(els.drawPoints.value, 1);
  state.settings.loss = numberOr(els.lossPoints.value, 0);
  state.settings.setClearWin = numberOr(els.setClearWinPoints.value, 3);
  state.settings.setClearLoss = numberOr(els.setClearLossPoints.value, 0);
  state.settings.setCloseWin = numberOr(els.setCloseWinPoints.value, 2);
  state.settings.setCloseLoss = numberOr(els.setCloseLossPoints.value, 1);
}

function applyMatchResult(match, home, away) {
  const points = getMatchPointSplit(match);

  if (match.homeScore > match.awayScore) {
    home.wins += 1;
    away.losses += 1;
  } else if (match.homeScore < match.awayScore) {
    away.wins += 1;
    home.losses += 1;
  } else {
    home.draws += 1;
    away.draws += 1;
  }

  home.points += points.home;
  away.points += points.away;
}

function getMatchPointSplit(match) {
  const mode = state.settings.pointsMode;
  const homeWins = match.homeScore > match.awayScore;
  const awayWins = match.awayScore > match.homeScore;

  if (!homeWins && !awayWins) {
    return { home: state.settings.draw, away: state.settings.draw };
  }

  if (mode === "winnerOnly") {
    return homeWins
      ? { home: state.settings.win, away: 0 }
      : { home: 0, away: state.settings.win };
  }

  if (mode === "setRatio") {
    const isClose = Math.abs(match.homeScore - match.awayScore) <= 1;
    const winnerPoints = isClose ? state.settings.setCloseWin : state.settings.setClearWin;
    const loserPoints = isClose ? state.settings.setCloseLoss : state.settings.setClearLoss;
    return homeWins
      ? { home: winnerPoints, away: loserPoints }
      : { home: loserPoints, away: winnerPoints };
  }

  return homeWins
    ? { home: state.settings.win, away: state.settings.loss }
    : { home: state.settings.loss, away: state.settings.win };
}
function compareStandingRows(a, b) {
  const preset = state.settings.rankingPreset;
  const chains = {
    standard: ["points", "diff", "for", "wins"],
    winsFirst: ["points", "wins", "diff", "for"],
    goalsFirst: ["points", "for", "diff", "wins"],
  };

  for (const key of chains[preset] || chains.standard) {
    if (b[key] !== a[key]) return b[key] - a[key];
  }

  return a.name.localeCompare(b.name, "ko");
}

function propagateTournament() {
  const ties = getTournamentTies();
  const tieMap = new Map(ties.map((tie) => [tie.tieId, tie]));
  let changed = true;
  let guard = 0;

  while (changed && guard < 30) {
    changed = false;
    guard += 1;

    ties.forEach((tie) => {
      const firstMatch = tie.matches[0];
      if (!firstMatch?.nextTieId || !firstMatch.nextSlot) return;
      const nextTie = tieMap.get(firstMatch.nextTieId);
      if (!nextTie) return;
      const winnerId = getTieOutcome(tie).winnerId;
      changed = setTieSlot(nextTie, firstMatch.nextSlot, winnerId) || changed;
    });
  }
}

function setTieSlot(tie, slot, teamId) {
  let changed = false;
  tie.matches.forEach((match) => {
    const targetSlot = state.settings.tournamentMode === "twoLeg" && match.leg === 2
      ? oppositeSlot(slot)
      : slot;

    if (match[targetSlot] !== teamId) {
      match[targetSlot] = teamId;
      match.homeScore = null;
      match.awayScore = null;
      changed = true;
    }
  });
  return changed;
}

function getTournamentTies() {
  const groups = new Map();
  state.matches
    .filter((match) => match.type === "tournament")
    .forEach((match) => {
      if (!groups.has(match.tieId)) groups.set(match.tieId, []);
      groups.get(match.tieId).push(match);
    });

  return Array.from(groups.entries())
    .map(([tieId, matches]) => {
      const sorted = matches.slice().sort((a, b) => a.leg - b.leg || a.id.localeCompare(b.id));
      return {
        tieId,
        round: sorted[0]?.round || 1,
        matchNo: sorted[0]?.matchNo || 1,
        matches: sorted,
      };
    })
    .sort((a, b) => a.round - b.round || a.matchNo - b.matchNo);
}

function getTieOutcome(tie) {
  const matches = tie.matches;
  const legOne = matches.find((match) => match.leg === 1) || matches[0];
  const homeSeed = legOne?.homeId || null;
  const awaySeed = legOne?.awayId || null;

  if (tie.round === 1 && homeSeed && !awaySeed) return { winnerId: homeSeed, reason: "부전승" };
  if (tie.round === 1 && awaySeed && !homeSeed) return { winnerId: awaySeed, reason: "부전승" };
  if (!homeSeed || !awaySeed) return { winnerId: null, reason: "" };

  if (state.settings.tournamentMode !== "twoLeg") {
    if (!isCompleteMatch(legOne)) return { winnerId: null, reason: "" };
    if (legOne.homeScore > legOne.awayScore) return { winnerId: legOne.homeId, reason: "" };
    if (legOne.awayScore > legOne.homeScore) return { winnerId: legOne.awayId, reason: "" };
    return resolveDraw(homeSeed, awaySeed);
  }

  if (!matches.every(isCompleteMatch)) return { winnerId: null, reason: "" };

  const aggregate = new Map([
    [homeSeed, { goals: 0, away: 0 }],
    [awaySeed, { goals: 0, away: 0 }],
  ]);

  matches.forEach((match) => {
    if (aggregate.has(match.homeId)) aggregate.get(match.homeId).goals += match.homeScore;
    if (aggregate.has(match.awayId)) {
      aggregate.get(match.awayId).goals += match.awayScore;
      aggregate.get(match.awayId).away += match.awayScore;
    }
  });

  const homeTotal = aggregate.get(homeSeed);
  const awayTotal = aggregate.get(awaySeed);

  if (homeTotal.goals > awayTotal.goals) return { winnerId: homeSeed, reason: "합산" };
  if (awayTotal.goals > homeTotal.goals) return { winnerId: awaySeed, reason: "합산" };

  if (state.settings.awayGoals) {
    if (homeTotal.away > awayTotal.away) return { winnerId: homeSeed, reason: "원정 다득점" };
    if (awayTotal.away > homeTotal.away) return { winnerId: awaySeed, reason: "원정 다득점" };
  }

  return resolveDraw(homeSeed, awaySeed);
}

function resolveDraw(homeSeed, awaySeed) {
  if (state.settings.drawResolver === "home") return { winnerId: homeSeed, reason: "동점 규칙" };
  if (state.settings.drawResolver === "away") return { winnerId: awaySeed, reason: "동점 규칙" };
  return { winnerId: null, reason: "동점" };
}

function groupTiesByRound(ties) {
  const rounds = new Map();
  ties.forEach((tie) => {
    if (!rounds.has(tie.round)) rounds.set(tie.round, []);
    rounds.get(tie.round).push(tie);
  });
  return rounds;
}

function getRoundTitle(round, totalRounds) {
  if (round === totalRounds) return "결승";
  if (round === totalRounds - 1) return "준결승";
  return `${round}라운드`;
}

function isCompleteMatch(match) {
  return (
    Boolean(match.homeId) &&
    Boolean(match.awayId) &&
    Number.isFinite(match.homeScore) &&
    Number.isFinite(match.awayScore)
  );
}

function uniqueRounds(matches) {
  return Array.from(new Set(matches.map((match) => match.round))).sort((a, b) => a - b);
}

function getTeam(teamId) {
  return state.teams.find((team) => team.id === teamId) || null;
}

function getTeamMap() {
  return new Map(state.teams.map((team) => [team.id, team]));
}

function oppositeSlot(slot) {
  return slot === "homeId" ? "awayId" : "homeId";
}

function syncTabs() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeView);
  });

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `${activeView}-view`);
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === activeFilter);
  });
}

function restoreScoreFocus(matchId, side) {
  const selector = `[data-match-score="${matchId}"][data-side="${side}"]`;
  const activeInput = document.querySelector(".view.is-active")?.querySelector(selector);
  const input = activeInput || document.querySelector(selector);
  if (!input) return;
  input.focus();
  const valueLength = String(input.value).length;
  try {
    input.setSelectionRange(valueLength, valueLength);
  } catch {
    // Number inputs do not support text selection in every browser.
  }
}

function optionExists(select, value) {
  return Array.from(select.options).some((option) => option.value === value);
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nextPowerOfTwo(value) {
  return 2 ** Math.ceil(Math.log2(Math.max(value, 2)));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function scoreOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function formatScore(value) {
  return Number.isFinite(value) ? value : "";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

