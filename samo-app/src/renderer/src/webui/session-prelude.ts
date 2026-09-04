/**
 * [INPUT]: 依赖 location.search 的 session 参数（SamoShellView 把 userMenu.open 命令里的 session 序列化进弹层 URL），../store/session 的 useSession（动态 import）
 * [OUTPUT]: 无导出；副作用——把 session 写进本文档的 localStorage（samo.session），并直接灌进 useSession（打包后共享块可能先于本文件求值，不能只靠写 localStorage）
 * [POS]: WebUI 宿主弹层页的前置：chrome://samo-overlay 与 chrome://samo 不同源，账号 mock 要靠命令带过来
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const session = new URLSearchParams(location.search).get('session');
if (session) {
  try {
    localStorage.setItem('samo.session', session);
  } catch {
    /* 私密模式 */
  }
  void import('../store/session').then(({ useSession }) => useSession.setState({ user: JSON.parse(session) }));
}
