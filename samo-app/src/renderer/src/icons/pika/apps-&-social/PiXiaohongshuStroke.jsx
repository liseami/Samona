import React from 'react';

/**
 * PiXiaohongshuStroke icon - 小红书 logo (红色圆角方块 + 白色"小红书"字样)
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - 圆角方块底色 (默认小红书品牌红 #FF2442)
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiXiaohongshuStroke({
  size = 24,
  color,
  className,
  ariaLabel = 'xiaohongshu icon',
  ...props
}) {
  const fill = color || '#FF2442';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={ariaLabel}
      {...props}
    >
      <rect x="1" y="1" width="22" height="22" rx="5" fill={fill} />
      <text
        x="12"
        y="12"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fontSize="6.2"
        fontFamily="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
        fontWeight="900"
        letterSpacing="-0.3"
      >
        小红书
      </text>
    </svg>
  );
}
