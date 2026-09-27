import React from 'react';
import { LayoutGrid, Banknote, Receipt, Wallet, BarChart3, MoreHorizontal, Users } from 'lucide-react';
import { TabType, UserRole } from '../types';

interface BottomNavBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  currentUserRole?: UserRole;
  isAdmin?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  currentUserRole,
  isAdmin = true,
}) => {
  const isStaff = !isAdmin || currentUserRole === 'staff';

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutGrid className="w-5 h-5" />,
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: <Banknote className="w-5 h-5" />,
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'cashbook',
      label: 'Cashbook',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'more',
      label: isStaff ? 'Customers' : 'Settings',
      icon: isStaff ? <Users className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-[#c4c5d5]/80 flex justify-between items-center h-15 sm:h-16 px-1 shadow-[0px_-2px_10px_rgba(0,0,0,0.05)]"
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            onClick={() => onTabChange(item.id)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer py-1 px-0.5 ${
              isActive
                ? 'bg-[#00288e] text-white rounded-xl shadow-xs'
                : 'text-[#475569] hover:bg-slate-100 rounded-xl active:scale-95'
            }`}
          >
            <div className="flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <span
              className={`font-mono text-[9px] sm:text-[10px] tracking-tight leading-none mt-1 whitespace-nowrap truncate max-w-full ${
                isActive ? 'text-white font-semibold' : 'text-[#475569]'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
