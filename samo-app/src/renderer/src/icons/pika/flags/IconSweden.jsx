/**
 * [INPUT]: 依赖 react; 透传 SVGProps 给 svg
 * [OUTPUT]: 对外提供 IconSweden 国旗图标组件
 * [POS]: shared/pika-icons/flags 的瑞典语语言选择器图标，被 SUPPORTED_LANGUAGES.flagIcon 引用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React from 'react';

// 瑞典国旗 · 与 IconChina 同规格: 32 viewBox + 30x24 旗面
const IconSweden = ({ size = '32px', ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" fill="none" {...props}>
    <defs>
      <clipPath id="laper-flag-sweden">
        <rect x="1" y="4" width="30" height="24" rx="4" ry="4" />
      </clipPath>
    </defs>
    <g clipPath="url(#laper-flag-sweden)">
      <rect x="1" y="4" width="30" height="24" fill="#0052B4" />
      <rect x="10" y="4" width="4" height="24" fill="#FFDA44" />
      <rect x="1" y="14" width="30" height="4" fill="#FFDA44" />
    </g>
    <path d="M27,4H5c-2.209,0-4,1.791-4,4V24c0,2.209,1.791,4,4,4H27c2.209,0,4-1.791,4-4V8c0-2.209-1.791-4-4-4Zm3,20c0,1.654-1.346,3-3,3H5c-1.654,0-3-1.346-3-3V8c0-1.654,1.346-3,3-3H27c1.654,0,3,1.346,3,3V24Z" opacity=".15" fill="#000" />
    <path d="M27,5H5c-1.657,0-3,1.343-3,3v1c0-1.657,1.343-3,3-3H27c1.657,0,3,1.343,3,3v-1c0-1.657-1.343-3-3-3Z" fill="#fff" opacity=".2" />
  </svg>
);

export default IconSweden;
