const STORAGE_KEY = "praise-task-checkins";
const praiseLevels = {
  0: {
    title: "先启动就很好",
    text: "你已经把注意力放回目标上了。哪怕现在还没到一半，这一步也是真实的开始。"
  },
  50: {
    title: "已经过半",
    text: "完成到 50%，说明你不是只想想而已，你已经真的把事情往前推了一大截。"
  },
  100: {
    title: "今日达标",
    text: "100% 完成，漂亮。你兑现了给自己的承诺，这种稳定感会慢慢变成底气。"
  },
  150: {
    title: "超出预期",
    text: "150%，你不只是完成任务，还多走了一段。今天的你很有冲劲，也很值得被看见。"
  },
  200: {
    title: "双倍完成",
    text: "200%，这已经是双倍进度了。你把普通的一次打卡，做成了很扎实的积累。"
  },
  250: {
    title: "持续加码",
    text: "250%，你在目标之外继续加码。不是蛮干，是认真把状态接住了。"
  },
  300: {
    title: "三倍推进",
    text: "300%，这份推进很亮眼。你今天给未来的自己存了一大笔进度。"
  },
  350: {
    title: "状态在线",
    text: "350%，节奏非常好。你没有被目标框住，而是在主动扩大自己的可能性。"
  },
  400: {
    title: "四倍能量",
    text: "400%，这不是一点点努力，这是很清楚、很有分量的行动力。"
  },
  450: {
    title: "越做越稳",
    text: "450%，你已经进入很稳定的推进状态了。继续保持，但也记得照顾好自己。"
  },
  500: {
    title: "五倍成就",
    text: "500%，直接拉满一整个大阶段。今天这份努力，完全值得认真夸一夸。"
  },
  550: {
    title: "突破惯性",
    text: "550%，你正在突破原本的惯性。能做到这里，说明你的专注很有力量。"
  },
  600: {
    title: "六倍积累",
    text: "600%，这已经是很可观的积累了。你在用行动告诉自己：我可以做得到。"
  },
  650: {
    title: "强势推进",
    text: "650%，今天的推进很强。你不只完成了任务，还把自信往上托了一截。"
  },
  700: {
    title: "七倍闪光",
    text: "700%，这个完成度很耀眼。你正在把目标变成一件越来越熟练的事。"
  },
  750: {
    title: "高能时刻",
    text: "750%，这是一段很高能的表现。请记住这种状态，它是你自己创造出来的。"
  },
  800: {
    title: "八倍优秀",
    text: "800%，优秀得很具体。你今天的每一点推进，都在认真改变结果。"
  },
  850: {
    title: "一路向前",
    text: "850%，你还在往前。这样的持续性很珍贵，也非常值得被自己肯定。"
  },
  900: {
    title: "接近满格",
    text: "900%，已经接近满格表现了。今天的你很能扛事，也很会成事。"
  },
  950: {
    title: "最后冲刺",
    text: "950%，几乎冲到顶了。你把一件事做到了非常漂亮的程度。"
  },
  1000: {
    title: "千分满格",
    text: "1000%，封顶夸夸。今天这波完成度很惊人，但也请把休息安排进计划里。"
  }
};

const taskForm = document.querySelector("#taskForm");
const taskName = document.querySelector("#taskName");
const taskTarget = document.querySelector("#taskTarget");
const taskUnit = document.querySelector("#taskUnit");
const taskFrequency = document.querySelector("#taskFrequency");
const taskWeeklyDays = document.querySelector("#taskWeeklyDays");
const taskWeeklyDaysLabel = document.querySelector("#taskWeeklyDaysLabel");
const taskList = document.querySelector("#taskList");
const archivedTaskList = document.querySelector("#archivedTaskList");
const taskTemplate = document.querySelector("#taskTemplate");
const taskCount = document.querySelector("#taskCount");
const todayCount = document.querySelector("#todayCount");
const archivedCount = document.querySelector("#archivedCount");
const praiseText = document.querySelector("#praiseText");
const clearAllBtn = document.querySelector("#clearAllBtn");
const praiseModal = document.querySelector("#praiseModal");
const praiseModalPercent = document.querySelector("#praiseModalPercent");
const praiseModalTitle = document.querySelector("#praiseModalTitle");
const praiseModalText = document.querySelector("#praiseModalText");
const praiseModalClose = document.querySelector("#praiseModalClose");

function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLogTimestamp(log) {
  if (Number.isFinite(Number(log.timestamp))) {
    return Number(log.timestamp);
  }
  return Date.parse(log.createdAt || log.date) || 0;
}

function getLogDate(log) {
  const timestamp = getLogTimestamp(log);
  return timestamp ? getTodayKey(new Date(timestamp)) : log.date;
}

function normalizeFrequency(frequency) {
  const type = frequency?.type || "daily";
  const weeklyDays = Math.min(Math.max(Number(frequency?.weeklyDays) || 1, 1), 7);
  if (type === "weekly") {
    return { type: "weekly", weeklyDays: 1 };
  }
  if (type === "custom") {
    return { type: "custom", weeklyDays };
  }
  return { type: "daily", weeklyDays: 1 };
}

function getFrequencyLabel(task) {
  const frequency = normalizeFrequency(task.frequency);
  if (frequency.type === "weekly") {
    return "每周打卡 1 天";
  }
  if (frequency.type === "custom") {
    return `每周打卡 ${frequency.weeklyDays} 天`;
  }
  return "每天打卡";
}

function readFrequency(select, weeklyDaysInput) {
  const type = select.value;
  return normalizeFrequency({
    type,
    weeklyDays: type === "custom" ? Number(weeklyDaysInput.value) : 1
  });
}

function syncWeeklyDaysField(select, field) {
  field.hidden = select.value !== "custom";
}

function normalizeTasks(tasks) {
  return tasks.map((task) => ({
    ...task,
    archived: Boolean(task.archived),
    frequency: normalizeFrequency(task.frequency),
    logs: (task.logs || []).map((log) => {
      const timestamp = getLogTimestamp(log) || Date.now();
      return {
        ...log,
        timestamp,
        date: getTodayKey(new Date(timestamp)),
        createdAt: log.createdAt || new Date(timestamp).toISOString()
      };
    })
  }));
}

async function readTasks() {
  try {
    const response = await fetch("/api/tasks", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      return normalizeTasks(Array.isArray(data.tasks) ? data.tasks : []);
    }
  } catch {
    // Directly opening the HTML cannot use the JSON file API, so keep a browser fallback.
  }

  try {
    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeTasks(Array.isArray(tasks) ? tasks : []);
  } catch {
    return [];
  }
}

async function saveTasks(tasks) {
  const normalizedTasks = normalizeTasks(tasks);
  try {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: normalizedTasks })
    });
    if (response.ok) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedTasks));
      return;
    }
  } catch {
    // Directly opening the HTML cannot write data.json, so keep a browser fallback.
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedTasks));
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getMaxValue(task) {
  return Number(task.target) * 5;
}

function getPraiseLevel(task, amount) {
  const percent = Math.round((Number(amount) / Number(task.target)) * 100);
  if (percent < 50) {
    return 0;
  }
  return Math.min(Math.floor(percent / 50) * 50, 1000);
}

function showPraise(task, amount) {
  const percent = Math.round((Number(amount) / Number(task.target)) * 100);
  const level = getPraiseLevel(task, amount);
  const praise = praiseLevels[level] || praiseLevels[1000];
  const displayPercent = level === 0 ? `${percent}%` : `${level}%`;
  const message = `${task.name} 已打卡到 ${amount}${task.unit}，完成度 ${percent}%。${praise.text}`;

  praiseText.textContent = message;
  praiseModalPercent.textContent = displayPercent;
  praiseModalTitle.textContent = praise.title;
  praiseModalText.textContent = message;
  praiseModal.hidden = false;
}

async function updateTask(id, updater) {
  const tasks = await readTasks();
  const nextTasks = tasks.map((task) => task.id === id ? updater(task) : task);
  await saveTasks(nextTasks);
  await render();
}

function updateSliderDisplay(task, slider, value, meta) {
  const max = getMaxValue(task);
  const progress = Number(slider.value);
  const percent = Math.round((progress / Number(task.target)) * 100);

  value.textContent = progress;
  meta.textContent = `${getFrequencyLabel(task)} · 目标 ${task.target}${task.unit} · 进度条范围 0-${max}${task.unit} · 当前 ${percent}%`;
  slider.style.setProperty("--fill", `${(progress / max) * 100}%`);
}

function renderTask(task, isArchived) {
  const max = getMaxValue(task);
  const progress = Math.min(Number(task.progress) || 0, max);
  const clone = taskTemplate.content.cloneNode(true);
  const card = clone.querySelector(".task-card");
  const title = clone.querySelector("h3");
  const status = clone.querySelector(".task-status");
  const meta = clone.querySelector(".task-meta");
  const value = clone.querySelector(".progress-value");
  const unit = clone.querySelector(".progress-unit");
  const slider = clone.querySelector(".task-slider");
  const editButton = clone.querySelector(".edit-button");
  const archiveButton = clone.querySelector(".archive-button");
  const deleteButton = clone.querySelector(".delete-button");
  const progressArea = clone.querySelector(".task-progress-area");
  const checkButton = clone.querySelector(".checkin-button");
  const plusButton = clone.querySelector(".plus-button");
  const minusButton = clone.querySelector(".minus-button");
  const editForm = clone.querySelector(".edit-form");
  const editName = clone.querySelector(".edit-name");
  const editTarget = clone.querySelector(".edit-target");
  const editUnit = clone.querySelector(".edit-unit");
  const editFrequency = clone.querySelector(".edit-frequency");
  const editWeeklyDays = clone.querySelector(".edit-weekly-days");
  const editWeeklyDaysField = clone.querySelector(".edit-weekly-days-field");
  const cancelEditButton = clone.querySelector(".cancel-edit-button");

  card.dataset.id = task.id;
  card.classList.toggle("is-archived", isArchived);
  title.textContent = task.name;
  status.textContent = isArchived ? "已归档" : "进行中";
  unit.textContent = `${task.unit} / ${task.target}${task.unit}`;
  slider.max = max;
  slider.value = progress;
  updateSliderDisplay(task, slider, value, meta);

  archiveButton.textContent = isArchived ? "恢复" : "归档";
  progressArea.hidden = isArchived;
  editButton.hidden = isArchived;

  editButton.addEventListener("click", () => {
    editName.value = task.name;
    editTarget.value = task.target;
    editUnit.value = task.unit;
    editFrequency.value = normalizeFrequency(task.frequency).type;
    editWeeklyDays.value = normalizeFrequency(task.frequency).weeklyDays;
    syncWeeklyDaysField(editFrequency, editWeeklyDaysField);
    editForm.hidden = false;
  });

  editFrequency.addEventListener("change", () => {
    syncWeeklyDaysField(editFrequency, editWeeklyDaysField);
  });

  cancelEditButton.addEventListener("click", () => {
    editForm.hidden = true;
  });

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nextName = editName.value.trim();
    const nextTarget = Number(editTarget.value);
    const nextUnit = editUnit.value.trim() || "个";
    const nextFrequency = readFrequency(editFrequency, editWeeklyDays);

    if (!nextName || !Number.isInteger(nextTarget) || nextTarget < 1) {
      return;
    }

    await updateTask(task.id, (current) => {
      const nextMax = nextTarget * 5;
      return {
        ...current,
        name: nextName,
        target: nextTarget,
        unit: nextUnit,
        frequency: nextFrequency,
        progress: Math.min(Number(current.progress) || 0, nextMax),
        updatedAt: new Date().toISOString()
      };
    });
    praiseText.textContent = `已更新「${nextName}」。`;
  });

  slider.addEventListener("input", () => {
    updateSliderDisplay(task, slider, value, meta);
  });

  slider.addEventListener("change", async () => {
    await updateTask(task.id, (current) => ({
      ...current,
      progress: Number(slider.value),
      updatedAt: new Date().toISOString()
    }));
  });

  checkButton.addEventListener("click", async () => {
    const amount = Number(slider.value);
    const timestamp = Date.now();
    await updateTask(task.id, (current) => {
      const log = {
        date: getTodayKey(new Date(timestamp)),
        amount,
        timestamp,
        createdAt: new Date(timestamp).toISOString()
      };
      return {
        ...current,
        progress: amount,
        logs: [...(current.logs || []), log],
        updatedAt: new Date(timestamp).toISOString()
      };
    });
    showPraise(task, amount);
  });

  plusButton.addEventListener("click", async () => {
    const nextValue = Math.min(Number(slider.value) + 1, max);
    await updateTask(task.id, (current) => ({
      ...current,
      progress: nextValue,
      updatedAt: new Date().toISOString()
    }));
  });

  minusButton.addEventListener("click", async () => {
    const nextValue = Math.max(Number(slider.value) - 1, 0);
    await updateTask(task.id, (current) => ({
      ...current,
      progress: nextValue,
      updatedAt: new Date().toISOString()
    }));
  });

  archiveButton.addEventListener("click", async () => {
    const timestamp = Date.now();
    await updateTask(task.id, (current) => ({
      ...current,
      archived: !isArchived,
      archivedAt: isArchived ? null : new Date(timestamp).toISOString(),
      updatedAt: new Date(timestamp).toISOString()
    }));
    praiseText.textContent = isArchived ? `已恢复「${task.name}」。` : `已归档「${task.name}」。`;
  });

  deleteButton.addEventListener("click", async () => {
    if (!confirm(`确定要删除「${task.name}」吗？`)) {
      return;
    }
    const nextTasks = (await readTasks()).filter((item) => item.id !== task.id);
    await saveTasks(nextTasks);
    await render();
  });

  return clone;
}

async function render() {
  const tasks = await readTasks();
  const todayKey = getTodayKey();
  const activeTasks = tasks.filter((task) => !task.archived);
  const archivedTasks = tasks.filter((task) => task.archived);
  const logs = tasks.flatMap((task) => task.logs || []);

  taskCount.textContent = activeTasks.length;
  todayCount.textContent = logs.filter((log) => getLogDate(log) === todayKey).length;
  archivedCount.textContent = archivedTasks.length;

  taskList.innerHTML = "";
  archivedTaskList.innerHTML = "";

  if (activeTasks.length === 0) {
    taskList.innerHTML = '<p class="empty-state">还没有进行中的任务。可以先添加“Python 教学视频 2 个”或“背英语单词 10 个”。</p>';
  } else {
    activeTasks.forEach((task) => taskList.appendChild(renderTask(task, false)));
  }

  if (archivedTasks.length === 0) {
    archivedTaskList.innerHTML = '<p class="empty-state">暂无归档任务。</p>';
  } else {
    archivedTasks.forEach((task) => archivedTaskList.appendChild(renderTask(task, true)));
  }
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = taskName.value.trim();
  const target = Number(taskTarget.value);
  const unit = taskUnit.value.trim() || "个";
  const frequency = readFrequency(taskFrequency, taskWeeklyDays);
  const timestamp = Date.now();

  if (!name || !Number.isInteger(target) || target < 1) {
    return;
  }

  const tasks = await readTasks();
  tasks.push({
    id: createId(),
    name,
    target,
    unit,
    progress: 0,
    archived: false,
    frequency,
    logs: [],
    createdAt: new Date(timestamp).toISOString(),
    updatedAt: new Date(timestamp).toISOString()
  });
  await saveTasks(tasks);
  taskForm.reset();
  taskUnit.value = "";
  taskFrequency.value = "daily";
  taskWeeklyDays.value = "3";
  syncWeeklyDaysField(taskFrequency, taskWeeklyDaysLabel);
  praiseText.textContent = `已添加「${name}」，现在可以开始打卡啦。`;
  await render();
});

taskFrequency.addEventListener("change", () => {
  syncWeeklyDaysField(taskFrequency, taskWeeklyDaysLabel);
});

praiseModalClose.addEventListener("click", () => {
  praiseModal.hidden = true;
});

praiseModal.addEventListener("click", (event) => {
  if (event.target === praiseModal) {
    praiseModal.hidden = true;
  }
});

clearAllBtn.addEventListener("click", async () => {
  if (confirm("确定要清空所有任务和打卡记录吗？")) {
    await saveTasks([]);
    localStorage.removeItem(STORAGE_KEY);
    praiseText.textContent = "已清空。新的计划可以从一个小任务开始。";
    await render();
  }
});

render();
