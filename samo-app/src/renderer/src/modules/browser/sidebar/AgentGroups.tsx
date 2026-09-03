/**
 * [INPUT]: 依赖 react，@dnd-kit/sortable（SortableContext/verticalListSortingStrategy），@shared/model 的 Identity/Tab，../../../icons 的 Bot/Hand，../../../store/browser 的 useBrowser/send，../../../components/ui/button，../../../lib/dnd 的 tabDragId，../../../lib/utils 的 cn，./TabItem
 * [OUTPUT]: 对外提供 AgentGroups 组件：每个 agent 任务空间一组——组头（Bot 图标 + 任务名 + 工作中脉冲点 + Take control / Hand back）+ 当前动作标签 + 它的标签行；点标签即「围观」（呈现该空间的标签）
 * [POS]: modules/browser/sidebar 的 agent 可见性层：拔掉「身份」后，agent 的任务空间不再是另一个身份，而是用户标签之下的分组；共享同一登录态
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Identity, Tab } from '@shared/model';
import { Bot, Hand } from '../../../icons';
import { send, useBrowser } from '../../../store/browser';
import { Button } from '../../../components/ui/button';
import { tabDragId } from '../../../lib/dnd';
import { cn } from '../../../lib/utils';
import { TabItem } from './TabItem';

export function AgentGroups() {
  const identities = useBrowser((s) => s.snapshot?.identities);
  const tabs = useBrowser((s) => s.snapshot?.tabs);
  const activeIdentityId = useBrowser((s) => s.snapshot?.activeIdentityId ?? -1);
  const activeByIdentity = useBrowser((s) => s.snapshot?.activeTabIdByIdentity);
  const agents = useMemo(() => (identities ?? []).filter((i) => i.ownership !== 'user'), [identities]);
  if (agents.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-border/60 px-2 pt-2">
      {agents.map((identity) => (
        <AgentGroup
          key={identity.id}
          identity={identity}
          tabs={(tabs ?? []).filter((t) => t.identityId === identity.id)}
          activeTabId={activeIdentityId === identity.id ? (activeByIdentity?.[identity.id] ?? null) : null}
        />
      ))}
    </div>
  );
}

function AgentGroup({ identity, tabs, activeTabId }: { identity: Identity; tabs: Tab[]; activeTabId: string | null }) {
  const delegated = identity.ownership === 'agentDelegatedToUser';
  const working = !delegated && identity.agentState !== null;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex h-7 items-center gap-1.5 px-1">
        {delegated ? <Hand size={13} className="shrink-0 text-orange-500" /> : <Bot size={13} className={cn('shrink-0', working ? 'text-agent' : 'text-muted-foreground')} />}
        <span className="min-w-0 flex-1 truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">{identity.taskId ?? identity.name}</span>
        {working && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-agent" />}
        <Button variant="secondary" size="small" className="h-6 px-2" onClick={() => send({ type: delegated ? 'identity.handBack' : 'identity.takeControl', identityId: identity.id })}>
          {delegated ? 'Hand back' : 'Take control'}
        </Button>
      </div>
      {identity.agentState && !delegated && <div className="truncate px-1 text-xs text-muted-foreground">{identity.agentState}</div>}
      <SortableContext items={tabs.map((t) => tabDragId(t.id))} strategy={verticalListSortingStrategy}>
        {tabs.map((tab) => (
          <TabItem key={tab.id} tab={tab} active={tab.id === activeTabId} />
        ))}
      </SortableContext>
    </div>
  );
}
