// 每次进入首页随机展示一张图片，不会改变原图的长宽比例。
const HOME_GALLERY_IMAGES = ["assets/home-gallery/home-01.jpg", "assets/home-gallery/home-02.jpg", "assets/home-gallery/home-03.jpg", "assets/home-gallery/home-04.jpg", "assets/home-gallery/home-05.jpg", "assets/home-gallery/home-06.jpg", "assets/home-gallery/home-07.jpg", "assets/home-gallery/home-08.jpg", "assets/home-gallery/home-09.jpg", "assets/home-gallery/home-10.jpg"];
let lastHomeGalleryIndex = -1;
function refreshHomeGallery() {
  const image = document.getElementById("home-gallery-image");
  if (!image || !HOME_GALLERY_IMAGES.length) return;
  let index = Math.floor(Math.random() * HOME_GALLERY_IMAGES.length);
  if (HOME_GALLERY_IMAGES.length > 1 && index === lastHomeGalleryIndex) {
    index = (index + 1 + Math.floor(Math.random() * (HOME_GALLERY_IMAGES.length - 1))) % HOME_GALLERY_IMAGES.length;
  }
  lastHomeGalleryIndex = index;
  image.src = HOME_GALLERY_IMAGES[index];
  image.alt = "绫野刚首页随机照片";
}

const GAME_CHARACTER_COUNT = 72;
const TOTAL_MATCHES = 35;
const TOURNAMENT_KEY = "pk-champion-tournament-v6-72-thirdplace";

const ROUND_NAMES = {
  group: "第一轮｜72 进 18（四选一）",
  round18: "第二轮｜18 进 9（二选一）",
  round9: "第三轮｜9 进 5（1 人轮空）",
  group5: "第四轮｜5 进 2（分成两组）",
  thirdPlace: "第五轮｜季军争夺战",
  final: "最终轮｜冠军决赛",
};

const PHASE_START_INDEX = { group: 0, round18: 18, round9: 27, group5: 31, thirdPlace: 33, final: 34 };

const MATCHES_PER_PHASE = {
  group: 18,
  round18: 9,
  round9: 4,
  group5: 2,
  thirdPlace: 1,
  final: 1,
};

const homeScreen = document.getElementById("home");
const playScreen = document.getElementById("play");
const finishScreen = document.getElementById("finish");
const resumeButton = document.getElementById("resume");
const globalStatsNote = document.getElementById("global-stats-note");
const globalStatsBars = document.getElementById("global-stats-bars");
const uploadStatus = document.getElementById("upload-status");
const roundLabel = document.getElementById("round-label");
const matchTitle = document.getElementById("match-title");
const matchSubtitle = document.getElementById("match-subtitle");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const arena = document.getElementById("arena");
const vsLabel = document.getElementById("vs-label");
const championName = document.getElementById("champion-name");
const championCard = document.getElementById("champion-card");
const runnerUpName = document.getElementById("runner-up-name");
const runnerUpCard = document.getElementById("runner-up-card");
const thirdPlaceCard = document.getElementById("third-place-card");
const roundReview = document.getElementById("round-review");

// 游戏固定使用 characters.js 中的全部 72 位角色。
const GAME_CHARACTERS = window.CHARACTERS || [];
const charactersById = Object.fromEntries(
  GAME_CHARACTERS.map((character) => [character.id, character])
);

let tournament = null;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function takeRandom(list, count) {
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(Math.random() * list.length);
    picked.push(list.splice(index, 1)[0]);
  }
  return picked;
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function ensureCurrentMatch() {
  if (!tournament || (tournament.currentMatch && tournament.currentMatch.length)) return;

  if (tournament.phase === "group" && tournament.remaining.length >= 4) {
    tournament.currentMatch = takeRandom(tournament.remaining, 4);
  } else if (
    (tournament.phase === "round18" || tournament.phase === "round9") &&
    tournament.remaining.length >= 2
  ) {
    tournament.currentMatch = takeRandom(tournament.remaining, 2);
  } else if (
    tournament.phase === "group5" &&
    tournament.groups5 &&
    tournament.group5Index < tournament.groups5.length
  ) {
    tournament.currentMatch = [...tournament.groups5[tournament.group5Index]];
  } else if (tournament.phase === "thirdPlace" && tournament.remaining.length >= 3) {
    tournament.currentMatch = tournament.remaining.splice(0, 3);
  } else if (tournament.phase === "final" && tournament.remaining.length >= 2) {
    tournament.currentMatch = tournament.remaining.splice(0, 2);
  }
}

function loadTournament() {
  try {
    const saved = JSON.parse(localStorage.getItem(TOURNAMENT_KEY));
    if (
      saved &&
      Array.isArray(saved.remaining) &&
      typeof saved.phase === "string" &&
      Array.isArray(saved.winners)
    ) {
      return saved;
    }
  } catch {
    // Ignore broken storage.
  }
  return null;
}

function saveTournament() {
  if (tournament) {
    localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(tournament));
  } else {
    localStorage.removeItem(TOURNAMENT_KEY);
  }
}

function showScreen(screen) {
  if (screen === "home") refreshHomeGallery();
  homeScreen.classList.toggle("hidden", screen !== "home");
  playScreen.classList.toggle("hidden", screen !== "play");
  finishScreen.classList.toggle("hidden", screen !== "finish");
}

function fallbackText(character) {
  return character.name.slice(-1);
}

function renderPortrait(container, character) {
  container.replaceChildren();
  const frame = document.createElement("div");
  frame.className = "card-image";
  if (character.image) {
    const img = document.createElement("img");
    img.src = character.image;
    img.alt = character.name;
    img.addEventListener("error", () => {
      img.remove();
      const fallback = document.createElement("span");
      fallback.className = "fallback";
      fallback.textContent = fallbackText(character);
      frame.appendChild(fallback);
    });
    frame.appendChild(img);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "fallback";
    fallback.textContent = fallbackText(character);
    frame.appendChild(fallback);
  }
  container.appendChild(frame);
}

function createBarRow(name, count, percent, isGlobal = false) {
  const row = document.createElement("div");
  row.className = isGlobal ? "bar-row global-bar-row" : "bar-row";

  const label = document.createElement("span");
  label.className = "bar-row-name";
  label.textContent = name;

  const track = document.createElement("div");
  track.className = "bar-track";
  const fill = document.createElement("div");
  fill.className = "bar-fill";
  fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  track.appendChild(fill);

  const value = document.createElement("span");
  value.className = "bar-row-value";
  value.textContent = isGlobal
    ? `${count} 局 · ${percent.toFixed(1)}%`
    : `${Math.round(percent)}%`;

  row.append(label, track, value);
  return row;
}

async function getAllChampionResults() {
  if (typeof supabaseClient === "undefined") {
    throw new Error("Supabase 客户端尚未加载");
  }

  const allRows = [];
  const pageSize = 1000;
  let start = 0;

  while (true) {
    const { data, error } = await supabaseClient
      .from("champion_results")
      .select("winner_id")
      .order("id", { ascending: true })
      .range(start, start + pageSize - 1);

    if (error) throw error;
    allRows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    start += pageSize;
  }

  return allRows;
}

async function renderGlobalStats() {
  if (!globalStatsNote || !globalStatsBars) {
    console.warn("结果页缺少全站统计区域，无法展示统计。");
    return;
  }
  globalStatsNote.textContent = "正在加载全站统计……";
  try {
    const rows = await getAllChampionResults();
    const counts = {};
    for (const row of rows) {
      counts[row.winner_id] = (counts[row.winner_id] || 0) + 1;
    }

    const total = rows.length;
    globalStatsNote.textContent = `全站共完成 ${total} 局 · 按夺冠次数排序`;
    globalStatsBars.replaceChildren();

    const ranked = [...GAME_CHARACTERS].sort((a, b) => {
      const countDifference = (counts[b.id] || 0) - (counts[a.id] || 0);
      return countDifference || a.name.localeCompare(b.name, "zh-CN");
    });

    for (const character of ranked) {
      const count = counts[character.id] || 0;
      const percent = total ? (count / total) * 100 : 0;
      globalStatsBars.appendChild(
        createBarRow(character.name, count, percent, true)
      );
    }
  } catch (error) {
    console.error("加载全站冠军统计失败：", error);
    globalStatsNote.textContent =
      "暂时无法加载全站统计。请检查网络连接，稍后刷新页面重试。";
    globalStatsBars.replaceChildren();
  }
}

function renderMatch() {
  ensureCurrentMatch();
  if (!tournament.currentMatch || !tournament.currentMatch.length) return;

  const size = tournament.currentMatch.length;
  const players = tournament.currentMatch.map((id) => charactersById[id]);
  const matchesThisRound = MATCHES_PER_PHASE[tournament.phase];
  const matchNumber = tournament.completedMatches - PHASE_START_INDEX[tournament.phase] + 1;

  if (!Number.isInteger(matchNumber) || matchNumber < 1 || matchNumber > matchesThisRound) {
    console.error("比赛存档进度异常：", tournament);
    alert("这局比赛的进度存档不兼容，请返回首页重新开始一局。");
    return;
  }

  roundLabel.textContent = ROUND_NAMES[tournament.phase];
  matchTitle.textContent = tournament.phase === "group"
    ? `第 ${matchNumber} / ${matchesThisRound} 组`
    : tournament.phase === "final"
      ? "冠军决赛"
      : `本轮第 ${matchNumber} / ${matchesThisRound} 场`;

  if (tournament.phase === "group") {
    matchSubtitle.textContent = "从 4 位角色中选出 1 位晋级";
  } else if (tournament.phase === "group5") {
    matchSubtitle.textContent = `本组选出 1 位晋级决赛（${size} 选 1）`;
  } else if (tournament.phase === "thirdPlace") {
    matchSubtitle.textContent = "从三位五强惜败角色中选出你心中的季军（3 选 1）";
  } else if (tournament.phase === "final") {
    matchSubtitle.textContent = `${players[0].name} vs ${players[1].name}`;
  } else {
    matchSubtitle.textContent = "选择你更喜欢的角色，胜者晋级";
  }

  progressFill.style.width = `${(tournament.completedMatches / TOTAL_MATCHES) * 100}%`;
  progressText.textContent = `总进度：已完成 ${tournament.completedMatches} / ${TOTAL_MATCHES} 次选择`;

  arena.classList.toggle("four", size > 2);
  arena.classList.toggle("two", size === 2);
  vsLabel.classList.toggle("hidden", size !== 2);
  vsLabel.textContent = "VS";

  const cards = [...arena.querySelectorAll(".card")];
  cards.forEach((card, index) => {
    const character = players[index];
    if (!character) {
      card.classList.add("hidden");
      return;
    }
    card.classList.remove("hidden");
    fillCard(card, character);
  });
}

function fillCard(card, character) {
  card.dataset.id = character.id;
  card.disabled = false;
  renderPortrait(card, character);
  let title = card.querySelector("h2");
  if (!title) {
    title = document.createElement("h2");
    card.appendChild(title);
  }
  title.textContent = character.name;
  let work = card.querySelector(".card-work");
  if (!work) {
    work = document.createElement("p");
    work.className = "card-work";
    card.appendChild(work);
  }
  work.textContent = `《${character.work}》`;
}

function startTournament() {
  if (GAME_CHARACTERS.length !== GAME_CHARACTER_COUNT) {
    alert(`当前共有 ${GAME_CHARACTERS.length} 个角色，游戏需要恰好 72 个。请检查 characters.js。`);
    return;
  }

  tournament = {
    phase: "group",
    remaining: shuffle(GAME_CHARACTERS.map((character) => character.id)),
    winners: [],
    currentMatch: null,
    completedMatches: 0,
    phaseCompleted: 0,
    groups5: null,
    group5Index: 0,
    thirdPlaceCandidates: [],
    thirdPlaceId: null,
    finalists: [],
    advancementHistory: [],
  };

  ensureCurrentMatch();
  saveTournament();
  showScreen("play");
  renderMatch();
}

function resumeTournament() {
  tournament = loadTournament();
  if (!tournament) {
    updateResumeButton();
    return;
  }
  ensureCurrentMatch();
  saveTournament();
  showScreen("play");
  renderMatch();
}

function renderResultCard(card, character) {
  renderPortrait(card, character);
  const name = document.createElement("h2");
  name.className = "result-character-name";
  name.textContent = character.name;
  const work = document.createElement("p");
  work.className = "card-work";
  work.textContent = `《${character.work}》`;
  card.append(name, work);
}

// 每轮晋级名单在该轮结束时保存；包括随机轮空的角色。
function rememberAdvancement(title, ids) {
  if (!tournament) return;
  if (!Array.isArray(tournament.advancementHistory)) {
    tournament.advancementHistory = [];
  }
  tournament.advancementHistory.push({
    title,
    ids: [...ids],
  });
}

function renderAdvancementReview(history) {
  if (!roundReview) return;
  roundReview.replaceChildren();
  for (const item of history) {
    const section = document.createElement("section");
    section.className = "review-round";
    const title = document.createElement("h4");
    title.textContent = item.title;
    const list = document.createElement("div");
    list.className = "review-names";
    for (const id of item.ids) {
      const character = charactersById[id];
      if (!character) continue;
      const entry = document.createElement("span");
      entry.className = "review-name";
      entry.textContent = `${character.name} · 《${character.work}》`;
      list.appendChild(entry);
    }
    section.append(title, list);
    roundReview.appendChild(section);
  }
}

async function finishTournament(championId, runnerUpId, thirdPlaceId) {
  const character = charactersById[championId];
  if (!character) {
    console.error("找不到冠军角色：", championId);
    return;
  }

  // 最终冠亚季军也纳入本局选择记录，但不影响原有上传逻辑。
  rememberAdvancement("季军争夺战 · 季军", [thirdPlaceId]);
  rememberAdvancement("冠军决赛 · 冠军", [championId]);
  const advancementHistory = [...(tournament.advancementHistory || [])];
  tournament = null;
  saveTournament();
  updateResumeButton();
  renderAdvancementReview(advancementHistory);
  championName.textContent = character.name;
  renderResultCard(championCard, character);
  const runnerUp = charactersById[runnerUpId];
  if (runnerUp) {
    runnerUpName.textContent = runnerUp.name;
    renderResultCard(runnerUpCard, runnerUp);
  }
  const thirdPlace = charactersById[thirdPlaceId];
  if (thirdPlace && thirdPlaceCard) renderResultCard(thirdPlaceCard, thirdPlace);
  showScreen("finish");
  if (uploadStatus) uploadStatus.textContent = "正在提交全站冠军记录……";
  else console.warn("结束页缺少 upload-status 元素，但仍会尝试上传冠军。");

  try {
    if (typeof submitChampion !== "function") {
      throw new Error("submitChampion 函数未加载");
    }
    const submitted = await submitChampion(championId);
    if (!submitted) throw new Error("Supabase 未确认提交成功");
    console.log("冠军上传成功：", championId);
    if (uploadStatus) uploadStatus.textContent = "本局已结束，冠军记录已成功计入全站冠军统计";
  } catch (error) {
    console.error("冠军结果提交失败：", error);
    if (uploadStatus) uploadStatus.textContent =
      "本局已结束，但冠军记录上传失败，请检查网络后再试。";
  }
  await renderGlobalStats();
}

function transitionToRound18() {
  rememberAdvancement("第一轮 · 72 进 18", tournament.winners);
  const qualifiers = shuffle(tournament.winners);
  tournament.phase = "round18";
  tournament.remaining = qualifiers;
  tournament.winners = [];
  tournament.phaseCompleted = 0;
  tournament.currentMatch = null;
}

function transitionToRound9() {
  rememberAdvancement("第二轮 · 18 进 9", tournament.winners);
  const qualifiers = shuffle(tournament.winners);
  const bye = qualifiers.splice(Math.floor(Math.random() * qualifiers.length), 1)[0];
  tournament.phase = "round9";
  tournament.remaining = qualifiers;
  tournament.winners = [bye];
  tournament.phaseCompleted = 0;
  tournament.currentMatch = null;
}

function transitionToGroup5() {
  rememberAdvancement("第三轮 · 9 进 5（含轮空）", tournament.winners);
  const qualifiers = shuffle(tournament.winners);
  tournament.phase = "group5";
  tournament.remaining = [];
  tournament.winners = [];
  tournament.groups5 = [qualifiers.slice(0, 2), qualifiers.slice(2)];
  tournament.group5Index = 0;
  tournament.phaseCompleted = 0;
  tournament.currentMatch = null;
}

function chooseWinner(id) {
  if (!tournament || !tournament.currentMatch) return;

  const contestants = tournament.currentMatch;
  const winnerId = contestants.includes(id) ? id : contestants[0];
  tournament.currentMatch = null;
  tournament.completedMatches += 1;
  tournament.phaseCompleted = (tournament.phaseCompleted || 0) + 1;

  if (tournament.phase === "final") {
    const runnerUpId = contestants.find((contestantId) => contestantId !== winnerId);
    finishTournament(winnerId, runnerUpId, tournament.thirdPlaceId);
    return;
  }

  if (tournament.phase === "thirdPlace") {
    tournament.thirdPlaceId = winnerId;
    tournament.phase = "final";
    tournament.remaining = [];
    tournament.winners = [];
    tournament.phaseCompleted = 0;
    tournament.currentMatch = [...tournament.finalists];
    ensureCurrentMatch();
    saveTournament();
    renderMatch();
    return;
  }

  if (tournament.phase === "group5") {
    tournament.thirdPlaceCandidates.push(...contestants.filter((person) => person !== winnerId));
  }
  tournament.winners.push(winnerId);

  if (tournament.phase === "group" && tournament.remaining.length === 0) {
    transitionToRound18();
  } else if (tournament.phase === "round18" && tournament.remaining.length === 0) {
    transitionToRound9();
  } else if (tournament.phase === "round9" && tournament.remaining.length === 0) {
    transitionToGroup5();
  } else if (tournament.phase === "group5") {
    tournament.group5Index += 1;
    if (tournament.group5Index >= 2) {
      const finalists = shuffle(tournament.winners);
      rememberAdvancement("第四轮 · 5 进 2", tournament.winners);
      tournament.phase = "thirdPlace";
      tournament.finalists = finalists;
      tournament.winners = [];
      tournament.remaining = shuffle(tournament.thirdPlaceCandidates);
      tournament.phaseCompleted = 0;
      tournament.currentMatch = null;
    }
  }

  ensureCurrentMatch();
  saveTournament();
  renderMatch();
}

function abandonTournament() {
  tournament = null;
  saveTournament();
  updateResumeButton();
  showScreen("home");
}

function updateResumeButton() {
  resumeButton.classList.toggle("hidden", !loadTournament());
}

arena.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (!card || card.disabled || card.classList.contains("hidden")) return;
  chooseWinner(card.dataset.id);
});

document.getElementById("start").addEventListener("click", startTournament);
resumeButton.addEventListener("click", resumeTournament);
document.getElementById("abandon").addEventListener("click", abandonTournament);
document.getElementById("again").addEventListener("click", startTournament);
document.getElementById("back-home").addEventListener("click", () => {
  updateResumeButton();
  showScreen("home");
});

updateResumeButton();

// 首次打开网站也随机选一张。
refreshHomeGallery();
