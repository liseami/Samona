import React from 'react';

/**
 * PiWalletconnectStroke icon from the stroke style in apps-&-social category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiWalletconnectStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'walletconnect icon',
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
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: color || "currentColor"}}
      
      role="img"
      aria-label={ariaLabel}
      {...props}
    >
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.769 8.846A8.23 8.23 0 0 1 12 6a8.23 8.23 0 0 1 6.231 2.846M2 12.111l5 5.625 5-5.625 5 5.625 5-5.625" fill="none"/>
    </svg>
  );
}
