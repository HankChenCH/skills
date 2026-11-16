// plugin add 动词命令定义（spec 20261116-2c58，票 20261116-ccfb）：空格 variadic + 逗号
// 分隔双收（归一化与 skill 侧共享同一实现）；带名免交互须配 --profile；无名但有 --profile
// 进交互且预置 profile；无参交互勾选（PTY，需终端）。命令定义层承载参数旗标声明、
// 校验分派、内核编排调用与摘要呈现。

import { Command, CommanderError } from 'commander';
import * as clack from '@clack/prompts';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { listProfiles, profilesRoot } from '../../kernel/dsh-profiles.ts';
import { ERR_PROFILE_VALUE, profileRequiredLines, resolvePluginSelection } from './names.ts';
import { installPluginsAndRender, selectPluginsInteractive } from './run.ts';

// plugin add 逐命令帮助（用法 + 示例；定稿断言随硬切票 20261116-bfcf）。
const PLUGIN_ADD_HELP = `用法：npx @hankchen/infra plugin add [名...] [选项]

安装套件插件进目标 dsh profile（经宿主官方命令转发，装后对账 + .infra-lock.json 记账）。

参数：
  名...    要安装的插件包名；空格或逗号分隔均可（如 @hankchen/dsh-demo）

选项：
  --profile <名>    目标 dsh profile（带名安装时必填；desktop 为官方保留名拒装）
  -h, --help        显示本帮助

示例：
  npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev   # 免交互安装插件到指定 profile
  npx @hankchen/infra plugin add                                    # 交互勾选插件与目标 profile
  npx @hankchen/infra plugin add --profile dev                      # 预置 profile，仅交互勾选插件`;

export function createPluginAddCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const add = new Command('add');
  configureCommandChannel(add);
  add.description('安装套件插件：带名免交互（须配 --profile）、无参交互勾选（需终端）');
  add.argument('[names...]', '要安装的插件包名；空格或逗号分隔均可（如 @hankchen/dsh-demo）');
  add.option('--profile <名>', '目标 dsh profile（带名安装时必填；desktop 为官方保留名拒装）');
  add.helpInformation = () => `${PLUGIN_ADD_HELP}\n`;
  // --profile 值必需由 commander 选项声明承担（spec 实现决策）：缺值时 commander 抛
  // optionMissingArgument，此处翻成 spec 契约原文走 ✗ 通道（装配层收口退出码 1）；
  // 其余库错误原样上抛，沿装配层既有 ✗/帮助通道。本命令唯一带值选项是 --profile。
  add.exitOverride((err: CommanderError) => {
    if (err.code === 'commander.optionMissingArgument' && err.message.includes("'--profile")) {
      throw new CommanderError(err.exitCode, 'commander.customError', ERR_PROFILE_VALUE);
    }
    throw err;
  });
  add.action(async (tokens: string[], opts: { profile?: string }) => {
    reportExitCode(await runPluginAdd({ tokens, profile: opts.profile, context }));
  });
  return add;
}

// plugin add 处理器：归一化校验 → 分支行动。错误统一 ✗ 通道 + 退出 1（零落盘）；
// 交互取消/空选退出 0（零落盘）；其余分支经共享运行时进内核安装。
export async function runPluginAdd({
  tokens,
  profile,
  context,
}: {
  tokens: string[];
  profile: string | undefined;
  context: ProgramContext;
}): Promise<number> {
  const selection = resolvePluginSelection({ tokens, profile, isTTY: Boolean(process.stdin.isTTY) });
  switch (selection.kind) {
    case 'error':
      console.error(`✗ ${selection.message}`);
      return 1;
    case 'profile-required':
      // 三行结构：✗ 行 + 既有 profile 列表行（或无既有说明行）+ 新形态示例行（缩进两格）。
      for (const [index, line] of profileRequiredLines(listProfiles(profilesRoot())).entries()) {
        console.error(index === 0 ? `✗ ${line}` : `  ${line}`);
      }
      return 1;
    case 'interactive': {
      clack.intro(`@hankchen/infra v${context.packageVersion} · 插件安装`);
      const picked = await selectPluginsInteractive(context, selection.presetProfile);
      if (picked.kind === 'catalog-error') {
        console.error(`✗ ${picked.message}`); // 编目失败统一 ✗ 通道 + 退出 1（取消/空选外无豁免）
        return 1;
      }
      if (picked.kind === 'cancel') {
        return 0; // 取消 / 空选：零落盘
      }
      return installPluginsAndRender({ plugins: picked.plugins, profile: picked.profile, context });
    }
    case 'names':
      return installPluginsAndRender({ plugins: selection.names, profile: selection.profile, context });
  }
}
