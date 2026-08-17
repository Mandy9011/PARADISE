# -*- coding: utf-8 -*-
"""
生成「隐藏奖励密码」表：每天 1 个，全局不重复，输入得 2 积分。
- 与现有各科密码（语文/数学/英语/体育）去重，避免撞车。
- 仅含 2 字中文词，便于语音识别；写入 passwords.js 的奖励密码区块（与作业密码合并为同一文件）。
用法：python _gen_reward_passwords.py
"""
import re
import json
import random
from datetime import date, timedelta


def bump_sw_version(sw_path='sw.js'):
    """重生成密码后自动把 SW 缓存版本 +1，确保已安装 PWA 能拉到最新的 passwords.js。
    仅当奖励密码内容实际变化时才应被调用（见主流程），避免无意义地刷高版本号。
    """
    try:
        with open(sw_path, 'r', encoding='utf-8') as f:
            sw = f.read()
    except FileNotFoundError:
        print('⚠️ 未找到 sw.js，跳过自动升 SW 版本。')
        return None
    m = re.search(r"const CACHE = 'homework-garden-v(\d+)';", sw)
    if not m:
        print('⚠️ 未在 sw.js 找到 CACHE 版本标记，跳过自动升 SW 版本。')
        return None
    old = int(m.group(1))
    new = old + 1
    sw = sw[:m.start(1)] + str(new) + sw[m.end(1):]
    with open(sw_path, 'w', encoding='utf-8') as f:
        f.write(sw)
    print(f'SW 缓存版本自动升级：v{old} → v{new}（sw.js CACHE）')
    return new


def _block_core(block_text):
    """去掉注释与标记行，仅保留密码映射本身，用于判断『密码是否真的变化』。"""
    lines = []
    for ln in block_text.splitlines():
        s = ln.strip()
        if s.startswith('//') or s.startswith('/*') or s.endswith('*/'):
            continue
        lines.append(ln)
    return '\n'.join(lines)

# 1) 读取现有 passwords.js，收集「各科作业密码」用于去重。
#    注意：只取奖励密码区块之前的「作业密码」部分，避免把脚本自己生成的奖励密码
#    也算进 used —— 否则每重跑一次候选池就缩小，最终报「候选词不足」无法重生成。
used = set()
try:
    with open('passwords.js', 'r', encoding='utf-8') as f:
        text = f.read()
    job_section = text.split('/* === DAILY_REWARD_PASSWORDS START === */')[0]
    for s in re.findall(r'"([^"]*)"', job_section):
        used.add(s.strip())
except FileNotFoundError:
    pass

# 2) 候选词池（2 字中文，儿童友好、易发音）。用 set 去重。
POOL = """
苹果 香蕉 橘子 葡萄 草莓 西瓜 樱桃 桃子 梨子 芒果 菠萝 椰子 柠檬 石榴 荔枝
龙眼 杨梅 哈密瓜 山楂 柿子 木瓜 枇杷 桑葚 火龙果 山竹 榴莲 蓝莓 橙子 杏子
小狗 小猫 兔子 松鼠 刺猬 熊猫 狮子 大象 长颈鹿 斑马 袋鼠 考拉 狐狸 灰狼
黑熊 猴子 猩猩 河马 犀牛 鳄鱼 乌龟 青蛙 蝌蚪 蝴蝶 蜜蜂 蚂蚁 蜻蜓 蜘蛛 蜗牛
螃蟹 小虾 鲸鱼 海星 章鱼 海龟 企鹅 鸵鸟 孔雀 鹦鹉 鸽子 燕子 喜鹊 乌鸦 老鹰
猫头鹰 啄木鸟 鸳鸯 天鹅 大雁 鸳鸯 画眉 百灵 黄鹂 翠鸟 丹顶鹤 蝙蝠 刺鱼 比目鱼
玫瑰 牡丹 菊花 荷花 梅花 兰花 向日葵 蒲公英 小草 树叶 树枝 大树 松树 柳树
竹子 枫树 仙人掌 蘑菇 木耳 芦苇 藤蔓 茉莉 桂花 丁香 海棠 蔷薇 郁金香 薰衣草
汽车 火车 飞机 轮船 自行车 摩托车 公交车 地铁 出租车 热气球 飞艇 火箭 飞船
积木 拼图 皮球 气球 风筝 木马 娃娃 玩偶 陀螺 弹珠 沙包 跳绳 滑板 秋千 跷跷板
面包 蛋糕 饼干 糖果 巧克力 冰淇淋 酸奶 牛奶 鸡蛋 面条 米饭 饺子 包子 馒头
油条 豆浆 米粥 汤圆 粽子 月饼 糖葫芦 棉花糖 棒棒糖 果冻 布丁 蛋挞 麻花
太阳 月亮 云朵 彩虹 闪电 雷声 风儿 雪花 雨滴 冰雹 雾气 露水 大山 小河 大海
湖泊 泉水 瀑布 沙滩 石头 泥土 森林 草原 田野 山谷 岛屿 峡谷 星空 银河 晚霞
红色 橙色 黄色 绿色 青色 蓝色 紫色 粉色 白色 黑色 灰色 金色 银色 棕色 彩色
圆形 方形 三角形 星形 心形 菱形 月牙形 梯形 扇形 椭圆形
爸爸 妈妈 爷爷 奶奶 哥哥 姐姐 弟弟 妹妹 宝宝 叔叔 阿姨 舅舅 姑姑 姥姥 姥爷
书本 铅笔 橡皮 尺子 书包 文具 黑板 课桌 蜡笔 水彩 毛笔 油画棒 地球仪 显微镜
眼睛 鼻子 耳朵 嘴巴 牙齿 头发 手指 脚丫 肩膀 膝盖 肚子 脸蛋 酒窝 睫毛
帽子 围巾 手套 鞋子 袜子 雨伞 镜子 钟表 台灯 枕头 被子 窗帘 相框 水杯 水壶
风车 灯笼 鞭炮 红包 春联 福字 年画 陀螺 铁环 毽子 空竹 风筝 风铃 蜡烛
星星 闪电 微风 暖阳 清泉 碧波 白云 青山 绿草 红花 翠竹 银月 金阳 晨露 晚风
甜瓜 香瓜 蜜桃 脆枣 板栗 核桃 腰果 花生 瓜子 杏仁 开心果 银杏 莲子 荸荠
蝈蝈 蟋蟀 知了 瓢虫 螳螂 天牛 金龟子 豆娘 草蛉 萤火虫 蜗牛 蚯蚓 蜈蚣 壁虎
锦鲤 金鱼 小丑鱼 海马 海胆 海螺 扇贝 水母 海豚 虎鲸 海豹 海狮 信天翁 海鸥
""".split()

pool = []
seen = set()
for w in POOL:
    w = w.strip()
    if not w:
        continue
    # 仅保留纯 2 字中文词
    if len(w) != 2 or not re.fullmatch(r'[一-鿿]{2}', w):
        continue
    if w in seen:
        continue
    seen.add(w)
    pool.append(w)

# 3) 去重：剔除与现有各科密码相同、或互相重复的候选
candidates = [w for w in pool if w not in used]

# 4) 按固定种子洗牌，保证可复现；取所需天数
START = date(2026, 8, 10)
END = date(2027, 1, 31)
days = (END - START).days + 1

random.seed(20260810)
random.shuffle(candidates)

if len(candidates) < days:
    raise SystemExit(f'候选词不足：需要 {days} 个，仅有 {len(candidates)} 个，请扩充词池。')

chosen = candidates[:days]

# 5) 映射到日期，输出 JS
out = {}
d = START
for w in chosen:
    out[d.isoformat()] = w
    d += timedelta(days=1)

# 校验：全局唯一
assert len(set(chosen)) == len(chosen) == days

block = '/* === DAILY_REWARD_PASSWORDS START === */\n'
block += '// 自动生成的「隐藏奖励密码」表（2026-08-10 ~ 2027-01-31）\n'
block += '// 由 _gen_reward_passwords.py 生成，请勿手动修改。\n'
block += '// 每天 1 个，全局不重复；输入可得 2 积分。仅在家长设置中可见，作业打卡界面不显示。\n'
block += 'const DAILY_REWARD_PASSWORDS = {\n'
for k, v in out.items():
    block += f'"{k}": "{v}",\n'
block += '};\n'
block += '/* === DAILY_REWARD_PASSWORDS END === */'

# 写入合并后的 passwords.js（仅替换奖励密码区块，保留作业密码 DAILY_PASSWORDS）
PATH = 'passwords.js'
with open(PATH, 'r', encoding='utf-8') as f:
    text = f.read()
pat = re.compile(r'/\* === DAILY_REWARD_PASSWORDS START === \*/.*?/\* === DAILY_REWARD_PASSWORDS END === \*/', re.S)
if not pat.search(text):
    raise SystemExit('passwords.js 中未找到奖励密码区块标记，无法写入，请检查标记。')
old_block = pat.search(text)
text = pat.sub(block, text)
with open(PATH, 'w', encoding='utf-8') as f:
    f.write(text)

print(f'已生成 {days} 个隐藏奖励密码，已写入 passwords.js（奖励密码区块）')
print('样例：', dict(list(out.items())[:3]))

# 仅当奖励密码映射本身实际变化时，才自动升 SW 缓存版本，避免注释等变动误刷版本号
if old_block is None or _block_core(old_block.group(0)) != _block_core(block):
    bump_sw_version()
else:
    print('奖励密码内容未变化（仅注释变动），跳过 SW 版本升级。')
