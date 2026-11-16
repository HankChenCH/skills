// 程序装配层（spec 20261116-2c58 分层拍板，票 20261116-f761/20261116-ccfb 接线、
// 20261116-bfcf 硬切定稿）：组装 commander 程序、注册子命令（新增子命令 = 加
// src/commands/<名>/ 目录 + 本文件注册一处）、前置分发与 ✗ 出口。
//
// 命令面契约（spec 实现决策原文级文案，测试逐字锚定）：
//   裸跑与顶层 -h/--help → 顶层帮助、退出 0、零落盘；skill/plugin 无动词 → 各自命令帮助
//   （命令定义层 action 承接）、退出 0；-h 恒为帮助（commander 选项解析先于位置参数收集）；
//   未知子命令 / 未知旗标（含全部旧旗标名 --all/--skills/--plugins 与任意 --foo）→
//   未知命令/未知旗标口径报错、退出 1、零落盘。旧旗标路径与裸跑两层菜单已随硬切退役
//   （src/cli.ts、src/legacy-flags.ts 删除），旧输入一律落未知旗标口径。

import { Command, CommanderError } from 'commander';

import { configureCommandChannel } from './commands/channel.ts';
import { createPluginCommand } from './commands/plugin/index.ts';
import { createSkillCommand } from './commands/skill/index.ts';
import { resolveProgramContext } from './context.ts';
import type { ProgramContext } from './context.ts';

// 顶层帮助（命令面定稿）：skill add 与 plugin add 用法示例；不含旧旗标名（--skills/--plugins
// 已退役，e2e 定稿断言守护）。
export function renderTopHelp(): string {
  return `@hankchen/infra —— 套件资产初始化 CLI

用法（在目标 git 项目根目录执行）：
  npx @hankchen/infra skill add dev-spec,dev-plan   # 免交互安装指定技能
  npx @hankchen/infra skill add                     # 交互勾选要安装的技能
  npx @hankchen/infra skill add --all               # 免交互安装全部技能
  npx @hankchen/infra@<semver> skill add <名...>    # 指定版本安装（锁文件记录该版本）
  npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev   # 免交互安装插件到指定 dsh profile

命令：
  skill add [名...] [--all]           安装技能；名字空格或逗号分隔均可，--all 全装，无参进交互勾选
  plugin add [名...] --profile <名>   安装插件进 dsh profile；无参进交互勾选（desktop 为官方保留名拒装）
  -h, --help                          显示对应层级帮助

行为：
  - 技能实体拷入项目 .agents/skills/<技能名>/（SKILL.md 与 references/ 随包原样齐备）
  - 对项目内已存在的 agent 目录（.claude、.zcode 等）建相对软链；不存在者跳过并列入完成摘要
  - 插件经宿主官方命令安装进指定 dsh profile（dsh 不在 PATH 自动改 npx @deepseek-ai/dsh），装后对账
  - 安装后在项目根写 .infra-lock.json 记账（包版本 + 逐技能指纹/逐插件版本与安装时间）
  - 重跑本命令即按当前包内容刷新已装资产并更新锁文件，无重复堆积`;
}

// spec 命令面契约原文（文案模板：命令名/旗标名/可用清单为实际值；原文例「foo」/「--skills」
// 由测试逐字锚定，不得改写）。
export function unknownCommandMessage(name: string, available: string[]): string {
  return `未知命令「${name}」；可用命令：${available.join('、')}（--help 查看用法示例）`;
}

export function unknownFlagMessage(flag: string): string {
  return `未知旗标「${flag}」；运行 --help 查看全部命令与用法`;
}

function createProgram(): Command {
  const program = new Command();
  program.name('infra');
  program.description('@hankchen/infra —— 套件资产初始化 CLI');
  // commander 自派帮助（-h/--help 位于旗标后、裸 -- 等形态）统一呈现定稿顶层帮助，
  // 与前置分发的裸跑/-h/--help 出口逐字节同文。
  program.helpInformation = () => `${renderTopHelp()}\n`;
  configureCommandChannel(program);
  return program;
}

// commander 库出口 → spec 契约文案（错误统一走 bin 出口 ✗ 通道 + 退出 1，spec 实现决策）：
//   unknownCommand / unknownOption → 未知命令/未知旗标口径（可用清单取自实际注册的子命令，
//   与注册单一事实源）；skill/plugin 命令组挂了 action 承接无动词帮助，其下不认识的动词
//   落 commander excessArguments（too many arguments）——语义上是未知子命令，同口径翻文案
//   （可用清单取该命令组实际注册的动词）；其余库错误剥 error: 前缀原样走 ✗ 通道。
function contractMessageFor(err: CommanderError, program: Command): string {
  const unknownCommand = err.message.match(/unknown command '([^']+)'/);
  if (unknownCommand) {
    return unknownCommandMessage(unknownCommand[1], program.commands.map((cmd) => cmd.name()));
  }
  const excessVerb = err.code === 'commander.excessArguments'
    ? err.message.match(/^error: too many arguments for '([^']+)'.*got \d+: (.+)\.$/)
    : null;
  if (excessVerb) {
    const group = program.commands.find((cmd) => cmd.name() === excessVerb[1]);
    return unknownCommandMessage(excessVerb[2], group ? group.commands.map((cmd) => cmd.name()) : []);
  }
  const unknownFlag = err.message.match(/unknown option '([^']+)'/);
  if (unknownFlag) {
    return unknownFlagMessage(unknownFlag[1]);
  }
  return err.message.replace(/^error: /, '');
}

// 新命令路径：commander 子命令模型承担路由与 token 消耗。commander 的 action 返回值
// 不进退出码，各命令处理器经 reportExitCode 回传（装配层收口为进程退出码）。
async function runSubcommands(argv: string[], context: ProgramContext): Promise<number> {
  const program = createProgram();
  let actionExitCode = 0;
  program.addCommand(createSkillCommand(context, (code) => { actionExitCode = code; }));
  program.addCommand(createPluginCommand(context, (code) => { actionExitCode = code; }));
  try {
    await program.parseAsync(argv, { from: 'user' });
    return actionExitCode;
  } catch (err) {
    if (err instanceof CommanderError) {
      // 帮助通道：helpDisplayed/-h 形态的文本已先行写往 stdout（writeOut 缺省即 stdout），
      // 按库给的退出码（0）归还。code=commander.help 且退出码非 0 是 help-as-error 变体
      //（如 `help <未知命令>`、零操作数 --）——文本被写往已静音的 writeErr，原地重发定稿
      // 顶层帮助保可见性，退出码随库（1）。
      if (err.code === 'commander.helpDisplayed' || err.code === 'commander.help') {
        if (err.exitCode !== 0) {
          console.log(renderTopHelp());
        }
        return err.exitCode;
      }
      console.error(`✗ ${contractMessageFor(err, program)}`);
      return 1;
    }
    throw err; // 未预期错误交 bin 顶层出口（含栈）
  }
}

// 前置分发（硬切后）：裸跑与顶层 -h/--help → 定稿顶层帮助（退出 0、零落盘）；裸 --
// 分隔符无后续命令语义，沿旧矩阵既定口径按未知旗标报错（commander 对零操作数的 -- 走
// help-as-error 通道且退出码 1，stderr 已静音——不前置会静默无输出退出）；其余 token
// 全量进 commander 子命令路由——skill/plugin 前缀进命令处理器，旧旗标与未知命令/未知旗标
// 由 commander 检测、经 contractMessageFor 翻成 spec 口径报错退出 1。
export async function run(argv: string[]): Promise<number> {
  const context = resolveProgramContext();
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help') {
    console.log(renderTopHelp());
    return 0;
  }
  if (argv[0] === '--') {
    console.error(`✗ ${unknownFlagMessage('--')}`);
    return 1;
  }
  return runSubcommands(argv, context);
}
