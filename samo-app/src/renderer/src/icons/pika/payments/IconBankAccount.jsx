/**
 * [INPUT]: 依赖 react; 消费父级 size 与透传 SVG props
 * [OUTPUT]: 对外提供 IconBankAccount 银行账户 SVG 组件
 * [POS]: shared/pika-icons/payments 的银行账户图标，供支付方式/账单 UI 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React from 'react';

export default function IconBankAccount({ size = '32px', ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" {...props}>
      <g className="nc-icon-wrapper">
        <rect x="2" y="7" width="28" height="18" rx="3" ry="3" fill="#e6e6e6" strokeWidth="0"></rect>
        <path d="m27,7H5c-1.657,0-3,1.343-3,3v12c0,1.657,1.343,3,3,3h22c1.657,0,3-1.343,3-3v-12c0-1.657-1.343-3-3-3Zm2,15c0,1.103-.897,2-2,2H5c-1.103,0-2-.897-2-2v-12c0-1.103.897-2,2-2h22c1.103,0,2,.897,2,2v12Z" isolation="isolate" opacity=".15" strokeWidth="0"></path>
        <path d="m27,8H5c-1.105,0-2,.895-2,2v1c0-1.105.895-2,2-2h22c1.105,0,2,.895,2,2v-1c0-1.105-.895-2-2-2Z" fill="#fff" isolation="isolate" opacity=".2" strokeWidth="0"></path>
        <path d="m21.5,21h-11c-.2764,0-.5.2236-.5.5s.2236.5.5.5h11c.2764,0,.5-.2236.5-.5s-.2236-.5-.5-.5Z" fill="#1a1a1a" opacity=".5" strokeWidth="0"></path>
        <path d="m21.6694,13.6787l-4.8486-3.2324c-.499-.332-1.1426-.332-1.6416,0l-4.8491,3.2324c-.2661.1777-.3823.5029-.2896.8096.0928.3062.3701.5117.6899.5117h1.0195v4h-.75c-.2764,0-.5.2236-.5.5s.2236.5.5.5h10c.2764,0,.5-.2236.5-.5s-.2236-.5-.5-.5h-.75v-4h1.0195c.3198,0,.5972-.2056.6899-.5117.0928-.3066-.0234-.6318-.29-.8096Zm-7.4194,5.3213h-1.5v-4h1.5v4Zm2.5,0h-1.5v-4h1.5v4Zm-.75-5.5c-.4142,0-.75-.3358-.75-.75s.3358-.75.75-.75.75.3358.75.75-.3358.75-.75.75Zm3.25,5.5h-1.5v-4h1.5v4Z" fill="#1a1a1a" opacity=".5" strokeWidth="0"></path>
      </g>
    </svg>
  );
}
