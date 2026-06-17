import {
  CloudArrowUp,
  House,
  List,
  Playlist as PlaylistIcon,
  SquaresFour,
  User,
} from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Home', icon: House, end: true },
  { path: '/playlist', label: 'Playlist', icon: PlaylistIcon },
  { path: '/category', label: 'Category', icon: SquaresFour },
  { path: '/upload', label: 'Upload', icon: CloudArrowUp },
  { path: '/profile', label: 'Profile', icon: User },
]

function Sidebar({ isCollapsed, onToggle }) {
  return (
    // NOTE: Phần sidebar menu bên trái
    <aside
      className={isCollapsed ? 'sidebar-panel sidebar-panel-collapsed' : 'sidebar-panel'}
      aria-label="Main menu"
    >
      {/* NOTE: Phần nút Menu dùng để đóng/mở sidebar */}
      <button
        className="menu-title"
        type="button"
        aria-label={isCollapsed ? 'Open menu' : 'Collapse menu'}
        aria-expanded={!isCollapsed}
        onClick={onToggle}
      >
        <List size={26} weight="bold" />
        <span className="menu-label">Menu</span>
      </button>

      {/* NOTE: Phần danh sách link điều hướng trong sidebar */}
      <nav className="side-nav">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) =>
                isActive ? 'side-link side-link-active' : 'side-link'
              }
            >
              <Icon size={24} weight="bold" />
              <span className="side-link-label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
