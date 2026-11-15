// dsh profile 解析（spec 20261115-495e 实现决策「profile 解析」Q2 拍板）。
// profile 根 = $DSH_HOME/profiles/（缺省 ~/.dsh/profiles/）；
// 列举既有 profile = 根下目录名排序；根不存在 = 无既有项（交互提示可输入新名）。

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function profilesRoot({ env = process.env, homedir = os.homedir() } = {}) {
  const home = env.DSH_HOME ?? path.join(homedir, '.dsh');
  return path.join(home, 'profiles');
}

export function listProfiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}
