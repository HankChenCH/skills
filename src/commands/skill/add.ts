// skill add 动词命令定义（spec 20261116-2c58，票 20261116-f761）：空格 variadic + 逗号
// 分隔双收（commander 收集原始 token，归一化在 names.ts）；--all 全装；无参交互勾选
// （PTY，需终端）。命令定义层承载参数旗标声明、校验分派、内核编排调用与摘要呈现。

import { Command } from 'commander';
import * as clack from '@clack/prompts';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { ASSET_MAP, SKILLS_TYPE, findRow } from '../../kernel/asset-map.ts';
import { listEntries } from '../../kernel/catalog.ts';
import { resolveSkillSelection } from './names.ts';
import { installSkillsAndRender, selectSkillsInteractive } from './run.ts';

// skill add 逐命令帮助（用法 + 示例；定稿断言随硬切票 20261116-bfcf）。
const SKILL_ADD_HELP = `用法：npx @hankchen/infra skill add [名...] [选项]

安装套件技能进目标 git 项目（.agents/skills/ + agent 目录软链 + .infra-lock.json 记账）。

参数：
  名...    要安装的技能名；空格或逗号分隔均可（如 dev-spec,dev-plan）

选项：
  --all         安装全部技能（与技能名互斥）
  -h, --help    显示本帮助

示例：
  npx @hankchen/infra skill add dev-spec,dev-plan   # 免交互安装指定技能
  npx @hankchen/infra skill add                     # 交互勾选要安装的技能
  npx @hankchen/infra skill add --all               # 免交互安装全部技能`;

export function createSkillAddCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const add = new Command('add');
  configureCommandChannel(add);
  add.description('安装套件技能：带名免交互、--all 全装、无参交互勾选（需终端）');
  add.argument('[names...]', '要安装的技能名；空格或逗号分隔均可（如 dev-spec,dev-plan）');
  add.option('--all', '安装全部技能（与技能名互斥）');
  add.helpInformation = () => `${SKILL_ADD_HELP}\n`;
  add.action(async (tokens: string[], opts: { all?: boolean }) => {
    reportExitCode(await runSkillAdd({ tokens, all: opts.all === true, context }));
  });
  return add;
}

// skill add 处理器：归一化校验 → 分支行动。错误统一 ✗ 通道 + 退出 1（零落盘）；
// 交互取消/空选退出 0（零落盘）；其余分支经共享运行时进内核安装。
export async function runSkillAdd({
  tokens,
  all,
  context,
}: {
  tokens: string[];
  all: boolean;
  context: ProgramContext;
}): Promise<number> {
  const selection = resolveSkillSelection({ tokens, all, isTTY: Boolean(process.stdin.isTTY) });
  switch (selection.kind) {
    case 'error':
      console.error(`✗ ${selection.message}`);
      return 1;
    case 'all':
      return installSkillsAndRender(listEntries(context.packageRoot, findRow(ASSET_MAP, SKILLS_TYPE)), context);
    case 'interactive': {
      clack.intro(`@hankchen/infra v${context.packageVersion} · 技能安装`);
      const picked = await selectSkillsInteractive(context);
      if (picked === null) {
        return 0; // 取消 / 空选：零落盘
      }
      return installSkillsAndRender(picked, context);
    }
    case 'names':
      return installSkillsAndRender(selection.names, context);
  }
}
