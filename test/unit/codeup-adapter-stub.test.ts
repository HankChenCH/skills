// codeup 适配器进程级替身测试（spec 20261119-20b1，票 20261119-2521）。
//
// seam = 适配器外部可观察行为（先例：spec 0004 以 PATH 替身断言适配器调用面，该套件形态
// 已随测试框架迁移演进，本轮新落执行器）：以假 curl（PATH 前置）钉住调用序列、退出码、
// stderr 文案与映射文件副作用。期望值独立来源 = spec 验收场景 FR-2 / FR-4–FR-6 的字面契约
// （创建 category=Req、终态关闭 {"status":"100014"} / {"status":"141230"}、映射三字段记账、
// 幂等追加、受理面跳过），不由实现推导。替身只钉替身契约：真实链路语义由集成级人工段背书
//（stub-fidelity-integration 纪律）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ADAPTER = path.join(packageRoot, '.sdlc', 'trackers', 'codeup.sh');

// ── 假 curl：记录 <method>\t<url>\t<data> 后回预制 200 响应；FAKE_CURL_FAIL_METHOD 命中即模拟网络失败 ──
const FAKE_CURL = `#!/bin/sh
log="\${FAKE_CURL_LOG:?}"
body="\${FAKE_CURL_BODY:?}"
method=POST; url=''; data=''
while [ $# -gt 0 ]; do
  case "$1" in
    -X) method=$2; shift 2 ;;
    --data) data=$2; shift 2 ;;
    -H|--header|-w|--write-out) shift 2 ;;
    -*) shift ;;
    *) [ -z "$url" ] && url=$1; shift ;;
  esac
done
printf '%s\\t%s\\t%s\\n' "$method" "$url" "$data" >> "$log"
if [ -n "\${FAKE_CURL_FAIL_METHOD:-}" ] && [ "$method" = "$FAKE_CURL_FAIL_METHOD" ]; then
  echo 'fake curl: 模拟平台非零（网络失败）' >&2
  exit 22
fi
cat "$body"
printf '\\n200'
`;

// 预制响应体：create 调用从中解析 workitemIdentifier，其余调用不读内容
const CANNED_BODY = '{"workitemIdentifier":"REQWID-1","success":true}\n';

interface RunResult {
  status: number;
  stderr: string;
  stdout: string;
  log: string[]; // 每行 <method>\t<url>\t<data>
  mapLines: string[];
}

interface SandboxSpec {
  file: string; // 相对仓库根的产物路径
  frontmatterStatus: string;
  kind: 'need' | 'spec' | 'ticket' | 'research';
  mapSeed?: string[]; // 预置 codeup.map 行
  failMethod?: string; // 命中该 HTTP method 即模拟非零
  config?: Partial<Record<'TRACKER_REPO' | 'CODEUP_TOKEN' | 'CODEUP_ASSIGNEE' | 'CODEUP_WORKITEM_TYPE', string>>;
}

const CONFIG_DEFAULTS = {
  TRACKER_REPO: 'org1/space1',
  CODEUP_TOKEN: 'pt-test',
  CODEUP_ASSIGNEE: 'user-1',
  CODEUP_WORKITEM_TYPE: 'req-type-1',
} as const;

const FIXTURE_BASENAME: Record<SandboxSpec['kind'], string> = {
  need: '20261119-8458-codeup-mcp-projection.md',
  spec: 'need20261119-8458-20261119-20b1-codeup-mcp-projection.md',
  ticket: 'spec20261119-20b1-20261119-2521-codeup-mcp-projection.md',
  research: '20261110-36c4-independent-note.md',
};

const FIXTURE_DIR: Record<SandboxSpec['kind'], string> = {
  need: 'docs/needs',
  spec: 'docs/specs',
  ticket: 'docs/tickets',
  research: 'docs/research',
};

function runAdapter(spec: SandboxSpec): RunResult {
  // mkdtemp 返回逻辑路径（/var/...），适配器用 pwd -P 解析 REPO_ROOT（/private/var/...）——
  // 先 realpath 对齐，否则产物相对路径剥离失败、受理面判定失真
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'codeup-adapter-')));
  const fakeBin = path.join(root, 'fakebin');
  fs.mkdirSync(fakeBin);
  fs.writeFileSync(path.join(fakeBin, 'curl'), FAKE_CURL, { mode: 0o755 });
  fs.mkdirSync(path.join(root, '.sdlc', 'trackers'), { recursive: true });
  fs.copyFileSync(ADAPTER, path.join(root, '.sdlc', 'trackers', 'codeup.sh'));
  fs.writeFileSync(
    path.join(root, '.sdlc', 'config.sh'),
    `TRACKER=codeup\n${Object.entries({ ...CONFIG_DEFAULTS, ...spec.config })
      .map(([k, v]) => `${k}="${v}"`)
      .join('\n')}\n`,
  );
  const dir = path.join(root, FIXTURE_DIR[spec.kind]);
  fs.mkdirSync(dir, { recursive: true });
  const fileRel = path.join(FIXTURE_DIR[spec.kind], FIXTURE_BASENAME[spec.kind]);
  fs.writeFileSync(
    path.join(root, fileRel),
    `---\nid: 20261119-8458\nstatus: ${spec.frontmatterStatus}\ncreated: 2026-11-19\n---\n# ${spec.kind} 夹具标题\n\n正文。\n`,
  );
  const mapPath = path.join(root, '.sdlc', 'trackers', 'codeup.map');
  if (spec.mapSeed !== undefined) {
    fs.writeFileSync(mapPath, spec.mapSeed.join('\n') + '\n');
  }
  const logPath = path.join(root, 'fake-curl.log');
  const bodyPath = path.join(root, 'fake-curl-body.json');
  fs.writeFileSync(bodyPath, CANNED_BODY);

  const res = spawnSync('bash', [path.join(root, '.sdlc', 'trackers', 'codeup.sh'), 'publish', path.join(root, fileRel)], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
      FAKE_CURL_LOG: logPath,
      FAKE_CURL_BODY: bodyPath,
      ...(spec.failMethod ? { FAKE_CURL_FAIL_METHOD: spec.failMethod } : {}),
    },
    encoding: 'utf-8',
  });

  const result: RunResult = {
    status: res.status ?? -1,
    stderr: res.stderr,
    stdout: res.stdout,
    log: fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf-8').split('\n').filter((l) => l !== '') : [],
    mapLines: fs.existsSync(mapPath) ? fs.readFileSync(mapPath, 'utf-8').split('\n').filter((l) => l !== '') : [],
  };
  fs.rmSync(root, { recursive: true, force: true });
  return result;
}

// 端点形态照旧契约：spaceIdentifier 在请求体内，URL 只含 organizationId（先例：spec 0004 适配器）
const CREATE_URL = 'https://devops.cn-hangzhou.aliyuncs.com/organization/org1/workitem';
const COMMENT_URL = 'https://devops.cn-hangzhou.aliyuncs.com/organization/org1/workitems/comment';
const CLOSE_URL = 'https://devops.cn-hangzhou.aliyuncs.com/organization/org1/workitem/REQWID-1';

const callsTo = (log: RunResult['log'], url: string): string[] => log.filter((l) => l.split('\t')[1] === url);
const callsWithMethod = (log: RunResult['log'], method: string): string[] => log.filter((l) => l.split('\t')[0] === method);

test('publish need（活跃态）：一次建单（category=Req）+ 一次评论、无状态更新调用、映射新增一行', () => {
  const r = runAdapter({ file: 'need', frontmatterStatus: 'confirmed', kind: 'need' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  const creates = callsTo(r.log, CREATE_URL);
  assert.equal(creates.length, 1, `应恰一次 CreateWorkitemV2，实际调用日志：${JSON.stringify(r.log)}`);
  assert.ok(creates[0].includes('"category":"Req"'), `建单应 category=Req，实际：${creates[0]}`);
  const comments = callsTo(r.log, COMMENT_URL);
  assert.equal(comments.length, 1, `应恰一次评论调用，实际调用日志：${JSON.stringify(r.log)}`);
  assert.ok(comments[0].includes('"formatType":"MARKDOWN"'), '评论应为 MARKDOWN 形态');
  assert.ok(comments[0].includes('盘上产物：docs/needs/'), '评论正文首行应带盘上指针');
  assert.equal(callsWithMethod(r.log, 'PUT').length, 0, '活跃态不得有状态更新调用');
  assert.equal(r.mapLines.length, 1, `映射应新增一行，实际：${JSON.stringify(r.mapLines)}`);
  assert.equal(r.mapLines[0].split('\t')[0], 'docs/needs/20261119-8458-codeup-mcp-projection.md');
  assert.equal(r.mapLines[0].split('\t')[1], 'REQWID-1', '映射第二列应记响应中的工作项标识');
});

test('publish need（status=done）：终态关闭调用收到 {"status":"100014"}', () => {
  const r = runAdapter({ file: 'need', frontmatterStatus: 'done', kind: 'need' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  const closes = callsTo(r.log, CLOSE_URL);
  assert.equal(closes.length, 1, `应恰一次终态关闭调用，实际调用日志：${JSON.stringify(r.log)}`);
  assert.equal(closes[0].split('\t')[0], 'PUT', '关闭应为 PUT UpdateWorkitem');
  assert.equal(closes[0].split('\t')[2], '{"status":"100014"}', `关闭体应为已完成状态，实际：${closes[0]}`);
});

test('publish need（status=rejected）：终态关闭调用收到 {"status":"141230"}', () => {
  const r = runAdapter({ file: 'need', frontmatterStatus: 'rejected', kind: 'need' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  const closes = callsTo(r.log, CLOSE_URL);
  assert.equal(closes.length, 1, `应恰一次终态关闭调用，实际调用日志：${JSON.stringify(r.log)}`);
  assert.equal(closes[0].split('\t')[2], '{"status":"141230"}', `关闭体应为已取消状态，实际：${closes[0]}`);
});

test('已关闭工作项重复终态 publish：关闭非零按失败留痕，仍 exit 0', () => {
  const rel = 'docs/needs/20261119-8458-codeup-mcp-projection.md';
  const r = runAdapter({
    file: 'need',
    frontmatterStatus: 'done',
    kind: 'need',
    mapSeed: [`${rel}\tREQWID-1\t`],
    failMethod: 'PUT',
  });
  assert.equal(r.status, 0, `关闭失败应留痕不阻断，实际 exit ${r.status}`);
  assert.ok(r.stderr.includes('终态关闭失败'), `stderr 应留痕关闭失败，实际：${r.stderr}`);
  assert.equal(callsTo(r.log, COMMENT_URL).length, 1, '重复 publish 仍应追加评论');
  assert.equal(r.mapLines.length, 1, '映射行数应不变');
});

test('publish 票：跳过并说明过程档不入云效，零 HTTP 调用', () => {
  const r = runAdapter({ file: 'ticket', frontmatterStatus: 'in-progress', kind: 'ticket' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.ok(r.stderr.includes('过程档不入云效'), `stderr 应说明过程档跳过，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, `不得有任何 HTTP 调用，实际：${JSON.stringify(r.log)}`);
  assert.equal(r.mapLines.length, 0, '票不得进映射');
});

test('publish 独立知识档（无 need 谱系）：跳过并说明无 need 谱系，零 HTTP 调用', () => {
  const r = runAdapter({ file: 'research', frontmatterStatus: 'accepted', kind: 'research' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.ok(r.stderr.includes('无 need 谱系'), `stderr 应说明无谱系跳过，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, `不得有任何 HTTP 调用，实际：${JSON.stringify(r.log)}`);
});

test('publish spec 而映射无其 need 记录：跳过并指明先投影对应 need，零 HTTP 调用', () => {
  const r = runAdapter({ file: 'spec', frontmatterStatus: 'approved', kind: 'spec', mapSeed: [] });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.ok(r.stderr.includes('先投影对应 need'), `stderr 应指明先投影 need，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, `不得有任何 HTTP 调用，实际：${JSON.stringify(r.log)}`);
});

test('publish spec（need 已映射）：向 need 需求单追加评论，映射新增行且第二列记 need 工作项标识', () => {
  const needRel = 'docs/needs/20261119-8458-codeup-mcp-projection.md';
  const specRel = 'docs/specs/need20261119-8458-20261119-20b1-codeup-mcp-projection.md';
  const r = runAdapter({
    file: 'spec',
    frontmatterStatus: 'approved',
    kind: 'spec',
    mapSeed: [`${needRel}\tREQWID-1\t`],
  });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.equal(callsTo(r.log, CREATE_URL).length, 0, 'spec 评论形态不得新建工作项');
  const comments = callsTo(r.log, COMMENT_URL);
  assert.equal(comments.length, 1, `应恰一次评论调用，实际调用日志：${JSON.stringify(r.log)}`);
  assert.ok(comments[0].includes('"workitemIdentifier":"REQWID-1"'), '评论应挂到 need 需求单下');
  assert.equal(r.mapLines.length, 2, `映射应为 need 行 + spec 行，实际：${JSON.stringify(r.mapLines)}`);
  const specRow = r.mapLines.find((l) => l.startsWith(specRel));
  assert.ok(specRow !== undefined, `映射应有 spec 行，实际：${JSON.stringify(r.mapLines)}`);
  assert.equal(specRow.split('\t')[1], 'REQWID-1', '知识档行第二列应记其承载 need 的工作项标识');
});

test('publish spec 二次 publish：幂等追加评论不新建，映射行数不变', () => {
  const specRel = 'docs/specs/need20261119-8458-20261119-20b1-codeup-mcp-projection.md';
  const r = runAdapter({
    file: 'spec',
    frontmatterStatus: 'approved',
    kind: 'spec',
    mapSeed: [`${specRel}\tREQWID-1\t`],
  });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.equal(callsTo(r.log, CREATE_URL).length, 0, '重复 publish 不得新建');
  assert.equal(callsTo(r.log, COMMENT_URL).length, 1, '重复 publish 应追加评论');
  assert.equal(r.mapLines.length, 1, '映射行数应不变');
});

test('同 need 二次 publish：幂等追加评论不新建，映射行数不变', () => {
  const r = runAdapter({
    file: 'need',
    frontmatterStatus: 'confirmed',
    kind: 'need',
    mapSeed: ['docs/needs/20261119-8458-codeup-mcp-projection.md\tREQWID-1\t'],
  });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.equal(callsTo(r.log, CREATE_URL).length, 0, '重复 publish 不得新建');
  assert.equal(callsTo(r.log, COMMENT_URL).length, 1, '重复 publish 应追加评论');
  assert.equal(callsWithMethod(r.log, 'PUT').length, 0, '活跃态二次 publish 无状态更新调用');
  assert.equal(r.mapLines.length, 1, '映射行数应不变');
});

test('三项 REST 配置逐项缺失：逐项警告跳过 exit 0 且零调用', () => {
  for (const missing of ['CODEUP_TOKEN', 'CODEUP_ASSIGNEE', 'CODEUP_WORKITEM_TYPE'] as const) {
    const r = runAdapter({ file: 'need', frontmatterStatus: 'confirmed', kind: 'need', config: { [missing]: '' } });
    assert.equal(r.status, 0, `${missing} 缺失应警告跳过 exit 0，实际 exit ${r.status}`);
    assert.ok(r.stderr.includes(missing), `${missing} 缺失应在 stderr 点名该项，实际：${r.stderr}`);
    assert.equal(r.log.length, 0, `${missing} 缺失不得有任何 HTTP 调用，实际：${JSON.stringify(r.log)}`);
  }
});
