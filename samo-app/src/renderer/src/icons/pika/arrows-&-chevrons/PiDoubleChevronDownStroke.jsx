import React from 'react';

/**
 * PiDoubleChevronDownStroke icon from the stroke style in arrows-&-chevrons category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiDoubleChevronDownStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'double-chevron-down icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 13a20.4 20.4 0 0 0 3.702 3.894c.175.141.42.141.596 0A20.4 20.4 0 0 0 16 13M8 7a20.4 20.4 0 0 0 3.702 3.894c.175.141.42.141.596 0A20.4 20.4 0 0 0 16 7" fill="none"/>
    </svg>
  );
}
