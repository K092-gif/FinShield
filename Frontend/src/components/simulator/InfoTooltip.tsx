'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../ui/InfoTooltip.css';

interface InfoTooltipProps {
  title?: string;
  children: React.ReactNode;
  iconColor?: string;
  align?: 'left' | 'right';
  position?: 'top' | 'bottom';
}

interface Coords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  isTop: boolean;
}

export default function InfoTooltip({ 
  title, 
  children, 
  iconColor = 'var(--text-muted)', 
  align = 'left',
  position = 'bottom'
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // If trigger scrolled out of viewport, cleanly dismiss
    if (triggerRect.bottom < 15 || triggerRect.top > vh - 15) {
      setOpen(false);
      return;
    }

    // Responsive width strictly clamped to screen boundaries
    const popoverWidth = vw <= 640 
      ? Math.min(310, Math.max(200, vw - 24))
      : Math.min(320, Math.max(260, vw - 32));

    // Horizontal placement with viewport edge clamping
    let left: number;
    if (vw <= 640) {
      // On mobile, center on the trigger icon
      left = triggerRect.left + (triggerRect.width / 2) - (popoverWidth / 2);
    } else {
      // On desktop, respect align prop
      if (align === 'right') {
        left = triggerRect.right - popoverWidth;
      } else {
        left = triggerRect.left;
      }
    }

    // STRICT CLAMPING: Guarantee at least 12px margin on both left and right screen edges
    const minLeft = 12;
    const maxLeft = Math.max(12, vw - popoverWidth - 12);
    left = Math.max(minLeft, Math.min(left, maxLeft));

    // Vertical placement with auto-flip
    const spaceBelow = vh - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    let isTop = position === 'top';

    // Auto-flip if tight on space
    if (!isTop && spaceBelow < 180 && spaceAbove > spaceBelow) {
      isTop = true;
    } else if (isTop && spaceAbove < 180 && spaceBelow > spaceAbove) {
      isTop = false;
    }

    const availableHeight = isTop ? spaceAbove - 24 : spaceBelow - 24;
    const maxHeight = Math.max(120, Math.min(460, availableHeight));

    if (isTop) {
      setCoords({
        bottom: vh - triggerRect.top + 8,
        left,
        width: popoverWidth,
        maxHeight,
        isTop: true
      });
    } else {
      setCoords({
        top: triggerRect.bottom + 8,
        left,
        width: popoverWidth,
        maxHeight,
        isTop: false
      });
    }
  }, [align, position]);

  // Post-render safety adjustment: measure real DOM rect to guarantee zero overflow
  useEffect(() => {
    if (!open || !popoverRef.current) return;
    const pop = popoverRef.current;
    const rect = pop.getBoundingClientRect();
    const vw = window.innerWidth;

    if (rect.right > vw - 12) {
      const shift = rect.right - (vw - 12);
      const curLeft = parseFloat(pop.style.left || `${coords?.left || 12}`);
      pop.style.left = `${Math.max(12, curLeft - shift)}px`;
    }
    if (rect.left < 12) {
      pop.style.left = '12px';
    }
  }, [open, coords]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current && 
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, updatePosition]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  return (
    <div 
      className={`info-tooltip-wrapper ${open ? 'open' : ''}`}
      ref={triggerRef} 
      onClick={toggleOpen}
      onMouseEnter={() => {
        if (typeof window !== 'undefined' && window.innerWidth > 768) {
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (typeof window !== 'undefined' && window.innerWidth > 768) {
          setOpen(false);
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={title || "ข้อมูลเพิ่มเติม"}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen((prev) => !prev);
        }
      }}
    >
      <i className='fi fi-sr-info info-icon-btn' style={{ color: iconColor }}></i>

      {open && mounted && coords && typeof document !== 'undefined' && createPortal(
        <div 
          ref={popoverRef}
          className={`info-tooltip-popover ${coords.isTop ? 'info-tooltip-top' : 'info-tooltip-bottom'}`} 
          style={{
            position: 'fixed',
            top: coords.isTop ? 'auto' : `${coords.top}px`,
            bottom: coords.isTop ? `${coords.bottom}px` : 'auto',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxWidth: `calc(100vw - 24px)`,
            maxHeight: `${coords.maxHeight}px`,
            overflowY: 'auto',
            zIndex: 9999999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {title && <div className='info-tooltip-title'>{title}</div>}
          <div className='info-tooltip-content'>{children}</div>
        </div>,
        document.body
      )}
    </div>
  );
}

