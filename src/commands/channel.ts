// 命令出口通道装配（票 20261116-f761）：commander 库出口统一翻异常通道、错误文案不走
// 库侧 stderr（由装配层 run 收口为 ✗ 通道）。addCommand 不继承父设置（commander 只有
// .command() 工厂继承），故装配层与每个命令工厂对自建 Command 实例各自调用本函数——
// 新增子命令时同样带上。

import { Command } from 'commander';

export function configureCommandChannel(cmd: Command): void {
  cmd.exitOverride();
  cmd.showSuggestionAfterError(false);
  cmd.showHelpAfterError(false);
  cmd.configureOutput({ writeErr: () => {} });
}
