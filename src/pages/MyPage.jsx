import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function MyPage({ onSelectVideo }) {
  const [profile, setProfile] = useState(null);

  const [historyVideos, setHistoryVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyPage();
  }, []);

  const loadMyPage = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    await Promise.all([
      loadProfile(user.id),
      loadHistory(user.id),
      loadLikedVideos(user.id),
      loadSavedVideos(user.id),
    ]);

    setLoading(false);
  };

  // =========================
  // 프로필
  // =========================
  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("프로필 조회 오류:", error);
      return;
    }

    setProfile(data);
  };

  // =========================
  // 시청 기록 + 이어보기
  // =========================
  const loadHistory = async (userId) => {
    const { data, error } = await supabase
      .from("watch_history")
      .select(
        `
        progress_seconds,
        watched_at,
        videos (*)
      `,
      )
      .eq("user_id", userId)
      .order("watched_at", {
        ascending: false,
      });

    if (error) {
      console.error("시청 기록 조회 오류:", error);
      return;
    }

    setHistoryVideos(data || []);
  };

  // =========================
  // 좋아요한 영상
  // =========================
  const loadLikedVideos = async (userId) => {
    const { data, error } = await supabase
      .from("video_likes")
      .select(
        `
        created_at,
        videos (*)
      `,
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("좋아요 영상 조회 오류:", error);
      return;
    }

    setLikedVideos(data || []);
  };

  // =========================
  // 저장한 영상
  // =========================
  const loadSavedVideos = async (userId) => {
    const { data, error } = await supabase
      .from("saved_videos")
      .select(
        `
        created_at,
        videos (*)
      `,
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("저장 영상 조회 오류:", error);
      return;
    }

    setSavedVideos(data || []);
  };

  if (loading) {
    return <h2>마이페이지 불러오는 중...</h2>;
  }

  return (
    <div>
      {/* 프로필 */}
      <section style={styles.profileBox}>
        <div style={styles.avatar}>
          {profile?.display_name?.charAt(0) || "U"}
        </div>

        <div>
          <h1>{profile?.display_name || "사용자"}</h1>

          <p style={styles.profileText}>내 영상 활동을 한곳에서 확인하세요.</p>
        </div>
      </section>

      {/* 이어보기 */}
      <section style={styles.section}>
        <h2>▶ 이어보기</h2>

        {historyVideos.length === 0 ? (
          <p style={styles.empty}>이어볼 영상이 없습니다.</p>
        ) : (
          <VideoGrid
            items={historyVideos}
            getVideo={(item) => item.videos}
            getProgress={(item) => item.progress_seconds}
            onSelectVideo={onSelectVideo}
          />
        )}
      </section>

      {/* 시청 기록 */}
      <section style={styles.section}>
        <h2>🕘 시청 기록</h2>

        {historyVideos.length === 0 ? (
          <p style={styles.empty}>시청 기록이 없습니다.</p>
        ) : (
          <VideoGrid
            items={historyVideos}
            getVideo={(item) => item.videos}
            onSelectVideo={onSelectVideo}
          />
        )}
      </section>

      {/* 좋아요 */}
      <section style={styles.section}>
        <h2>👍 좋아요한 영상</h2>

        {likedVideos.length === 0 ? (
          <p style={styles.empty}>좋아요한 영상이 없습니다.</p>
        ) : (
          <VideoGrid
            items={likedVideos}
            getVideo={(item) => item.videos}
            onSelectVideo={onSelectVideo}
          />
        )}
      </section>

      {/* 저장 */}
      <section style={styles.section}>
        <h2>🔖 저장한 영상</h2>

        {savedVideos.length === 0 ? (
          <p style={styles.empty}>저장한 영상이 없습니다.</p>
        ) : (
          <VideoGrid
            items={savedVideos}
            getVideo={(item) => item.videos}
            onSelectVideo={onSelectVideo}
          />
        )}
      </section>
    </div>
  );
}

function VideoGrid({ items, getVideo, getProgress, onSelectVideo }) {
  return (
    <div style={styles.grid}>
      {items.map((item) => {
        const video = getVideo(item);

        if (!video) return null;

        const progress = getProgress ? Number(getProgress(item) || 0) : 0;

        const durationText =
          progress > 0 ? `${Math.floor(progress)}초까지 시청` : "";

        return (
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

              <p style={styles.meta}>
                {video.category}
                {" · "}
                조회수 {video.views || 0}
              </p>

              {durationText && (
                <p style={styles.progressText}>{durationText}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  profileBox: {
    backgroundColor: "#fff",
    padding: "24px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#111",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "700",
  },

  profileText: {
    color: "#777",
  },

  section: {
    marginTop: "30px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "20px",
    marginTop: "15px",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
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
    padding: "14px",
  },

  title: {
    margin: 0,
    fontSize: "16px",
  },

  meta: {
    color: "#888",
    fontSize: "13px",
    marginTop: "8px",
  },

  progressText: {
    color: "#111",
    fontSize: "13px",
    fontWeight: "600",
  },

  empty: {
    color: "#888",
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: "10px",
  },
};

export default MyPage;
