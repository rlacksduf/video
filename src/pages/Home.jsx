import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Home({ onSelectVideo }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [category, setCategory] = useState("전체");

  const [searchHistory, setSearchHistory] = useState([]);

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
    loadSearchHistory();
  }, [sort, category]);

  // =========================
  // 영상 불러오기
  // =========================
  const loadVideos = async () => {
    setLoading(true);

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

    const { data, error } = await query;

    if (error) {
      console.error("영상 조회 오류:", error);
      setVideos([]);
    } else {
      setVideos(data || []);
    }

    setLoading(false);
  };

  // =========================
  // 검색 기록 불러오기
  // =========================
  const loadSearchHistory = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("search_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(10);

    if (error) {
      console.error("검색 기록 조회 오류:", error);
      return;
    }

    setSearchHistory(data || []);
  };

  // =========================
  // 검색 실행
  // =========================
  const handleSearch = async (keyword = search) => {
    const value = keyword.trim();

    if (!value) {
      return;
    }

    setSearch(value);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("search_history").insert({
        user_id: user.id,
        query: value,
      });

      if (error) {
        console.error("검색 기록 저장 오류:", error);
      } else {
        loadSearchHistory();
      }
    }
  };

  // Enter 검색
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 검색 기록 하나 클릭
  const handleHistoryClick = (query) => {
    setSearch(query);
  };

  // 검색 기록 전체 삭제
  const clearSearchHistory = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("search_history")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("검색 기록 삭제 오류:", error);
      return;
    }

    setSearchHistory([]);
  };

  // 검색 기록에서 중복 제거
  const uniqueHistory = [
    ...new Map(searchHistory.map((item) => [item.query, item])).values(),
  ];

  // =========================
  // 검색 필터
  // =========================
  const filteredVideos = videos.filter((video) => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

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
    <div>
      <h1>영상 탐색</h1>

      {/* =========================
          검색
      ========================= */}
      <div style={styles.searchArea}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="영상 제목, 설명, 태그 검색"
          style={styles.searchInput}
        />

        <button onClick={() => handleSearch()} style={styles.searchButton}>
          검색
        </button>
      </div>

      {/* =========================
          검색 기록
      ========================= */}
      {uniqueHistory.length > 0 && (
        <div style={styles.historyBox}>
          <div style={styles.historyHeader}>
            <strong>최근 검색</strong>

            <button onClick={clearSearchHistory} style={styles.clearButton}>
              전체 삭제
            </button>
          </div>

          <div style={styles.historyList}>
            {uniqueHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => handleHistoryClick(item.query)}
                style={styles.historyItem}
              >
                🔍 {item.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =========================
          카테고리
      ========================= */}
      <div style={styles.categoryArea}>
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            style={{
              ...styles.categoryButton,
              ...(category === item ? styles.activeCategory : {}),
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {/* =========================
          정렬
      ========================= */}
      <div style={styles.sortArea}>
        <span>정렬:</span>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={styles.sortSelect}
        >
          <option value="latest">최신순</option>
          <option value="popular">인기순</option>
          <option value="views">조회수순</option>
        </select>
      </div>

      {/* =========================
          영상 목록
      ========================= */}
      {loading ? (
        <h2>영상 불러오는 중...</h2>
      ) : filteredVideos.length === 0 ? (
        <div style={styles.empty}>
          <h2>영상이 없습니다.</h2>
          <p>검색어나 카테고리를 바꿔보세요.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              style={styles.card}
              onClick={() => onSelectVideo(video.id)}
            >
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  style={styles.thumbnail}
                />
              ) : (
                <div style={styles.noThumbnail}>썸네일 없음</div>
              )}

              <div style={styles.info}>
                <h3 style={styles.title}>{video.title}</h3>

                <p style={styles.description}>
                  {video.description || "설명 없음"}
                </p>

                <p style={styles.meta}>
                  {video.category}
                  {" · "}
                  조회수 {video.views || 0}
                  {" · "}
                  👍 {video.likes_count || 0}
                </p>

                {video.tags?.length > 0 && (
                  <div style={styles.tags}>
                    {video.tags.map((tag) => (
                      <span key={tag} style={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  searchArea: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },

  searchInput: {
    flex: 1,
    padding: "13px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  searchButton: {
    border: "none",
    backgroundColor: "#111",
    color: "#fff",
    padding: "0 20px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  historyBox: {
    marginTop: "15px",
    padding: "15px",
    backgroundColor: "#fff",
    borderRadius: "10px",
    border: "1px solid #eee",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  clearButton: {
    border: "none",
    background: "transparent",
    color: "#888",
    cursor: "pointer",
    fontSize: "13px",
  },

  historyList: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "12px",
  },

  historyItem: {
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    padding: "7px 10px",
    borderRadius: "20px",
    cursor: "pointer",
  },

  categoryArea: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "20px",
  },

  categoryButton: {
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    padding: "8px 14px",
    borderRadius: "20px",
    cursor: "pointer",
  },

  activeCategory: {
    backgroundColor: "#111",
    color: "#fff",
    borderColor: "#111",
  },

  sortArea: {
    marginTop: "25px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  sortSelect: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px",
    marginTop: "25px",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
  },

  thumbnail: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    display: "block",
  },

  noThumbnail: {
    width: "100%",
    aspectRatio: "16 / 9",
    backgroundColor: "#ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#777",
  },

  info: {
    padding: "16px",
  },

  title: {
    margin: 0,
  },

  description: {
    color: "#666",
    fontSize: "14px",
  },

  meta: {
    color: "#888",
    fontSize: "13px",
  },

  tags: {
    display: "flex",
    gap: "5px",
    flexWrap: "wrap",
    marginTop: "10px",
  },

  tag: {
    fontSize: "12px",
    color: "#555",
    backgroundColor: "#f1f1f1",
    padding: "4px 7px",
    borderRadius: "12px",
  },

  empty: {
    textAlign: "center",
    padding: "80px 20px",
    color: "#777",
  },
};

export default Home;
