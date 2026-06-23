import { SquaresFour } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import CardCategory from "../components/card_category.jsx";
import LoadingState from "../components/loading_state.jsx";
import { localizeCategory, useLanguage } from "../i18n.jsx";
import "../styles/category.css";

function Category({ categories = [], isLoading = false, error = "" }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const localizedCategories = categories.map((category) =>
    localizeCategory(category, t),
  );

  if (isLoading) {
    return (
      <section className="page-section category-page page-loading-page">
        <LoadingState
          title={t("common.waitingTitle")}
          description={t("common.waitingMusicDescription")}
          quiet
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-section category-page page-loading-page">
        <LoadingState
          title={t("common.musicLoadErrorTitle")}
          description={error}
          variant="error"
        />
      </section>
    );
  }

  return (
    <section className="page-section category-page">
      {/* NOTE: Header trang Category */}
      <div className="category-panel-heading">
        <div>
          <h2>{t("categoryPage.title")}</h2>
        </div>

        <span className="category-panel-badge">
          <SquaresFour size={17} weight="fill" />
          {categories.length} {t("common.categories")}
        </span>
      </div>

      {/* NOTE: Danh sách card thể loại nhạc */}
      <div className="category-grid">
        {localizedCategories.map((category) => (
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
  );
}

export default Category;
