// 非交互旗标解析与 --help 文本（spec 20261115-8975 FR-6）。
//
// 旗标集：
//   --all                 安装技能类型全部条目（免交互）
//   --skills <名[,名...]> 按条目指定安装（逗号分隔；可重复出现，取并集保序）
//   -h / --help           帮助
// 交互路径与旗标路径共用同一安装器，落盘结果一致。

const FLAGS = ['--all', '--skills <名[,名...]> [-a, -b, ...]', '-h, --help'];

export function renderHelp() {
  return `@hankghchen/infra —— 套件资产初始化 CLI

用法（在目标 git 项目根目录执行）：
  npx @hankghchen/infra                      # 进入两层交互菜单（选类型 → 勾选技能）
  npx @hankghchen/infra@<semver>             # 指定版本安装（锁文件记录该版本）
  npx @hankghchen/infra --all                # 免交互安装全部技能
  npx @hankghchen/infra --skills dev-spec,dev-plan   # 免交互安装指定技能
  npx @hankghchen/infra --skills dev-spec --skills ref-testing       # 可重复出现，取并集

旗标：
  --all                       安装技能类型全部条目（免交互）
  --skills <名[,名...]>       按条目指定安装；逗号分隔，可重复出现，取并集
  -h, --help                  显示本帮助

行为：
  - 技能实体拷入项目 .agents/skills/<技能名>/（SKILL.md 与 references/ 随包原样齐备）
  - 对项目内已存在的 agent 目录（.claude、.zcode 等）建相对软链；不存在者跳过并列入完成摘要
  - 安装后在项目根写 .infra-lock.json 记账（包版本 + 逐技能指纹/安装时间）
  - 重跑本命令 = 按当前包内容覆盖刷新已装技能并更新锁文件，无重复堆积`;
}

export function parseArgs(argv) {
  const parsed = { mode: 'interactive' };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case '--all': {
        if (parsed.mode === 'skills') {
          throw new Error('--all 与 --skills 互斥：全装与按条目指定只能选一');
        }
        parsed.mode = 'all';
        break;
      }
      case '--skills': {
        if (parsed.mode === 'all') {
          throw new Error('--all 与 --skills 互斥：全装与按条目指定只能选一');
        }
        const value = argv[i + 1];
        if (value === undefined || value === '') {
          throw new Error('--skills 需要至少一个技能名（如 --skills dev-spec,dev-plan）');
        }
        parsed.mode = 'skills';
        const merged = [...(parsed.skills ?? []), ...value.split(',').map((s) => s.trim()).filter(Boolean)];
        parsed.skills = [...new Set(merged)];
        i += 1;
        break;
      }
      case '-h':
      case '--help': {
        return { mode: 'help' };
      }
      default:
        if (arg.startsWith('--')) {
          throw new Error(`未知旗标 ${arg}；可用旗标：${FLAGS.join('、')}（--help 查看示例）`);
        }
        throw new Error(`不接受位置参数「${arg}」：本命令只认旗标，技能请用 --skills 指定（--help 查看示例）`);
    }
    i += 1;
  }
  return parsed;
}
