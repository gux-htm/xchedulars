import React, { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Home, Users, Book, Calendar, Settings, Menu, X, Send, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ProfileDropdown from './ProfileDropdown';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';
import { cn } from '@/lib/utils';
import { pageVariants, slideInLeft } from '@/lib/animations';
import { useSounds } from '@/hooks/useSounds';

const MotionAside = motion.aside as any;
const MotionDiv = motion.div as any;
const MotionMain = motion.main as any;

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAdmin, isInstructor } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { sounds } = useSounds();

  if (!user) {
    return <>{children}</>;
  }

  const adminLinks = [
    { href: '/admin/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/admin/programs', icon: Book, label: 'Programs' },
    { href: '/admin/courses', icon: Book, label: 'Courses' },
    { href: '/admin/instructors', icon: Users, label: 'Instructors' },
    { href: '/admin/rooms', icon: Home, label: 'Rooms' },
    { href: '/admin/timetable', icon: Calendar, label: 'Timetable' },
    { href: '/admin/exams', icon: Calendar, label: 'Exams' },
    { href: '/admin/approvals', icon: Users, label: 'Approvals' },
    { href: '/admin/CourseRequests', icon: Send, label: 'Request' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const instructorLinks = [
    { href: '/instructor/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/instructor/requests', icon: Book, label: 'Course Requests' },
    { href: '/instructor/timetable', icon: Calendar, label: 'My Timetable' },
  ];

  const studentLinks = [
    { href: '/student/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/student/timetable', icon: Calendar, label: 'Timetable' },
    { href: '/student/exams', icon: Calendar, label: 'Exams' },
  ];

  const links = isAdmin ? adminLinks : isInstructor ? instructorLinks : studentLinks;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <nav className="bg-card shadow-md fixed w-full z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                sounds.toggle();
                setSidebarOpen(!sidebarOpen);
              }}
              className="text-foreground hover:text-primary transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-2xl font-bold text-primary flex items-center"><GraduationCap className="mr-2" /> Xchedular</h1>
          </div>
          <div className="flex items-center space-x-4">
            <SoundToggle />
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <MotionAside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="fixed left-0 w-64 h-full bg-card shadow-lg overflow-y-auto"
            >
              <nav className="p-4 space-y-2">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = router.pathname === link.href;

                  return (
                    <MotionDiv
                      key={link.href}
                      whileHover={{ x: 5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      onHoverStart={() => sounds.hover()}
                    >
                      <Link
                        href={link.href}
                        onClick={() => sounds.click()}
                        className={cn(
                          'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'text-foreground hover:bg-muted hover:shadow-md'
                        )}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{link.label}</span>
                      </Link>
                    </MotionDiv>
                  );
                })}
              </nav>
            </MotionAside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <MotionMain
          className={cn(
            'flex-1 transition-all duration-300',
            sidebarOpen ? 'ml-64' : 'ml-0'
          )}
          initial="initial"
          animate="animate"
          variants={pageVariants}
        >
          <div className="p-6">{children}</div>
        </MotionMain>
      </div>
    </div>
  );
};

export default Layout;
