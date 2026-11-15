// 复刻 bin/infra.js 旗标路径的精确出口（parse → catch 打印 → help 打印），
// 作为五库等价探针的字节级参照。
import { parseArgs, renderHelp } from '/tmp/r3-exp/fixtures/current-pkg/src/cli-args.js';

const argv = process.argv.slice(2);
let args;
try {
  args = parseArgs(argv);
} catch (err) {
  console.error(`✗ ${err.message}`);
  console.error('  运行 npx @hankchen/infra --help 查看全部旗标与示例。');
  process.exit(1);
}
if (args.mode === 'help') {
  console.log(renderHelp());
  process.exit(0);
}
console.log(JSON.stringify(args));
