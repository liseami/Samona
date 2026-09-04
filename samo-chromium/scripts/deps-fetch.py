"""
[INPUT]: 依赖 ~/chromium/src/DEPS（vars + deps；条目为 cipd 的 packages/version 或 gcs 的 bucket/objects）、depot_tools 的 cipd、网络可达 GCS
[OUTPUT]: 命令行：deps-fetch.py <dep_path>...  → 把源码包缺的 DEPS 二进制装到位：cipd 条目 → cipd ensure 到该目录；gcs 条目 → 下载 object 到 output_file，tar.gz/zip 自动解开；已存在则跳过
[POS]: samo-chromium 源码包路线的迷你 gclient：不跑 gclient sync（经隧道必断），只借 DEPS 的事实拿二进制。toolchain.sh 调用
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import os, sys, subprocess, tarfile, zipfile, urllib.request, tempfile, hashlib

SRC = os.path.expanduser(os.environ.get('CHROMIUM_SRC', '~/chromium/src'))
CIPD = os.path.expanduser(os.environ.get('DEPOT_TOOLS', '~/depot_tools')) + '/cipd'
g = {'Var': lambda k: g['vars'][k], 'Str': lambda s: s}
exec(open(os.path.join(SRC, 'DEPS')).read(), g)

def dest_of(path):  # 'src/third_party/x' → ~/chromium/src/third_party/x
    return os.path.join(SRC, path[len('src/'):] if path.startswith('src/') else path)

def gcs(path, entry):
    d = dest_of(path); os.makedirs(d, exist_ok=True)
    for o in entry['objects']:
        out = os.path.join(d, o['output_file'])
        marker = out + '.samo-fetched'
        if os.path.exists(marker): print(f'[deps] have {path}/{o["output_file"]}'); continue
        url = f"https://storage.googleapis.com/{entry['bucket']}/{o['object_name']}"
        print(f'[deps] gcs {url} → {out}')
        with urllib.request.urlopen(url, timeout=120) as r, open(out, 'wb') as f:
            h = hashlib.sha256()
            while True:
                b = r.read(1 << 20)
                if not b: break
                f.write(b); h.update(b)
        if o.get('sha256sum') and h.hexdigest() != o['sha256sum']: raise SystemExit(f'sha256 mismatch for {out}')
        if out.endswith(('.tar.gz', '.tgz')):
            with tarfile.open(out) as t: t.extractall(d)
        elif out.endswith('.zip'):
            with zipfile.ZipFile(out) as z: z.extractall(d)
        open(marker, 'w').write(o.get('sha256sum', ''))

def cipd(path, entry):
    d = dest_of(path); os.makedirs(d, exist_ok=True)
    lines = [f"{p['package'].replace('${{platform}}', 'mac-arm64')} {p['version']}" for p in entry['packages']]
    print(f'[deps] cipd {path}: ' + '; '.join(lines))
    with tempfile.NamedTemporaryFile('w', suffix='.ensure', delete=False) as f: f.write('\n'.join(lines) + '\n'); ef = f.name
    subprocess.run([CIPD, 'ensure', '-root', d, '-ensure-file', ef], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.unlink(ef)

for path in sys.argv[1:]:
    e = g['deps'].get(path)
    if not isinstance(e, dict): print(f'[deps] no entry {path}', file=sys.stderr); continue
    if e.get('dep_type') == 'gcs': gcs(path, e)
    elif 'packages' in e: cipd(path, e)
    else: print(f'[deps] unsupported entry {path}', file=sys.stderr)
