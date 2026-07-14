
'use client';
import { useState, useRef, useEffect } from 'react';
import '../ui/InfoTooltip.css';

export default function InfoTooltip({ title, children, iconColor = 'var(--text-muted)', align = 'left' }: { title?: string, children: React.ReactNode, iconColor?: string, align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    else document.removeEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className='info-tooltip-wrapper' ref={ref} onClick={(e) => { e.preventDefault(); setOpen(!open); }}>
      <i className='fi fi-sr-info info-icon-btn' style={{ color: iconColor }}></i>
      {open && (
        <div className={`info-tooltip-popover info-tooltip-${align}`} onClick={(e) => e.stopPropagation()}>
          {title && <div className='info-tooltip-title'>{title}</div>}
          <div className='info-tooltip-content'>{children}</div>
        </div>
      )}
    </div>
  );
}
