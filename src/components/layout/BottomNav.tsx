import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PieChart, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollDirection } from '@/hooks/useScrollDirection';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  iconFilled?: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: PieChart,
  },
  {
    name: 'Transacciones',
    path: '/transacciones',
    icon: List,
  },
];

interface BottomNavProps {
  onAddClick: () => void;
}

/**
 * Fixed bottom navigation bar for mobile/tablet devices.
 * Features:
 * - Auto-hides on scroll down
 * - Shows on scroll up
 * - Always visible when at top of page
 * - Prominent FAB-style add button
 * - Active state indicators
 */
export function BottomNav({ onAddClick }: BottomNavProps) {
  const location = useLocation();
  const { direction, isAtTop } = useScrollDirection({
    threshold: 15,
    topThreshold: 50,
  });

  // Hide navigation when scrolling down (unless at top)
  const isHidden = direction === 'down' && !isAtTop;

  return (
    <nav
      className={cn(
        // Base styles
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white/95 dark:bg-card/95 backdrop-blur-md',
        'border-t border-border/50',
        'shadow-lg shadow-black/5 dark:shadow-black/20',
        // Safe area for notched devices
        'pb-safe-bottom',
        // Transition for smooth show/hide
        'transition-transform duration-300 ease-out',
        // Hide on large screens
        'lg:hidden',
        // Transform based on visibility
        isHidden ? 'translate-y-full' : 'translate-y-0'
      )}
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-end h-16 max-w-md mx-auto">
        {/* Left nav */}
        <NavLink item={NAV_ITEMS[0]} isActive={location.pathname === NAV_ITEMS[0].path} />

        {/* Center FAB */}
        <div className="flex items-center justify-center px-6 -mt-4">
          <button
            onClick={onAddClick}
            className={cn(
              'w-14 h-14 rounded-full',
              'bg-primary text-primary-foreground',
              'shadow-[0_10px_28px_-8px_hsl(var(--primary)/0.55)]',
              'flex items-center justify-center',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'active:scale-95 transition-transform duration-150',
              'ring-1 ring-primary/30'
            )}
            aria-label="Agregar transacción"
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        </div>

        {/* Right nav */}
        <NavLink item={NAV_ITEMS[1]} isActive={location.pathname === NAV_ITEMS[1].path} />
      </div>
    </nav>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
}

function NavLink({ item, isActive }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className={cn(
        // Base layout
        'flex flex-col items-center justify-center',
        'min-w-[48px] min-h-[48px] px-3 py-2',
        // Touch target sizing
        'touch-manipulation',
        // Transition
        'transition-all duration-200',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <div
        className={cn(
          'relative flex items-center justify-center',
          'w-10 h-7 rounded-full',
          'transition-colors duration-200',
          isActive && 'bg-primary/10'
        )}
      >
        <Icon
          className={cn(
            'w-5 h-5 transition-transform duration-200',
            isActive && 'scale-110'
          )}
        />
        {isActive && (
          <span
            className={cn(
              'absolute -bottom-1 left-1/2 -translate-x-1/2',
              'w-1 h-1 rounded-full bg-primary',
              'animate-in fade-in zoom-in duration-200'
            )}
          />
        )}
      </div>
      <span
        className={cn(
          'text-[11px] font-medium mt-0.5',
          'transition-all duration-200',
          isActive && 'font-semibold'
        )}
      >
        {item.name}
      </span>
    </Link>
  );
}

export default BottomNav;
