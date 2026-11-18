// dsh-mcp 插件 pack 跨进程锁（test/e2e 共享 helper，评审 20261118-137e 建议 #5 单点化；
// 消费方 = dsh-mcp-e2e-integration.test.ts / dsh-mcp-web-e2e-integration.test.ts /
// dsh-ts-loading.test.ts）：
// prepack/postpack 钩子改写共享插件目录（index.js/client.js 进出仓库树），而 node --test
// 默认并行跑测试文件——两文件并发 pack 同一插件目录时，一方 postpack 会删掉另一方刚编译
// 的产物（竞态实证推演）；dsh-ts-loading 的 demo pack 段（票 20261118-4349 接入）虽在
// 临时拷贝内打外卖 tarball、不触仓库树，但与 dsh-mcp 系并发 pnpm pack 时实测 staging
// prepack exit 1（单跑恒绿，验收报告 20261118-e87d draft）——进程级竞争同锁互斥。
// O_EXCL 锁文件互斥，锁内写持有者 token（pid+随机数）。
//
// 修复环（评审 20261118-137e 三阻断的落点，此前双份拷贝各自带缺陷）：
// - 阻断 1：释放必须核验持有者身份再 unlink——读锁文件比对 token 一致才删；不一致（等待者
//   已超时强收、锁已换主）不删，避免原持有者 finally 删掉他人的锁使互斥失效。
// - 阻断 2：等待方强收阈值必须 ≥ 持有者合法持锁预算——两消费方的 pack runCommand timeout
//   均为 10 分钟（INSTALL_TIMEOUT_MS，npx/pnpm 冷启动满额场景），阈值取 10+2 分钟；5 分钟
//   阈值会把慢 pack 误判强收，互斥在最需要它的场景失效。
// - 阻断 3：open 失败只把 EEXIST 当「锁被占」继续轮询（其余 IO 错带路径与原因上抛，不吞成
//   白轮询）；强收路径与占用路径同享退避 sleep——多竞争者在 rm/open 间隙互重建锁时无退避
//   紧循环会打满 CPU。

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PACK_LOCK_FILE = path.join(os.tmpdir(), 'dsh-mcp-plugin-pack.lock');
// 强收阈值 = 持有者预算（两消费方 pack timeout 10 分钟）+ 余量 2 分钟（评审 137e 阻断 2）
const STALE_LOCK_THRESHOLD_MS = 12 * 60 * 1000;
const POLL_INTERVAL_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 持有者句柄：release 核验身份后才删锁文件（评审 137e 阻断 1）。 */
export interface PackLockHandle {
  release(): void;
}

async function acquirePackLock(): Promise<PackLockHandle> {
  const token = `${process.pid}-${crypto.randomBytes(8).toString('hex')}`;
  const deadline = Date.now() + STALE_LOCK_THRESHOLD_MS;
  let fd: number | undefined;
  while (fd === undefined) {
    try {
      fd = fs.openSync(PACK_LOCK_FILE, 'wx');
      fs.writeFileSync(fd, token, 'utf8');
    } catch (err) {
      if (fd !== undefined) {
        // token 落盘失败：锁已占名但无身份记录（他人无法核验）——关 fd 并删自己的锁重来
        fs.closeSync(fd);
        fd = undefined;
        fs.rmSync(PACK_LOCK_FILE, { force: true });
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw new Error(
          `pack 锁打开失败（非占用类 IO 错，评审 137e 阻断 3 不吞）：path=${PACK_LOCK_FILE}，${err instanceof Error ? err.message : String(err)}`,
        );
      }
      if (Date.now() > deadline) {
        // 陈锁强收：锁龄超持有者合法预算 = 原持有者崩溃形态；强收后走同一退避重抢
        fs.rmSync(PACK_LOCK_FILE, { force: true });
      }
      await sleep(POLL_INTERVAL_MS);
    }
  }
  return {
    release() {
      let owned = false;
      try {
        owned = fs.readFileSync(PACK_LOCK_FILE, 'utf8') === token;
      } catch {
        owned = false; // 锁文件已不存在（被他人强收且尚未重建）——无本主锁可删
      }
      fs.closeSync(fd);
      if (owned) fs.rmSync(PACK_LOCK_FILE, { force: true });
    },
  };
}

/** 在 pack 互斥锁内执行临界区（pack 命令 + 产物/残留断言）；异常与正常返回都释放。 */
export async function withPackLock<T>(critical: () => T): Promise<T> {
  const lock = await acquirePackLock();
  try {
    return critical();
  } finally {
    lock.release();
  }
}
