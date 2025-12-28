import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { User, Edit, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const MotionDiv = motion.div as any;

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  if (!user) return null;

  const profilePicture = user.metadata?.profile_picture || `https://ui-avatars.com/api/?name=${user.name}&background=random`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 cursor-pointer focus:outline-none"
      >
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
        </div>
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage src={profilePicture} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </button>

      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 bg-card rounded-md shadow-lg py-1 z-50 border border-border"
          >
            {/* Mobile User Info */}
            <div className="px-4 py-3 border-b border-border md:hidden">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
            </div>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer'
              )}
            >
              <User className="mr-3 h-4 w-4" /> Profile
            </Link>
            <Link
              href="/update-password"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer'
              )}
            >
              <Edit className="mr-3 h-4 w-4" /> Update Password
            </Link>
            <div className="border-t border-border my-1"></div>
            <button
              onClick={logout}
              className={cn(
                'flex items-center w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer'
              )}
            >
              <LogOut className="mr-3 h-4 w-4" /> Logout
            </button>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
