/**
 * [INPUT]: 消费标准 SVG 图标尺寸、颜色与无障碍属性
 * [OUTPUT]: 对外提供 PiExportUpStroke 上行导出图标
 * [POS]: pika-icons/general 的项目自绘导出语义图标 · 与 DownloadDown 同规格、同容器轮廓，内部箭头反向向上
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React from 'react';

export default function PiExportUpStroke({
  size = 24,
  color,
  className,
  ariaLabel = 'export-up icon',
  ...props
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: color || 'currentColor' }}
      role="img"
      aria-label={ariaLabel}
      {...props}
    >
      <path
        d="M3 15a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5M9 7.812a15 15 0 0 1 2.556-2.655A.7.7 0 0 1 12 5m3 2.812a15 15 0 0 0-2.556-2.655A.7.7 0 0 0 12 5m0 0v11"
      />
    </svg>
  );
}
