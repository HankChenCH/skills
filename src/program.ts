// 程序装配层（spec 20261116-2c58 分层拍板，票 20261116-f761）：组装 commander 程序、
// 注册子命令（新增子命令 = 加 src/commands/<名>/ 目录 + 本文件注册一处）、前置分发。
//
// 过渡并存口径：argv 首个 token 为 `skill` → 新命令路径（src/commands/skill/）；顶层
// -h/--help → 新命令面顶层帮助（skill add 用法示例先行呈现；plugin add 示例行随票
// 20261116-ccfb 补、定稿断言随 20261116-bfcf）；其余 token（旧旗标 --all/--skills/--plugins
// 与裸跑两层菜单）走 src/legacy-flags.ts 并存——硬切（旧旗标按未知旗标口径报错、两层菜单
// 退役、未知命令/未知旗标 spec 新文案）归票 20261116-bfcf。

import { Command, CommanderError } from 'commander';

import { configureCommandChannel } from './commands/channel.ts';
import { createSkillCommand } from './commands/skill/index.ts';
import { resolveProgramContext } from './context.ts';
import type { ProgramContext } from './context.ts';
import { runLegacyFlags } from './legacy-flags.ts';

// 顶层帮助（过渡态命令面）：skill add 用法示例；plugin add 示例行随票 20261116-ccfb 补。
export function renderTopHelp(): string {
  return `@hankchen/infra —— 套件资产初始化 CLI

用法（在目标 git 项目根目录执行）：
  npx @hankchen/infra skill add dev-spec,dev-plan   # 免交互安装指定技能
  npx @hankchen/infra skill add                     # 交互勾选要安装的技能
  npx @hankchen/infra skill add --all               # 免交互安装全部技能
  npx @hankchen/infra@<semver> skill add <名...>    # 指定版本安装（锁文件记录该版本）

命令：
  skill add [名...] [--all]    安装技能；名字空格或逗号分隔均可，--all 全装，无参进交互勾选
  -h, --help                   显示对应层级帮助

行为：
  - 技能实体拷入项目 .agents/skills/<技能名>/（SKILL.md 与 references/ 随包原样齐备）
  - 对项目内已存在的 agent 目录（.claude、.zcode 等）建相对软链；不存在者跳过并列入完成摘要
  - 安装后在项目根写 .infra-lock.json 记账（包版本 + 逐技能指纹与安装时间）
  - 重跑 skill add 即按当前包内容刷新已装技能并更新锁文件，无重复堆积`;
}

function createProgram(): Command {
  const program = new Command();
  program.name('infra');
  program.description('@hankchen/infra —— 套件资产初始化 CLI');
  configureCommandChannel(program);
  return program;
}

// 新命令路径：commander 子命令模型承担路由与 token 消耗。commander 的 action 返回值
// 不进退出码，各命令处理器经 reportExitCode 回传（装配层收口为进程退出码）。
async function runSubcommands(argv: string[], context: ProgramContext): Promise<number> {
  const program = createProgram();
  let actionExitCode = 0;
  program.addCommand(createSkillCommand(context, (code) => { actionExitCode = code; }));
  try {
    await program.parseAsync(argv, { from: 'user' });
    return actionExitCode;
  } catch (err) {
    if (err instanceof CommanderError) {
      // 帮助文本已先行写往 stdout（writeOut 缺省即 stdout），按库给的退出码（0）归还。
      if (err.code === 'commander.helpDisplayed' || err.code === 'commander.help') {
        return err.exitCode;
      }
      // 过渡态：未知旗标/未知命令沿 commander 检测文案进 ✗ 通道（spec 新文案定稿随硬切票）
      console.error(`✗ ${err.message.replace(/^error: /, '')}`);
      return 1;
    }
    throw err; // 未预期错误交 bin 顶层出口（含栈）
  }
}

// 前置分发（过渡态并存口径）：顶层 -h/--help → 新命令面帮助；skill 前缀 → 新命令路径；
// 其余 token → 旧旗标路径（含裸跑两层菜单）。
export async function run(argv: string[]): Promise<number> {
  const context = resolveProgramContext();
  if (argv.length > 0 && (argv[0] === '-h' || argv[0] === '--help')) {
    console.log(renderTopHelp());
    return 0;
  }
  if (argv[0] === 'skill') {
    return runSubcommands(argv, context);
  }
  return runLegacyFlags(argv, context);
}
