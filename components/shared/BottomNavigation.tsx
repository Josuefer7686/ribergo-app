'use client';

import { useAppStore } from '@/store/useAppStore';
import { haptics } from '@/utils/haptics';
import { Home, Clock, MessageSquare, User, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

export function BottomNavigation() {
  const { role, activeTab, setActiveTab } = useAppStore();

  const passengerTabs = [
    { id: 'HOME', label: 'Inicio', icon: Home },
    { id: 'TRIPS', label: 'Viajes', icon: Clock },
    { id: 'MESSAGES', label: 'Mensajes', icon: MessageSquare },
    { id: 'PROFILE', label: 'Perfil', icon: User },
  ] as const;

  const driverTabs = [
    { id: 'HOME', label: 'Inicio', icon: Home },
    { id: 'TRIPS', label: 'Viajes', icon: Clock },
    { id: 'INCOME', label: 'Ingresos', icon: DollarSign },
    { id: 'PROFILE', label: 'Perfil', icon: User },
  ] as const;

  const tabs = role === 'PASSENGER' ? passengerTabs : driverTabs;

  return (
    <div className="w-full relative shrink-0 bg-surface/75 border-t border-white/10 backdrop-blur-2xl pb-safe pt-2.5 px-4 flex items-center justify-around z-40 shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => {
              haptics.selection();
              setActiveTab(tab.id as any);
            }}
            className="flex flex-col items-center gap-1 py-1 px-3 relative group transition active:scale-90"
          >
            <Icon 
              className={`w-5 h-5 transition-colors ${isActive ? 'text-gold-primary' : 'text-text-secondary group-hover:text-white'}`} 
            />
            <span className={`text-[10px] font-bold tracking-tight transition-colors ${isActive ? 'text-gold-primary' : 'text-text-secondary group-hover:text-white'}`}>
              {tab.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="active-tab-glow"
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="absolute -bottom-1.5 w-6 h-1 rounded-full bg-gold-primary shadow-sm shadow-gold-primary"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
