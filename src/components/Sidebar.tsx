import { 
  LayoutDashboard, 
  Brain, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Gamepad2,
  LogOut,
  User,
  Settings as SettingsIcon
} from 'lucide-react';
import type { User as UserType } from '../App';

type SidebarProps = {
  currentPage: string;
  onNavigate: (page: 'dashboard' | 'recording' | 'study' | 'progress' | 'calendar' | 'games' | 'settings') => void;
  onLogout: () => void;
  user: UserType;
};

export function Sidebar({ currentPage, onNavigate, onLogout, user }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'games', label: 'Memory Games', icon: Gamepad2 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">NeuroLearn</h2>
            <p className="text-xs text-gray-500">EEG Learning</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-xl">
            {user.avatar || <User className="w-6 h-6 text-white" />}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500">Student</p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}