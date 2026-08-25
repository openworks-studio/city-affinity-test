(() => {
  "use strict";

  const state = {
    currentQuestion: 0,
    answers: Array(QUESTIONS.length).fill(null),
    result: null,
    routeDays: 3,
    advancing: false
  };

  const dom = {
    screens: document.querySelectorAll(".screen"),
    intro: document.getElementById("intro-screen"),
    quiz: document.getElementById("quiz-screen"),
    loading: document.getElementById("loading-screen"),
    result: document.getElementById("result-screen"),
    start: document.getElementById("start-btn"),
    back: document.getElementById("back-btn"),
    close: document.getElementById("close-btn"),
    questionIndex: document.getElementById("question-index"),
    questionTotal: document.getElementById("question-total"),
    progress: document.getElementById("progress-bar"),
    stage: document.getElementById("stage-label"),
    number: document.getElementById("question-number"),
    kicker: document.getElementById("question-kicker"),
    title: document.getElementById("question-title"),
    options: document.getElementById("options"),
    answerStatus: document.getElementById("answer-status"),
    loadingCopy: document.getElementById("loading-copy"),
    loadingBar: document.getElementById("loading-bar"),
    resultHero: document.getElementById("result-hero"),
    resultCity: document.getElementById("result-city"),
    resultArchetype: document.getElementById("result-archetype"),
    resultScore: document.getElementById("result-score"),
    scoreRing: document.getElementById("score-ring"),
    resultTagline: document.getElementById("result-tagline"),
    reasonList: document.getElementById("reason-list"),
    realityNote: document.querySelector("#reality-note p"),
    foodList: document.getElementById("food-list"),
    sightList: document.getElementById("sight-list"),
    routeSummary: document.getElementById("route-summary"),
    itineraryList: document.getElementById("itinerary-list"),
    alternativeList: document.getElementById("alternative-list"),
    routeButtons: document.querySelectorAll(".segment"),
    restart: document.getElementById("restart-btn"),
    shareTop: document.getElementById("share-btn-top"),
    share: document.getElementById("share-btn"),
    modal: document.getElementById("share-modal"),
    canvas: document.getElementById("share-canvas"),
    download: document.getElementById("download-card-btn"),
    toast: document.getElementById("toast")
  };

  const maxScores = QUESTIONS.reduce((totals, question) => {
    Object.keys(AXIS_META).forEach((axis) => {
      const questionMax = Math.max(0, ...question.options.map((option) => option.scores?.[axis] || 0));
      totals[axis] = (totals[axis] || 0) + questionMax;
    });
    return totals;
  }, {});

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }

  function showScreen(screen) {
    dom.screens.forEach((item) => item.classList.toggle("is-active", item === screen));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function startQuiz() {
    state.currentQuestion = 0;
    state.answers = Array(QUESTIONS.length).fill(null);
    state.result = null;
    showScreen(dom.quiz);
    renderQuestion();
  }

  function renderQuestion() {
    const question = QUESTIONS[state.currentQuestion];
    const selected = state.answers[state.currentQuestion];
    dom.questionIndex.textContent = state.currentQuestion + 1;
    dom.questionTotal.textContent = QUESTIONS.length;
    dom.progress.style.width = `${((state.currentQuestion + 1) / QUESTIONS.length) * 100}%`;
    dom.stage.textContent = question.stage;
    dom.number.textContent = String(state.currentQuestion + 1).padStart(2, "0");
    dom.kicker.textContent = question.kicker;
    dom.title.textContent = question.text;
    dom.back.disabled = state.currentQuestion === 0;
    dom.answerStatus.textContent = selected === null ? "请选择一项继续" : "已选择，可重新修改";
    dom.options.innerHTML = question.options.map((option, index) => `
      <button class="option-btn${selected === index ? " is-selected" : ""}" type="button" role="radio" aria-checked="${selected === index}" data-option="${index}">
        <span class="option-icon"><i data-lucide="${option.icon}"></i></span>
        <span class="option-copy"><strong>${option.title}</strong><span>${option.note}</span></span>
        <span class="option-check" aria-hidden="true"></span>
      </button>
    `).join("");
    refreshIcons();
    dom.options.querySelectorAll(".option-btn").forEach((button) => {
      button.addEventListener("click", () => selectOption(Number(button.dataset.option)));
    });
  }

  function selectOption(optionIndex) {
    if (state.advancing) return;
    state.answers[state.currentQuestion] = optionIndex;
    state.advancing = true;
    dom.options.querySelectorAll(".option-btn").forEach((button, index) => {
      const active = index === optionIndex;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-checked", String(active));
    });
    dom.answerStatus.textContent = "已记录你的选择";

    window.setTimeout(() => {
      state.advancing = false;
      if (state.currentQuestion < QUESTIONS.length - 1) {
        state.currentQuestion += 1;
        renderQuestion();
      } else {
        finishQuiz();
      }
    }, 330);
  }

  function goBack() {
    if (state.currentQuestion === 0 || state.advancing) return;
    state.currentQuestion -= 1;
    renderQuestion();
  }

  function exitQuiz() {
    state.advancing = false;
    showScreen(dom.intro);
  }

  function finishQuiz() {
    showScreen(dom.loading);
    dom.loadingBar.style.width = "0";
    const messages = ["比对你的旅行节奏...", "校准人流、体力与预算...", "正在生成专属城市路线..."];
    let messageIndex = 0;
    dom.loadingCopy.textContent = messages[0];
    requestAnimationFrame(() => { dom.loadingBar.style.width = "100%"; });
    const messageTimer = window.setInterval(() => {
      messageIndex = Math.min(messageIndex + 1, messages.length - 1);
      dom.loadingCopy.textContent = messages[messageIndex];
    }, 520);

    window.setTimeout(() => {
      window.clearInterval(messageTimer);
      state.result = calculateResult();
      renderResult();
      showScreen(dom.result);
    }, 1650);
  }

  function calculateResult() {
    const raw = Object.fromEntries(Object.keys(AXIS_META).map((axis) => [axis, 0]));
    const practical = { crowd: 2, walking: 2, climate: "any", budget: 2 };

    state.answers.forEach((answerIndex, questionIndex) => {
      const option = QUESTIONS[questionIndex].options[answerIndex];
      Object.entries(option.scores || {}).forEach(([axis, score]) => { raw[axis] += score; });
      Object.assign(practical, option.practical || {});
    });

    const rawPeak = Math.max(1, ...Object.values(raw));
    const rawTotal = Math.max(1, Object.values(raw).reduce((sum, value) => sum + value, 0));
    const profile = Object.fromEntries(Object.keys(AXIS_META).map((axis) => [axis, (raw[axis] / rawPeak) * 5]));
    const profileShare = Object.fromEntries(Object.keys(AXIS_META).map((axis) => [axis, raw[axis] / rawTotal]));

    const ranked = CITY_DATA.map((city) => {
      const cityTotal = Object.values(city.vector).reduce((sum, value) => sum + value, 0);
      const distance = Object.keys(AXIS_META).reduce((sum, axis) => sum + Math.abs(profileShare[axis] - city.vector[axis] / cityTotal), 0);
      const affinity = 100 * (1 - distance / 2);
      let practicalFit = 100;
      if (city.practical.crowd > practical.crowd) practicalFit -= (city.practical.crowd - practical.crowd) * 7;
      if (city.practical.terrain > practical.walking) practicalFit -= (city.practical.terrain - practical.walking) * 10;
      if (city.practical.budget > practical.budget) practicalFit -= (city.practical.budget - practical.budget) * 8;
      if (practical.climate !== "any" && city.practical.climate !== practical.climate) practicalFit -= 7;
      practicalFit = Math.max(35, practicalFit);
      const exactScore = Math.min(96, Math.max(58, affinity * .75 + practicalFit * .25));
      return { city, score: Math.round(exactScore), exactScore, affinity, practicalFit };
    }).sort((a, b) => b.exactScore - a.exactScore || b.practicalFit - a.practicalFit || a.city.id.localeCompare(b.city.id));

    const topAxes = Object.entries(profile).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([axis]) => axis);
    return { winner: ranked[0], alternatives: ranked.slice(1, 3), profile, practical, topAxes };
  }

  function renderResult() {
    const { winner, alternatives, topAxes } = state.result;
    const city = winner.city;
    dom.resultHero.style.backgroundImage = `url("${city.image}")`;
    dom.resultHero.style.backgroundColor = city.color;
    dom.resultCity.textContent = city.name;
    dom.resultArchetype.textContent = city.archetype;
    dom.resultScore.textContent = winner.score;
    dom.scoreRing.style.setProperty("--score", winner.score);
    dom.resultTagline.textContent = city.tagline;

    dom.reasonList.innerHTML = topAxes.map((axis) => {
      const meta = AXIS_META[axis];
      return `<article class="reason-item"><span><i data-lucide="${meta.icon}"></i></span><div><strong>${meta.name}</strong><p>${meta.copy}</p></div></article>`;
    }).join("");
    dom.realityNote.textContent = city.reality;
    dom.foodList.innerHTML = city.foods.map((food) => `<span class="chip">${food}</span>`).join("");
    dom.sightList.innerHTML = city.sights.map((sight, index) => `
      <div class="sight-item"><span>${index + 1}</span><div><strong>${sight[0]}</strong><p>${sight[1]}</p></div></div>
    `).join("");
    dom.alternativeList.innerHTML = alternatives.map((item, index) => `
      <article class="alternative-card" style="background-image:url('${item.city.image}');background-color:${item.city.color}">
        <span>另一种可能 · ${index + 2}</span><h3>${item.city.name}</h3><p>${item.city.archetype} · ${item.score} 分</p>
      </article>
    `).join("");
    setRouteDays(3);
    refreshIcons();
  }

  function setRouteDays(days) {
    state.routeDays = days;
    dom.routeButtons.forEach((button) => {
      const active = Number(button.dataset.days) === days;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const city = state.result.winner.city;
    const route = days === 3 ? city.route3 : city.route7;
    dom.routeSummary.textContent = days === 3
      ? `抓住 ${city.name} 最核心的三种体验，适合第一次到访，也为临时停留和返程留出余量。`
      : `在核心城市体验之外加入近郊与留白日，避免连续七天高强度打卡。具体开放与预约信息请在出发前核实。`;
    dom.itineraryList.innerHTML = route.map((day, index) => `
      <article class="itinerary-day">
        <span class="day-marker">D${index + 1}</span>
        <div class="day-content">
          <h3>${day[0]}</h3>
          <div class="day-parts">
            <div class="day-part"><strong>上午</strong><span>${day[1]}</span></div>
            <div class="day-part"><strong>下午</strong><span>${day[2]}</span></div>
            <div class="day-part"><strong>晚上</strong><span>${day[3]}</span></div>
          </div>
        </div>
      </article>
    `).join("");
  }

  function openShareModal() {
    drawShareCard();
    dom.modal.hidden = false;
    document.body.style.overflow = "hidden";
    dom.modal.querySelector(".modal-close").focus();
  }

  function closeShareModal() {
    dom.modal.hidden = true;
    document.body.style.overflow = "";
  }

  function drawShareCard() {
    const canvas = dom.canvas;
    const ctx = canvas.getContext("2d");
    const { city, score } = state.result.winner;
    const [axisA, axisB, axisC] = state.result.topAxes.map((axis) => AXIS_META[axis].name);
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, city.color);
    gradient.addColorStop(1, "#1e2925");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = .14;
    ctx.strokeStyle = "#fff9eb";
    ctx.lineWidth = 2;
    for (let x = 60; x < w; x += 82) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 60; y < h; y += 82) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#d94e3d";
    ctx.beginPath(); ctx.arc(105, 108, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fffdf7";
    ctx.font = "700 34px 'Noto Serif SC', serif";
    ctx.textAlign = "center";
    ctx.fillText("城", 105, 120);
    ctx.textAlign = "left";
    ctx.font = "700 31px 'Noto Sans SC', sans-serif";
    ctx.fillText("城遇 · CITY AFFINITY", 170, 119);

    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.font = "600 27px 'Noto Sans SC', sans-serif";
    ctx.fillText("我的命定城市", 72, 330);
    ctx.fillStyle = "#fffdf7";
    ctx.font = "900 184px 'Noto Serif SC', serif";
    ctx.fillText(city.name, 62, 525);
    ctx.fillStyle = "#f1d797";
    ctx.font = "700 43px 'Noto Serif SC', serif";
    ctx.fillText(city.archetype, 72, 600);

    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.beginPath(); ctx.moveTo(72, 658); ctx.lineTo(1008, 658); ctx.stroke();

    ctx.fillStyle = "#fffdf7";
    ctx.font = "900 106px 'Noto Serif SC', serif";
    ctx.fillText(String(score), 72, 815);
    ctx.font = "600 24px 'Noto Sans SC', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.fillText("偏好匹配分 / 100", 246, 804);

    [axisA, axisB, axisC].forEach((label, index) => {
      const x = 72 + index * 300;
      ctx.fillStyle = index === 0 ? "#d94e3d" : "rgba(255,255,255,.14)";
      roundRect(ctx, x, 885, 266, 62, 8);
      ctx.fill();
      ctx.fillStyle = "#fffdf7";
      ctx.font = "600 25px 'Noto Sans SC', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x + 133, 925);
    });

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.88)";
    ctx.font = "500 29px 'Noto Sans SC', sans-serif";
    drawWrappedText(ctx, city.tagline, 72, 1050, 880, 48, 3);

    ctx.fillStyle = "rgba(255,255,255,.57)";
    ctx.font = "500 22px 'Noto Sans SC', sans-serif";
    ctx.fillText(`${QUESTIONS.length} 道旅行场景题 · ${CITY_DATA.length} 座城市匹配 · 仅作旅行灵感参考`, 72, 1350);
    ctx.textAlign = "right";
    ctx.fillText("2026 国庆版", 1008, 1350);
    ctx.textAlign = "left";
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = Array.from(text);
    let line = "";
    let lineIndex = 0;
    for (let index = 0; index < chars.length; index += 1) {
      const testLine = line + chars[index];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, y + lineIndex * lineHeight);
        line = chars[index];
        lineIndex += 1;
        if (lineIndex >= maxLines) return;
      } else {
        line = testLine;
      }
    }
    if (lineIndex < maxLines) ctx.fillText(line, x, y + lineIndex * lineHeight);
  }

  function downloadCard() {
    const city = state.result.winner.city;
    const link = document.createElement("a");
    link.download = `我的命定城市-${city.name}.png`;
    link.href = dom.canvas.toDataURL("image/png");
    link.click();
    showToast("结果图已开始下载");
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 2200);
  }

  dom.start.addEventListener("click", startQuiz);
  dom.back.addEventListener("click", goBack);
  dom.close.addEventListener("click", exitQuiz);
  dom.restart.addEventListener("click", startQuiz);
  dom.routeButtons.forEach((button) => button.addEventListener("click", () => setRouteDays(Number(button.dataset.days))));
  dom.share.addEventListener("click", openShareModal);
  dom.shareTop.addEventListener("click", openShareModal);
  dom.download.addEventListener("click", downloadCard);
  dom.modal.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeShareModal));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.modal.hidden) closeShareModal();
  });

  refreshIcons();
})();
