import React from 'react';

/**
 * PiEqualsCancelStroke icon from the stroke style in maths category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiEqualsCancelStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'equals-cancel icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.333 9 19 3m-4.667 6H5m9.333 0-4.666 6M15 15h4m-.02-6H19M5 21l4.667-6m0 0H5" fill="none"/>
    </svg>
  );
}
