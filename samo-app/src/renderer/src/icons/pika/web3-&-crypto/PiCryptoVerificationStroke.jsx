import React from 'react';

/**
 * PiCryptoVerificationStroke icon from the stroke style in web3-&-crypto category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiCryptoVerificationStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'crypto-verification icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.5 12.666 2.341 2.339C11.99 12.997 13.593 11.302 15.5 10m-.392-6.273 2.6 1.444c1.198.666 1.797.999 2.234 1.472a4 4 0 0 1 .856 1.456c.202.61.202 1.296.202 2.667v2.468c0 1.37 0 2.056-.202 2.667a4 4 0 0 1-.856 1.456c-.437.473-1.036.806-2.234 1.472l-2.6 1.444c-1.134.63-1.702.946-2.302 1.07a4.05 4.05 0 0 1-1.612 0c-.6-.124-1.168-.44-2.302-1.07l-2.6-1.444c-1.198-.666-1.797-.999-2.233-1.472a4 4 0 0 1-.857-1.456C3 15.29 3 14.605 3 13.234v-2.468c0-1.37 0-2.056.202-2.667a4 4 0 0 1 .857-1.456c.436-.473 1.035-.806 2.233-1.472l2.6-1.444c1.134-.63 1.702-.946 2.302-1.07a4 4 0 0 1 1.612 0c.6.124 1.168.44 2.302 1.07Z" fill="none"/>
    </svg>
  );
}
