"""生成书架查找用的简繁折叠表，写进 src/library.ts（以及其他给出的 library.js 副本）里
BEGIN hanzi-fold / END hanzi-fold 两行注释之间。

数据来自 OpenCC（Apache-2.0）：data/dictionary/TSCharacters.txt（繁→简）和
JPShinjitaiCharacters.txt（日文新字体→旧字体，再转成简体）。只取一对一的单字。

用法：python tools/make_hanzi_fold.py <TSCharacters.txt> <JPShinjitaiCharacters.txt> [要写入的文件 ...]
不给要写入的文件时写 src/library.ts。
"""
import re
import sys
from pathlib import Path


def load(path):
    table = {}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        if line.startswith('#') or not line.strip():
            continue
        key, values = line.split('\t')
        table[key] = values.split(' ')
    return table


def pairs(ts_path, jp_path):
    fold = {k: v[0] for k, v in load(ts_path).items() if len(k) == 1 and len(v[0]) == 1 and k != v[0]}
    for shinjitai, olds in load(jp_path).items():
        simplified = fold.get(olds[0], olds[0])
        if len(shinjitai) == 1 and shinjitai not in fold and simplified != shinjitai and len(simplified) == 1:
            fold[shinjitai] = simplified
    return ''.join(k + v for k, v in sorted(fold.items()))


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    text = pairs(sys.argv[1], sys.argv[2])
    block = f"  const HANZI_PAIRS = '{text}';\n"
    marker = re.compile(r'(// BEGIN hanzi-fold\n).*?(\s*// END hanzi-fold)', re.S)
    for target in sys.argv[3:] or [str(Path(__file__).resolve().parents[1] / 'src/library.ts')]:
        path = Path(target)
        source = path.read_text(encoding='utf-8')
        if not marker.search(source):
            sys.exit(f'{target}: 没有 BEGIN/END hanzi-fold 标记')
        path.write_text(marker.sub(lambda m: m[1] + block.rstrip('\n') + m[2], source, count=1), encoding='utf-8')
        print(f'{target}: {len(text) // 2} 对')


if __name__ == '__main__':
    main()
