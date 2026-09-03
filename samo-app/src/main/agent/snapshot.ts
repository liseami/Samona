/**
 * [INPUT]: 依赖 electron 的 WebContents（其 debugger 已由 CdpBridge 附着）
 * [OUTPUT]: 对外提供 buildSnapshot(wc, options) → { content, refs }，refs 以 backendNodeId 为 ref（ego 的 @N 约定）
 * [POS]: agent 模块的「页面之眼」：把 CDP Accessibility 树压成 agent 可读的缩进文本；ego lite 用内核级快照，这里是它的 CDP 近似实现，后续可替换而不影响调用方
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { WebContents } from 'electron';

export interface SnapshotOptions {
  scope?: 'only_within_viewport' | 'full_page';
  includeActionMarks?: boolean;
  includeStableLocator?: boolean;
  maxResultLength?: number;
}
export interface SnapshotRef {
  backendNodeId: number;
  role: string;
  name: string;
}
export interface SnapshotResult {
  content: string;
  refs: SnapshotRef[];
}

interface AXValue {
  type?: string;
  value?: unknown;
}
interface AXNode {
  nodeId: string;
  ignored?: boolean;
  role?: AXValue;
  name?: AXValue;
  value?: AXValue;
  properties?: { name: string; value: AXValue }[];
  childIds?: string[];
  backendDOMNodeId?: number;
}

// ============ 哪些角色值得给 ref（可交互或可读的语义节点） ============
const INTERACTIVE = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'checkbox',
  'radio',
  'combobox',
  'listbox',
  'option',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'tab',
  'switch',
  'slider',
  'spinbutton',
  'textarea',
]);
const STRUCTURAL_SKIP = new Set(['none', 'generic', 'presentation', 'InlineTextBox', 'LineBreak', 'ignored']);
const MAX_NAME = 120;

export async function buildSnapshot(wc: WebContents, options: SnapshotOptions = {}): Promise<SnapshotResult> {
  const { nodes } = (await wc.debugger.sendCommand('Accessibility.getFullAXTree')) as { nodes: AXNode[] };
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const root = nodes[0];
  const lines: string[] = [];
  const refs: SnapshotRef[] = [];
  const limit = options.maxResultLength ?? 60_000;
  let total = 0;

  const visit = (node: AXNode | undefined, depth: number) => {
    if (!node || total > limit) return;
    const role = str(node.role);
    const name = clip(str(node.name));
    const value = clip(str(node.value));
    const skip = node.ignored || STRUCTURAL_SKIP.has(role) || (!name && !value && !INTERACTIVE.has(role));
    let nextDepth = depth;
    if (!skip) {
      const parts = [`${'  '.repeat(depth)}- ${role}`];
      if (name) parts.push(` "${name}"`);
      if (node.backendDOMNodeId !== undefined && (INTERACTIVE.has(role) || name)) {
        parts.push(` [ref=@${node.backendDOMNodeId}]`);
        refs.push({ backendNodeId: node.backendDOMNodeId, role, name });
      }
      const flags = (node.properties ?? [])
        .filter((p) => ['checked', 'disabled', 'expanded', 'selected', 'focused', 'pressed', 'required'].includes(p.name))
        .filter((p) => p.value?.value !== false && p.value?.value !== 'false')
        .map((p) => (p.value?.value === true || p.value?.value === 'true' ? p.name : `${p.name}=${String(p.value?.value)}`));
      if (flags.length) parts.push(` [${flags.join(' ')}]`);
      if (value && value !== name) parts.push(`: ${value}`);
      const line = parts.join('');
      total += line.length + 1;
      lines.push(line);
      nextDepth = depth + 1;
    }
    for (const id of node.childIds ?? []) visit(byId.get(id), nextDepth);
  };
  visit(root, 0);

  const header = `# ${wc.getTitle() || 'untitled'}\nurl: ${wc.getURL()}\n`;
  return { content: header + lines.join('\n') + (total > limit ? '\n… (truncated)' : ''), refs };
}

function str(v: AXValue | undefined): string {
  if (!v || v.value === undefined || v.value === null) return '';
  return String(v.value);
}
function clip(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > MAX_NAME ? `${t.slice(0, MAX_NAME - 1)}…` : t;
}
