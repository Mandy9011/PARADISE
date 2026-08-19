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

// 时间→积分 的默认规则（家长可在「家长设置」里修改）
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

// 休息机制：家长设置的一段连续日期区间内，应用整体“冻结”（积分获取/扣分/生长均停止）
function isRestDay(d) {
  if (state.pastRestDays && state.pastRestDays.includes(d)) return true;  // 历史归档的休息日，永久固定
  const r = state.rest;
  return !!(r && r.start && r.end && r.start <= d && d <= r.end);
}
// 计算 from 到 to 之间的“有效天数”（剔除休息日）；from 当天不计，to 当天计
function activeGap(from, to) {
  if (!from || !to || to < from) return 0;
  let cnt = 0, d = addDays(from, 1);
  while (d <= to) { if (!isRestDay(d)) cnt++; d = addDays(d, 1); }
  return cnt;
}
// 自动归档：把当前休息区间里“已经过去（<今天）”的日子永久固定到 pastRestDays。
// 一旦某天过去，它就永远被记为休息日，之后改 state.rest（删除/替换区间）也不会撤销历史。
function archivePastRestDays() {
  if (!state.pastRestDays) state.pastRestDays = [];
  if (state.rest && state.rest.start && state.rest.end) {
    const today = localDateStr();
    let d = state.rest.start, touched = false;
    while (d <= state.rest.end) {
      if (d < today && !state.pastRestDays.includes(d)) { state.pastRestDays.push(d); touched = true; }
      d = addDays(d, 1);
    }
    if (touched) save();
  }
}

// 照护状态分级（gap = 距上次浇水/喂食的天数：0=今天，1=昨天）
// 0 生长状态良好 | 1 缺水了/饿肚子了 | 2 尽快照护(明天枯萎) | 3 枯萎了/饿跑了(图片空白)
function plantCareState(p, today) {
  if (p.withered) return { tier: 3, text: '🥀 花朵枯萎了~', blank: true };
  const gap = activeGap(p.lastWaterDate, today);
  if (gap <= 1) return { tier: 0, text: '🌿 生长状态良好', blank: false };
  if (gap === 2) return { tier: 1, text: '💧 植物缺水了', blank: false };
  if (gap === 3) return { tier: 2, text: '⏰ 尽快浇水哦，花朵明天要枯萎了~', blank: false };
  return { tier: 3, text: '🥀 花朵枯萎了~', blank: true };
}
function petCareState(p, today) {
  if (p.starved) return { tier: 3, text: '🍂 宠物饿跑了~', blank: true };
  const gap = activeGap(p.lastFeedDate, today);
  if (gap <= 1) return { tier: 0, text: '🐾 生长状态良好', blank: false };
  if (gap === 2) return { tier: 1, text: '🍖 宠物饿肚子了', blank: false };
  if (gap === 3) return { tier: 2, text: '⏰ 尽快喂食哦，宠物明天要饿跑了~', blank: false };
  return { tier: 3, text: '🍂 宠物饿跑了~', blank: true };
}

// 集齐收藏判定：12 种不同花全部盛开 / 12 种不同宠物全部长大(永久)
function flowerKindsBloomed() {
  return new Set(state.garden.filter((p) => !p.disappeared && p.bloomed).map((p) => p.type)).size;
}
function petKindsGrown() {
  return new Set(state.pets.filter((p) => !p.starved && !p.disappeared && p.feedCount >= 21).map((p) => p.type)).size;
}
function checkCollectionRewards() {
  if (!state.collectionRewards.flower && flowerKindsBloomed() >= 12) {
    state.collectionRewards.flower = true; save(); showRewardModal('flower');
  }
  if (!state.collectionRewards.pet && petKindsGrown() >= 12) {
    state.collectionRewards.pet = true; save(); showRewardModal('pet');
  }
}
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

// 中文数字 → 阿拉伯数字（语音输入「200米跑」与表格「二百米跑」统一为同一串，避免密码错误）
function cnToArabic(str) {
  if (!/[零〇一二两三四五六七八九十百千万]/.test(str)) return str;
  const d = { '零':0,'〇':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9 };
  const unit = { '十':10,'百':100,'千':1000 };
  let out = '';
  let num = 0, section = 0, hasDigit = false;
  const flush = () => {
    const v = section + num;
    if (hasDigit && v > 0) out += String(v);
    section = 0; num = 0; hasDigit = false;
  };
  for (const ch of str) {
    if (d[ch] !== undefined) { num = d[ch]; hasDigit = true; }
    else if (unit[ch] !== undefined) { section += (num === 0 ? 1 : num) * unit[ch]; num = 0; hasDigit = true; }
    else if (ch === '万') { const base = section + num; out += String((base > 0 ? base : 1) * 10000); section = 0; num = 0; hasDigit = false; }
    else { flush(); out += ch; }
  }
  flush();
  return out;
}

function normalize(s) {
  return cnToArabic((s || '').trim().toLowerCase().replace(/\s+/g, ''));
}

// 取某科当天的「每日自动密码」（实时，按设备日期），与隐藏奖励保持一致：每天自动更新、家长无需手动设置
function dailySubjectPassword(sub) {
  const dp = (typeof DAILY_PASSWORDS !== 'undefined') ? DAILY_PASSWORDS[localDateStr()] : null;
  const v = dp && dp[sub];
  return (v != null) ? String(v) : '';
}

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
    timeRules: defaultTimeRules(), // 时间→积分 映射，可在家长设置里修改
    rewardClaimed: { date: '', claimed: false },  // 隐藏奖励每日限领一次
    collectionRewards: { flower: false, pet: false },  // 集齐 12 种盛开花朵/长大宠物奖励：雪花/蓝孔雀
    rest: null,            // 休息区间 { start:'YYYY-MM-DD', end:'YYYY-MM-DD' } 或 null（未开启）；区间内积分/扣分/生长全部冻结
    pastRestDays: []      // 历史已过去、且当时为休息日的日期集合（归档后永久固定，后续改设置无法撤销）
  };
}

// 深合并：override 优先，base 补齐缺失字段；数组直接以 override 为准（不逐个元素合并）。
// 用于「新版本代码读取旧备份」时自动补全新字段，绝不报错 / 不丢失旧数据。
function deepFill(base, override) {
  if (Array.isArray(override)) return override;
  if (override && typeof override === 'object') {
    const bObj = (base && typeof base === 'object' && !Array.isArray(base)) ? base : null;
    const result = {};
    const keys = new Set([...(bObj ? Object.keys(bObj) : []), ...Object.keys(override)]);
    keys.forEach((k) => {
      const bv = bObj ? bObj[k] : undefined;
      const ov = override[k];
      if (ov === undefined) { if (bObj) result[k] = bv; }
      else if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
        result[k] = deepFill(bv, ov);
      } else {
        result[k] = ov;
      }
    });
    return result;
  }
  return override;
}

// 把任意（可能旧的）备份对象规范化为完整、可用的 state：以默认值为底，导入数据覆盖，缺失字段自动补齐
function normalizeState(parsed) {
  return deepFill(defaultState(), parsed || {});
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = deepFill(defaultState(), parsed);
      // 补齐可能缺失的科目
      SUBJECTS.forEach((s) => {
        if (!state.completion[s]) state.completion[s] = { done: false, inputTime: null, points: 0 };
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
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

/* ---------------- 数据备份 / 恢复（覆盖全部用户进度，兼容新旧版本） ---------------- */
// 一键导出：把当前 state 打包为完整 JSON 文件并触发下载（iPad 可存到「文件 - iCloud 云盘」）
function exportBackup() {
  try {
    save(); // 确保导出的是最新数据
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fname = `养花养宠存档_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1500);
    showToast('备份成功！请保存到 iCloud，换设备 / 更新版本可恢复进度');
  } catch (e) {
    showModal('⚠️ 导出失败', '备份文件生成出错，请稍后再试。', null);
  }
}

// 导入恢复：唤起文件选择器 → 读取并校验 → 确认覆盖 → 写回 localStorage → 自动刷新初始化
function importBackup() {
  try {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.style.display = 'none';
    inp.addEventListener('change', () => {
      const file = inp.files && inp.files[0];
      inp.remove();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let parsed;
        try {
          parsed = JSON.parse(reader.result);
        } catch (e2) {
          showModal('⚠️ 备份文件无效', '文件已损坏或格式错误，无法读取。', null);
          return;
        }
        const valid = parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
          ['lifePoints', 'points', 'garden', 'pets', 'completion', 'date', 'history', 'passwords']
            .some((k) => k in parsed);
        if (!valid) {
          showModal('⚠️ 备份文件无效', '这个文件不是有效的养花养宠备份，无法导入。', null);
          return;
        }
        showModal('📥 导入备份',
          '将用此备份<b>覆盖当前所有进度</b>（积分、植物、宠物、打卡记录、设置等）。确定继续吗？',
          [
            { label: '取消', cls: 'btn-yellow', onClick: () => closeModal() },
            {
              label: '恢复', cls: 'btn-green', onClick: () => {
                try {
                  state = normalizeState(parsed);   // 自动补齐缺失字段，兼容新旧版本
                  // 恢复后把「当前日期」对齐到今天，避免旧备份的日期触发 ensureToday 把中间缺失的
                  // 每一天都重新结算（集中扣分 / 枯萎 / 饿跑）；并清空恢复数据里「今天」的打卡态，
                  // 让孩子以今天为全新一天重新打卡，但保留积分 / 植物 / 宠物 / 历史等全部进度。
                  state.date = localDateStr();
                  SUBJECTS.forEach((s) => { state.completion[s] = { done: false, inputTime: null, points: 0 }; });
                  state.rewardClaimed = { date: '', claimed: false };
                  save();
                  closeModal();
                  showToast('数据恢复成功！所有养成进度已同步');
                  setTimeout(() => { location.reload(); }, 1200); // 刷新后由 load() 重新初始化，进度立即生效
                } catch (e3) {
                  showModal('⚠️ 恢复失败', '写入数据出错，请稍后再试。', null);
                }
              }
            }
          ]);
      };
      reader.onerror = () => { showModal('⚠️ 读取失败', '无法读取该文件，请重试。', null); };
      reader.readAsText(file);
    });
    document.body.appendChild(inp);
    inp.click();
  } catch (e) {
    showModal('⚠️ 导入失败', '无法打开文件选择器，请稍后再试。', null);
  }
}

// 手动同步 GitHub 上的最新代码：拉取服务端最新 sw.js，再刷新页面加载最新资源，无需重开 PWA
function checkForUpdate() {
  if (!('serviceWorker' in navigator)) {
    showToast('正在刷新页面…');
    setTimeout(() => location.reload(), 400);
    return;
  }
  showToast('正在同步最新版本…');
  navigator.serviceWorker.getRegistration().then((reg) => {
    const go = () => setTimeout(() => location.reload(), 600); // 刷新后新 SW 激活并接管，页面即加载最新代码
    if (reg && reg.update) {
      reg.update().then(go).catch(go);
    } else {
      go();
    }
  }).catch(() => setTimeout(() => location.reload(), 400));
}

function addLog(date, time, subject, desc, points) {
  state.history.push({ date, time, subject, desc, points });
}

/* ---------------- 跨天结算：作业扣分 + 花园枯萎 ---------------- */
function resetCompletion() {
  SUBJECTS.forEach((s) => { state.completion[s] = { done: false, inputTime: null, points: 0 }; });
}

function ensureToday() {
  archivePastRestDays();   // 进入新的一天时，先把已过去的休息日归档固定
  const today = localDateStr();
  if (today < state.date) state.date = today;   // 设备时钟被回拨时，避免 state.date 残留未来值导致界面/取值不一致
  const deductions = [];   // 作业未完成扣分
  const witheredList = []; // 新枯萎的植物

  // 逐天补齐（支持多天未打开的情况，按天结算）
  while (state.date < today) {
    const endedDay = state.date;          // 刚刚结束的那一天
    const newDay = addDays(endedDay, 1);  // 即将进入的新的一天

    // 休息日：积分获取、扣分与生长机制全部冻结，仅推进日期、不结算
    if (!isRestDay(endedDay)) {
      // 1) 作业结算：当天有密码但未完成 -> 扣 1
      SUBJECTS.forEach((sub) => {
        const c = state.completion[sub];
        const dpEnded = (typeof DAILY_PASSWORDS !== 'undefined') ? (DAILY_PASSWORDS[endedDay] || null) : null;
        const pw = (dpEnded && dpEnded[sub] != null) ? String(dpEnded[sub]).trim() : '';
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
        if (!p.withered && (p.missedWaterDays || 0) >= 4) {
          p.withered = true;
          p.witheredSince = newDay;
          witheredList.push(p);
        } else if (p.withered) {
          if (activeGap(p.witheredSince, newDay) >= 1) p.disappeared = true;   // 枯萎后保留 1 个有效天即消失
        }
      });
    }

    state.date = newDay;
    resetCompletion();
  }

  // 宠物饿死（与植物枯萎对称）：非永久宠物连续 3 天未喂食 → 先进入"饿肚子"状态（保留 1 天），再 1 天后消失
  const starvedList = [];       // 新进入饿肚子状态的宠物（用于提醒）
  state.pets = (state.pets || []).filter((pt) => {
    if (pt.feedCount >= 21) return true;                   // 永久宠物不受影响
    if (pt.starved) {
      if (activeGap(pt.starvedSince, today) >= 1) { return false; } // 保留 1 个有效天后消失
      return true;
    }
    if (activeGap(pt.lastFeedDate, today) >= 4) {
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
    const p = normalize(dailySubjectPassword(sub));
    if (p && p === n) found = sub;
  });
  return found;
}

function submitPassword(input) {
  if (isRestDay(localDateStr())) { showToast('🌴 今天休息日，作业打卡暂停、不计分哦~'); return; }
  const sub = matchSubject(input);
  if (sub) {
    // 正常作业密码逻辑（原有）
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
      showModal('🌙 迟到了一点', `${sub} 已经完成，但 22:00 以后输入密码会扣 1 点积分哦。<br>明天要早点完成，就能拿更多分啦！`, null);
    } else if (pts === 0) {
      showToast(`⏰ ${sub} 完成，时间较晚得 0 分`);
    } else {
      showToast(`🎉 ${sub} 完成！+${pts} 积分`);
    }
    return;
  }

  // 休息日：积分获取暂停，隐藏奖励同样不计
  if (isRestDay(localDateStr())) { showToast('🌴 今天休息日，隐藏奖励也暂停哦~'); return; }

  // 隐藏奖励密码：输入得 2 积分，每日限一次，不计入任何科目
  // 与各科密码保持一致：一律用设备实时日期 localDateStr()，避免 state.date 残留导致取值错位
  const rw = (typeof DAILY_REWARD_PASSWORDS !== 'undefined') ? DAILY_REWARD_PASSWORDS[localDateStr()] : null;
  if (rw && normalize(rw) === normalize(input)) {
    if (state.rewardClaimed.date === localDateStr() && state.rewardClaimed.claimed) {
      showToast('🎁 今天的隐藏奖励已经领过啦');
      return;
    }
    state.lifePoints += 2;
    state.rewardClaimed = { date: localDateStr(), claimed: true };
    addLog(localDateStr(), fmtTime(new Date()), '隐藏奖励', '奖励 +2', 2);
    save();
    render();
    showToast('🎁 隐藏奖励！+2 积分');
    return;
  }

  showToast('❌ 密码不对，再试试看~');
}

/* ---------------- 花园：播种 / 浇水 ---------------- */
function plantSeed(seedName) {
  if (isRestDay(localDateStr())) { showToast('🌴 休息中，植物养护已暂停~'); return; }
  if (state.lifePoints < 3) { showModal('💔 积分不足', '播种需要 3 点积分，先把作业完成赚积分吧！', null); return; }
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
  if (isRestDay(localDateStr())) { showToast('🌴 休息中，植物养护已暂停~'); return; }
  if (p.bloomed) { showToast('🌸 这株已经盛开啦，不用再浇水'); return; }
  if (p.withered) { showModal('🥀 已经枯萎', '枯萎的植物无法再浇水，3 天后会消失哦。', null); return; }

  const today = localDateStr();
  // 测试模式下放开「当天播种不可浇」「每天只能浇一次」的限制，方便测试
  if (!state.testMode && p.plantedDate === today) { showToast('🌱 今天刚播种，明天才能浇水哦'); return; }
  if (!state.testMode && p.lastWaterDate === today) { showToast('💧 今天已经浇过水啦'); return; }
  if (state.lifePoints < 1) { showModal('💔 积分不足', '浇水需要 1 点积分，先去完成作业吧！', null); return; }

  state.lifePoints -= 1;
  p.growth += 1;
  p.lastWaterDate = today;
  p.missedWaterDays = 0;
  addLog(today, fmtTime(new Date()), '花园', `浇水${p.type} -1`, -1);

  if (p.growth >= 21) {
    p.bloomed = true;
    sortGardenInPlace();
    checkCollectionRewards();
    save(); render();
    playWaterEffect(plantId);
    showModal('🌸 盛开啦！', `太棒了！你的<b>${p.type}</b>已经长到第 8 级，永久盛开～<br>它会永远留在花园里，不再需要浇水维护。`, null);
    return;
  }
  save();
  render();
  playWaterEffect(plantId);
  showToast(`💧 ${p.type} 长大一点啦（已浇 ${p.growth}/21 次，Level ${plantStageIndex(p) + 1}）`);
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
function plantBg(p) {
  const seed = SEEDS.find((s) => s.name === p.type);
  const st = getStage(p);
  return st === 'bloomed' ? (seed && seed.color) || '#fff4cf' : STAGE[st].bg;
}

// 植物对应的「生长状态图」基础路径（不含扩展名）
// 命名规则：images/flowers/<img键>_g<生长值>（如 lotus_g3）
// 枯萎：images/<img键>_withered；消失：images/<img键>_disappeared
// 支持 jpg / png / webp 三种格式，App 会自动尝试，找到哪个用哪个（见 __tryImg）
// 若三种都缺失，<img> 隐藏，显示空白占位（不再使用自动生成的 SVG 兜底图）
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
function petImgSize(p) { return 140 + Math.min(p.level, 7) * 6; }   // level0=140px ... level7=182px（图片放大，约占横栏1/4）
// 植物图片尺寸随成长阶段（growth/3，0~7）逐步放大，与宠物逻辑一致
function plantImgSize(p) { return 140 + Math.min(plantStageIndex(p), 7) * 6; }   // 阶段0=140px ... 阶段7=182px
// 宠物阶段图：_stage0~7，支持 webp/png/jpg 三种格式回退
function petStageImg(prefix, level) {
  const lv = Math.min(level, 7);
  const base = `images/pets/${prefix}_stage${lv}`;
  return [base + '.webp', base + '.png', base + '.jpg'].join('|');
}

function adoptPet(name) {
  if (isRestDay(localDateStr())) { showToast('🌴 休息中，宠物养护已暂停~'); return; }
  if (state.lifePoints < 3) {
    showModal('💔 积分不足', '领养宠物需要 3 点积分，先把作业完成赚积分吧！', null);
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
  if (isRestDay(localDateStr())) { showToast('🌴 休息中，宠物养护已暂停~'); return; }
  if (p.feedCount >= 21) { showToast('⭐ 它已经是永久宠物啦，不用再喂'); return; }
  if (p.starved) { showToast('🍂 它已经饿坏了，无法再喂'); return; }
  const today = localDateStr();
  if (!state.testMode && p.lastFeedDate === today) { showToast('🍖 今天已经喂过啦'); return; }   // 测试模式下跳过每日限制
  if (state.lifePoints < 1) {
    showModal('💔 积分不足', '喂食需要 1 点积分，先去完成作业吧！', null);
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
    checkCollectionRewards();
    showModal('⭐ 宠物长大了！', `太棒了！你的<b>${p.type}</b>已经长到第 8 级，成为永久宠物～<br>它以后都不用再喂食啦，会一直陪着你！`, null);
  } else {
    showToast(`🍖 ${p.type} 吃饱啦（已喂 ${p.feedCount} 次，Level ${p.level + 1}）`);
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
  const petBadge = state.collectionRewards.pet
    ? `<span class="reward-badge"><img src="蓝孔雀.webp" alt="">🦚 蓝孔雀收藏</span>` : '';
  let html = `<div class="section-title">🐾 我的宠物${petBadge}</div>`;
  if (state.pets.length === 0) {
    html += `<div class="card empty-tip">还没有宠物～去「商店」里的宠物商店领养一只吧！🐶</div>`;
  } else {
    state.pets.forEach((p) => {
      const pet = PETS.find((s) => s.name === p.type);
      const emoji = pet ? pet.emoji : '🐾';
      const permanent = p.feedCount >= 21;
      const today = localDateStr();
      let statusText, btnHtml;
      const care = petCareState(p, today);
      if (permanent) {
        statusText = '⭐ 宠物已经长大啦';
        btnHtml = `<button class="feed-btn" disabled>已长大</button>`;
      } else {
        statusText = care.text;
        if (care.tier === 3) {
          btnHtml = `<button class="feed-btn" disabled>已饿坏</button>`;
        } else {
          const fedToday = p.lastFeedDate === today;
          const canFeed = state.testMode || !fedToday;   // 测试模式下不限制每日次数
          if (!canFeed) {
            btnHtml = `<button class="feed-btn" disabled>今天已喂食</button>`;
          } else {
            btnHtml = `<button class="feed-btn" data-action="feed" data-id="${p.id}">喂食<br>❤️1</button>`;
            if (state.testMode) statusText += `（测试模式：可随时多次喂食）`;
          }
        }
      }
      const sz = petImgSize(p);
      const pct = Math.min(100, (p.feedCount / 21) * 100);
      const stageSrc = pet ? petStageImg(pet.img, p.level) : '';
      const firstSrc = pet ? `images/pets/${pet.img}_stage${Math.min(p.level, 7)}.webp` : '';
      const picInner = (permanent || care.tier !== 3) ? `<img class="pet-img" data-imgs="${stageSrc}" data-i="0" src="${firstSrc}" style="width:${sz}px;height:${sz}px" alt="${p.type}" onerror="window.__tryImg(this)">` : '';
      html += `
        <div class="card pet" data-id="${p.id}">
          <div class="pic pet-pic" style="width:${sz + 14}px;height:${sz + 14}px">
            ${picInner}
          </div>
          <div class="pinfo">
            <div class="petname" data-pet-id="${p.id}">${emoji} ${p.type}</div>
            <div class="pstatus">${statusText}</div>
            <div class="bar ${care.tier === 3 ? 'wither-bar' : care.tier === 2 ? 'warn-bar' : ''}"><span style="width:${pct}%"></span></div>
            <div class="pstatus">Level ${p.feedCount} / 21</div>
          </div>
          ${btnHtml}
        </div>`;
    });
  }
  html += `<div class="tip-note">
    🍖 每只宠物每天可喂食1次，喂食21次后，宠物长大，永久获得。<br>
    💔 连续3天不喂食，宠物会饿跑，记得每天来照顾它们哦！<br>
    👆 ${state.testMode ? '🧪 测试模式：长按动物名可删除、可多次喂食。' : '长按动物名可上下拖动排序。'}
  </div>`;
  document.getElementById('view').innerHTML = html;
}

/* ---------------- 渲染 ---------------- */
let currentTab = 'homework';

function render() {
  // 休息横幅：区间开启且今天落在区间内时显示
  const rb = document.getElementById('restBanner');
  if (rb) {
    const t = localDateStr();
    // 横幅只看“当前激活区间是否包含今天”，不依赖历史归档（pastRestDays 仅用于结算/显示固定）
    if (state.rest && state.rest.start <= t && t <= state.rest.end) {
      rb.textContent = `🌴 休息中（${state.rest.start} 至 ${state.rest.end}）：积分获取、扣分与植物宠物生长均已暂停~`;
      rb.classList.remove('hidden');
    } else {
      rb.classList.add('hidden');
    }
  }

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
  let html = `<div class="section-title" style="display:flex;align-items:center;justify-content:space-between">📚 今天的作业打卡<span style="font-size:15px;font-weight:700;color:#8a7a82">${today}　星期${'日一二三四五六'[new Date().getDay()]}</span></div>`;
  if (state.date !== today) {
    html += `<div class="hint-sm" style="color:#c0392b;margin-top:6px">⚠️ 设备日期（${today}）与存档日期（${state.date}）不一致，各科密码按「设备日期」取用。若日期不对，请到 iPad「设置 → 通用 → 日期与时间」打开「自动设置」并设为「中国标准时间」。</div>`;
  }

  SUBJECTS.forEach((sub) => {
    const c = state.completion[sub];
    const pwSet = dailySubjectPassword(sub).trim() !== '';
    const stateCls = c.done ? 'done' : 'todo';
    const stateText = c.done ? `已完成 ${c.points >= 0 ? '+' : ''}${c.points} ✅` : (pwSet ? '待完成' : '家长未设密码');
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
      <input id="pwdInput" class="pwd-input" placeholder="🔑 请输入密码" autocomplete="off" />
      <div class="btn-row">
        <button class="big-btn btn-voice" data-action="voice">🎤 按住说话</button>
        <button class="big-btn btn-verify" data-action="verify">✅ 验证</button>
      </div>
      <div class="tip-note">
        <b>📌 怎么打卡？</b>
        <ol class="hw-steps">
          <li>🎤 按住说话，或在上方输入框手动输入密码，点「✅ 验证」提交。</li>
          <li>每项作业每天只能打卡1次，表现优秀的话会有隐藏奖励哦！</li>
        </ol>
        <b>⏰ 计分时段</b>（家长设置里可改）：${timeRulesText()}。
        ${state.testMode ? '<br>🧪 <b>测试模式开启</b>：不限制每科打卡次数与浇水次数，方便测试；正式使用请在家长设置关闭。' : ''}
      </div>
    </div>`;

  // 今日明细
  const logs = state.history.filter((h) => h.date === today);
  html += `<div class="section-title">📝 今日积分明细</div><div class="card">`;
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
  let html = `<div class="section-title">🛒 种子商店（每颗 3❤️）</div><div class="grid">`;
  SEEDS.forEach((s) => {
    const disabled = state.lifePoints < 3 ? 'disabled' : '';
    html += `
      <div class="seed">
        <div class="flower">${s.emoji}</div>
        <div class="sname">${s.name}</div>
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
        <button class="mini-btn" data-action="adopt" data-pet="${s.name}" ${disabled}>领养</button>
      </div>`;
  });
  html += `</div>`;
  document.getElementById('view').innerHTML = html;
}

function renderGarden() {
  const flowerBadge = state.collectionRewards.flower
    ? `<span class="reward-badge"><img src="雪花.webp" alt="">❄️ 雪花收藏</span>` : '';
  let html = `<div class="section-title">🌷 我的花园${flowerBadge}</div>`;
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
      const care = plantCareState(p, today);

      if (st === 'bloomed') {
        statusText = '🌸 花朵已经盛开啦';
        btnHtml = `<button class="water-btn" disabled>已开花</button>`;
      } else {
        statusText = care.text;
        if (care.tier === 3) {
          barCls = 'wither-bar';
          btnHtml = `<button class="water-btn" disabled>已枯萎</button>`;
        } else {
          if (care.tier === 2) barCls = 'warn-bar';
          // 测试模式：播种当天即可浇水、每天可多次浇（按钮保持可点）
          // 正常模式：播种当天不能浇（明天才能浇）、每天只能浇一次
          if (!state.testMode && p.plantedDate === today) {
            btnHtml = `<button class="water-btn" disabled>明天浇水</button>`;
          } else if (!state.testMode && p.lastWaterDate === today) {
            btnHtml = `<button class="water-btn" disabled>今天已浇水</button>`;
          } else {
            btnHtml = `<button class="water-btn" data-action="water" data-id="${p.id}">浇水<br>❤️1</button>`;
            if (state.testMode) statusText += `（测试模式：可随时浇水）`;
          }
        }
      }

      const pct = Math.min(100, (p.growth / 21) * 100);
      const ibase = plantImageBase(p);
      const cands = [ibase + '.jpg', ibase + '.png', ibase + '.webp'].join('|');
      const picInner = care.blank ? '' : `<img class="plant-img" data-imgs="${cands}" data-i="0" src="${ibase}.jpg" alt="${p.type}" onerror="window.__tryImg(this)" />`;
      html += `
        <div class="card plant" data-id="${p.id}">
          <div class="pic" style="background:${plantBg(p)};width:${plantImgSize(p) + 14}px;height:${plantImgSize(p) + 14}px">
            ${picInner}
          </div>
          <div class="pinfo">
            <div class="pname" data-plant-id="${p.id}">${(seed && seed.emoji) || '🌱'} ${p.type}</div>
            <div class="pstatus">${statusText}</div>
            <div class="bar ${barCls}"><span style="width:${pct}%"></span></div>
            <div class="pstatus">Level ${p.growth} / 21</div>
          </div>
          ${btnHtml}
        </div>`;
    });
  }
  const gardenHint = state.testMode
    ? '🧪 测试模式：长按花名（或右键点花名）可删除这株花，可多次浇水。'
    : '长按花名可上下拖动排序。';
  html += `<div class="tip-note">
    💧 每朵花每天可浇水1次，浇水21次后，花朵盛开，永久获得。<br>
    🥀 连续3天不浇水，花朵会枯萎消失，记得每天来照顾它们哦！<br>
    👆 ${gardenHint}
  </div>`;
  document.getElementById('view').innerHTML = html;
}

/* ---------------- 语音识别（按住说话，松开停止） ---------------- */
let recognition = null;
let voiceActive = false;   // 话筒是否正在录音
let voiceHeld = false;     // 用户是否正按住按钮
let voiceFinal = '';       // 累积的最终识别文本
let voiceRestarts = 0;     // 移动端提前结束时自动重启次数（防死循环）

// 每次启动都新建实例：移动端浏览器在报错/结束后常使旧实例失效，复用会无法再次识别
function buildRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  let rec;
  try { rec = new SR(); } catch (e) { return null; }
  rec.lang = 'zh-CN';
  rec.continuous = true;        // 按住期间持续听
  rec.interimResults = true;    // 实时回显，最终取 final
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) voiceFinal += t;
      else interim += t;
    }
    const input = document.getElementById('pwdInput');
    if (input) input.value = (voiceFinal + interim).trim();
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      voiceHeld = false; voiceActive = false;
      showModal('🎤 麦克风未开启', '请在系统「设置 → 隐私 → 麦克风」中允许本应用使用麦克风，<br>或直接在键盘上手动输入密码。', null);
    } else if (e.error === 'no-speech') {
      // 没听到声音，静默等待
    } else if (e.error === 'aborted') {
      // 主动 stop 触发，忽略
    } else {
      showToast('语音识别失败，请手动输入密码');
    }
  };
  rec.onend = () => {
    voiceActive = false;
    const vb = document.querySelector('[data-action="voice"]');
    if (vb) vb.classList.remove('listening');
    // 移动端常在按住途中意外结束：仍按住则自动重启继续听（最多几次，防止死循环）
    if (voiceHeld && voiceRestarts < 3) {
      voiceRestarts++;
      try { rec.start(); voiceActive = true; return; } catch (e) {}
    }
    commitVoice();   // 真正结束（松手或到达上限）→ 提交文本
  };
  return rec;
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showModal('🎤 不支持语音', '当前浏览器不支持语音输入。<br>请直接在键盘上手动输入密码；手机键盘上通常有 🎤 听写按钮可用。', null);
    return;
  }
  if (voiceActive) return;        // 防止重复启动
  recognition = buildRecognition();
  if (!recognition) {
    showModal('🎤 不支持语音', '当前浏览器不支持语音输入，请直接用键盘手动输入密码。', null);
    return;
  }
  voiceHeld = true;
  voiceActive = true;
  voiceFinal = '';
  voiceRestarts = 0;
  const vb = document.querySelector('[data-action="voice"]');
  if (vb) vb.classList.add('listening');
  try {
    recognition.start();
    showToast('请说出密码…（松开停止）');
  } catch (e) {
    // 偶尔 start 抛错（上一实例未完全结束），稍后重试一次
    setTimeout(() => {
      if (voiceHeld && !voiceActive) { try { recognition.start(); voiceActive = true; } catch (_) {} }
    }, 120);
  }
}

function stopVoice() {
  if (!voiceHeld) return;
  voiceHeld = false;
  if (recognition) { try { recognition.stop(); } catch (e) {} }  // stop 触发 onend → commitVoice
  else commitVoice();
}

function commitVoice() {
  const text = (voiceFinal || '').trim();
  voiceFinal = '';
  if (!text) { showToast('没听清，请再说一次或手动输入'); return; }
  const input = document.getElementById('pwdInput');
  if (input) input.value = text;
  submitPassword(text);
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
function closeModal() {
  document.getElementById('modalMask').classList.add('hidden');
  // 若跨天期间因弹窗打开而推迟了「昨日小结」提醒，关闭弹窗后补弹（避免被覆盖 / 丢失）
  if (state && ((state._pendingDeductions && state._pendingDeductions.length) ||
      (state._pendingWithered && state._pendingWithered.length) ||
      (state._pendingStarved && state._pendingStarved.length))) {
    render();
    showPendingAlerts();
  }
}

// 集齐收藏的庆祝弹窗：雪花(花朵) / 蓝孔雀(宠物)
function showRewardModal(kind) {
  const isFlower = kind === 'flower';
  const img = isFlower ? '雪花.webp' : '蓝孔雀.webp';
  const title = isFlower ? '🎉 集齐 12 种花朵！' : '🎉 集齐 12 种宠物！';
  const msg = isFlower
    ? '你让 12 种花全部盛开啦，送你一朵神奇的<b>雪花</b>❄️，它会永远留在你的花园收藏里！'
    : '你把这 12 种宠物全部养大啦，送你一只珍贵的<b>蓝孔雀</b>🦚，它会永远陪着你！';
  showModal(title, `<div class="reward-pop"><img class="reward-img" src="${img}" alt=""></div><p>${msg}</p>`, [{
    label: '🎁 领取奖励',
    cls: 'btn-yellow',
    onClick: () => {
      closeModal();
      render();
      showToast(isFlower ? '❄️ 雪花已收入收藏！' : '🦚 蓝孔雀已收入收藏！');
    }
  }]);
}

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
  const box = document.getElementById('modalBox');
  const rewardToday = (typeof DAILY_REWARD_PASSWORDS !== 'undefined') ? (DAILY_REWARD_PASSWORDS[localDateStr()] || '') : '';

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

  const SUBJECT_ICON = { '语文': '📖', '数学': '🔢', '英语': '🔤', '体育': '⚽' };
  const subjectInfo = SUBJECTS.map((sub) => {
    const pw = dailySubjectPassword(sub);
    return `<div class="field"><label>${SUBJECT_ICON[sub]} 今日${sub}密码（自动）</label><input value="${pw || '（今日暂无）'}" readonly /></div>`;
  }).join('');

  box.innerHTML = `
    <h2>⚙️ 家长设置</h2>
    <p>4 科作业密码每天按设备日期自动更新（家长无需设置），可直接复制发给孩子。</p>
    ${subjectInfo}

    <div class="field reward-field">
      <label>🎁 今日隐藏奖励密码（输入得 2 积分，孩子看不到）</label>
      <input id="rewardPwView" value="${rewardToday || '（今日暂无）'}" readonly />
      <div class="hint-sm">这是给家长专用的「隐藏奖励」：告诉孩子这个密码、让他在作业打卡处输入，可额外得 2 积分。作业打卡界面不会显示此密码，仅在这里可见；每天 1 个、不重复，每日限领一次。</div>
    </div>

    <div class="field">
      <label>🧪 测试模式（不限制每日打卡 / 浇水次数）</label>
      <label class="switch"><input type="checkbox" id="testModeChk" ${state.testMode ? 'checked' : ''}/><span class="slider"></span></label>
      <div class="hint-sm">测试阶段建议开启；测试完成后取消勾选，恢复正常「每科每天打卡 1 次、每株每天浇水 1 次」的限制。</div>
    </div>

    <div class="field">
      <label>⏰ 完成作业时间 → 积分</label>
      <div id="timeRulesBox">${ruleRows}</div>
      <button class="mini-add" data-action="addRule">➕ 添加时间段</button>
      <div class="hint-sm">例如「到 19 点 → 3 分」表示 19:00 之前完成得 3 分。建议把最后一档设为「到 24 点 → -1 分」作为兜底（最晚时段）。</div>
    </div>

      <div class="field">
        <label>🌴 休息日（放假 / 出游期间，积分、扣分与植物宠物生长全部暂停）</label>
        <div class="rest-date-row">
          <input type="date" id="restStart" value="${state.rest ? state.rest.start : ''}" />
          <span>至</span>
          <input type="date" id="restEnd" value="${state.rest ? state.rest.end : ''}" />
        </div>
        <div class="hint-sm">设置起止日期（含首尾两天）。两项都留空表示不开启休息。开启后孩子端顶部会显示「休息中」提示，期间不扣积分、植物不会枯萎、宠物不会饿跑。</div>
      </div>

    <div class="field"><label>🔒 修改家长码（可选）</label><input id="newPin" inputmode="numeric" placeholder="留空表示不修改" /></div>
    <div class="tip-note">建议每天更换密码，防止孩子重复使用旧密码。家长码用于保护此设置不被孩子误改。</div>

    <div class="backup-block">
      <div class="section-title">📦 数据备份 / 恢复</div>
      <div class="modal-actions" style="margin-top:2px">
        <button class="big-btn btn-blue" data-action="exportBackup">一键导出备份</button>
        <button class="big-btn btn-blue" data-action="importBackup">导入恢复存档</button>
      </div>
      <div class="modal-actions" style="margin-top:8px">
        <button class="big-btn btn-blue" data-action="checkUpdate">检查更新 / 刷新同步</button>
      </div>
      <div class="hint-sm">建议定期把备份存到 iCloud。换设备 / 代码更新 / 系统清理后，可随时导入恢复全部进度。GitHub 推送新版本后，点「检查更新 / 刷新同步」即可一键升级，无需重开本应用。</div>
    </div>
    <div class="modal-actions modal-footer">
      <button class="big-btn btn-green" data-modal="save">保存</button>
      <button class="big-btn btn-yellow" data-modal="close">关闭</button>
    </div>`;
  box._modalButtons = null;
  box._settingsMode = true;
  document.getElementById('modalMask').classList.remove('hidden');
}

function saveParentSettings() {
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

  // 休息区间：起止都填且 start<=end 才生效，否则关闭
  const rs = document.getElementById('restStart').value;
  const re = document.getElementById('restEnd').value;
  // 归档旧区间里已过去的日子（固定），避免改设置把历史休息日撤销
  if (state.rest && state.rest.start && state.rest.end) {
    let od = state.rest.start; const today = localDateStr();
    while (od <= state.rest.end) { if (od < today && !state.pastRestDays.includes(od)) state.pastRestDays.push(od); od = addDays(od, 1); }
  }
  state.rest = (rs && re && rs <= re) ? { start: rs, end: re } : null;

  save();
  closeModal();
  render();
  showToast('✅ 设置已保存');
}

/* ---------------- 帮助 ---------------- */
function openHelp() {
  showModal('❓ 怎么用？',
    `1️⃣ <b>作业打卡</b>：孩子完成作业后，点🎤说密码或手动输入，验证通过得积分。<br>
     2️⃣ <b>商店</b>：用 3 点积分播种喜欢的花，或领养喜欢的宠物。<br>
     3️⃣ <b>我的花园 / 我的宠物</b>：每天用 1 积分浇水/喂养，花朵/宠物升 1 级，浇水/喂养满 21 次，可永久获得花朵/宠物。连续 3 天不浇水/喂养，花朵将会枯萎，宠物将会饿跑。<br>
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

  // 语音：按住说话（press & hold）
  gview.addEventListener('pointerdown', (e) => {
    const vb = e.target.closest('[data-action="voice"]');
    if (vb) { e.preventDefault(); startVoice(); }
  });
  // 松手 / 取消：无论在按钮内还是手指滑出按钮，都可靠地停止录音（移动端常滑动）
  window.addEventListener('pointerup', () => { if (voiceHeld) stopVoice(); });
  window.addEventListener('pointercancel', () => { if (voiceHeld) stopVoice(); });
  // 页面隐藏（切到别的 App / 锁屏）也停止，避免话筒一直占着
  document.addEventListener('visibilitychange', () => { if (document.hidden && voiceHeld) stopVoice(); });

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
      if (action === 'exportBackup') { exportBackup(); return; }
      if (action === 'importBackup') { importBackup(); return; }
      if (action === 'checkUpdate') { checkForUpdate(); return; }
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
  const s = state._pendingStarved || [];
  state._pendingDeductions = [];
  state._pendingWithered = [];
  state._pendingStarved = [];
  save();
  if (!d.length && !w.length && !s.length) return;

  // 合并为单个弹窗：原先多项提醒连调 showModal 会互相覆盖，只剩最后一个可见
  const parts = [];
  if (d.length) {
    const subs = d.map((x) => x.sub).join('、');
    parts.push(`📋 昨天有 <b>${d.length}</b> 项作业没完成，扣了 <b>${d.length}</b> 点积分（${subs}）。`);
  }
  if (w.length) {
    const names = w.map((x) => x.type).join('、');
    parts.push(`🥀 有 <b>${w.length}</b> 株植物枯萎了（${names}），枯萎后 1 天会消失。`);
  }
  if (s.length) {
    parts.push(`🍂 有 <b>${s.length}</b> 只宠物快饿坏了（${s.join('、')}），再不喂明天就会消失哦！`);
  }
  showModal('📋 昨日小结', parts.join('<br><br>') + '<br><br>今天加油哦！', null);
}

function init() {
  load();
  bindEvents();
  render();
  showPendingAlerts();

  // 注册 Service Worker（支持离线 / 主屏幕全屏）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
    // 自动检测服务端是否有新版本：发现后轻提示，由「家长设置 - 检查更新」按钮手动同步（避免孩子使用中突然刷新）
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('🎉 发现新版本，去「家长设置」点「检查更新 / 刷新同步」即可升级');
          }
        });
      });
    }).catch(() => {});
  }

  // 每分钟检查一次是否跨天，自动结算
  setInterval(() => {
    const before = state.date;
    ensureToday();
    const crossed = state.date !== before;
    const hasPending = (state._pendingDeductions && state._pendingDeductions.length) ||
                       (state._pendingWithered && state._pendingWithered.length) ||
                       (state._pendingStarved && state._pendingStarved.length);
    if (!crossed && !hasPending) return;   // 无事发生

    // UI 忙（家长设置弹窗打开，或孩子正在作业输入框打字）时不刷新界面 / 弹提醒，
    // 以免覆盖弹窗内容或清空输入；推迟到弹窗关闭或输入结束后由下个周期 / closeModal 补弹
    const mask = document.getElementById('modalMask');
    const maskOpen = mask && !mask.classList.contains('hidden');
    const typing = document.activeElement && document.activeElement.id === 'pwdInput' && document.activeElement.value;
    if (maskOpen || typing) return;

    if (crossed) render();
    if (hasPending) showPendingAlerts();
  }, 60000);
}

init();
