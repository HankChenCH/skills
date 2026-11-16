// skill 安装共享运行时（票 20261116-f761）：新 skill add 命令与旧旗标路径（legacy-flags）
// 共用单份交互勾选与安装摘要实现，文案零漂移。安装行为（未知名报错列清单、软链冲突跳过、
// 锁文件记账、跨包版本刷新）全部在安装内核，本层只编排与呈现——语义零变化，仅调用。

import * as clack from '@clack/prompts';

import type { ProgramContext } from '../../context.ts';
import { AGENT_DIRS } from '../../kernel/agent-dirs.ts';
import { ASSET_MAP, SKILLS_TYPE, findRow } from '../../kernel/asset-map.ts';
import { listEntries, readDescriptions } from '../../kernel/catalog.ts';
import { installAssets } from '../../kernel/installer.ts';
import type { InstallAssetsResult } from '../../kernel/installer.ts';
import { LOCKFILE_NAME } from '../../kernel/lockfile.ts';
import { skillOptions } from '../../kernel/menu.ts';

// 条目多选勾选（构造保留：按名排序、描述提示，与现行 skillOptions 形态一致）。
// 取消（Ctrl-C）与空选确认 → 提示后返回 null，调用方按 0 退出、零落盘（现行交互纪律）。
export async function selectSkillsInteractive(context: ProgramContext): Promise<string[] | null> {
  const row = findRow(ASSET_MAP, SKILLS_TYPE);
  const names = listEntries(context.packageRoot, row);
  const descriptions = readDescriptions(context.packageRoot, row, names);
  const picked = await clack.multiselect({
    message: `选择要安装的技能（共 ${names.length} 项；空格勾选、回车确认）`,
    options: skillOptions(names, descriptions),
    required: false,
  });
  if (clack.isCancel(picked)) {
    clack.cancel('已取消，未做任何改动。');
    return null;
  }
  if (picked.length === 0) {
    clack.outro('未勾选任何技能——未做任何改动。');
    return null;
  }
  clack.log.step(`已选 ${picked.length} 项：${picked.join('、')}`);
  return picked;
}

// 安装 + 完成摘要：spinner → 内核 installAssets → 摘要（含软链冲突跳过与记账提示）。
export async function installSkillsAndRender(selected: string[], context: ProgramContext): Promise<number> {
  const spinner = clack.spinner();
  spinner.start(`正在安装 ${selected.length} 项技能…`);
  let result: InstallAssetsResult;
  try {
    result = installAssets({
      row: findRow(ASSET_MAP, SKILLS_TYPE),
      packageRoot: context.packageRoot,
      projectRoot: process.cwd(),
      agentDirs: AGENT_DIRS,
      selected,
      packageVersion: context.packageVersion,
      now: new Date().toISOString(),
    });
  } catch (err) {
    spinner.stop('安装失败');
    clack.log.error(err.message);
    return 1;
  }
  spinner.stop(`安装完成（${result.installedSkills.length} 项）`);
  renderSummary(result, context);
  return 0;
}

function renderSummary(result: InstallAssetsResult, context: ProgramContext): void {
  const lines = [];
  lines.push(`已安装 ${result.installedSkills.length} 项技能 → .agents/skills/：${result.installedSkills.join('、')}`);
  if (result.linkedAgentDirs.length > 0) {
    lines.push(`已为 ${result.linkedAgentDirs.length} 个 agent 目录建软链：${result.linkedAgentDirs.join('、')}`);
  }
  if (result.skippedAgentDirs.length > 0) {
    lines.push(
      `跳过 ${result.skippedAgentDirs.length} 个 agent 目录（项目内不存在）：${result.skippedAgentDirs.map((s) => s.dir).join('、')}`,
    );
  }
  for (const conflict of result.conflicts) {
    lines.push(`跳过软链（该位置已有真实文件，未改动使用者数据）：${conflict.linkPath}`);
  }
  lines.push(`记账：${LOCKFILE_NAME}（包版本 ${context.packageVersion}）；重跑本命令即刷新已装技能到当前包内容。`);
  clack.outro(lines.join('\n'));
}
