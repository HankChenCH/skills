#!/bin/zsh
# $1 = 输出文件, $2 = fixture 目录（含 probe.js）, "ref" 特指参照驱动所在目录
OUT=$1; DIR=$2
MATRIX=("--help" "-h" "--all --skills dev-spec" "--plugins x --all" "--foo" "positional" "--skills" "--plugins" "--profile" "--profile dev" "--skills a --skills b" "--skills a,b" "--all" "--plugins p --profile dev" "--plugins p" "")
: > $OUT
for m in "${MATRIX[@]}"; do
  echo "##### argv: [$m]" >> $OUT
  (cd $DIR && node probe.js ${=m}) >>$OUT 2>&1
  echo "--exit: $?" >> $OUT
done
