import { SquaresFour } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import CardCategory from '../components/card_category.jsx'
import { categories } from '../datas/categoryData.js'
import '../styles/category.css'

function Category() {
  const navigate = useNavigate()

  return (
    <section className="page-section category-page">
      {/* NOTE: Header trang Category */}
      <div className="category-panel-heading">
        <div>
          <h2>Category</h2>
          <p>Phân loại bài hát theo thể loại nhạc để nghe nhanh hơn.</p>
        </div>

        <span className="category-panel-badge">
          <SquaresFour size={17} weight="fill" />
          {categories.length} thể loại
        </span>
      </div>

      {/* NOTE: Danh sách card thể loại nhạc */}
      <div className="category-grid">
        {categories.map((category) => (
          <CardCategory
            key={category.id}
            title={category.title}
            description={category.description}
            cover={category.cover}
            songCount={category.songCount}
            tone={category.tone}
            onClick={() => navigate(`/category/${category.id}`)}
          />
        ))}
      </div>
    </section>
  )
}

export default Category
