// 装后就绪核验（spec 20261119-7a9a 实现决策「就绪核验契约」，票 20261119-9bd3）。
// 接口窄：进 目标 profile 目录 + 执行体（与安装同源，dsh-command.ts 形态）+ 命令执行注入，
// 出 四分支核验结果与三段处方。官方命令不在套件内实跑：run 由调用方注入
// （bin 用 plugin-install 的 runCommand，测试注入桩）。
//
// 探测源裁决（desktop 探针实证 2026-11-19，留痕票 Progress）：运行时版本探测沿安装流
// 既有执行体发 `--version`（dsh 在 PATH 直跑，否则 npx 转发）——安装时点可得的最优代理。
// desktop 真实运行时归 Electron app 独占、可超前于 CLI 探测值（事故日三层漂移实证），
// 核验结论以代理值为准；代理不可得即 probe-unavailable 降级警告，不虚构通过。

import fs from 'node:fs';
import path from 'node:path';

import type { CommandRunner, CommandRunResult } from './plugin-install.ts';
import type { Executor } from './dsh-command.ts';

// manager 官方包（@hankchen/dsh-mcp 的可选 peer，宿主 boot 兼容门按精确同版校验其行）
export const MANAGER_PACKAGE = '@deepseek-ai/dsh-mcp-manager';
// 触发就绪核验的插件：manager 供给契约的宿主（其余插件安装与 manager 无关，不核验）
export const READINESS_TRIGGER_PLUGIN = '@hankchen/dsh-mcp';

export type ReadinessOutcome =
  | { kind: 'pass'; runtimeVersion: string; managerVersion: string }
  | { kind: 'mismatch'; runtimeVersion: string; managerVersion: string }
  | { kind: 'missing'; runtimeVersion: string }
  | { kind: 'probe-unavailable' };

// 从官方 CLI --version 输出提取版本：取首个 semver 形 token（判定单点，parse-normalization）；
// 无可解析 token = 探测失败（输出形态漂移同因同位报「不可得」，不猜）。
function parseRuntimeVersion(stdout: string): string | undefined {
  const match = stdout.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  return match === null ? undefined : match[0];
}

// manager 解析副本版本：读 profile 依赖树中 manager 包的 package.json（官方 pnpm 安装落点）。
// 读不到 / 不合法 JSON / 缺 version = 依赖树无可用副本，同归「缺 manager」口径（不猜版本）。
function readManagerVersion(profilePath: string): string | undefined {
  let raw;
  try {
    raw = fs.readFileSync(path.join(profilePath, 'node_modules', ...MANAGER_PACKAGE.split('/'), 'package.json'), 'utf8');
  } catch {
    return undefined;
  }
  try {
    const version = (JSON.parse(raw) as { version?: unknown }).version;
    return typeof version === 'string' && version.trim() !== '' ? version.trim() : undefined;
  } catch {
    return undefined;
  }
}

// 就绪核验（spec 就绪核验契约 ①②③）：① 探测运行时 dsh 版本（探测失败 → probe-unavailable
// 降级，调用方警告继续、不虚构通过）；② 读 profile 依赖树 manager 解析副本（无副本 = 缺）；
// ③ 通过判据 = 两版本精确同版——宿主 boot 兼容门按 peer 精确钉同 rc 校验 manager
// （ADR 20261118-ad91 一手实证），「rc 段不同」是该精确比对在 prerelease 域的子集。
export function checkManagerReadiness({
  profilePath,
  executor,
  run,
}: {
  profilePath: string;
  executor: Executor;
  run: CommandRunner;
}): ReadinessOutcome {
  const probe: CommandRunResult = run({ command: executor.command, args: [...executor.launcher, '--version'] });
  const runtimeVersion = probe.status === 0 ? parseRuntimeVersion(probe.stdout) : undefined;
  if (runtimeVersion === undefined) {
    return { kind: 'probe-unavailable' };
  }
  const managerVersion = readManagerVersion(profilePath);
  if (managerVersion === undefined) {
    return { kind: 'missing', runtimeVersion };
  }
  if (managerVersion === runtimeVersion) {
    return { kind: 'pass', runtimeVersion, managerVersion };
  }
  return { kind: 'mismatch', runtimeVersion, managerVersion };
}

// 三段可复制处方（spec 就绪核验契约 ③；文本形态对照 README「已知边界」恢复配方逐段一致：
// 段 1 profile 级依赖覆盖写法 / 段 2 manager 补装并重装 profile 依赖 / 段 3 插件管理器重载指引）。
// 版本一律钉探测到的运行时版本、路径用目标 profile 实路径——拿到输出即可逐段复制执行。
export function managerPrescriptionLines({
  profilePath,
  runtimeVersion,
}: {
  profilePath: string;
  runtimeVersion: string;
}): string[] {
  return [
    `1) profile 的 pnpm-workspace.yaml 加 overrides，把 manager 钉到运行时同版：\n` +
      `     overrides:\n       '${MANAGER_PACKAGE}': ${runtimeVersion}`,
    `2) 补装 manager 并重装 profile 依赖（钉运行时同版）：\n` +
      `     pnpm --dir "${profilePath}" add ${MANAGER_PACKAGE}@${runtimeVersion}`,
    `3) 插件管理器开关重载（plugin_manager set_plugin 或 GUI），或重启宿主 app 生效。`,
  ];
}
