import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PieChart, List, Settings, Plus } from 'lucide-react';
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
  {
    name: 'Admin',
    path: '/administracion',
    icon: Settings,
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
      <div className="flex items-end justify-around px-2 h-16">
        {/* Left nav items */}
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
        ))}

        {/* Center FAB Button */}
        <div className="relative -mt-4">
          <button
            onClick={onAddClick}
            className={cn(
              // Size and shape
              'w-14 h-14 rounded-full',
              // Gradient background
              'bg-gradient-to-br from-theme-green to-theme-sage',
              // Shadow and glow
              'shadow-lg shadow-green-300/40 dark:shadow-green-900/30',
              // Flex centering
              'flex items-center justify-center',
              // Focus and interaction states
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-green focus-visible:ring-offset-2',
              'active:scale-95 transition-transform duration-150',
              // Subtle border
              'border-2 border-white/30 dark:border-white/10'
            )}
            aria-label="Agregar transacción"
          >
            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Right nav item */}
        <NavLink item={NAV_ITEMS[2]} isActive={location.pathname === NAV_ITEMS[2].path} />

        {/* Placeholder for symmetry (empty space) */}
        <div className="w-12" />
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
        // Active/inactive styles
        isActive
          ? 'text-theme-green'
          : 'text-muted-foreground hover:text-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Icon container with subtle background on active */}
      <div
        className={cn(
          'relative flex items-center justify-center',
          'w-10 h-7 rounded-full',
          'transition-all duration-200',
          isActive && 'bg-theme-green/10'
        )}
      >
        <Icon
          className={cn(
            'w-5 h-5 transition-transform duration-200',
            isActive && 'scale-110'
          )}
        />
        {/* Active indicator dot */}
        {isActive && (
          <span
            className={cn(
              'absolute -bottom-1 left-1/2 -translate-x-1/2',
              'w-1 h-1 rounded-full',
              'bg-theme-green',
              'animate-in fade-in zoom-in duration-200'
            )}
          />
        )}
      </div>
      {/* Label */}
      <span
        className={cn(
          'text-[10px] font-medium mt-0.5',
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
