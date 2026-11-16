// skill 命令组定义（票 20261116-f761）：挂 add 动词；无动词裸打显示本命令帮助（退出 0）。
// 新增子命令口径：加 src/commands/<名>/ 目录（index.ts 命令工厂）+ 装配层（src/program.ts）
// 注册一处；命令工厂只被装配层引用（分层结构契约测试守护）。

import { Command } from 'commander';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { createSkillAddCommand } from './add.ts';

export function createSkillCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const skill = new Command('skill');
  configureCommandChannel(skill);
  skill.description('安装套件技能进目标 git 项目（.agents/skills/ + agent 目录软链 + 锁文件记账）');
  skill.addCommand(createSkillAddCommand(context, reportExitCode));
  skill.action(() => {
    skill.outputHelp(); // 无动词：本命令帮助写 stdout，action 正常归还 → 退出 0
  });
  return skill;
}
