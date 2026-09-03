/**
 * [INPUT]: 依赖 react; 透传 SVGProps 给 svg
 * [OUTPUT]: 对外提供 IconSerbia 国旗图标组件
 * [POS]: shared/pika-icons/flags 的塞尔维亚语语言选择器图标，被 SUPPORTED_LANGUAGES.flagIcon 引用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React from 'react';

// 塞尔维亚国旗 · 与 IconChina 同规格: 32 viewBox + 30x24 旗面
const IconSerbia = ({ size = '32px', ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" fill="none" {...props}>
    <defs>
      <clipPath id="laper-flag-serbia">
        <rect x="1" y="4" width="30" height="24" rx="4" ry="4" />
      </clipPath>
    </defs>
    <g clipPath="url(#laper-flag-serbia)">
      <rect x="1" y="4" width="30" height="8" fill="#C6363C" />
      <rect x="1" y="12" width="30" height="8" fill="#0C4076" />
      <rect x="1" y="20" width="30" height="8" fill="#F5F5F5" />
      <path d="M8.5 7.5L7.5 8.9H11.5L10.5 7.5L9.5 8.1L8.5 7.5Z" fill="#F4C430" />
      <path d="M6.2 9.5H12.8L12.25 16.2C12 18.3 10.1 19.8 9.5 20.2C8.9 19.8 7 18.3 6.75 16.2L6.2 9.5Z" fill="#C6363C" stroke="#F4C430" strokeWidth="0.75" />
      <path d="M9.5 10.8V18.4M7.65 12.5H11.35" stroke="#F5F5F5" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M7.8 14.3C8.45 14 8.95 14.12 9.32 14.55M11.2 14.3C10.55 14 10.05 14.12 9.68 14.55M7.75 16.15C8.5 15.85 9.05 16 9.4 16.55M11.25 16.15C10.5 15.85 9.95 16 9.6 16.55" stroke="#F5F5F5" strokeWidth="0.55" strokeLinecap="round" />
    </g>
    <path d="M27,4H5c-2.209,0-4,1.791-4,4V24c0,2.209,1.791,4,4,4H27c2.209,0,4-1.791,4-4V8c0-2.209-1.791-4-4-4Zm3,20c0,1.654-1.346,3-3,3H5c-1.654,0-3-1.346-3-3V8c0-1.654,1.346-3,3-3H27c1.654,0,3,1.346,3,3V24Z" opacity=".15" fill="#000" />
    <path d="M27,5H5c-1.657,0-3,1.343-3,3v1c0-1.657,1.343-3,3-3H27c1.657,0,3,1.343,3,3v-1c0-1.657-1.343-3-3-3Z" fill="#fff" opacity=".2" />
  </svg>
);

export default IconSerbia;
