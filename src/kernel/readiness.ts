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
  | { kind: 'missing'; runtimeVersion: string; cause: ManagerCopyCause }
  | { kind: 'probe-unavailable' };

// manager 解析副本缺失报因（评审 20261120-4f76 建议 3）：分支行为不变（同归 missing
// fail-loud），只改报因粒度——absent 真缺副本（ENOENT）/ unreadable 副本在但 package.json
// 读失败（权限、落成目录等）/ corrupt 不可解析或缺非空 version。
export type ManagerCopyCause = 'absent' | 'unreadable' | 'corrupt';

// 从官方 CLI --version 输出提取版本：按裸版本行判定（判定单点，parse-normalization）。
// 逐行 trim 后整行锚定取首个命中行（探针实证 2026-11-19 留痕票 Progress：官方
// `--version` 输出 '0.2.2-rc.5\n' 裸行形态）；整行尾锚挡截段与错位——'1.2.3.4' 截段、
// '2026.11.19 … 0.2.2-rc.5' 横幅错位等非法变体不得静默接受为版本（parse-normalization
// 规则 4：新形态分支带尾锚），无命中行 = 探测失败，同因同位报「不可得」，不猜。
function parseRuntimeVersion(stdout: string): string | undefined {
  for (const line of stdout.split('\n')) {
    // v 前缀在锚内容忍（node --version 风格输出），归约产出纯 semver 值——
    // 前缀剥离归解析单点，精确比对消费方拿到的键无 v/无 v 之别。
    const match = line.trim().match(/^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/);
    if (match !== null) return match[1];
  }
  return undefined;
}

// manager 解析副本版本：读 profile 依赖树中 manager 包的 package.json。
// 落点一手探针实证（2026-11-20 本机 desktop profile，2026-11-19 事故现场，留痕票 Progress）：
// 官方 pnpm 安装管线下 manager（@hankchen/dsh-mcp 的普通 dependencies，非 peer）解析副本
// 直达落点 `node_modules/@deepseek-ai/dsh-mcp-manager/package.json` 成立——实体目录非符号
// 链接，`node_modules/.pnpm/` 内无该包虚拟仓条目（hoist 直达布局）；本机 web profile 依赖
// 未装无反证。单元替身（makeManagerCopy）与 e2e shim 同写该直达路径，替身契约与实证落点
// 一致；真实链路落点由 dsh-plugin-integration.test.ts 集成用例断言拦截（stub-fidelity 判据 2）。
// 读不到（ENOENT）/ 读失败 / 不合法 JSON / 缺 version = 依赖树无可用解析副本，同归
// 「缺 manager」口径（不猜版本）；读失败形态按 ManagerCopyCause 报因供 headline 实报。
function readManagerVersion(profilePath: string): { version: string } | { cause: ManagerCopyCause } {
  let raw;
  try {
    raw = fs.readFileSync(path.join(profilePath, 'node_modules', ...MANAGER_PACKAGE.split('/'), 'package.json'), 'utf8');
  } catch (err) {
    return { cause: (err as NodeJS.ErrnoException).code === 'ENOENT' ? 'absent' : 'unreadable' };
  }
  try {
    const version = (JSON.parse(raw) as { version?: unknown }).version;
    return typeof version === 'string' && version.trim() !== '' ? { version: version.trim() } : { cause: 'corrupt' };
  } catch {
    return { cause: 'corrupt' };
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
  const copy = readManagerVersion(profilePath);
  if (!('version' in copy)) {
    return { kind: 'missing', runtimeVersion, cause: copy.cause };
  }
  if (copy.version === runtimeVersion) {
    return { kind: 'pass', runtimeVersion, managerVersion: copy.version };
  }
  return { kind: 'mismatch', runtimeVersion, managerVersion: copy.version };
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
