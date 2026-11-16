#!/usr/bin/env node
// @hankchen/infra 装配壳（票 20261116-f761）：入口只做三件事——TTY raw 模式前置、
// 调命令运行面、未预期错误 ✗ 出口。命令注册、前置分发、旧旗标路径分别在
// src/program.ts（程序装配层，票 f761 C3 落位）与 src/legacy-flags.ts（旧旗标路径，
// 过渡并存）——bin 不再承载任何分发与交互逻辑。
// （TS 迁移注：仓库内本入口为 .ts 直跑〔node ≥24.9 默认剥类型〕；发布面经 prepack 编译
//  为同路径 bin/infra.js，并显式换载打包清单 bin 直指它〔备份 package.json → 改写 bin:
//  bin/infra.js → postpack 还原〕——spec D8 修订。）

import { runLegacyFlags } from '../src/legacy-flags.ts';
import { resolveProgramContext } from '../src/context.ts';

// 提前进入 raw 模式：clack 只认裸 \r 的 return 键名；若终端仍处规范模式（如 PTY 合成按键、
// 部分远端终端），\r 会被 ICRNL 翻成 \n（键名 enter）而永远无法提交。TTY 上先开 raw 保证
// 回车语义一致；clack 自身的 raw 开关在非 tty.ReadStream 的 stdin 上会静默跳过。
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

const context = resolveProgramContext();
runLegacyFlags(process.argv.slice(2), context.packageRoot, context.packageVersion).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`✗ 未预期的错误：${err.stack ?? err.message}`);
    process.exitCode = 1;
  },
);
