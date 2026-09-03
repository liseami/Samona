import React from 'react';

/**
 * PiGoogleStroke icon from the stroke style in apps-&-social category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiGoogleStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'google icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.054 4.518A9.4 9.4 0 0 0 12.69 2.85c-5.147 0-9.44 3.931-9.44 9.15 0 5.053 4.183 9.1 9.44 9.1 5.364 0 8.807-4.126 8.546-9.1H12.69" fill="none"/>
    </svg>
  );
}
