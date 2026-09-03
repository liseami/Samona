/**
 * [INPUT]: 依赖 react; 消费父级 size 与透传 SVG props
 * [OUTPUT]: 对外提供 IconBrazil 国旗 SVG 组件
 * [POS]: shared/pika-icons/flags 的巴西国旗，供语言切换器 (SUPPORTED_LANGUAGES.flagIcon) 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { SVGProps } from "react";

function IconBrazil({ size = "32px", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      {...props}
    >
      <g className="nc-icon-wrapper">
        <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#009b3a"></rect>
        <path
          d="M16,9.333l11.667,6.667-11.667,6.667L4.333,16,16,9.333Z"
          fill="#fed100"
        ></path>
        <circle cx="16" cy="16" r="4" fill="#002776"></circle>
        <path
          d="M27,4H5c-2.209,0-4,1.791-4,4V24c0,2.209,1.791,4,4,4H27c2.209,0,4-1.791,4-4V8c0-2.209-1.791-4-4-4Zm3,20c0,1.654-1.346,3-3,3H5c-1.654,0-3-1.346-3-3V8c0-1.654,1.346-3,3-3H27c1.654,0,3,1.346,3,3V24Z"
          opacity=".15"
        ></path>
        <path
          d="M27,5H5c-1.657,0-3,1.343-3,3v1c0-1.657,1.343-3,3-3H27c1.657,0,3,1.343,3,3v-1c0-1.657-1.343-3-3-3Z"
          fill="#fff"
          opacity=".2"
        ></path>
      </g>
    </svg>
  );
}

export default IconBrazil;
