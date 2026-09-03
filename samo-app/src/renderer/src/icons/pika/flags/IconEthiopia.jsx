/**
 * [INPUT]: 依赖 react; 消费父级 size 与透传 SVG props
 * [OUTPUT]: 对外提供 IconEthiopia 国旗 SVG 组件
 * [POS]: shared/pika-icons/flags 的埃塞俄比亚国旗 (am 语言)，供语言切换器 (SUPPORTED_LANGUAGES.flagIcon) 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { SVGProps } from "react";

function IconEthiopia({ size = "32px", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      {...props}
    >
      <g className="nc-icon-wrapper">
        {/* 黄 (中带, 作底) */}
        <path fill="#fcdd09" d="M1 8H31V24H1z"></path>
        {/* 绿 (上带) */}
        <path
          d="M5,4H27c2.208,0,4,1.792,4,4v4H1v-4c0-2.208,1.792-4,4-4Z"
          fill="#078930"
        ></path>
        {/* 红 (下带) */}
        <path
          d="M5,20H27c2.208,0,4,1.792,4,4v4H1v-4c0-2.208,1.792-4,4-4Z"
          transform="rotate(180 16 24)"
          fill="#da121a"
        ></path>
        {/* 蓝圆 */}
        <circle cx="16" cy="16" r="6.2" fill="#0f47af"></circle>
        {/* 金色五角星 */}
        <path
          fill="#fcdd09"
          d="M16,11.4 L17.08,14.52 L20.38,14.58 L17.74,16.57 L18.70,19.72 L16,17.83 L13.30,19.72 L14.26,16.57 L11.62,14.58 L14.92,14.52 Z"
        ></path>
        {/* 圆角描边阴影 (与其它国旗风格统一) */}
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

export default IconEthiopia;
