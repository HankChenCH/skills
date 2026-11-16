// commander 15 旗标解析适配面（工单 20261115-eed0；RQ3 §6.3 接入模式 + §10.1 映射表为准绳）。
// 手写解析 src/cli-args.ts 退役，对外接口（parseArgs(argv) / renderHelp()）不变，
// bin/infra.ts 消费形态零改动。
//
// 分层（RQ3 §6.3「语义状态机保留在我侧」——等价的关键不在选哪个库）：
//   - commander：解析骨架与 token 消耗。exitOverride 把库出口翻成异常通道；
//     allowUnknownOption / allowExcessArguments 把未知旗标与位置参数检测让给状态机
//     （保触发顺序）；configureOutput 静音与 showSuggestionAfterError(false) 为保险
//     （§10.3 出口通道映射表原文装配，库检测已让位，静音兜配置漂移）。
//   - 本模块状态机：互斥、值必需（判空不判旗标形）、配对（解析后判，顺序无关）、
//     并集保序去重、未知旗标/位置参数、-h/--help 按序即时派发——错误触发点与文案
//     与退役 cli-args.ts 逐字一致（FR-5 防线），以 RQ3 §6.2 十六案例矩阵 + §10.4
//     边角回归集守护（test/unit/cli.test.ts）。
//
// 偏差留痕（vs RQ3 §10.1 -h 行「helpOption + commander.helpDisplayed 通道」）：
// helpOption(false)，help 由状态机按序自派发。库侧拦截会先于状态机触发，破两形态：
// 「-h 位于错误 token 之后」（--foo -h 应报未知旗标）与「-h 处于值位」（--skills -h
// 应取值 '-h'，§10.4-1）；自派发同时令裸 `--` 自然保持「未知旗标 --」口径（§10.4-2
// 无需预扫描）。帮助文本仍经 helpInformation() 覆盖装配（官方定制面；将来若恢复
// 库侧拦截，文本照旧复刻现行）。选项值消费分工实况：commander 只承担旗标形 token
// 消耗（collectFn split+trim+filter 照 §10.1 装配，其返回值不读）；值语义（拆分、
// 去重、校验）全部由状态机承担，解析结果以状态机为唯一权威——opts 不读（与 RQ3
// 探针同形）。
//
// 解析结果：解析器逐旗标增量构造（单对象增量写），故 skills/plugins/profile 为可选；
// mode='skills' 时 skills 恒非空数组、mode='plugins' 时 plugins 恒非空数组——由解析内
// 的「需要至少一个名字」显式报错保证，消费侧无需再防空。

import { Command } from 'commander';

const FLAGS = [
  '--all',
  '--skills <名[,名...]> [-a, -b, ...]',
  '--plugins <名[,名...]> --profile <名> [-a, -b, ...]',
  '-h, --help',
];

export interface ParsedArgs {
  mode: 'interactive' | 'help' | 'all' | 'skills' | 'plugins';
  skills?: string[];
  plugins?: string[];
  profile?: string | null;
}

export function renderHelp(): string {
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

// §10.1 映射表：值语义状态机自担（按首现去重的并集语义在状态机）。collectFn 仅为
// commander「选项带值」接口形态装配：其返回值不读（opts 不读，见文件头）。保留装配面
// 是 FR-5 逐字节防线的既定形态——有/无 collector 的 token 消费与错误通道经
// commander@15.1.0 六形态探针实测同形（评审 20261116-* 标准轴；差异仅在 opts 存值
// 形态，本模块不可观察），删除无可观察收益，不动装配面。
const splitNames = (value: string, previous: string[] = []): string[] => [
  ...(previous ?? []),
  ...value.split(',').map((s) => s.trim()).filter(Boolean),
];

function createProgram(): Command {
  const program = new Command();
  program.helpInformation = () => `${renderHelp()}\n`;
  program.exitOverride();
  program.showSuggestionAfterError(false);
  program.allowExcessArguments();
  program.allowUnknownOption();
  program.configureOutput({ writeErr: () => {} });
  program.helpOption(false); // 偏差留痕见文件头：help 自派发，破 FR-5 的两形态不走库拦截
  program.option('--all', '安装技能类型全部条目（免交互）');
  program.option('--skills [names]', '按条目指定安装；逗号分隔，可重复出现，取并集', splitNames);
  program.option('--plugins [names]', '免交互安装插件；逗号分隔，可重复出现，取并集', splitNames);
  program.option('--profile [name]', '插件安装的目标 dsh profile');
  return program;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const program = createProgram();
  try {
    program.parse(argv, { from: 'user' });
  } catch (err) {
    // §10.3 兜底哨兵（矩阵未触发）：helpDisplayed 通道在 helpOption(false) 后理论不可达，
    // 保留映射表口径防配置漂移；其余码一律包「未预期的解析错误」上抛（bin ✗ 出口承接）。
    if (err.code === 'commander.helpDisplayed') {
      return { mode: 'help' };
    }
    throw new Error(`未预期的解析错误：${err.message}`);
  }

  // 顺序敏感语义状态机：与退役 cli-args.ts 逐字同构（错误触发点与文案，FR-5 防线）。
  const parsed: ParsedArgs = { mode: 'interactive' };
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
        const value = argv[i + 1];
        if (value === undefined || value === '') {
          throw new Error('--plugins 需要至少一个名字（如 --plugins a,b）');
        }
        const merged = [...(parsed.plugins ?? []), ...value.split(',').map((s) => s.trim()).filter(Boolean)];
        parsed.plugins = [...new Set(merged)];
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
