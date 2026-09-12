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

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    setProfile(data);
  };

  const loadHistory = async (userId) => {
    const { data } = await supabase
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

    setHistoryVideos(data || []);
  };

  const loadLikedVideos = async (userId) => {
    const { data } = await supabase
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

    setLikedVideos(data || []);
  };

  const loadSavedVideos = async (userId) => {
    const { data } = await supabase
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

    setSavedVideos(data || []);
  };

  if (loading) {
    return (
      <div className="xten-content-loading">
        <div className="xten-spinner" />
        <p>마이페이지 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="xten-mypage">
      <div className="xten-page-head">
        <div>
          <div className="xten-home-kicker">MY XTEN</div>

          <h1 className="xten-page-title">마이페이지</h1>

          <p className="xten-page-description">
            내가 시청한 콘텐츠와 활동을 확인하세요.
          </p>
        </div>
      </div>

      <section className="xten-card xten-mypage-profile">
        <div className="xten-mypage-avatar">
          {profile?.display_name?.charAt(0) || "U"}
        </div>

        <div>
          <strong>{profile?.display_name || "사용자"}</strong>

          <p>Xten에서의 활동을 한눈에 확인하세요.</p>
        </div>
      </section>

      <MySection
        eyebrow="CONTINUE"
        title="이어보기"
        description="보던 영상을 이어서 시청하세요."
        empty="이어볼 영상이 없습니다."
        items={historyVideos}
        progress
        onSelectVideo={onSelectVideo}
      />

      <MySection
        eyebrow="HISTORY"
        title="시청 기록"
        description="최근 시청한 영상입니다."
        empty="시청 기록이 없습니다."
        items={historyVideos}
        onSelectVideo={onSelectVideo}
      />

      <MySection
        eyebrow="LIKED"
        title="좋아요한 영상"
        description="좋아요를 누른 영상입니다."
        empty="좋아요한 영상이 없습니다."
        items={likedVideos}
        onSelectVideo={onSelectVideo}
      />

      <MySection
        eyebrow="SAVED"
        title="저장한 영상"
        description="나중에 볼 영상을 모아두었습니다."
        empty="저장한 영상이 없습니다."
        items={savedVideos}
        onSelectVideo={onSelectVideo}
      />
    </div>
  );
}

function MySection({
  eyebrow,
  title,
  description,
  empty,
  items,
  progress,
  onSelectVideo,
}) {
  return (
    <section className="xten-mypage-section">
      <div className="xten-section-head">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <b>{items.length}</b>
      </div>

      {items.length === 0 ? (
        <div className="xten-mypage-empty">
          <div>◉</div>
          <p>{empty}</p>
        </div>
      ) : (
        <div className="xten-mypage-grid">
          {items.map((item) => {
            const video = item.videos;

            if (!video) return null;

            const seconds = progress ? Number(item.progress_seconds || 0) : 0;

            return (
              <article
                key={video.id}
                className="xten-video-card"
                onClick={() => onSelectVideo(video.id)}
              >
                <div className="xten-thumbnail">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} />
                  ) : (
                    <div className="xten-no-thumbnail">
                      <b>▶</b>
                      <span>THUMBNAIL</span>
                    </div>
                  )}

                  {seconds > 0 && (
                    <span className="xten-progress">
                      {Math.floor(seconds)}초
                    </span>
                  )}
                </div>

                <div className="xten-video-info">
                  <h3 className="xten-video-title">{video.title}</h3>

                  <p className="xten-video-meta">
                    {video.category} · 조회수 {video.views || 0}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default MyPage;
