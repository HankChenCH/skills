// 非交互旗标解析与 --help 文本（spec 20261115-8975 FR-6 + 20261115-495e 非交互旗标决策）。
//
// 旗标集：
//   --all                 安装技能类型全部条目（免交互；语义维持技能，不扩展到插件）
//   --skills <名[,名...]> 按条目指定技能安装（逗号分隔；可重复出现，取并集保序）
//   --plugins <名[,名...]> 按条目指定插件安装（registry 包名；可重复出现，取并集；与 --profile 配对）
//   --profile <名>        插件安装的目标 dsh profile（只与 --plugins 配对）
//   -h / --help           帮助
// 交互路径与旗标路径共用同一安装器，落盘结果一致。

const FLAGS = [
  '--all',
  '--skills <名[,名...]> [-a, -b, ...]',
  '--plugins <名[,名...]> --profile <名> [-a, -b, ...]',
  '-h, --help',
];

export function renderHelp() {
  return `@hankchen/infra —— 套件资产初始化 CLI

用法（在目标 git 项目根目录执行）：
  npx @hankchen/infra                      # 进入两层交互菜单（选类型 → 勾选技能/插件）
  npx @hankchen/infra@<semver>             # 指定版本安装（锁文件记录该版本）
  npx @hankchen/infra --all                # 免交互安装全部技能
  npx @hankchen/infra --skills dev-spec,dev-plan   # 免交互安装指定技能
  npx @hankchen/infra --skills dev-spec --skills ref-testing       # 可重复出现，取并集
  npx @hankchen/infra --plugins @hankchen/dsh-demo --profile dev   # 免交互安装插件到指定 dsh profile

旗标：
  --all                       安装技能类型全部条目（免交互）
  --skills <名[,名...]>       按条目指定安装；逗号分隔，可重复出现，取并集
  --plugins <名[,名...]>      免交互安装插件（registry 包名）；逗号分隔，可重复出现，取并集
  --profile <名>              插件安装的目标 dsh profile（与 --plugins 配对必填；desktop 为官方保留名拒装）
  -h, --help                  显示本帮助

行为：
  - 技能实体拷入项目 .agents/skills/<技能名>/（SKILL.md 与 references/ 随包原样齐备）
  - 对项目内已存在的 agent 目录（.claude、.zcode 等）建相对软链；不存在者跳过并列入完成摘要
  - 插件经宿主官方命令安装进 dsh profile（dsh 不在 PATH 自动改 npx @deepseek-ai/dsh）；
    node 版本须 ≥ 24.9.0；装后读 profile package.json 对账落点并记入 .infra-lock.json
  - 安装后在项目根写 .infra-lock.json 记账（包版本 + 逐技能指纹/逐插件版本与安装时间）
  - 重跑本命令 = 按当前包内容覆盖刷新已装资产并更新锁文件，无重复堆积`;
}

function mergeValues(existing, value, flag) {
  if (value === undefined || value === '') {
    throw new Error(`${flag} 需要至少一个名字（如 ${flag} a,b）`);
  }
  const merged = [...(existing ?? []), ...value.split(',').map((s) => s.trim()).filter(Boolean)];
  return [...new Set(merged)];
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
        if (parsed.mode === 'plugins') {
          throw new Error('--plugins/--profile 与 --all/--skills 互斥：插件安装与技能安装只能选一');
        }
        parsed.mode = 'all';
        break;
      }
      case '--skills': {
        if (parsed.mode === 'all') {
          throw new Error('--all 与 --skills 互斥：全装与按条目指定只能选一');
        }
        if (parsed.mode === 'plugins') {
          throw new Error('--plugins/--profile 与 --all/--skills 互斥：插件安装与技能安装只能选一');
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
      case '--plugins': {
        if (parsed.mode === 'all' || parsed.mode === 'skills') {
          throw new Error('--plugins/--profile 与 --all/--skills 互斥：插件安装与技能安装只能选一');
        }
        parsed.mode = 'plugins';
        parsed.plugins = mergeValues(parsed.plugins, argv[i + 1], '--plugins');
        i += 1;
        break;
      }
      case '--profile': {
        const value = argv[i + 1];
        if (value === undefined || value === '') {
          throw new Error('--profile 需要一个 profile 名（如 --profile dev）');
        }
        // 配对检查延后到解析结束：--profile 与 --plugins 不限先后顺序
        parsed.profile = value;
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
        throw new Error(`不接受位置参数「${arg}」：本命令只认旗标，条目请用 --skills/--plugins 指定（--help 查看示例）`);
    }
    i += 1;
  }
  if (parsed.mode === 'plugins') {
    if (parsed.profile === undefined) {
      parsed.profile = null;
    }
  } else if (parsed.profile !== undefined) {
    throw new Error('--profile 需与 --plugins 配对使用（插件安装指定目标 dsh profile）');
  }
  return parsed;
}
