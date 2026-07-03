(function () {
  const letters = ["A", "B", "C", "D"];
  const allQuestions = window.quizQuestions || [];
  const state = {
    activeLecture: "全部",
    wrongOnly: false,
    order: allQuestions.map((q) => q.id),
    answers: JSON.parse(localStorage.getItem("networkQuizAnswers") || "{}")
  };

  const quizList = document.getElementById("quizList");
  const template = document.getElementById("questionTemplate");
  const lectureTabs = document.getElementById("lectureTabs");
  const answeredCount = document.getElementById("answeredCount");
  const correctCount = document.getElementById("correctCount");
  const accuracy = document.getElementById("accuracy");
  const progressBar = document.getElementById("progressBar");
  const wrongOnlyBtn = document.getElementById("wrongOnlyBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const resetBtn = document.getElementById("resetBtn");

  function save() {
    localStorage.setItem("networkQuizAnswers", JSON.stringify(state.answers));
  }

  function currentQuestions() {
    const byId = new Map(allQuestions.map((q) => [q.id, q]));
    return state.order
      .map((id) => byId.get(id))
      .filter(Boolean)
      .filter((q) => state.activeLecture === "全部" || q.lecture === state.activeLecture)
      .filter((q) => {
        if (!state.wrongOnly) return true;
        return state.answers[q.id] !== undefined && state.answers[q.id] !== q.answer;
      });
  }

  function renderTabs() {
    const lectures = ["全部", ...Array.from(new Set(allQuestions.map((q) => q.lecture)))];
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

  function updateStats() {
    const answered = allQuestions.filter((q) => state.answers[q.id] !== undefined);
    const correct = answered.filter((q) => state.answers[q.id] === q.answer);
    const percent = answered.length ? Math.round((correct.length / answered.length) * 100) : 0;
    answeredCount.textContent = answered.length;
    correctCount.textContent = correct.length;
    accuracy.textContent = `${percent}%`;
    progressBar.style.width = `${Math.round((answered.length / allQuestions.length) * 100)}%`;
  }

  function setResult(card, question) {
    const chosen = state.answers[question.id];
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
      return;
    }

    if (chosen === question.answer) {
      result.textContent = "正确";
      result.className = "result ok";
    } else {
      result.textContent = `不对，正确答案是 ${letters[correctDisplayIndex]}`;
      result.className = "result bad";
    }
  }

  function displayOptions(question) {
    const choices = question.options.map((text, originalIndex) => ({ text, originalIndex }));
    let seed = question.id * 2654435761;
    for (let i = choices.length - 1; i > 0; i -= 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
  }

  function renderQuestion(question, index) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".number").textContent = `第 ${index + 1} 题`;
    node.querySelector(".tag").textContent = `${question.lecture} · ${question.topic}`;
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
        state.answers[question.id] = option.originalIndex;
        save();
        setResult(node, question);
        updateStats();
      });
      options.appendChild(btn);
    });

    setResult(node, question);
    return node;
  }

  function render() {
    renderTabs();
    updateStats();
    wrongOnlyBtn.classList.toggle("is-on", state.wrongOnly);
    const questions = currentQuestions();
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

  function shuffleOrder() {
    const next = [...state.order];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    state.order = next;
    render();
  }

  wrongOnlyBtn.addEventListener("click", () => {
    state.wrongOnly = !state.wrongOnly;
    render();
  });

  shuffleBtn.addEventListener("click", shuffleOrder);

  resetBtn.addEventListener("click", () => {
    state.answers = {};
    save();
    render();
  });

  render();
})();
