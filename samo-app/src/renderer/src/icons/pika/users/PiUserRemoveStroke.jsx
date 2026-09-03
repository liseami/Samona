import React from 'react';

/**
 * PiUserRemoveStroke icon from the stroke style in users category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiUserRemoveStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'user-remove icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 21H6a2 2 0 0 1-2-2 4 4 0 0 1 4-4h3m4 0h6m-5-8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" fill="none"/>
    </svg>
  );
}
