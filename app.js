/* =====================================================================
   花宠乐园  ·  iPad PWA  ·  全部数据本地存储(localStorage)，无后端
   作者：给小朋友的激励小工具
   ===================================================================== */

/* ---------------- 基础配置 ---------------- */
const SUBJECTS = ['语文', '数学', '英语', '体育'];
const SUBJECT_EMOJI = { '语文': '📖', '数学': '🔢', '英语': '🔤', '体育': '⚽' };

// 12 种种子：名字 + 开花后的代表 emoji + 主题色 + 图片键(img)
// img 用于「images/flowers/」文件夹里对应生长状态图的命名：images/flowers/<img>_g<生长值>.jpg
// 生长值 0~7 对应 8 张阶段图（_g0 最小幼苗 → _g7 盛开）；浇 7 次水开花
const SEEDS = [
  { name: '三角梅', emoji: '🌺', color: '#ffb3d1', img: 'bougainvillea' },
  { name: '向日葵', emoji: '🌻', color: '#ffe08a', img: 'sunflower' },
  { name: '四叶草', emoji: '🍀', color: '#c8f0c0', img: 'clover' },
  { name: '樱花',   emoji: '🌸', color: '#ffd6e7', img: 'sakura' },
  { name: '牡丹',   emoji: '🏵️', color: '#ffb3c8', img: 'peony' },
  { name: '玫瑰',   emoji: '🌹', color: '#ffc0cc', img: 'rose' },
  { name: '百合',   emoji: '💮', color: '#fff0f5', img: 'lily' },
  { name: '腊梅',   emoji: '🌟', color: '#fff0a8', img: 'wintersweet' },
  { name: '茉莉',   emoji: '🌼', color: '#fff3c4', img: 'jasmine' },
  { name: '荷花',   emoji: '🪷', color: '#c8eef0', img: 'lotus' },
  { name: '郁金香', emoji: '🌷', color: '#ffc6e0', img: 'tulip' },
  { name: '铃兰',   emoji: '🔔', color: '#d6f0ff', img: 'lilyofvalley' }
];

// 12 种可领养宠物：名字 + 代表 emoji + 图片键(img)
// img 用于「images/pets/」文件夹里对应生长阶段图的命名：images/pets/<img>_stage<等级>.webp
// 等级 0~7 对应 8 张阶段图（_stage0 幼崽 → _stage7 成年）；喂 14 次成为永久宠物
const PETS = [
  { name: '企鹅',   emoji: '🐧', img: 'penguin' },
  { name: '小兔',   emoji: '🐰', img: 'rabbit' },
  { name: '布偶猫', emoji: '🐱', img: 'ragdoll' },
  { name: '恐龙',   emoji: '🦖', img: 'dino' },
  { name: '朱雀',   emoji: '🐦', img: 'vermilion' },
  { name: '梅花鹿', emoji: '🦌', img: 'deer' },
  { name: '狐狸',   emoji: '🦊', img: 'fox' },
  { name: '独角兽', emoji: '🦄', img: 'unicorn' },
  { name: '白虎',   emoji: '🐯', img: 'whitetiger' },
  { name: '精卫',   emoji: '🕊️', img: 'jingwei' },
  { name: '金毛',   emoji: '🐶', img: 'golden' },
  { name: '香猪',   emoji: '🐷', img: 'fragpig' }
];

// 时间→生命值 的默认规则（家长可在「家长设置」里修改）
// 含义：在 0 ~ 第 1 条 end 点之间得第 1 条 points；在 第1条end ~ 第2条end 之间得第 2 条 points…
// end:24 表示「当天 24 点（即 0 点）之前」的兜底档（即最晚时段）。
function defaultTimeRules() {
  return [
    { end: 19, points: 3 },
    { end: 20, points: 2 },
    { end: 21, points: 1 },
    { end: 22, points: 0 },
    { end: 24, points: -1 }
  ];
}

// 植物各个生长阶段的展示（播种/幼苗/长大中/即将开花/盛开/枯萎/消失）
const STAGE = {
  seed:         { emoji: '🌰', label: '刚播种',   bg: '#f3e9df' },
  sprout:       { emoji: '🌱', label: '幼苗',     bg: '#e6f6df' },
  growing:      { emoji: '🌿', label: '长大中',   bg: '#e0f3e6' },
  aboutToBloom: { emoji: '🌷', label: '即将开花', bg: '#fdeaf3' },
  bloomed:      { emoji: null, label: '盛开啦',   bg: '#fff4cf' },
  withered:     { emoji: '🥀', label: '枯萎了',   bg: '#ece3da' },
  disappeared:  { emoji: '🪴', label: '已消失',   bg: '#f0ece8' }
};

const STORAGE_KEY = 'homework_garden_v1';

/* ---------------- 日期 / 时间工具（全部以设备本地时间为准） ---------------- */
function fmt(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function localDateStr(dt = new Date()) { return fmt(dt); }
function addDays(s, n) { const dt = parseDate(s); dt.setDate(dt.getDate() + n); return fmt(dt); }
function dateDiff(a, b) { return Math.round((parseDate(a) - parseDate(b)) / 86400000); }
function fmtTime(dt) { return String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0'); }

// 按时段给分：根据 state.timeRules 配置的规则计算
// 规则按 end 升序，找到第一个 h < end 的档位即采用其 points；都没有则取最后一档（兜底）
function scoreForDate(date) {
  const raw = (state && state.timeRules && state.timeRules.length) ? state.timeRules : defaultTimeRules();
  const rules = raw.slice().sort((a, b) => a.end - b.end);
  const h = date.getHours();
  for (const r of rules) {
    if (h < r.end) return r.points;
  }
  return rules.length ? rules[rules.length - 1].points : -1;
}

// 把当前时间规则转成一句人话（用于作业页提示）
function timeRulesText() {
  const raw = (state && state.timeRules && state.timeRules.length) ? state.timeRules : defaultTimeRules();
  const rules = raw.slice().sort((a, b) => a.end - b.end);
  const parts = [];
  let prev = 0;
  rules.forEach((r, i) => {
    const endH = r.end >= 24 ? 24 : r.end;
    if (i === 0) parts.push(`${endH}点前 +${r.points}`);
    else if (r.end >= 24) parts.push(`${prev}点后 ${r.points}`);
    else parts.push(`${prev}-${endH}点 +${r.points}`);
    prev = r.end;
  });
  return parts.join('，');
}

function normalize(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ''); }

/* ---------------- 状态 / 持久化 ---------------- */
let state = null;

function defaultState() {
  const completion = {};
  SUBJECTS.forEach((s) => { completion[s] = { done: false, inputTime: null, points: 0 }; });
  return {
    version: 1,
    lifePoints: 0,
    date: localDateStr(),
    passwords: { '语文': '', '数学': '', '英语': '', '体育': '' },
    completion,
    garden: [],
    pets: [],             // 宠物列表：{id,type,feedCount,level,lastFeedDate,adoptedDate}
    history: [],          // {date,time,subject,desc,points}
    parentPin: '1234',    // 家长码，默认 1234，可在家长设置里修改
    testMode: true,       // 测试模式：true=不限制每日打卡/浇水次数；改成 false 即恢复正常限制
    timeRules: defaultTimeRules()  // 时间→生命值 映射，可在家长设置里修改
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(defaultState(), parsed);
      // 补齐可能缺失的科目
      SUBJECTS.forEach((s) => {
        if (!state.completion[s]) state.completion[s] = { done: false, inputTime: null, points: 0 };
        if (state.passwords[s] === undefined) state.passwords[s] = '';
      });
    } else {
      state = defaultState();
    }
  } catch (e) {
    state = defaultState();
  }
  migratePets();
  ensureToday();
  migrateGarden();
  applyDailyPasswords();   // 按当天日期自动填入各科密码（内置，无需家长每天设置）
}

// 自动把当天的各科密码从内嵌表 DAILY_PASSWORDS 填入 state.passwords
// 仅在日期落在内置表范围内生效；超出范围（如 2027-02 以后）保持原样，由家长手动设置
function applyDailyPasswords() {
  const today = localDateStr();
  const dp = (typeof DAILY_PASSWORDS !== 'undefined') ? DAILY_PASSWORDS[today] : null;
  if (!dp) return;
  SUBJECTS.forEach((sub) => {
    if (dp[sub] != null) state.passwords[sub] = String(dp[sub]);
  });
  save();
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function addLog(date, time, subject, desc, points) {
  state.history.push({ date, time, subject, desc, points });
}

/* ---------------- 跨天结算：作业扣分 + 花园枯萎 ---------------- */
function resetCompletion() {
  SUBJECTS.forEach((s) => { state.completion[s] = { done: false, inputTime: null, points: 0 }; });
}

function ensureToday() {
  const today = localDateStr();
  const deductions = [];   // 作业未完成扣分
  const witheredList = []; // 新枯萎的植物

  // 逐天补齐（支持多天未打开的情况，按天结算）
  while (state.date < today) {
    const endedDay = state.date;          // 刚刚结束的那一天
    const newDay = addDays(endedDay, 1);  // 即将进入的新的一天

    // 1) 作业结算：当天有密码但未完成 -> 扣 1
    SUBJECTS.forEach((sub) => {
      const c = state.completion[sub];
      const pw = (state.passwords[sub] || '').trim();
      if (pw && !c.done) {
        state.lifePoints -= 1;
        deductions.push({ sub, day: endedDay });
        addLog(endedDay, '结算', sub, '未完成 -1', -1);
      }
    });

    // 2) 花园结算：连续未浇水 / 枯萎倒计时
    state.garden.forEach((p) => {
      if (p.disappeared || p.bloomed) return;
      const eligible = p.plantedDate < endedDay; // 播种次日才开始可浇水
      if (eligible) {
        if (p.lastWaterDate === endedDay) p.missedWaterDays = 0;
        else p.missedWaterDays = (p.missedWaterDays || 0) + 1;
      }
      if (!p.withered && (p.missedWaterDays || 0) >= 3) {
        p.withered = true;
        p.witheredSince = newDay;
        witheredList.push(p);
      } else if (p.withered) {
        if (dateDiff(newDay, p.witheredSince) >= 1) p.disappeared = true;   // 枯萎后保留 1 天即消失
      }
    });

    state.date = newDay;
    resetCompletion();
  }

  // 宠物饿死（与植物枯萎对称）：非永久宠物连续 3 天未喂食 → 先进入"饿肚子"状态（保留 1 天），再 1 天后消失
  const starvedList = [];       // 新进入饿肚子状态的宠物（用于提醒）
  state.pets = (state.pets || []).filter((pt) => {
    if (pt.feedCount >= 21) return true;                   // 永久宠物不受影响
    if (pt.starved) {
      if (dateDiff(today, pt.starvedSince) >= 1) { return false; } // 保留 1 天后消失
      return true;
    }
    if (dateDiff(today, pt.lastFeedDate) >= 3) {
      pt.starved = true;
      pt.starvedSince = today;                            // 进入饿肚子状态（保留 1 天）
      starvedList.push(pt.type);                           // 记录用于提醒
      return true;
    }
    return true;
  });

  state._pendingDeductions = deductions;
  state._pendingWithered = witheredList;
  state._pendingStarved = starvedList;
  save();
}

/* ---------------- 作业：验证密码 / 计分 ---------------- */
function matchSubject(input) {
  const n = normalize(input);
  if (!n) return null;
  let found = null;
  SUBJECTS.forEach((sub) => {
    const p = normalize(state.passwords[sub]);
    if (p && p === n) found = sub;
  });
  return found;
}

function submitPassword(input) {
  const sub = matchSubject(input);
  if (!sub) { showToast('❌ 密码不对，再试试看~'); return; }
  const c = state.completion[sub];
  // 测试模式下允许反复打卡（不限当天次数）；正常模式每天每科只能打卡一次
  if (c.done && !state.testMode) { showToast(`✅ ${sub} 今天已经完成啦`); return; }

  const now = new Date();
  const pts = scoreForDate(now);
  c.done = true;
  c.inputTime = fmtTime(now);
  c.points = pts;
  state.lifePoints += pts;
  addLog(state.date, fmtTime(now), sub, pts > 0 ? `完成 +${pts}` : (pts < 0 ? '迟到 -1' : '完成 +0'), pts);
  save();
  render();

  if (pts < 0) {
    showModal('🌙 迟到了一点', `${sub} 已经完成，但 22:00 以后输入密码会扣 1 点生命值哦。<br>明天要早点完成，就能拿更多分啦！`, null);
  } else if (pts === 0) {
    showToast(`⏰ ${sub} 完成，时间较晚得 0 分`);
  } else {
    showToast(`🎉 ${sub} 完成！+${pts} 生命值`);
  }
}

/* ---------------- 花园：播种 / 浇水 ---------------- */
function plantSeed(seedName) {
  if (state.lifePoints < 3) { showModal('💔 生命值不足', '播种需要 3 点生命值，先把作业完成赚生命值吧！', null); return; }
  state.lifePoints -= 3;
  const today = localDateStr();
  const seed = SEEDS.find((s) => s.name === seedName);
  state.garden.push({
    id: 'p' + Date.now() + Math.floor(Math.random() * 1000),
    type: seedName,
    growth: 0,
    plantedDate: today,
    lastWaterDate: today,   // 播种当天视为已“养护”基线，从明天起才可浇水
    missedWaterDays: 0,
    bloomed: false,
    withered: false,
    witheredSince: null,
    disappeared: false,
    addedAt: Date.now()      // 用于「我的花园」默认排序（新种在前）
  });
  sortGardenInPlace();
  addLog(today, fmtTime(new Date()), '花园', `播种${seedName} -3`, -3);
  save();
  render();
  showToast(`🌱 播种了${seedName}！明天开始每天浇水就能长大`);
}

// 浇水特效：右上角洒水壶（透明底）纯旋转倾倒 + 水滴落在植物上
function playWaterEffect(plantId) {
  const card = document.querySelector(`.plant[data-id="${plantId}"]`);
  const pic = card && card.querySelector('.pic');
  if (!pic) return;
  const fx = document.createElement('div');
  fx.className = 'water-fx';
  fx.innerHTML = `
    <img class="can" src="water_can.png" alt="" />
    <span class="drop d1"></span><span class="drop d2"></span><span class="drop d3"></span>`;
  pic.appendChild(fx);
  setTimeout(() => fx.remove(), 1300);
}

function waterPlant(plantId) {
  const p = state.garden.find((x) => x.id === plantId);
  if (!p || p.disappeared) return;
  if (p.bloomed) { showToast('🌸 这株已经盛开啦，不用再浇水'); return; }
  if (p.withered) { showModal('🥀 已经枯萎', '枯萎的植物无法再浇水，3 天后会消失哦。', null); return; }

  const today = localDateStr();
  // 测试模式下放开「当天播种不可浇」「每天只能浇一次」的限制，方便测试
  if (!state.testMode && p.plantedDate === today) { showToast('🌱 今天刚播种，明天才能浇水哦'); return; }
  if (!state.testMode && p.lastWaterDate === today) { showToast('💧 今天已经浇过水啦'); return; }
  if (state.lifePoints < 1) { showModal('💔 生命值不足', '浇水需要 1 点生命值，先去完成作业吧！', null); return; }

  state.lifePoints -= 1;
  p.growth += 1;
  p.lastWaterDate = today;
  p.missedWaterDays = 0;
  addLog(today, fmtTime(new Date()), '花园', `浇水${p.type} -1`, -1);

  if (p.growth >= 21) {
    p.bloomed = true;
    sortGardenInPlace();
    save(); render();
    playWaterEffect(plantId);
    showModal('🌸 盛开啦！', `太棒了！你的<b>${p.type}</b>已经长到第 8 级，永久盛开～<br>它会永远留在花园里，不再需要浇水维护。`, null);
    return;
  }
  save();
  render();
  playWaterEffect(plantId);
  showToast(`💧 ${p.type} 长大一点啦（已浇 ${p.growth}/21 次，第 ${plantStageIndex(p) + 1} 阶段）`);
}

/* 根据植物数据推导当前阶段 */
function getStage(p) {
  if (p.disappeared) return 'disappeared';
  if (p.withered) return 'withered';
  if (p.bloomed || p.growth >= 21) return 'bloomed';   // 浇满 21 次 = 第 8 级，永久盛开
  if (p.growth <= 0) return 'seed';
  if (p.growth < 18) return 'growing';
  return 'aboutToBloom';
}
function plantEmoji(p) {
  const seed = SEEDS.find((s) => s.name === p.type);
  const st = getStage(p);
  return st === 'bloomed' ? (seed && seed.emoji) || '🌸' : STAGE[st].emoji;
}
function plantBg(p) {
  const seed = SEEDS.find((s) => s.name === p.type);
  const st = getStage(p);
  return st === 'bloomed' ? (seed && seed.color) || '#fff4cf' : STAGE[st].bg;
}

// 植物对应的「生长状态图」基础路径（不含扩展名）
// 命名规则：images/flowers/<img键>_g<生长值>（如 lotus_g3）
// 枯萎：images/<img键>_withered；消失：images/<img键>_disappeared
// 支持 jpg / png / webp 三种格式，App 会自动尝试，找到哪个用哪个（见 __tryImg）
// 若三种都缺失，<img> 隐藏，露出底下的 emoji 兜底
// 植物阶段序号：每浇 3 次水升 1 级，0~7 共 8 张图（浇满 21 次 = 第 8 级）
function plantStageIndex(p) {
  return Math.min(Math.floor(p.growth / 3), 7);
}
function plantImageBase(p) {
  const seed = SEEDS.find((s) => s.name === p.type);
  const key = (seed && seed.img) ? seed.img : 'fallback';
  const st = getStage(p);
  if (st === 'disappeared') return `images/flowers/${key}_disappeared`;
  if (st === 'withered') return `images/flowers/${key}_withered`;
  if (st === 'bloomed') return `images/flowers/${key}_g7`;   // 永久盛开用最大图
  return `images/flowers/${key}_g${plantStageIndex(p)}`;
}

// 图片加载失败时，依次尝试 jpg → png → webp，全部失败则隐藏并显示 emoji 兜底
window.__tryImg = function (img) {
  const list = (img.getAttribute('data-imgs') || '').split('|');
  let i = (parseInt(img.getAttribute('data-i'), 10) || 0) + 1;
  if (i < list.length) {
    img.setAttribute('data-i', String(i));
    img.src = list[i];
  } else {
    img.style.display = 'none';
  }
};

// 自动生成的花朵生长图（SVG，零文件、零存储）：随 growth 0~10 长大，10 盛开；枯竭/消失也有对应形态
// 作为「默认显示」，若 images/ 里放了同名真实照片（jpg/png/webp），照片会盖在它上面
function plantSvg(p) {
  const seed = SEEDS.find((s) => s.name === p.type);
  const color = (seed && seed.color) ? seed.color : '#cdeaf0';
  const st = getStage(p);
  const g = Math.max(0, Math.min(10, p.growth));
  const potY = 86, cx = 50;
  const stemH = 8 + (g / 10) * 58;          // 8 → 66
  const topY = potY - stemH;                // 花头中心 y
  const stemColor = (st === 'withered') ? '#b39a63' : '#5fae5f';

  if (st === 'disappeared') {
    return `<svg class="plant-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <polygon points="38,84 62,84 58,96 42,96" fill="#cdbfa6"/>
      <text x="50" y="79" font-size="22" text-anchor="middle" fill="#b0a089">×</text>
    </svg>`;
  }

  const wilt = (st === 'withered');
  const rot = wilt ? ` rotate(18 ${cx} ${potY})` : '';
  const leaf1 = `<ellipse cx="${cx - 13}" cy="${potY - stemH * 0.45}" rx="11" ry="6" fill="${stemColor}" transform="rotate(-28 ${cx - 13} ${potY - stemH * 0.45})"/>`;
  const leaf2 = `<ellipse cx="${cx + 13}" cy="${potY - stemH * 0.72}" rx="11" ry="6" fill="${stemColor}" transform="rotate(28 ${cx + 13} ${potY - stemH * 0.72})"/>`;

  let head = '';
  if (g >= 10) {
    let petals = '';
    for (let k = 0; k < 6; k++) {
      const ang = (k * 60) * Math.PI / 180;
      const px = cx + Math.cos(ang) * 9;
      const py = topY + Math.sin(ang) * 9;
      petals += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="7" ry="11" fill="${color}" transform="rotate(${k * 60} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
    }
    head = petals + `<circle cx="${cx}" cy="${topY}" r="6" fill="#ffd84a"/>`;
  } else if (g >= 1) {
    const r = 4 + (g / 10) * 6;
    const budFill = g >= 7 ? color : '#86c98a';
    head = `<ellipse cx="${cx}" cy="${topY}" rx="${r.toFixed(1)}" ry="${(r * 1.3).toFixed(1)}" fill="${budFill}"/>`;
  } else {
    head = `<circle cx="${cx}" cy="${potY - 4}" r="3" fill="#7ec47e"/>`;
  }

  return `<svg class="plant-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <g${rot}>
      <polygon points="38,84 62,84 58,96 42,96" fill="#d8a06a"/>
      <rect x="${cx - 2}" y="${topY}" width="4" height="${stemH}" fill="${stemColor}"/>
      ${leaf1}${leaf2}
      ${head}
    </g>
  </svg>`;
}

/* ---------------- 花园排序 / 删除 / 拖动 ---------------- */
// 按规则排序：未开花(含枯萎)在前、已开花在后；同组按添加时间倒序(新→旧)
function sortGardenInPlace() {
  state.garden.sort((a, b) => {
    const ab = a.bloomed ? 1 : 0;
    const bb = b.bloomed ? 1 : 0;
    if (ab !== bb) return ab - bb;                 // 未开花(0)排在前面
    return (b.addedAt || 0) - (a.addedAt || 0);    // 同组：新添加的在前
  });
}
// 兼容旧数据：补 addedAt，并套用一次排序规则
function migrateGarden() {
  state.garden.forEach((p, i) => { if (p.addedAt === undefined) p.addedAt = i; });
  sortGardenInPlace();
}

/* ---------------- 宠物：排序 / 领养 / 喂食 / 成长 / 饿死 ---------------- */
// 排序规则（与花园一致）：永久宠物排在后面，其余保持相对顺序
function sortPetsInPlace() {
  const perms = state.pets.filter((p) => p.feedCount >= 21);
  const norms = state.pets.filter((p) => p.feedCount < 21);
  state.pets = norms.concat(perms);
}

// 物种 → 专属动作对应的 CSS 关键帧名（喂食后播放一次）
const PET_ACTIONS = {
  '企鹅': 'act-penguin', '小兔': 'act-rabbit', '布偶猫': 'act-rabbit', '恐龙': 'act-rabbit',
  '朱雀': 'act-penguin', '梅花鹿': 'act-dog', '狐狸': 'act-dog', '独角兽': 'act-rabbit',
  '白虎': 'act-rabbit', '精卫': 'act-penguin', '金毛': 'act-dog', '香猪': 'act-pig'
};

// 幼崽→成年：图片尺寸随等级变大（不与动画 transform 冲突）
function petScale(p) { return 38 + Math.min(p.level, 7) * 4; }
function petImgSize(p) { return 140 + Math.min(p.level, 7) * 6; }   // level0=140px ... level7=182px（图片放大，约占横栏1/4）
// 植物图片尺寸随成长阶段（growth/3，0~7）逐步放大，与宠物逻辑一致
function plantImgSize(p) { return 140 + Math.min(plantStageIndex(p), 7) * 6; }   // 阶段0=140px ... 阶段7=182px
// 宠物阶段图：_stage0~7，支持 webp/png/jpg 三种格式回退
function petStageImg(prefix, level) {
  const lv = Math.min(level, 7);
  const base = `images/pets/${prefix}_stage${lv}`;
  return [base + '.webp', base + '.png', base + '.jpg'].join('|');
}
function petStageLabel(p) {
  if (p.feedCount >= 21) return '⭐ 永久';
  if (p.level === 0) return '🐣 幼崽';
  return '🌿 成长中';
}

function adoptPet(name) {
  if (state.lifePoints < 3) {
    showModal('💔 生命值不足', '领养宠物需要 3 点生命值，先把作业完成赚生命值吧！', null);
    return;
  }
  state.lifePoints -= 3;
  const today = localDateStr();
  const newPet = {
    id: 'pet' + Date.now() + Math.floor(Math.random() * 1000),
    type: name,
    feedCount: 0,
    level: 0,
    lastFeedDate: today,   // 领养当天视为已喂基线，从明天起才可喂食
    adoptedDate: today,
    adoptedAt: Date.now(),
    starved: false,
    starvedSince: null
  };
  state.pets.unshift(newPet);   // 新领养的排在非永久组最前面
  sortPetsInPlace();
  addLog(today, fmtTime(new Date()), '宠物', `领养${name} -3`, -3);
  save();
  render();
  showToast(`🐾 领养了${name}！记得每天来喂它`);
}

function feedPet(id) {
  const p = state.pets.find((x) => x.id === id);
  if (!p) return;
  if (p.feedCount >= 21) { showToast('⭐ 它已经是永久宠物啦，不用再喂'); return; }
  if (p.starved) { showToast('🍂 它已经饿坏了，无法再喂'); return; }
  const today = localDateStr();
  if (!state.testMode && p.lastFeedDate === today) { showToast('🍖 今天已经喂过啦'); return; }   // 测试模式下跳过每日限制
  if (state.lifePoints < 1) {
    showModal('💔 生命值不足', '喂食需要 1 点生命值，先去完成作业吧！', null);
    return;
  }

  state.lifePoints -= 1;
  p.feedCount += 1;
  p.lastFeedDate = today;
  p.level = Math.min(Math.floor(p.feedCount / 3), 7);   // 每喂 3 次升 1 级，0~7 共 8 阶段
  const justGrown = (p.feedCount >= 21);
  if (justGrown) p.level = 7;                            // 满 21 次 = 第 8 级 / 永久
  addLog(today, fmtTime(new Date()), '宠物', `喂食${p.type} -1`, -1);
  save();
  render();
  animatePet(id, p.type);

  if (justGrown) {
    sortPetsInPlace();  // 变永久后移到后面
    showModal('⭐ 宠物长大了！', `太棒了！你的<b>${p.type}</b>已经长到第 8 级，成为永久宠物～<br>它再也不会饿肚子，会永远陪着你！`, null);
  } else {
    showToast(`🍖 ${p.type} 吃饱啦（已喂 ${p.feedCount} 次，第 ${p.level + 1} 阶段）`);
  }
}

// 喂食成功后播放该物种专属动作（一次性动画）
function animatePet(id, type) {
  setTimeout(() => {
    const el = document.querySelector(`.pet[data-id="${id}"] .pet-img`);
    if (!el) return;
    const kf = PET_ACTIONS[type] || 'act-dog';
    el.style.animation = `${kf} 0.9s ease`;
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  }, 30);
}

// 兼容旧数据：补齐宠物字段
function migratePets() {
  if (!Array.isArray(state.pets)) state.pets = [];
  state.pets.forEach((p, i) => {
    if (p.feedCount === undefined) p.feedCount = 0;
    if (p.level === undefined) p.level = 0;
    if (p.lastFeedDate === undefined) p.lastFeedDate = p.adoptedDate || state.date;
    if (p.adoptedDate === undefined) p.adoptedDate = p.lastFeedDate || state.date;
    if (p.starved === undefined) p.starved = false;
    if (p.starvedSince === undefined) p.starvedSince = null;
    if (p.adoptedAt === undefined) p.adoptedAt = Date.now() - (state.pets.length - i) * 100000;
  });
  sortPetsInPlace();
}

function renderPets() {
  let html = `<div class="section-title">🐾 我的宠物</div>`;
  if (state.pets.length === 0) {
    html += `<div class="card empty-tip">还没有宠物～去「商店」里的宠物商店领养一只吧！🐶</div>`;
  } else {
    state.pets.forEach((p) => {
      const pet = PETS.find((s) => s.name === p.type);
      const emoji = pet ? pet.emoji : '🐾';
      const permanent = p.feedCount >= 21;
      const today = localDateStr();
      let statusText, btnHtml;
      if (permanent) {
        statusText = '⭐ 永久宠物（不用再喂）';
        btnHtml = `<button class="feed-btn" disabled>已长大</button>`;
      } else if (p.starved) {
        const left = Math.max(0, 1 - dateDiff(today, p.starvedSince));
        statusText = `🍂 饿肚子 · ${left}天后消失`;
        btnHtml = `<button class="feed-btn" disabled>已饿坏</button>`;
      } else {
        const fedToday = p.lastFeedDate === today;
        const canFeed = state.testMode || !fedToday;   // 测试模式下不限制每日次数
        const left = Math.max(0, 3 - dateDiff(today, p.lastFeedDate));
        statusText = `距饿肚 ${left} 天`;
        if (!canFeed) {
          btnHtml = `<button class="feed-btn" disabled>今天已喂</button>`;
        } else {
          btnHtml = `<button class="feed-btn" data-action="feed" data-id="${p.id}">🍖喂食<br>-1</button>`;
          if (state.testMode) statusText += `（测试模式：可随时多次喂食）`;
        }
      }
      const sz = petImgSize(p);
      const pct = Math.min(100, (p.feedCount / 21) * 100);
      const stageSrc = pet ? petStageImg(pet.img, p.level) : '';
      const firstSrc = pet ? `images/pets/${pet.img}_stage${Math.min(p.level, 7)}.webp` : '';
      html += `
        <div class="card pet" data-id="${p.id}">
          <div class="pic pet-pic" style="width:${sz + 14}px;height:${sz + 14}px">
            <img class="pet-img" data-imgs="${stageSrc}" data-i="0" src="${firstSrc}" style="width:${sz}px;height:${sz}px" alt="${p.type}" onerror="window.__tryImg(this)">
          </div>
          <div class="pinfo">
            <div class="petname" data-pet-id="${p.id}">${emoji} ${p.type}</div>
            <div class="pstatus">${petStageLabel(p)}</div>
            <div class="pstatus">${statusText}</div>
            <div class="bar"><span style="width:${pct}%"></span></div>
            <div class="pstatus">已喂 ${p.feedCount}/21（第 ${Math.min(p.level, 7) + 1} 阶段）</div>
          </div>
          ${btnHtml}
        </div>`;
    });
  }
  html += `<div class="tip-note">每天花 1 点喂食 1 次，每喂 3 次升 1 级，累计喂满 21 次就长成第 8 级永久宠物，再也不会饿肚子～连续 3 天不喂，宠物会进入「饿肚子」状态，再过 1 天就会消失哦！<br>${state.testMode ? '🧪 测试模式：可随时多次喂食、长按宠物名可删除。' : '✋ 长按宠物名可上下拖动排序。'}</div>`;
  document.getElementById('view').innerHTML = html;
}

/* ---------------- 渲染 ---------------- */
let currentTab = 'homework';

function render() {
  document.getElementById('lifePoints').textContent = state.lifePoints;
  if (currentTab === 'homework') renderHomework();
  else if (currentTab === 'shop') renderShop();
  else if (currentTab === 'pet') renderPets();
  else renderGarden();
  // 高亮当前 tab
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === currentTab));
}

function renderHomework() {
  const today = localDateStr();
  let html = `<div class="section-title" style="display:flex;align-items:center;justify-content:space-between">📚 今天的作业打卡<span style="font-size:15px;font-weight:700;color:#8a7a82">${state.date}　星期${'日一二三四五六'[new Date().getDay()]}</span></div>`;

  SUBJECTS.forEach((sub) => {
    const c = state.completion[sub];
    const pwSet = (state.passwords[sub] || '').trim() !== '';
    const stateCls = c.done ? 'done' : 'todo';
    const stateText = c.done ? `已完成 +${c.points} ✅` : (pwSet ? '待完成' : '家长未设密码');
    const subLine = c.done ? `完成时间 ${c.inputTime}` : (pwSet ? '完成后让家长给密码' : '请家长去⚙️设置密码');
    html += `
      <div class="card subject">
        <div class="emoji">${SUBJECT_EMOJI[sub]}</div>
        <div class="info">
          <div class="name">${sub}</div>
          <div class="sub">${subLine}</div>
        </div>
        <div class="state ${stateCls}">${stateText}</div>
      </div>`;
  });

  html += `
    <div class="card pwd-area">
      <div class="section-title" style="margin:0 0 8px">🔑 输入密码验证</div>
      <input id="pwdInput" class="pwd-input" placeholder="按住🎤说话，松开停止，或手动输入密码" autocomplete="off" />
      <div class="btn-row">
        <button class="big-btn btn-voice" data-action="voice">🎤 按住说话</button>
        <button class="big-btn btn-verify" data-action="verify">✅ 验证</button>
      </div>
      <div class="tip-note">提示：孩子完成一项作业，家长给对应密码。计分时段（可在⚙️家长设置里改）：${timeRulesText()}。<br>${state.testMode ? '🧪 <b>测试模式开启</b>：不限制每科打卡次数和每天浇水次数，方便测试；正式使用时请在家长设置里关闭测试。' : '每科每天只能打卡一次，花园每株每天只能浇一次水。'}</div>
    </div>`;

  // 今日明细
  const logs = state.history.filter((h) => h.date === today);
  html += `<div class="section-title">📝 今日生命值明细</div><div class="card">`;
  if (logs.length === 0) {
    html += `<div class="empty-tip">今天还没有记录，快去完成作业吧！</div>`;
  } else {
    logs.slice().reverse().forEach((h) => {
      const cls = h.points >= 0 ? 'plus' : 'minus';
      const sign = h.points >= 0 ? '+' + h.points : h.points;
      html += `<div class="log-item"><span>${h.time} · ${h.subject} · ${h.desc}</span><span class="pts ${cls}">${sign}</span></div>`;
    });
  }
  html += `</div>`;

  document.getElementById('view').innerHTML = html;
}

function renderShop() {
  let html = `<div class="section-title">🛒 商店（每颗 3❤️）</div><div class="grid">`;
  SEEDS.forEach((s) => {
    const disabled = state.lifePoints < 3 ? 'disabled' : '';
    html += `
      <div class="seed">
        <div class="flower">${s.emoji}</div>
        <div class="sname">${s.name}</div>
        <div class="price">💰 3 生命值</div>
        <button class="mini-btn" data-action="plant" data-seed="${s.name}" ${disabled}>播种</button>
      </div>`;
  });
  html += `</div>`;

  // 宠物商店板块（与种子商店并列，叠加宠物模块，不动原有种子逻辑）
  html += `<div class="section-title">🐾 宠物商店（每只 3❤️）</div><div class="grid">`;
  PETS.forEach((s) => {
    const disabled = state.lifePoints < 3 ? 'disabled' : '';
    const s0 = `images/pets/${s.img}_stage0.webp`;
    html += `
      <div class="seed">
        <div class="flower"><img class="shop-pet" data-imgs="${petStageImg(s.img, 0)}" data-i="0" src="${s0}" alt="${s.name}" onerror="window.__tryImg(this)"></div>
        <div class="sname">${s.name}</div>
        <div class="price">💰 3 生命值</div>
        <button class="mini-btn" data-action="adopt" data-pet="${s.name}" ${disabled}>领养</button>
      </div>`;
  });
  html += `</div>
    <div class="tip-note">播种扣 3 点生命值，${state.testMode ? '播种当天起即可浇水、每天可多次浇（测试模式）' : '从第二天起每天可花 1 点浇水'}，每浇 3 次升 1 级，浇满 21 次永久盛开留在花园！<br>🐾 想养宠物？在上方「宠物商店」领养，去「我的宠物」每天喂食照顾它们～</div>`;
  document.getElementById('view').innerHTML = html;
}

function renderGarden() {
  let html = `<div class="section-title">🌷 我的花园</div>`;
  const alive = state.garden.filter((p) => !p.disappeared);
  if (alive.length === 0) {
    html += `<div class="card empty-tip">花园还是空的～去商店播种第一株植物吧！🌱</div>`;
  } else {
    alive.forEach((p) => {
      const st = getStage(p);
      const stageInfo = STAGE[st];
      const seed = SEEDS.find((s) => s.name === p.type);
      let statusText = stageInfo.label;
      let barCls = '';
      let btnHtml = '';
      const today = localDateStr();

      if (st === 'bloomed') {
        statusText = '🌸 已盛开（永久保留）';
        btnHtml = `<button class="water-btn" disabled>已开花</button>`;
      } else if (st === 'withered') {
        const left = Math.max(0, 1 - dateDiff(today, p.witheredSince));
        statusText = `🥀 枯萎中 · ${left} 天后消失`;
        barCls = 'wither-bar';
        btnHtml = `<button class="water-btn" disabled>已枯萎</button>`;
      } else {
        const left = Math.max(0, 3 - (p.missedWaterDays || 0));
        statusText = `距枯萎还有 ${left} 天`;
        // 测试模式：播种当天即可浇水、每天可多次浇（按钮保持可点）
        // 正常模式：播种当天不能浇（明天才能浇）、每天只能浇一次
        if (!state.testMode && p.plantedDate === today) {
          btnHtml = `<button class="water-btn" disabled>明天浇水</button>`;
        } else if (!state.testMode && p.lastWaterDate === today) {
          btnHtml = `<button class="water-btn" disabled>今天已浇</button>`;
        } else {
          btnHtml = `<button class="water-btn" data-action="water" data-id="${p.id}">💧浇水<br>-1</button>`;
          if (state.testMode) statusText += `（测试模式：可随时浇水）`;
        }
      }

      const pct = Math.min(100, (p.growth / 21) * 100);
      const ibase = plantImageBase(p);
      const cands = [ibase + '.jpg', ibase + '.png', ibase + '.webp'].join('|');
      html += `
        <div class="card plant" data-id="${p.id}">
          <div class="pic" style="background:${plantBg(p)};width:${plantImgSize(p) + 14}px;height:${plantImgSize(p) + 14}px">
            ${plantSvg(p)}
            <img class="plant-img" data-imgs="${cands}" data-i="0" src="${ibase}.jpg" alt="${p.type}" onerror="window.__tryImg(this)" />
          </div>
          <div class="pinfo">
            <div class="pname" data-plant-id="${p.id}">${(seed && seed.emoji) || '🌱'} ${p.type}</div>
            <div class="pstatus">${statusText}</div>
            <div class="bar ${barCls}"><span style="width:${pct}%"></span></div>
            <div class="pstatus">生长 ${p.growth}/21（第 ${plantStageIndex(p) + 1} 阶段）</div>
          </div>
          ${btnHtml}
        </div>`;
    });
  }
  const gardenHint = state.testMode
    ? '🧪 测试模式：长按花名（或右键点花名）可删除这株花。'
    : '✋ 长按花名可上下拖动，给花朵排个喜欢的顺序。';
  html += `<div class="tip-note">连续 3 天不给植物浇水会枯萎，枯萎后再 1 天会消失。记得每天来照顾它们哦！<br>${gardenHint}</div>`;
  document.getElementById('view').innerHTML = html;
}

/* ---------------- 语音识别（按住说话，松开停止） ---------------- */
let recognition = null;
let voiceActive = false;   // 标记话筒是否正在录音
function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;
  try {
    recognition = new SR();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const input = document.getElementById('pwdInput');
      if (input) input.value = text;
      submitPassword(text);
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        showModal('🎤 麦克风未开启', 'iPad 上请打开：<b>设置 → Safari → 麦克风</b>，允许本应用使用麦克风。<br>或者直接用键盘手动输入密码也可以哦。', null);
      } else if (e.error === 'no-speech') {
        showToast('没听到声音，再试一次或手动输入');
      } else {
        showToast('语音识别失败，请手动输入密码');
      }
    };
    recognition.onend = () => {
      voiceActive = false;
      const vb = document.querySelector('[data-action="voice"]');
      if (vb) vb.classList.remove('listening');
    };
    return true;
  } catch (e) { return false; }
}

function startVoice() {
  if (!recognition) {
    showModal('🎤 不支持语音', '当前浏览器不支持语音输入，请直接用键盘手动输入密码。', null);
    return;
  }
  if (voiceActive) return;   // 防止重复启动
  voiceActive = true;
  const vb = document.querySelector('[data-action="voice"]');
  if (vb) vb.classList.add('listening');
  try { recognition.start(); showToast('请说出密码…（松开停止）'); }
  catch (e) { voiceActive = false; }
}

function stopVoice() {
  if (!voiceActive || !recognition) return;
  try { recognition.stop(); } catch (e) {}
}

/* ---------------- Toast / Modal ---------------- */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function showModal(title, html, buttons) {
  const box = document.getElementById('modalBox');
  let actions = '';
  if (buttons && buttons.length) {
    buttons.forEach((b, i) => { actions += `<button class="big-btn ${b.cls || 'btn-green'}" data-modal="${i}">${b.label}</button>`; });
  } else {
    actions = `<button class="big-btn btn-green" data-modal="close">知道啦</button>`;
  }
  box.innerHTML = `<h2>${title}</h2><p>${html}</p><div class="modal-actions">${actions}</div>`;
  box._modalButtons = buttons || null;
  document.getElementById('modalMask').classList.remove('hidden');
}
function closeModal() { document.getElementById('modalMask').classList.add('hidden'); }

/* ---------------- 家长设置（带家长码） ---------------- */
function openParentGate() {
  const box = document.getElementById('modalBox');
  box.innerHTML = `
    <h2>⚙️ 家长设置</h2>
    <p style="text-align:center">请输入家长码（默认 1234）</p>
    <div class="field"><input id="pinInput" type="password" inputmode="numeric" placeholder="家长码" /></div>
    <div class="modal-actions">
      <button class="big-btn btn-yellow" data-modal="pin">进入</button>
      <button class="big-btn btn-green" data-modal="close">取消</button>
    </div>`;
  box._modalButtons = null;
  box._pinMode = true;
  document.getElementById('modalMask').classList.remove('hidden');
  setTimeout(() => { const i = document.getElementById('pinInput'); if (i) i.focus(); }, 50);
}

function openParentSettings() {
  const p = state.passwords;
  const box = document.getElementById('modalBox');

  // 时间规则行（按 end 升序展示）
  const sortedRules = (state.timeRules && state.timeRules.length ? state.timeRules : defaultTimeRules())
    .slice().sort((a, b) => a.end - b.end);
  const ruleRows = sortedRules.map((r) => `
    <div class="rule-row" data-rule>
      <span>到</span>
      <input type="number" data-rule-end value="${r.end}" min="1" max="24" />
      <span>点 →</span>
      <input type="number" data-rule-pts value="${r.points}" />
      <span>分</span>
      <button class="mini-del" data-action="delRule" title="删除">✕</button>
    </div>`).join('');

  box.innerHTML = `
    <h2>⚙️ 家长设置</h2>
    <p>设置今天 4 科作业密码，完成后通过微信发给孩子。每天可重新设置新密码。</p>
    <div class="field"><label>📖 语文密码</label><input data-pw="语文" value="${p['语文'] || ''}" placeholder="例如：yuwen1" /></div>
    <div class="field"><label>🔢 数学密码</label><input data-pw="数学" value="${p['数学'] || ''}" placeholder="例如：shuxue1" /></div>
    <div class="field"><label>🔤 英语密码</label><input data-pw="英语" value="${p['英语'] || ''}" placeholder="例如：yingyu1" /></div>
    <div class="field"><label>⚽ 体育密码</label><input data-pw="体育" value="${p['体育'] || ''}" placeholder="例如：tiyu1" /></div>

    <div class="field">
      <label>🧪 测试模式（不限制每日打卡 / 浇水次数）</label>
      <label class="switch"><input type="checkbox" id="testModeChk" ${state.testMode ? 'checked' : ''}/><span class="slider"></span></label>
      <div class="hint-sm">测试阶段建议开启；测试完成后取消勾选，恢复正常「每科每天打卡 1 次、每株每天浇水 1 次」的限制。</div>
    </div>

    <div class="field">
      <label>⏰ 完成作业时间 → 生命值</label>
      <div id="timeRulesBox">${ruleRows}</div>
      <button class="mini-add" data-action="addRule">➕ 添加时间段</button>
      <div class="hint-sm">例如「到 19 点 → 3 分」表示 19:00 之前完成得 3 分。建议把最后一档设为「到 24 点 → -1 分」作为兜底（最晚时段）。</div>
    </div>

    <div class="field"><label>🔒 修改家长码（可选）</label><input id="newPin" inputmode="numeric" placeholder="留空表示不修改" /></div>
    <div class="tip-note">建议每天更换密码，防止孩子重复使用旧密码。家长码用于保护此设置不被孩子误改。</div>
    <div class="modal-actions">
      <button class="big-btn btn-green" data-modal="save">保存</button>
      <button class="big-btn btn-yellow" data-modal="close">关闭</button>
    </div>`;
  box._modalButtons = null;
  box._settingsMode = true;
  document.getElementById('modalMask').classList.remove('hidden');
}

function saveParentSettings() {
  document.querySelectorAll('#modalBox [data-pw]').forEach((inp) => {
    state.passwords[inp.dataset.pw] = inp.value;
  });
  const newPin = document.getElementById('newPin').value.trim();
  if (newPin) state.parentPin = newPin;

  // 测试模式开关
  const tm = document.getElementById('testModeChk');
  if (tm) state.testMode = tm.checked;

  // 时间规则
  const rules = [];
  document.querySelectorAll('#modalBox [data-rule]').forEach((row) => {
    const end = parseInt(row.querySelector('[data-rule-end]').value, 10);
    const pts = parseInt(row.querySelector('[data-rule-pts]').value, 10);
    if (!isNaN(end) && end >= 1 && end <= 24 && !isNaN(pts)) rules.push({ end, points: pts });
  });
  if (rules.length) state.timeRules = rules;

  save();
  closeModal();
  render();
  showToast('✅ 设置已保存');
}

/* ---------------- 帮助 ---------------- */
function openHelp() {
  showModal('❓ 怎么用？',
    `1️⃣ <b>作业打卡</b>：孩子完成作业后，点🎤说密码或手动输入，验证通过得生命值。<br>
     2️⃣ <b>商店 / 我的花园</b>：用 3 点生命值在商店播种喜欢的花，从第二天起每天花 1 点浇水，每浇 3 次升 1 级，浇满 21 次永久盛开留在花园！<br>
     3️⃣ <b>宠物商店 / 我的宠物</b>：用 3 点领养宠物，每天花 1 点喂食 1 次，每喂 3 次升 1 级，喂满 21 次成为永久宠物（永不饿死）。<br>
     ⚠️ 设备时间不要随便改，否则计时和计分都会乱。<br>
     📖 完整图文说明见《操作说明.md》。`,
    null);
}

/* ---------------- 花园 & 宠物：删除 / 拖动排序 交互（通用） ---------------- */
// 交互临时状态（长按计时 / 拖动上下文），模块级以便各函数共享
let lpTimer = null, lpStart = null, dragCtx = null;
function clearLP() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } }

// 测试模式：长按花名或右键点花名 → 删除确认
function confirmDeletePlant(plant) {
  showModal('🗑️ 删除这株花？', `确定要删除「${plant.type}」吗？删除后无法恢复哦。`, [
    { label: '删除', cls: 'btn-yellow', onClick: () => deletePlant(plant.id) },
    { label: '取消', cls: 'btn-green', onClick: () => {} }
  ]);
}
function deletePlant(id) {
  state.garden = state.garden.filter((p) => p.id !== id);
  save(); closeModal(); render();
  showToast('🗑️ 已删除这株花');
}

// 测试模式：长按宠物名或右键点宠物名 → 删除确认
function confirmDeletePet(pet) {
  showModal('🗑️ 删除这只宠物？', `确定要删除「${pet.type}」吗？删除后无法恢复哦。`, [
    { label: '删除', cls: 'btn-yellow', onClick: () => deletePet(pet.id) },
    { label: '取消', cls: 'btn-green', onClick: () => {} }
  ]);
}
function deletePet(id) {
  state.pets = state.pets.filter((p) => p.id !== id);
  save(); closeModal(); render();
  showToast('🗑️ 已删除这只宠物');
}

// 非测试模式：长按名称 → 进入拖动排序（支持 .plant 和 .pet）
function startDrag(label, id, cardClass) {
  const card = label.closest('.' + cardClass);
  if (!card) return;
  dragCtx = { id, card, cardClass };
  card.classList.add('dragging');
  card.style.pointerEvents = 'none'; // 让 elementFromPoint 能命中下方的卡片
  showToast('✋ 上下拖动排序，松手保存');
}
function handleDragMove(e) {
  if (!dragCtx) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const target = el ? el.closest('.' + dragCtx.cardClass) : null;
  if (!target || target === dragCtx.card) return;
  const rect = target.getBoundingClientRect();
  const after = (e.clientY - rect.top) > rect.height / 2;
  const parent = dragCtx.card.parentNode;
  if (after) {
    if (target.nextSibling === dragCtx.card) return;
    parent.insertBefore(dragCtx.card, target.nextSibling);
  } else {
    if (target.previousSibling === dragCtx.card) return;
    parent.insertBefore(dragCtx.card, target);
  }
}
function finalizeDrag() {
  if (!dragCtx) return;
  const { cardClass } = dragCtx;
  const ids = [...document.querySelectorAll('#view .' + cardClass)].map((c) => c.dataset.id);
  const map = {};
  const arr = (cardClass === 'pet') ? state.pets : state.garden;
  arr.forEach((x) => { map[x.id] = x; });
  const newArr = ids.map((id) => map[id]).filter(Boolean);
  if (cardClass === 'pet') state.pets = newArr; else state.garden = newArr;
  save();
  if (dragCtx && dragCtx.card) {
    dragCtx.card.classList.remove('dragging');
    dragCtx.card.style.pointerEvents = '';
  }
  dragCtx = null;
  render();
  showToast('✅ 排列已保存');
}
function cancelDrag() {
  if (dragCtx && dragCtx.card) {
    dragCtx.card.classList.remove('dragging');
    dragCtx.card.style.pointerEvents = '';
  }
  dragCtx = null;
  render();
}

/* ---------------- 事件绑定 ---------------- */
function bindEvents() {
  // Tab 切换
  document.querySelectorAll('.tab').forEach((b) => {
    b.addEventListener('click', () => { currentTab = b.dataset.tab; render(); });
  });

  // 顶栏按钮
  document.getElementById('gearBtn').addEventListener('click', openParentGate);
  document.getElementById('helpBtn').addEventListener('click', openHelp);

  // 视图内的动作（事件委托）
  document.getElementById('view').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'verify') {
      const input = document.getElementById('pwdInput');
      submitPassword(input ? input.value : '');
      if (input) input.value = '';
    } else if (action === 'plant') {
      plantSeed(btn.dataset.seed);
    } else if (action === 'water') {
      waterPlant(btn.dataset.id);
    } else if (action === 'adopt') {
      adoptPet(btn.dataset.pet);
    } else if (action === 'feed') {
      feedPet(btn.dataset.id);
    }
  });

  // 回车验证
  document.getElementById('view').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'pwdInput') {
      submitPassword(e.target.value);
      e.target.value = '';
    }
  });

  // 花园 & 宠物：测试模式长按/右键删除；非测试模式长按拖动排序（作用于「花名」/「宠物名」）
  // 语音输入：按住启动话筒，松开停止
  const gview = document.getElementById('view');

  // 语音：按住说话
  gview.addEventListener('pointerdown', (e) => {
    const vb = e.target.closest('[data-action="voice"]');
    if (vb) { e.preventDefault(); startVoice(); }
  });
  gview.addEventListener('pointerup', (e) => {
    if (e.target.closest && e.target.closest('[data-action="voice"]')) stopVoice();
  });
  gview.addEventListener('pointercancel', () => { stopVoice(); });

  // 长按交互（通用：植物 + 宠物）
  gview.addEventListener('pointerdown', (e) => {
    const plantLabel = e.target.closest('.pname');
    const petLabel = e.target.closest('.petname');
    const label = plantLabel || petLabel;
    if (!label) return;
    const isPet = !!petLabel;
    lpStart = { x: e.clientX, y: e.clientY };
    const id = isPet ? label.dataset.petId : label.dataset.plantId;
    clearLP();
    lpTimer = setTimeout(() => {
      lpTimer = null;
      if (isPet) {
        const pet = state.pets.find((p) => p.id === id);
        if (!pet) return;
        if (state.testMode) confirmDeletePet(pet);
        else startDrag(label, id, 'pet');
      } else {
        const plant = state.garden.find((p) => p.id === id);
        if (!plant) return;
        if (state.testMode) confirmDeletePlant(plant);
        else startDrag(label, id, 'plant');
      }
    }, 550);
  });
  gview.addEventListener('pointermove', (e) => {
    if (dragCtx) { handleDragMove(e); return; }
    if (lpTimer && lpStart) {
      const dx = e.clientX - lpStart.x, dy = e.clientY - lpStart.y;
      if (dx * dx + dy * dy > 100) clearLP(); // 视为滚动，取消长按
    }
  });
  gview.addEventListener('pointerup', () => {
    if (dragCtx) finalizeDrag();
    clearLP(); lpStart = null;
  });
  gview.addEventListener('pointercancel', () => {
    if (dragCtx) cancelDrag();
    clearLP(); lpStart = null;
  });
  gview.addEventListener('contextmenu', (e) => {
    const plantLabel = e.target.closest('.pname');
    const petLabel = e.target.closest('.petname');
    const label = plantLabel || petLabel;
    if (!label) return;
    e.preventDefault();
    const isPet = !!petLabel;
    const id = isPet ? label.dataset.petId : label.dataset.plantId;
    if (isPet) {
      const pet = state.pets.find((p) => p.id === id);
      if (!pet) return;
      if (state.testMode) confirmDeletePet(pet);
      else showToast('✋ 长按宠物名即可拖动排序～');
    } else {
      const plant = state.garden.find((p) => p.id === id);
      if (!plant) return;
      if (state.testMode) confirmDeletePlant(plant);
      else showToast('✋ 长按花名即可拖动排序～');
    }
  });

  // Modal 按钮
  document.getElementById('modalBox').addEventListener('click', (e) => {
    // 家长设置里的「添加 / 删除时间段」按钮（data-action）
    const actBtn = e.target.closest('[data-action]');
    if (actBtn) {
      const action = actBtn.dataset.action;
      if (action === 'addRule') {
        const box2 = document.getElementById('timeRulesBox');
        if (box2) {
          const row = document.createElement('div');
          row.className = 'rule-row';
          row.setAttribute('data-rule', '');
          row.innerHTML = `<span>到</span><input type="number" data-rule-end value="20" min="1" max="24" /><span>点 →</span><input type="number" data-rule-pts value="1" /><span>分</span><button class="mini-del" data-action="delRule" title="删除">✕</button>`;
          box2.appendChild(row);
        }
        return;
      }
      if (action === 'delRule') {
        const row = actBtn.closest('[data-rule]');
        if (row) row.remove();
        return;
      }
    }

    const btn = e.target.closest('[data-modal]');
    if (!btn) return;
    const key = btn.dataset.modal;
    const box = document.getElementById('modalBox');
    if (key === 'close') { closeModal(); return; }
    if (key === 'pin') {
      const val = document.getElementById('pinInput').value.trim();
      if (val === state.parentPin) { openParentSettings(); }
      else { showToast('家长码不对'); }
      return;
    }
    if (key === 'save') { saveParentSettings(); return; }
    // 自定义按钮
    const custom = box._modalButtons;
    if (custom && custom[Number(key)] && custom[Number(key)].onClick) custom[Number(key)].onClick();
  });

  // 点击遮罩关闭
  document.getElementById('modalMask').addEventListener('click', (e) => {
    if (e.target.id === 'modalMask') closeModal();
  });
}

/* ---------------- 启动 ---------------- */
function showPendingAlerts() {
  const d = state._pendingDeductions || [];
  const w = state._pendingWithered || [];
  state._pendingDeductions = [];
  state._pendingWithered = [];
  save();

  if (d.length && w.length) {
    const subs = d.map((x) => x.sub).join('、');
    const names = w.map((x) => x.type).join('、');
    showModal('📋 昨日小结', `昨天有 <b>${d.length}</b> 项作业没完成，扣了 <b>${d.length}</b> 点生命值（${subs}）。<br>另外有 <b>${w.length}</b> 株植物枯萎了（${names}）。<br>今天加油哦！`, null);
  } else if (d.length) {
    const subs = d.map((x) => x.sub).join('、');
    showModal('📋 扣分提醒', `昨天有 <b>${d.length}</b> 项作业没完成，扣了 <b>${d.length}</b> 点生命值：<br>${subs}。<br>今天早点完成就能拿高分啦！`, null);
  } else if (w.length) {
    const names = w.map((x) => x.type).join('、');
    showModal('🥀 植物枯萎提醒', `有 <b>${w.length}</b> 株植物因为连续 3 天没浇水枯萎了：<br>${names}。<br>枯萎后 1 天会消失，记得每天来照顾花园！`, null);
  }

  const s = state._pendingStarved || [];
  state._pendingStarved = [];
  if (s.length) {
    showModal('🍂 宠物快饿坏了', `有 <b>${s.length}</b> 只宠物因为连续 3 天没喂食，快饿坏了：${s.join('、')}。<br>再不喂，明天就会消失哦！快去「我的宠物」喂喂它们吧！`, null);
  }
}

function init() {
  load();
  initVoice();
  bindEvents();
  render();
  showPendingAlerts();

  // 注册 Service Worker（支持离线 / 主屏幕全屏）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // 每分钟检查一次是否跨天，自动结算
  setInterval(() => {
    const before = state.date;
    ensureToday();
    if (state.date !== before) { render(); showPendingAlerts(); }
  }, 60000);
}

init();
