import React from 'react';

/**
 * PiUserTwoStroke icon from the stroke style in users category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiUserTwoStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'user-two icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.395 21h.105a2 2 0 0 0 2-2 4 4 0 0 0-2.735-3.796M16.404 3.481a4 4 0 0 1 0 7.037M13.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM6 15h7a4 4 0 0 1 4 4 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 4 4 0 0 1 4-4Z" fill="none"/>
    </svg>
  );
}
