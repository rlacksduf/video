import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Home({ onSelectVideo, onSelectImage }) {
  const [videos, setVideos] = useState([]);
  const [images, setImages] = useState([]);

  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadingImages, setLoadingImages] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState("latest");

  const categories = [
    "전체",
    "게임",
    "음악",
    "스포츠",
    "교육",
    "브이로그",
    "엔터테인먼트",
    "뉴스",
    "기타",
  ];

  useEffect(() => {
    loadVideos();
  }, [category, sort]);

  useEffect(() => {
    loadImages();
  }, []);

  const loadVideos = async () => {
    setLoadingVideos(true);

    let query = supabase.from("videos").select("*").eq("status", "published");

    if (category !== "전체") {
      query = query.eq("category", category);
    }

    if (sort === "latest") {
      query = query.order("created_at", {
        ascending: false,
      });
    }

    if (sort === "popular") {
      query = query.order("likes_count", {
        ascending: false,
      });
    }

    if (sort === "views") {
      query = query.order("views", {
        ascending: false,
      });
    }

    const { data, error } = await query.limit(12);

    if (error) {
      console.error("영상 조회 오류:", error);
      setVideos([]);
    } else {
      setVideos(data || []);
    }

    setLoadingVideos(false);
  };

  const loadImages = async () => {
    setLoadingImages(true);

    const { data, error } = await supabase
      .from("image_posts")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(8);

    if (error) {
      console.error("이미지 조회 오류:", error);
      setImages([]);
    } else {
      setImages(data || []);
    }

    setLoadingImages(false);
  };

  const filteredVideos = videos.filter((video) => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return true;

    const title = video.title?.toLowerCase() || "";

    const description = video.description?.toLowerCase() || "";

    const tags = Array.isArray(video.tags)
      ? video.tags.join(" ").toLowerCase()
      : "";

    return (
      title.includes(keyword) ||
      description.includes(keyword) ||
      tags.includes(keyword)
    );
  });

  return (
    <div className="xten-home-final">
      {/* HERO */}
      <section className="xten-home-final-hero">
        <div>
          <span>XTEN</span>

          <h1>
            콘텐츠를
            <br />
            찾아보세요<span>.</span>
          </h1>

          <p>영상과 이미지를 한곳에서 둘러보세요.</p>
        </div>
      </section>

      {/* SEARCH */}
      <section className="xten-home-final-search">
        <div className="xten-home-final-search-inner">
          <span>⌕</span>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="영상 검색"
          />

          {search && (
            <button type="button" onClick={() => setSearch("")}>
              ×
            </button>
          )}
        </div>
      </section>

      {/* CATEGORY */}
      <section className="xten-home-final-categories">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </section>

      {/* VIDEO SECTION */}
      <section className="xten-home-final-section">
        <div className="xten-home-final-section-head">
          <div>
            <span>VIDEO</span>
            <h2>영상</h2>
          </div>

          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="latest">최신순</option>

            <option value="popular">인기순</option>

            <option value="views">조회수순</option>
          </select>
        </div>

        {loadingVideos ? (
          <div className="xten-home-final-loading">
            <div className="xten-spinner" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="xten-home-final-empty">영상이 없습니다.</div>
        ) : (
          <div className="xten-home-final-video-grid">
            {filteredVideos.map((video) => (
              <article
                key={video.id}
                className="xten-home-final-video-card"
                onClick={() => onSelectVideo(video.id)}
              >
                <div className="xten-home-final-video-thumb">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} />
                  ) : (
                    <div>▶</div>
                  )}
                </div>

                <div className="xten-home-final-video-info">
                  <span>{video.category}</span>

                  <h3>{video.title}</h3>

                  <p>
                    조회수 {video.views || 0}
                    {" · "}
                    좋아요 {video.likes_count || 0}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* IMAGE SECTION */}
      <section className="xten-home-final-section xten-home-final-images">
        <div className="xten-home-final-section-head">
          <div>
            <span>IMAGE</span>
            <h2>이미지</h2>
          </div>

          <span className="xten-home-final-count">{images.length}개</span>
        </div>

        {loadingImages ? (
          <div className="xten-home-final-loading">
            <div className="xten-spinner" />
          </div>
        ) : images.length === 0 ? (
          <div className="xten-home-final-empty">이미지가 없습니다.</div>
        ) : (
          <div className="xten-home-final-image-grid">
            {images.map((image) => {
              const imageUrl = image.image_url || image.url || image.imageUrl;

              return (
                <article
                  key={image.id}
                  className="xten-home-final-image-card"
                  onClick={() => onSelectImage(image.id)}
                >
                  <div className="xten-home-final-image-thumb">
                    {imageUrl ? (
                      <img src={imageUrl} alt={image.title || "이미지"} />
                    ) : (
                      <div>IMAGE</div>
                    )}
                  </div>

                  <div className="xten-home-final-image-info">
                    <h3>{image.title || "제목 없음"}</h3>

                    {image.description && <p>{image.description}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
