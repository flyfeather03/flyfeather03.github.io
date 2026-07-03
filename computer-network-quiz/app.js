(function () {
  const letters = ["A", "B", "C", "D"];
  const courseInfo = {
    network: {
      label: "计算机网络",
      short: "计网",
      subtitle: "前五讲，应用层/传输层/网络层/链路层",
      accent: "teal"
    },
    org: {
      label: "计算机组成",
      short: "计组",
      subtitle: "计算机组织与体系结构课件",
      accent: "amber"
    },
    ics: {
      label: "计算机系统导论",
      short: "计系导",
      subtitle: "ICS 全套课件，程序员视角理解系统",
      accent: "blue"
    },
    compiler: {
      label: "编译原理",
      short: "编原",
      subtitle: "Arthals 编译原理笔记",
      accent: "violet"
    },
    os: {
      label: "操作系统",
      short: "操统",
      subtitle: "OS 课件：进程、同步、调度、内存、I/O、文件系统",
      accent: "coral"
    }
  };

  const allQuestions = (window.quizQuestions || []).map((q) => ({
    ...q,
    course: q.course || "network"
  }));

  const state = {
    view: "home",
    course: null,
    activeLecture: "全部",
    wrongOnly: false,
    order: allQuestions.map((q) => questionKey(q)),
    answers: JSON.parse(localStorage.getItem("unifiedQuizAnswers") || "{}")
  };

  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  const homePanel = document.getElementById("homePanel");
  const toolbar = document.getElementById("toolbar");
  const progressWrap = document.getElementById("progressWrap");
  const quizList = document.getElementById("quizList");
  const template = document.getElementById("questionTemplate");
  const lectureTabs = document.getElementById("lectureTabs");
  const answeredCount = document.getElementById("answeredCount");
  const correctCount = document.getElementById("correctCount");
  const accuracy = document.getElementById("accuracy");
  const progressBar = document.getElementById("progressBar");
  const homeBtn = document.getElementById("homeBtn");
  const wrongOnlyBtn = document.getElementById("wrongOnlyBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const resetBtn = document.getElementById("resetBtn");

  function questionKey(question) {
    return `${question.course || "network"}:${question.id}`;
  }

  function save() {
    localStorage.setItem("unifiedQuizAnswers", JSON.stringify(state.answers));
  }

  function parseHash() {
    const hash = location.hash.replace(/^#/, "");
    if (hash === "mixed") {
      state.view = "mixed";
      state.course = null;
      return;
    }
    if (hash.startsWith("course=")) {
      const course = hash.split("=")[1];
      state.view = "course";
      state.course = courseInfo[course] ? course : "network";
      return;
    }
    state.view = "home";
    state.course = null;
  }

  function scopedQuestions(ignoreLecture) {
    let questions = allQuestions;
    if (state.view === "course") {
      questions = questions.filter((q) => q.course === state.course);
    } else if (state.view === "mixed") {
      questions = questions.slice();
    } else {
      return allQuestions;
    }

    if (!ignoreLecture && state.activeLecture !== "全部") {
      questions = questions.filter((q) => q.lecture === state.activeLecture || `${courseInfo[q.course].short} ${q.lecture}` === state.activeLecture);
    }

    if (state.wrongOnly) {
      questions = questions.filter((q) => state.answers[questionKey(q)] !== undefined && state.answers[questionKey(q)] !== q.answer);
    }

    const byKey = new Map(questions.map((q) => [questionKey(q), q]));
    return state.order.map((key) => byKey.get(key)).filter(Boolean);
  }

  function countFor(questions) {
    const answered = questions.filter((q) => state.answers[questionKey(q)] !== undefined);
    const correct = answered.filter((q) => state.answers[questionKey(q)] === q.answer);
    return { answered, correct };
  }

  function updateStats() {
    const questions = state.view === "home" ? allQuestions : scopedQuestions(true);
    const { answered, correct } = countFor(questions);
    const percent = answered.length ? Math.round((correct.length / answered.length) * 100) : 0;
    answeredCount.textContent = answered.length;
    correctCount.textContent = correct.length;
    accuracy.textContent = `${percent}%`;
    progressBar.style.width = `${questions.length ? Math.round((answered.length / questions.length) * 100) : 0}%`;
  }

  function setHeader() {
    if (state.view === "home") {
      pageTitle.textContent = "课程选择题练习";
      pageSubtitle.textContent = "选择单门课程，或把所有题目打散练习";
    } else if (state.view === "mixed") {
      pageTitle.textContent = "全部题目打散练习";
      pageSubtitle.textContent = "所有课程混合出题，适合考前随机扫盲";
    } else {
      pageTitle.textContent = `${courseInfo[state.course].label}选择题`;
      pageSubtitle.textContent = courseInfo[state.course].subtitle;
    }
  }

  function renderHome() {
    homePanel.replaceChildren();
    const cards = [
      ...Object.entries(courseInfo).map(([key, info]) => ({ key, ...info, href: `#course=${key}`, questions: allQuestions.filter((q) => q.course === key) })),
      { key: "mixed", label: "全部打散", short: "混合", subtitle: "所有课程题目随机混合", href: "#mixed", questions: allQuestions, accent: "coral" },
      { key: "future", label: "后续更新", short: "更多", subtitle: "之后可以继续加入新课程题库", href: "", questions: [], accent: "gray", disabled: true }
    ];

    cards.forEach((card) => {
      const { answered, correct } = countFor(card.questions);
      const el = document.createElement(card.disabled ? "div" : "a");
      el.className = `course-card ${card.accent}`;
      if (!card.disabled) el.href = card.href;
      el.innerHTML = `
        <span class="course-pill">${card.short}</span>
        <h2>${card.label}</h2>
        <p>${card.subtitle}</p>
        <div class="course-meta">
          <span>${card.questions.length} 题</span>
          <span>${answered.length} 已答</span>
          <span>${correct.length} 正确</span>
        </div>
      `;
      homePanel.appendChild(el);
    });
  }

  function renderTabs() {
    const base = state.view === "mixed" ? allQuestions : allQuestions.filter((q) => q.course === state.course);
    const lectures = ["全部", ...Array.from(new Set(base.map((q) => state.view === "mixed" ? `${courseInfo[q.course].short} ${q.lecture}` : q.lecture)))];
    lectureTabs.replaceChildren();
    lectures.forEach((lecture) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = lecture;
      btn.className = lecture === state.activeLecture ? "active" : "";
      btn.addEventListener("click", () => {
        state.activeLecture = lecture;
        render();
      });
      lectureTabs.appendChild(btn);
    });
  }

  function setResult(card, question) {
    const key = questionKey(question);
    const chosen = state.answers[key];
    const result = card.querySelector(".result");
    const optionButtons = card.querySelectorAll(".option");
    const correctDisplayIndex = Array.from(optionButtons).findIndex((btn) => Number(btn.dataset.originalIndex) === question.answer);

    optionButtons.forEach((btn) => {
      const originalIndex = Number(btn.dataset.originalIndex);
      btn.disabled = chosen !== undefined;
      btn.classList.toggle("correct", chosen !== undefined && originalIndex === question.answer);
      btn.classList.toggle("wrong", chosen === originalIndex && chosen !== question.answer);
    });

    if (chosen === undefined) {
      result.textContent = "";
      result.className = "result";
    } else if (chosen === question.answer) {
      result.textContent = "正确";
      result.className = "result ok";
    } else {
      result.textContent = `不对，正确答案是 ${letters[correctDisplayIndex]}`;
      result.className = "result bad";
    }
  }

  function hashSeed(value) {
    const str = String(value);
    let seed = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      seed ^= str.charCodeAt(i);
      seed = Math.imul(seed, 16777619) >>> 0;
    }
    return seed;
  }

  function displayOptions(question) {
    const choices = question.options.map((text, originalIndex) => ({ text, originalIndex }));
    let seed = hashSeed(questionKey(question));
    for (let i = choices.length - 1; i > 0; i -= 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
  }

  function renderQuestion(question, index) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".number").textContent = `第 ${index + 1} 题`;
    node.querySelector(".tag").textContent = `${courseInfo[question.course].short} · ${question.lecture} · ${question.topic}`;
    node.querySelector(".question-title").textContent = question.question;
    node.querySelector(".source").textContent = `课件出处：${question.source}`;
    node.querySelector(".detail").textContent = question.detail;

    const options = node.querySelector(".options");
    displayOptions(question).forEach((option, optionIndex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.dataset.originalIndex = option.originalIndex;
      btn.innerHTML = `<span class="letter">${letters[optionIndex]}</span><span>${option.text}</span>`;
      btn.addEventListener("click", () => {
        state.answers[questionKey(question)] = option.originalIndex;
        save();
        setResult(node, question);
        updateStats();
      });
      options.appendChild(btn);
    });

    setResult(node, question);
    return node;
  }

  function renderQuiz() {
    renderTabs();
    wrongOnlyBtn.classList.toggle("is-on", state.wrongOnly);
    const questions = scopedQuestions(false);
    quizList.replaceChildren();

    if (!questions.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "当前筛选下没有题目";
      quizList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    questions.forEach((question, index) => fragment.appendChild(renderQuestion(question, index)));
    quizList.appendChild(fragment);
  }

  function render() {
    setHeader();
    updateStats();
    const isHome = state.view === "home";
    homePanel.hidden = !isHome;
    toolbar.hidden = isHome;
    progressWrap.hidden = isHome;
    quizList.hidden = isHome;

    if (isHome) {
      renderHome();
      quizList.replaceChildren();
    } else {
      renderQuiz();
    }
  }

  function shuffleOrder() {
    const next = [...state.order];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    state.order = next;
    render();
  }

  homeBtn.addEventListener("click", () => {
    location.hash = "";
  });

  wrongOnlyBtn.addEventListener("click", () => {
    state.wrongOnly = !state.wrongOnly;
    render();
  });

  shuffleBtn.addEventListener("click", shuffleOrder);

  resetBtn.addEventListener("click", () => {
    scopedQuestions(true).forEach((q) => {
      delete state.answers[questionKey(q)];
    });
    save();
    render();
  });

  window.addEventListener("hashchange", () => {
    state.activeLecture = "全部";
    state.wrongOnly = false;
    parseHash();
    render();
  });

  parseHash();
  render();
})();
