import {
  CloudArrowUp,
  House,
  List,
  Playlist as PlaylistIcon,
  SquaresFour,
  User,
} from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '../i18n.jsx'

const navItems = [
  { path: '/', labelKey: 'nav.home', icon: House, end: true },
  { path: '/playlist', labelKey: 'nav.playlist', icon: PlaylistIcon },
  { path: '/category', labelKey: 'nav.category', icon: SquaresFour },
  { path: '/upload', labelKey: 'nav.upload', icon: CloudArrowUp },
  { path: '/profile', labelKey: 'nav.profile', icon: User },
]

function Sidebar({ isCollapsed, onToggle }) {
  const { t } = useLanguage()

  return (
    // NOTE: Phần sidebar menu bên trái
    <aside
      className={isCollapsed ? 'sidebar-panel sidebar-panel-collapsed' : 'sidebar-panel'}
      aria-label={t('nav.mainMenu')}
    >
      {/* NOTE: Phần nút Menu dùng để đóng/mở sidebar */}
      <button
        className="menu-title"
        type="button"
        aria-label={isCollapsed ? t('nav.openMenu') : t('nav.collapseMenu')}
        aria-expanded={!isCollapsed}
        onClick={onToggle}
      >
        <List size={26} weight="bold" />
        <span className="menu-label">{t('nav.menu')}</span>
      </button>

      {/* NOTE: Phần danh sách link điều hướng trong sidebar */}
      <nav className="side-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const label = t(item.labelKey)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              aria-label={label}
              className={({ isActive }) =>
                isActive ? 'side-link side-link-active' : 'side-link'
              }
            >
              <Icon size={24} weight="bold" />
              <span className="side-link-label">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
