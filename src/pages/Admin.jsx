import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Admin() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [comments, setComments] = useState([]);

  const [message, setMessage] = useState("");

  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || data?.role !== "admin") {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);

    await Promise.all([loadUsers(), loadVideos(), loadComments()]);

    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setUsers(data || []);
  };

  const loadVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setVideos(data || []);
  };

  const loadComments = async () => {
    const { data: commentData, error } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error || !commentData?.length) {
      setComments([]);
      return;
    }

    const userIds = [...new Set(commentData.map((comment) => comment.user_id))];

    const videoIds = [
      ...new Set(commentData.map((comment) => comment.video_id)),
    ];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    const { data: videoRows } = await supabase
      .from("videos")
      .select("id, title")
      .in("id", videoIds);

    const profileMap = {};
    const videoMap = {};

    (profiles || []).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    (videoRows || []).forEach((video) => {
      videoMap[video.id] = video;
    });

    setComments(
      commentData.map((comment) => ({
        ...comment,
        profile: profileMap[comment.user_id],
        video: videoMap[comment.video_id],
      })),
    );
  };

  const handleSuspend = async (userId) => {
    const confirmed = window.confirm("이 사용자를 30일 정지하시겠습니까?");

    if (!confirmed) return;

    const until = new Date();
    until.setDate(until.getDate() + 30);

    const { error } = await supabase
      .from("profiles")
      .update({
        suspended_until: until.toISOString(),
      })
      .eq("id", userId);

    if (error) {
      setMessage("회원 정지에 실패했습니다.");
      return;
    }

    setMessage("회원이 30일 정지되었습니다.");
    await loadUsers();
  };

  const handleUnsuspend = async (userId) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        suspended_until: null,
      })
      .eq("id", userId);

    if (error) {
      setMessage("정지 해제에 실패했습니다.");
      return;
    }

    setMessage("회원 정지가 해제되었습니다.");
    await loadUsers();
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("이 댓글을 삭제하시겠습니까?")) {
      return;
    }

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      setMessage("댓글 삭제에 실패했습니다.");
      return;
    }

    setMessage("댓글을 삭제했습니다.");
    await loadComments();
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("이 영상을 삭제하시겠습니까?")) {
      return;
    }

    const { error } = await supabase
      .from("videos")
      .update({
        status: "deleted",
      })
      .eq("id", videoId);

    if (error) {
      setMessage("영상 삭제에 실패했습니다.");
      return;
    }

    setMessage("영상을 삭제했습니다.");
    await loadVideos();
  };

  const handleRestoreVideo = async (videoId) => {
    const { error } = await supabase
      .from("videos")
      .update({
        status: "published",
      })
      .eq("id", videoId);

    if (error) {
      setMessage("영상 복구에 실패했습니다.");
      return;
    }

    setMessage("영상을 복구했습니다.");
    await loadVideos();
  };

  if (loading) {
    return (
      <div className="xten-content-loading">
        <div className="xten-spinner" />
        <p>관리자 확인 중...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="xten-empty-card">
        <div className="xten-empty-icon">🔒</div>

        <h2>접근 권한 없음</h2>

        <p>관리자 계정만 접근할 수 있습니다.</p>
      </div>
    );
  }

  const suspendedUsers = users.filter(
    (user) =>
      user.suspended_until && new Date(user.suspended_until) > new Date(),
  ).length;

  const deletedVideos = videos.filter(
    (video) => video.status === "deleted",
  ).length;

  return (
    <div className="xten-admin">
      <div className="xten-page-head">
        <div>
          <div className="xten-home-kicker">ADMIN PANEL</div>

          <h1 className="xten-page-title">관리자</h1>

          <p className="xten-page-description">Xten 서비스를 관리하세요.</p>
        </div>
      </div>

      {message && (
        <div className="xten-success xten-page-message">{message}</div>
      )}

      <div className="xten-admin-stats">
        <StatCard label="USERS" value={users.length} sub="전체 회원" icon="●" />

        <StatCard
          label="VIDEOS"
          value={videos.length}
          sub="전체 영상"
          icon="▶"
        />

        <StatCard
          label="COMMENTS"
          value={comments.length}
          sub="전체 댓글"
          icon="◌"
        />

        <StatCard
          label="SUSPENDED"
          value={suspendedUsers}
          sub="현재 정지 회원"
          icon="!"
        />
      </div>

      <div className="xten-admin-tabs">
        <button
          type="button"
          className={activeTab === "users" ? "active" : ""}
          onClick={() => setActiveTab("users")}
        >
          회원
          <span>{users.length}</span>
        </button>

        <button
          type="button"
          className={activeTab === "comments" ? "active" : ""}
          onClick={() => setActiveTab("comments")}
        >
          댓글
          <span>{comments.length}</span>
        </button>

        <button
          type="button"
          className={activeTab === "videos" ? "active" : ""}
          onClick={() => setActiveTab("videos")}
        >
          영상
          <span>{videos.length}</span>
        </button>
      </div>

      {activeTab === "users" && (
        <section className="xten-admin-panel">
          <div className="xten-panel-heading">
            <div>
              <span>MEMBERS</span>
              <h2>회원 관리</h2>
            </div>

            <strong>{users.length}명</strong>
          </div>

          <div className="xten-admin-users">
            {users.map((user) => {
              const suspended =
                user.suspended_until &&
                new Date(user.suspended_until) > new Date();

              return (
                <article key={user.id} className="xten-admin-user">
                  <div className="xten-admin-user-main">
                    <div className="xten-admin-user-avatar">
                      {user.display_name?.charAt(0) || "U"}
                    </div>

                    <div>
                      <strong>{user.display_name || "사용자"}</strong>

                      <p>
                        가입일{" "}
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString(
                              "ko-KR",
                            )
                          : "-"}
                      </p>

                      <div className="xten-admin-tags">
                        <span>{user.role}</span>

                        {suspended && <span className="danger">정지</span>}
                      </div>
                    </div>
                  </div>

                  {user.role !== "admin" &&
                    (suspended ? (
                      <button
                        type="button"
                        className="xten-btn"
                        onClick={() => handleUnsuspend(user.id)}
                      >
                        정지 해제
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="xten-btn danger"
                        onClick={() => handleSuspend(user.id)}
                      >
                        30일 정지
                      </button>
                    ))}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "comments" && (
        <section className="xten-admin-panel">
          <div className="xten-panel-heading">
            <div>
              <span>COMMENTS</span>
              <h2>댓글 관리</h2>
            </div>

            <strong>{comments.length}개</strong>
          </div>

          {comments.length === 0 ? (
            <div className="xten-admin-empty">댓글이 없습니다.</div>
          ) : (
            <div className="xten-admin-comments">
              {comments.map((comment) => (
                <article key={comment.id} className="xten-admin-comment">
                  <div className="xten-comment-user-line">
                    <span>
                      {(comment.profile?.display_name || "사용자").charAt(0)}
                    </span>

                    <div>
                      <strong>
                        {comment.profile?.display_name || "사용자"}
                      </strong>

                      <small>
                        {new Date(comment.created_at).toLocaleString("ko-KR")}
                      </small>
                    </div>
                  </div>

                  <p className="xten-admin-comment-text">{comment.content}</p>

                  <div className="xten-admin-comment-bottom">
                    <span>{comment.video?.title || "알 수 없는 영상"}</span>

                    <button
                      type="button"
                      className="xten-btn danger"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "videos" && (
        <section className="xten-admin-panel">
          <div className="xten-panel-heading">
            <div>
              <span>VIDEOS</span>
              <h2>영상 관리</h2>
            </div>

            <strong>{videos.length}개</strong>
          </div>

          <div className="xten-admin-videos">
            {videos.map((video) => (
              <article key={video.id} className="xten-admin-video">
                <div className="xten-admin-video-main">
                  <div className="xten-admin-video-thumb">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} />
                    ) : (
                      <span>▶</span>
                    )}
                  </div>

                  <div>
                    <strong>{video.title}</strong>

                    <p>
                      {video.category} · 조회수 {video.views || 0}
                    </p>

                    <div className="xten-admin-tags">
                      <span
                        className={
                          video.status === "deleted" ? "danger" : "success"
                        }
                      >
                        {video.status}
                      </span>
                    </div>
                  </div>
                </div>

                {video.status === "deleted" ? (
                  <button
                    type="button"
                    className="xten-btn xten-btn-primary"
                    onClick={() => handleRestoreVideo(video.id)}
                  >
                    복구
                  </button>
                ) : (
                  <button
                    type="button"
                    className="xten-btn danger"
                    onClick={() => handleDeleteVideo(video.id)}
                  >
                    삭제
                  </button>
                )}
              </article>
            ))}
          </div>

          {deletedVideos > 0 && (
            <div className="xten-admin-footer-note">
              삭제 처리된 영상 {deletedVideos}개가 있습니다.
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="xten-stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{sub}</p>
      </div>

      <div className="xten-stat-icon">{icon}</div>
    </div>
  );
}

export default Admin;
