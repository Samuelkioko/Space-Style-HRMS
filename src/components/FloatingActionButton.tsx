import React from 'react';
import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
}

export const FloatingActionButton: React.FC<FABProps> = ({ onClick }) => {
  return (
    <div className="fixed bottom-20 right-4 md:right-10 md:bottom-8 z-40">
      <button
        id="main-floating-action-btn"
        onClick={onClick}
        className="w-14 h-14 bg-[#00288e] text-white rounded-full shadow-xl flex items-center justify-center hover:bg-[#1e40af] hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#00288e]/30 cursor-pointer"
        aria-label="Add Transaction"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>
  );
};
