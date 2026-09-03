/**
 * [INPUT]: 依赖 ../../icons 的 Bot/Hand，../../store/browser 的 useBrowser/send/selectActiveSpace，../ui/button 的 Button
 * [OUTPUT]: 对外提供 AgentBanner 组件：活动 Space 被 agent 持有时的控制条——显示 agent 当前动作，提供「Take control / Hand back」（phi HUD 控制药丸的侧栏版）
 * [POS]: renderer/components/sidebar 的 agent 可见性层；用户 Space 时不渲染
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Bot, Hand } from '../../icons';
import { selectActiveSpace, send, useBrowser } from '../../store/browser';
import { Button } from '../ui/button';

export function AgentBanner() {
  const space = useBrowser(selectActiveSpace);
  if (!space || space.ownership === 'user') return null;
  const delegated = space.ownership === 'agentDelegatedToUser';
  return (
    <div className="no-drag mx-2 mb-1 flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm shadow-xs">
      {delegated ? <Hand size={13} className="shrink-0 text-orange-500" /> : <Bot size={13} className="shrink-0 text-space" />}
      <span className="min-w-0 flex-1 truncate text-foreground">{delegated ? 'You are in control' : (space.agentState ?? 'Agent is working…')}</span>
      <Button variant="secondary" size="sm" className="h-6 px-2" onClick={() => send({ type: delegated ? 'space.handBack' : 'space.takeControl', spaceId: space.id })}>
        {delegated ? 'Hand back' : 'Take control'}
      </Button>
    </div>
  );
}
