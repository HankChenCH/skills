// 安装后对账（spec 20261115-495e 实现决策「安装后对账」+ docs/plugin-assets.md §2.3）。
// 接口窄：进 目标 profile 目录路径 + 包名，出 落点核对结果。
// 两处落点 = profile package.json 的 dependencies 依赖行 + dsh.profile.bundles 数组行，
// 齐备 = 安装符合官方格式；缺任一 → 报错指明缺失落点与 profile 路径。

import fs from 'node:fs';
import path from 'node:path';

function readProfilePackage(profilePath) {
  const pkgFile = path.join(profilePath, 'package.json');
  let raw;
  try {
    raw = fs.readFileSync(pkgFile, 'utf8');
  } catch (err) {
    throw new Error(
      `对账失败：profile 的 package.json 读不到（${pkgFile}，${err.message}）——官方命令可能未完成安装`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`对账失败：profile 的 package.json 不是合法 JSON（${pkgFile}，${err.message}）`);
  }
}

export function reconcilePluginInstall({ profilePath, packageName }) {
  const pkg = readProfilePackage(profilePath);
  const missing = [];
  const version = pkg.dependencies?.[packageName];
  if (version === undefined) {
    missing.push('dependencies 依赖行');
  }
  const bundles = pkg.dsh?.profile?.bundles;
  if (!Array.isArray(bundles) || !bundles.includes(packageName)) {
    missing.push('dsh.profile.bundles 清单行');
  }
  if (missing.length > 0) {
    throw new Error(
      `对账失败：包 ${packageName} 在 profile ${profilePath} 的 package.json 缺少落点——${missing.join(' 与 ')}；` +
        `安装未通过官方格式核对`,
    );
  }
  return { ok: true, version };
}
