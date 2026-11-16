// plugin 命令组定义（spec 20261116-2c58，票 20261116-ccfb）：挂 add 动词；无动词裸打显示
// 本命令帮助（退出 0）。新增子命令口径：加 src/commands/<名>/ 目录（index.ts 命令工厂）+
// 装配层（src/program.ts）注册一处；命令工厂只被装配层引用（分层结构契约测试守护）。

import { Command } from 'commander';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { createPluginAddCommand } from './add.ts';

export function createPluginCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const plugin = new Command('plugin');
  configureCommandChannel(plugin);
  plugin.description('安装套件插件进目标 dsh profile（官方命令转发 + 装后对账 + 锁文件记账）');
  plugin.addCommand(createPluginAddCommand(context, reportExitCode));
  plugin.action(() => {
    plugin.outputHelp(); // 无动词：本命令帮助写 stdout，action 正常归还 → 退出 0
  });
  return plugin;
}
