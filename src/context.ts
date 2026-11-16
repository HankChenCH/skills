// 程序上下文（票 20261116-f761）：包根与包版本单点解析，装配层解析一次、命令定义层与
// 旧旗标路径消费。独立成叶模块是为了分层方向单一：program → commands → kernel，
// 命令层经本叶模块取上下文而不反向 import 装配层。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ProgramContext {
  packageRoot: string;
  packageVersion: string;
}

export function resolveProgramContext(): ProgramContext {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as { version: string };
  return { packageRoot, packageVersion: manifest.version };
}
