// 批量插件安装编排（spec 20261115-495e 实现决策「命令组装与执行」「安装后对账」「锁文件多类型」）。
// 免交互与交互路径共用本编排：前置检查 → 逐条（组装官方命令 → 注入执行体执行 → 对账 → 锁文件记账）。
// 批量语义：逐条顺序执行；单条失败（执行非零退出或对账缺落点）即中止，
// 报错带已完成/未完成清单；已完成的插件逐条落锁文件，不因后条失败回吐。
// 官方命令不在套件内实跑：执行体 run 由调用方注入（bin 传 runCommand，测试注入桩）。

import { spawnSync } from 'node:child_process';

import { buildPluginCommand, resolveExecutor, assertPluginPreconditions } from './dsh-command.js';
import { reconcilePluginInstall } from './reconcile.js';
import { PACKAGE_NAME, readLockfile, writeLockfile } from './lockfile.js';

export function runCommand({ command, args }) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

export function installPlugins({
  profile,
  plugins,
  profilePath,
  dshInPath,
  projectRoot,
  packageVersion,
  now,
  nodeVersion = process.version,
  run = runCommand,
}) {
  if (!Array.isArray(plugins) || plugins.length === 0) {
    throw new Error('未选择任何插件：plugins 为空，拒绝安装');
  }
  assertPluginPreconditions({ nodeVersion, profile });
  const executor = resolveExecutor(dshInPath);
  const lockfile = readLockfile(projectRoot) ?? {
    package: PACKAGE_NAME,
    packageVersion,
    skills: {},
    plugins: {},
  };
  lockfile.package = PACKAGE_NAME;
  lockfile.packageVersion = packageVersion;
  lockfile.plugins = { ...(lockfile.plugins ?? {}) };

  const installed = [];
  for (const [index, name] of plugins.entries()) {
    try {
      const { command, args } = buildPluginCommand(executor, profile, name);
      const result = run({ command, args });
      if (result.status !== 0) {
        const tail = (result.stderr ?? '').trim().split('\n').slice(-3).join('；');
        throw new Error(
          `官方命令执行失败（${command} ${args.join(' ')} 退出码 ${result.status}${tail ? `；输出尾部：${tail}` : ''}）`,
        );
      }
      const { version } = reconcilePluginInstall({ profilePath, packageName: name });
      lockfile.plugins[name] = { version, profile, installedAt: now };
      writeLockfile(projectRoot, lockfile);
      installed.push({ name, version });
    } catch (err) {
      const completed = installed.map((entry) => entry.name).join('、') || '（无）';
      const pending = plugins.slice(index).join('、');
      throw new Error(
        `插件 ${name} 安装中止：${err.message}\n已完成：${completed}\n未完成：${pending}`,
      );
    }
  }
  return { profile, installed };
}
