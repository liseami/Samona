/**
 * [INPUT]: 依赖 react; 消费父级 size 与透传 SVG props
 * [OUTPUT]: 对外提供 IconFrance 国旗 SVG 组件
 * [POS]: shared/pika-icons/flags 的法国国旗，供语言切换器 (SUPPORTED_LANGUAGES.flagIcon) 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { SVGProps } from "react";

function IconFrance({ size = "32px", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      {...props}
    >
      <g className="nc-icon-wrapper">
        <path fill="#fff" d="M10 4H22V28H10z"></path>
        <path
          d="M5,4h6V28H5c-2.208,0-4-1.792-4-4V8c0-2.208,1.792-4,4-4Z"
          fill="#092050"
        ></path>
        <path
          d="M25,4h6V28h-6c-2.208,0-4-1.792-4-4V8c0-2.208,1.792-4,4-4Z"
          transform="rotate(180 26 16)"
          fill="#be2a2c"
        ></path>
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

export default IconFrance;
