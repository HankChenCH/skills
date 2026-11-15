// dsh 官方命令组装器（spec 20261115-495e 实现决策「命令组装与执行」拍板 D2 +「前置检查」异常流 A/B）。
// 接口窄：进 执行体探测结果 + profile 名 + 包名，出 官方命令与前置判定。
// 官方命令一律不在套件内实跑——真实执行体由调用方注入（bin 用 runCommand，测试注入桩）。
// profile 与包名作为独立 argv 元素传递，不做 shell 字符串拼接。

import fs from 'node:fs';
import path from 'node:path';

// 官方 @deepseek-ai/dsh 的 node 前置（need 20261115-339e F4；包 engines 与 .nvmrc 已对齐同值）
export const NODE_FLOOR: number[] = [24, 9, 0];

// 官方保留 profile 名：官方 CLI 拒绝对其做插件管理（need F4），初始化器执行前同样拒装
export const RESERVED_PROFILES: string[] = ['desktop'];

export const DSH_COMMAND = 'dsh';
export const DSH_NPM_PACKAGE = '@deepseek-ai/dsh';

// --yes 裁量：npx 对未缓存包在 TTY 下默认弹安装确认，会卡死「免交互/脚本化复现」场景
// （本特性目标即免交互）；只影响 npx 自身的拉取确认，不改变转发的官方命令语义。
export const NPX_LAUNCH_FLAGS: string[] = ['--yes'];

// 执行体 = 官方命令的启动形态：直跑命令 + 前置 launcher 元素（npx 形态含 --yes 与包名）。
export interface Executor {
  command: string;
  launcher: string[];
}

// PATH 探测：逐目录 accessSync(X_OK)。探测结果作为入参注入组装器，测试注入探测结果而非真扫 PATH。
export function commandExists(name: string, { pathEnv = process.env.PATH }: { pathEnv?: string | undefined } = {}): boolean {
  const dirs = (pathEnv ?? '').split(path.delimiter).filter(Boolean);
  return dirs.some((dir) => {
    try {
      fs.accessSync(path.join(dir, name), fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

export function resolveExecutor(dshInPath: boolean): Executor {
  if (dshInPath) {
    return { command: DSH_COMMAND, launcher: [] };
  }
  return { command: 'npx', launcher: [...NPX_LAUNCH_FLAGS, DSH_NPM_PACKAGE] };
}

export function buildPluginCommand(executor: Executor, profile: string, packageName: string): {
  command: string;
  args: string[];
} {
  return {
    command: executor.command,
    args: [...executor.launcher, 'plugin', '--profile', profile, 'add', packageName],
  };
}

function parseVersionParts(nodeVersion: string): number[] {
  const match = String(nodeVersion).match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`无法解析 node 版本：「${nodeVersion}」`);
  }
  return match.slice(1, 4).map(Number);
}

function atLeast(version: number[], floor: number[]): boolean {
  for (let i = 0; i < floor.length; i += 1) {
    if (version[i] !== floor[i]) {
      return version[i] > floor[i];
    }
  }
  return true;
}

// 前置检查（异常流 A/B）：node 版本与保留 profile 名。两检查都必须在任何官方命令执行前发生。
export function assertPluginPreconditions({ nodeVersion, profile }: { nodeVersion: string; profile: string }): void {
  const parts = parseVersionParts(nodeVersion);
  if (!atLeast(parts, NODE_FLOOR)) {
    throw new Error(
      `node 版本 ${nodeVersion} 低于官方 dsh 要求的 ${NODE_FLOOR.join('.')}，拒绝安装插件（官方命令将无法运行）。` +
        `请先升级 node 再重试：fnm use ${NODE_FLOOR.join('.')}，或 nvm install ${NODE_FLOOR.join('.')} && nvm use ${NODE_FLOOR.join('.')}`,
    );
  }
  if (RESERVED_PROFILES.includes(profile)) {
    throw new Error(
      `profile「${profile}」是 dsh 官方保留名——官方 CLI 拒绝对保留 profile 做插件管理（装进去也不会生效），` +
        `初始化器在执行前拒绝安装；请改用其他 profile 名。`,
    );
  }
}
