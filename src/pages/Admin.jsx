import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

function Admin() {
  const [tab, setTab] = useState("overview");

  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [comments, setComments] = useState([]);
  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    users: 0,
    videos: 0,
    comments: 0,
    images: 0,
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);

    await Promise.all([
      loadUsers(),
      loadVideos(),
      loadComments(),
      loadImages(),
    ]);

    setLoading(false);
  };

  /* =========================================================
     USERS
  ========================================================= */

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("사용자 조회 오류:", error);
      setUsers([]);
      return;
    }

    const nextUsers = data || [];

    setUsers(nextUsers);

    setStats((prev) => ({
      ...prev,
      users: nextUsers.length,
    }));
  };

  /* =========================================================
     VIDEOS
  ========================================================= */

  const loadVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .neq("status", "deleted")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("영상 조회 오류:", error);
      setVideos([]);
      return;
    }

    const nextVideos = data || [];

    setVideos(nextVideos);

    setStats((prev) => ({
      ...prev,
      videos: nextVideos.length,
    }));
  };

  /* =========================================================
     COMMENTS
  ========================================================= */

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("댓글 조회 오류:", error);
      setComments([]);
      return;
    }

    const nextComments = data || [];

    setComments(nextComments);

    setStats((prev) => ({
      ...prev,
      comments: nextComments.length,
    }));
  };

  /* =========================================================
     IMAGES
  ========================================================= */

  const loadImages = async () => {
    const { data, error } = await supabase
      .from("image_posts")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("이미지 조회 오류:", error);
      setImages([]);
      return;
    }

    const nextImages = data || [];

    setImages(nextImages);

    setStats((prev) => ({
      ...prev,
      images: nextImages.length,
    }));
  };

  /* =========================================================
     USER DELETE
  ========================================================= */

  const deleteUser = async (id) => {
    const ok = window.confirm(
      "이 사용자의 프로필을 삭제하시겠습니까?\n\n프로필 데이터가 삭제됩니다.",
    );

    if (!ok) return;

    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (error) {
      console.error("사용자 삭제 오류:", error);

      alert("사용자 삭제에 실패했습니다.\n\n" + error.message);

      return;
    }

    setUsers((prev) => prev.filter((user) => user.id !== id));

    setStats((prev) => ({
      ...prev,
      users: Math.max(0, prev.users - 1),
    }));
  };

  /* =========================================================
     VIDEO DELETE
  ========================================================= */

  const deleteVideo = async (id) => {
    const target = videos.find((video) => video.id === id);

    const ok = window.confirm(
      `"${target?.title || "이 영상"}"을 삭제하시겠습니까?\n\n삭제된 영상은 관리자 목록과 최근 영상에서 제외됩니다.`,
    );

    if (!ok) return;

    const { error } = await supabase
      .from("videos")
      .update({
        status: "deleted",
      })
      .eq("id", id);

    if (error) {
      console.error("영상 삭제 오류:", error);

      alert("영상 삭제에 실패했습니다.\n\n" + error.message);

      return;
    }

    // 현재 목록에서 즉시 제거
    setVideos((prev) => prev.filter((video) => video.id !== id));

    // 통계 즉시 감소
    setStats((prev) => ({
      ...prev,
      videos: Math.max(0, prev.videos - 1),
    }));
  };

  /* =========================================================
     COMMENT DELETE
  ========================================================= */

  const deleteComment = async (id) => {
    const target = comments.find((comment) => comment.id === id);

    const ok = window.confirm(
      `"${target?.content || "이 댓글"}"을 삭제하시겠습니까?\n\n답글이 있다면 함께 삭제를 시도합니다.`,
    );

    if (!ok) return;

    /*
     * 1. 자식 댓글 삭제
     */
    const { error: childError } = await supabase
      .from("comments")
      .delete()
      .eq("parent_id", id);

    if (childError) {
      console.warn("답글 삭제 오류:", childError);
    }

    /*
     * 2. 본 댓글 삭제
     */
    const { error } = await supabase.from("comments").delete().eq("id", id);

    if (error) {
      console.error("댓글 삭제 오류:", error);

      alert("댓글 삭제에 실패했습니다.\n\n" + error.message);

      return;
    }

    /*
     * 3. 화면에서 본 댓글 + 답글 제거
     */
    setComments((prev) =>
      prev.filter((comment) => comment.id !== id && comment.parent_id !== id),
    );

    /*
     * 4. 실제 현재 목록 기준으로 다시 계산
     */
    setStats((prev) => ({
      ...prev,
      comments: Math.max(
        0,
        comments.filter(
          (comment) => comment.id !== id && comment.parent_id !== id,
        ).length,
      ),
    }));
  };

  /* =========================================================
     IMAGE STORAGE PATH
  ========================================================= */

  const getImageStoragePath = (url) => {
    if (!url) return null;

    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;

      const markers = [
        "/storage/v1/object/public/images/",
        "/storage/v1/object/sign/images/",
        "/storage/v1/object/images/",
      ];

      for (const marker of markers) {
        const index = pathname.indexOf(marker);

        if (index !== -1) {
          return decodeURIComponent(pathname.slice(index + marker.length));
        }
      }

      return null;
    } catch (error) {
      console.warn("이미지 Storage 경로 분석 실패:", error);

      return null;
    }
  };

  /* =========================================================
     IMAGE DELETE
  ========================================================= */

  const deleteImage = async (image) => {
    const imageTitle = image.title || "제목 없음";

    const ok = window.confirm(
      `"${imageTitle}" 이미지를 삭제하시겠습니까?\n\nDB와 Storage의 이미지를 삭제합니다.\n삭제하면 되돌릴 수 없습니다.`,
    );

    if (!ok) return;

    try {
      const imageUrl = image.image_url || image.url || image.imageUrl;

      /*
       * 1. Storage 파일 삭제
       */
      const storagePath = getImageStoragePath(imageUrl);

      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("images")
          .remove([storagePath]);

        if (storageError) {
          console.warn("Storage 이미지 삭제 실패:", storageError);
        }
      }

      /*
       * 2. DB 삭제
       */
      const { error: databaseError } = await supabase
        .from("image_posts")
        .delete()
        .eq("id", image.id);

      if (databaseError) {
        console.error("이미지 DB 삭제 오류:", databaseError);

        alert("이미지 DB 삭제에 실패했습니다.\n\n" + databaseError.message);

        return;
      }

      /*
       * 3. 화면에서 제거
       */
      setImages((prev) => prev.filter((item) => item.id !== image.id));

      /*
       * 4. 통계 감소
       */
      setStats((prev) => ({
        ...prev,
        images: Math.max(0, prev.images - 1),
      }));
    } catch (error) {
      console.error("이미지 삭제 오류:", error);

      alert("이미지 삭제 중 오류가 발생했습니다.");
    }
  };

  /* =========================================================
     RECENT DATA
  ========================================================= */

  const recentUsers = useMemo(() => users.slice(0, 5), [users]);

  const recentVideos = useMemo(() => videos.slice(0, 5), [videos]);

  const recentImages = useMemo(() => images.slice(0, 6), [images]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="xten-admin-v2-loading">
        <div className="xten-admin-v2-spinner" />

        <p>관리자 데이터를 불러오는 중...</p>
      </div>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="xten-admin-v2">
      {/* HEADER */}
      <header className="xten-admin-v2-header">
        <div>
          <span className="xten-admin-v2-eyebrow">XTEN ADMIN</span>

          <h1>관리자 센터</h1>

          <p>서비스의 사용자와 콘텐츠를 관리하세요.</p>
        </div>

        <button
          type="button"
          className="xten-admin-v2-refresh"
          onClick={loadAll}
        >
          ↻ 새로고침
        </button>
      </header>

      {/* STATS */}
      <section className="xten-admin-v2-stat-grid">
        <div className="xten-admin-v2-stat-card">
          <div className="xten-admin-v2-stat-icon">U</div>

          <div>
            <span>USERS</span>

            <strong>{stats.users}</strong>

            <p>전체 사용자</p>
          </div>
        </div>

        <div className="xten-admin-v2-stat-card">
          <div className="xten-admin-v2-stat-icon">V</div>

          <div>
            <span>VIDEOS</span>

            <strong>{stats.videos}</strong>

            <p>현재 영상</p>
          </div>
        </div>

        <div className="xten-admin-v2-stat-card">
          <div className="xten-admin-v2-stat-icon">I</div>

          <div>
            <span>IMAGES</span>

            <strong>{stats.images}</strong>

            <p>전체 이미지</p>
          </div>
        </div>

        <div className="xten-admin-v2-stat-card">
          <div className="xten-admin-v2-stat-icon">C</div>

          <div>
            <span>COMMENTS</span>

            <strong>{stats.comments}</strong>

            <p>전체 댓글</p>
          </div>
        </div>
      </section>

      {/* TABS */}
      <nav className="xten-admin-v2-tabs">
        <button
          type="button"
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          개요
        </button>

        <button
          type="button"
          className={tab === "users" ? "active" : ""}
          onClick={() => setTab("users")}
        >
          사용자
          <span>{users.length}</span>
        </button>

        <button
          type="button"
          className={tab === "videos" ? "active" : ""}
          onClick={() => setTab("videos")}
        >
          영상
          <span>{videos.length}</span>
        </button>

        <button
          type="button"
          className={tab === "images" ? "active" : ""}
          onClick={() => setTab("images")}
        >
          이미지
          <span>{images.length}</span>
        </button>

        <button
          type="button"
          className={tab === "comments" ? "active" : ""}
          onClick={() => setTab("comments")}
        >
          댓글
          <span>{comments.length}</span>
        </button>
      </nav>

      {/* =====================================================
          OVERVIEW
      ====================================================== */}

      {tab === "overview" && (
        <section className="xten-admin-v2-overview">
          <div className="xten-admin-v2-overview-grid">
            {/* USERS */}
            <section className="xten-admin-v2-panel">
              <div className="xten-admin-v2-panel-head">
                <div>
                  <span>RECENT USERS</span>

                  <h2>최근 가입</h2>
                </div>

                <button type="button" onClick={() => setTab("users")}>
                  전체 보기
                </button>
              </div>

              <div className="xten-admin-v2-user-list">
                {recentUsers.length === 0 ? (
                  <div className="xten-admin-v2-empty-small">
                    사용자가 없습니다.
                  </div>
                ) : (
                  recentUsers.map((user) => (
                    <div key={user.id} className="xten-admin-v2-user-item">
                      <div className="xten-admin-v2-user-avatar">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" />
                        ) : (
                          (user.display_name || "U").charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="xten-admin-v2-user-text">
                        <strong>{user.display_name || "이름 없음"}</strong>

                        <span>{user.role || "user"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* VIDEOS */}
            <section className="xten-admin-v2-panel">
              <div className="xten-admin-v2-panel-head">
                <div>
                  <span>RECENT VIDEOS</span>

                  <h2>최근 영상</h2>
                </div>

                <button type="button" onClick={() => setTab("videos")}>
                  전체 보기
                </button>
              </div>

              <div className="xten-admin-v2-content-list">
                {recentVideos.length === 0 ? (
                  <div className="xten-admin-v2-empty-small">
                    영상이 없습니다.
                  </div>
                ) : (
                  recentVideos.map((video) => (
                    <div key={video.id} className="xten-admin-v2-mini-content">
                      <div className="xten-admin-v2-mini-thumb">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt="" />
                        ) : (
                          <span>V</span>
                        )}
                      </div>

                      <div>
                        <strong>{video.title}</strong>

                        <span>
                          {video.category || "기타"} · 조회수 {video.views || 0}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* IMAGES */}
          <section className="xten-admin-v2-panel">
            <div className="xten-admin-v2-panel-head">
              <div>
                <span>RECENT IMAGES</span>

                <h2>최근 이미지</h2>
              </div>

              <button type="button" onClick={() => setTab("images")}>
                전체 보기
              </button>
            </div>

            {recentImages.length === 0 ? (
              <div className="xten-admin-v2-empty-small">
                이미지가 없습니다.
              </div>
            ) : (
              <div className="xten-admin-v2-overview-images">
                {recentImages.map((image) => {
                  const imageUrl =
                    image.image_url || image.url || image.imageUrl;

                  return (
                    <div
                      key={image.id}
                      className="xten-admin-v2-overview-image"
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={image.title || "이미지"} />
                      ) : (
                        <span>IMAGE</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      )}

      {/* =====================================================
          USERS
      ====================================================== */}

      {tab === "users" && (
        <section className="xten-admin-v2-panel">
          <div className="xten-admin-v2-panel-head">
            <div>
              <span>USERS</span>

              <h2>사용자 관리</h2>
            </div>

            <strong className="xten-admin-v2-result-count">
              {users.length}명
            </strong>
          </div>

          <div className="xten-admin-v2-list">
            {users.length === 0 ? (
              <div className="xten-admin-v2-empty">사용자가 없습니다.</div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="xten-admin-v2-list-row">
                  <div className="xten-admin-v2-user-avatar">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" />
                    ) : (
                      (user.display_name || "U").charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="xten-admin-v2-list-main">
                    <strong>{user.display_name || "이름 없음"}</strong>

                    <span>{user.role || "user"}</span>
                  </div>

                  <div className="xten-admin-v2-list-date">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("ko-KR")
                      : "-"}
                  </div>

                  <button
                    type="button"
                    className="xten-admin-v2-danger-button"
                    onClick={() => deleteUser(user.id)}
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          VIDEOS
      ====================================================== */}

      {tab === "videos" && (
        <section className="xten-admin-v2-panel">
          <div className="xten-admin-v2-panel-head">
            <div>
              <span>VIDEOS</span>

              <h2>영상 관리</h2>
            </div>

            <strong className="xten-admin-v2-result-count">
              {videos.length}개
            </strong>
          </div>

          <div className="xten-admin-v2-management-grid">
            {videos.length === 0 ? (
              <div className="xten-admin-v2-empty">영상이 없습니다.</div>
            ) : (
              videos.map((video) => (
                <article key={video.id} className="xten-admin-v2-media-card">
                  <div className="xten-admin-v2-media-thumb">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} />
                    ) : (
                      <span>VIDEO</span>
                    )}

                    <div className="xten-admin-v2-media-badge">
                      {video.category || "기타"}
                    </div>
                  </div>

                  <div className="xten-admin-v2-media-info">
                    <h3>{video.title}</h3>

                    <p>
                      조회수 {video.views || 0}
                      {" · "}
                      좋아요 {video.likes_count || 0}
                    </p>

                    <button
                      type="button"
                      className="xten-admin-v2-danger-button full"
                      onClick={() => deleteVideo(video.id)}
                    >
                      영상 삭제
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          IMAGES
      ====================================================== */}

      {tab === "images" && (
        <section className="xten-admin-v2-panel">
          <div className="xten-admin-v2-panel-head">
            <div>
              <span>IMAGES</span>

              <h2>이미지 관리</h2>
            </div>

            <strong className="xten-admin-v2-result-count">
              {images.length}개
            </strong>
          </div>

          {images.length === 0 ? (
            <div className="xten-admin-v2-empty">이미지가 없습니다.</div>
          ) : (
            <div className="xten-admin-v2-management-grid image-grid">
              {images.map((image) => {
                const imageUrl = image.image_url || image.url || image.imageUrl;

                return (
                  <article key={image.id} className="xten-admin-v2-media-card">
                    <div className="xten-admin-v2-media-thumb image">
                      {imageUrl ? (
                        <img src={imageUrl} alt={image.title || "이미지"} />
                      ) : (
                        <span>IMAGE</span>
                      )}
                    </div>

                    <div className="xten-admin-v2-media-info">
                      <h3>{image.title || "제목 없음"}</h3>

                      <p>{image.description || "설명 없음"}</p>

                      <small>
                        {image.created_at
                          ? new Date(image.created_at).toLocaleDateString(
                              "ko-KR",
                            )
                          : "-"}
                      </small>

                      <button
                        type="button"
                        className="xten-admin-v2-danger-button full"
                        onClick={() => deleteImage(image)}
                      >
                        이미지 삭제
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          COMMENTS
      ====================================================== */}

      {tab === "comments" && (
        <section className="xten-admin-v2-panel">
          <div className="xten-admin-v2-panel-head">
            <div>
              <span>COMMENTS</span>

              <h2>댓글 관리</h2>
            </div>

            <strong className="xten-admin-v2-result-count">
              {comments.length}개
            </strong>
          </div>

          <div className="xten-admin-v2-list">
            {comments.length === 0 ? (
              <div className="xten-admin-v2-empty">댓글이 없습니다.</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="xten-admin-v2-comment-row">
                  <div className="xten-admin-v2-comment-mark">C</div>

                  <div className="xten-admin-v2-comment-main">
                    <strong>{comment.content || "내용 없음"}</strong>

                    <span>
                      {comment.created_at
                        ? new Date(comment.created_at).toLocaleString("ko-KR")
                        : "-"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="xten-admin-v2-danger-button"
                    onClick={() => deleteComment(comment.id)}
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Admin;
