import { MagnifyingGlass, User, Waveform } from '@phosphor-icons/react'

function Topbar() {
  return (
    // NOTE: Phần topbar
    <header className="topbar">
      {/* NOTE: Phần logo bên trái */}
      <div className="brand-mark" aria-label="MusicWeb">
        <Waveform size={54} weight="bold" />
      </div>

      {/* NOTE: Phần thanh search ở giữa */}
      <label className="search-box">
        <MagnifyingGlass size={31} weight="bold" />
        <input type="search" placeholder="Search some song" />
      </label>

      {/* NOTE: Phần nút profile bên phải */}
      <button className="profile-button" type="button" aria-label="Profile">
        <User size={25} weight="bold" />
      </button>
    </header>
  )
}

export default Topbar
