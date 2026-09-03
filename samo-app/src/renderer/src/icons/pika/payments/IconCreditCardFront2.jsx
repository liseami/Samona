/**
 * [INPUT]: 依赖 react; 消费父级 size 与透传 SVG props
 * [OUTPUT]: 对外提供 IconCreditCardFront2 通用信用卡正面 SVG 组件
 * [POS]: shared/pika-icons/payments 的通用信用卡图标，供支付方式/账单 UI 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React from 'react';

export default function IconCreditCardFront2({ size = '32px', ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" {...props}>
      <g className="nc-icon-wrapper">
        <rect x="2" y="7" width="28" height="18" rx="3" ry="3" fill="#1a1a1a" strokeWidth="0"></rect>
        <path d="m27,7H5c-1.657,0-3,1.343-3,3v12c0,1.657,1.343,3,3,3h22c1.657,0,3-1.343,3-3v-12c0-1.657-1.343-3-3-3Zm2,15c0,1.103-.897,2-2,2H5c-1.103,0-2-.897-2-2v-12c0-1.103.897-2,2-2h22c1.103,0,2,.897,2,2v12Z" isolation="isolate" opacity=".15" strokeWidth="0"></path>
        <path d="m27,8H5c-1.105,0-2,.895-2,2v1c0-1.105.895-2,2-2h22c1.105,0,2,.895,2,2v-1c0-1.105-.895-2-2-2Z" fill="#fff" isolation="isolate" opacity=".2" strokeWidth="0"></path>
        <rect x="5" y="11" width="6" height="5" rx="1.5" ry="1.5" fill="#edab40" strokeWidth="0"></rect>
        <path d="m9,20h-3.25c-.4141,0-.75-.3359-.75-.75s.3359-.75.75-.75h3.25c.4141,0,.75.3359.75.75s-.3359.75-.75.75Z" fill="#90928f" strokeWidth="0"></path>
        <path d="m14.75,20h-3.25c-.4141,0-.75-.3359-.75-.75s.3359-.75.75-.75h3.25c.4141,0,.75.3359.75.75s-.3359.75-.75.75Z" fill="#90928f" strokeWidth="0"></path>
        <path d="m20.5,20h-3.25c-.4141,0-.75-.3359-.75-.75s.3359-.75.75-.75h3.25c.4141,0,.75.3359.75.75s-.3359.75-.75.75Z" fill="#90928f" strokeWidth="0"></path>
        <path d="m26.25,20h-3.25c-.4141,0-.75-.3359-.75-.75s.3359-.75.75-.75h3.25c.4141,0,.75.3359.75.75s-.3359.75-.75.75Z" fill="#90928f" strokeWidth="0"></path>
      </g>
    </svg>
  );
}
