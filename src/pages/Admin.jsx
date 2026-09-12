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

  // ========================================
  // 관리자 확인
  // ========================================
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

    if (error) {
      console.error(error);
      setAuthorized(false);
      setLoading(false);
      return;
    }

    if (data?.role !== "admin") {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);

    await Promise.all([loadUsers(), loadVideos(), loadComments()]);

    setLoading(false);
  };

  // ========================================
  // 회원 목록
  // ========================================
  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("회원 조회 오류:", error);
      return;
    }

    setUsers(data || []);
  };

  // ========================================
  // 영상 목록
  // ========================================
  const loadVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("영상 조회 오류:", error);
      return;
    }

    setVideos(data || []);
  };

  // ========================================
  // 댓글 목록
  // ========================================
  const loadComments = async () => {
    const { data: commentData, error } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("댓글 조회 오류:", error);
      return;
    }

    if (!commentData || commentData.length === 0) {
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

    const { data: videosData } = await supabase
      .from("videos")
      .select("id, title")
      .in("id", videoIds);

    const profileMap = {};
    const videoMap = {};

    (profiles || []).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    (videosData || []).forEach((video) => {
      videoMap[video.id] = video;
    });

    const formattedComments = commentData.map((comment) => ({
      ...comment,
      profile: profileMap[comment.user_id] || null,
      video: videoMap[comment.video_id] || null,
    }));

    setComments(formattedComments);
  };

  // ========================================
  // 회원 정지
  // ========================================
  const handleSuspend = async (userId) => {
    const confirmed = window.confirm("이 사용자를 정지하시겠습니까?");

    if (!confirmed) return;

    const until = new Date();

    // 30일 정지
    until.setDate(until.getDate() + 30);

    const { error } = await supabase
      .from("profiles")
      .update({
        suspended_until: until.toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("회원 정지 오류:", error);
      setMessage("회원 정지에 실패했습니다.");
      return;
    }

    setMessage("회원을 30일 정지했습니다.");

    await loadUsers();
  };

  // ========================================
  // 회원 정지 해제
  // ========================================
  const handleUnsuspend = async (userId) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        suspended_until: null,
      })
      .eq("id", userId);

    if (error) {
      console.error("정지 해제 오류:", error);
      setMessage("정지 해제에 실패했습니다.");
      return;
    }

    setMessage("회원 정지를 해제했습니다.");

    await loadUsers();
  };

  // ========================================
  // 댓글 삭제
  // ========================================
  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm("이 댓글을 삭제하시겠습니까?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("댓글 삭제 오류:", error);
      setMessage("댓글 삭제에 실패했습니다.");
      return;
    }

    setMessage("댓글을 삭제했습니다.");

    await loadComments();
  };

  // ========================================
  // 영상 삭제
  // ========================================
  const handleDeleteVideo = async (videoId) => {
    const confirmed = window.confirm("이 영상을 삭제하시겠습니까?");

    if (!confirmed) return;

    // 실제 row를 삭제하지 않고
    // deleted 상태로 변경
    const { error } = await supabase
      .from("videos")
      .update({
        status: "deleted",
      })
      .eq("id", videoId);

    if (error) {
      console.error("영상 삭제 오류:", error);
      setMessage("영상 삭제에 실패했습니다.");
      return;
    }

    setMessage("영상을 삭제했습니다.");

    await loadVideos();
  };

  // ========================================
  // 영상 복구
  // ========================================
  const handleRestoreVideo = async (videoId) => {
    const { error } = await supabase
      .from("videos")
      .update({
        status: "published",
      })
      .eq("id", videoId);

    if (error) {
      console.error("영상 복구 오류:", error);
      setMessage("영상 복구에 실패했습니다.");
      return;
    }

    setMessage("영상을 복구했습니다.");

    await loadVideos();
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>관리자 확인 중...</h2>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={styles.center}>
        <div style={styles.denied}>
          <h2>접근 권한 없음</h2>
          <p>관리자 계정만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>관리자 페이지</h1>

      {message && <div style={styles.message}>{message}</div>}

      {/* 탭 */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            ...styles.tab,
            ...(activeTab === "users" ? styles.activeTab : {}),
          }}
        >
          회원 관리
        </button>

        <button
          onClick={() => setActiveTab("comments")}
          style={{
            ...styles.tab,
            ...(activeTab === "comments" ? styles.activeTab : {}),
          }}
        >
          댓글 관리
        </button>

        <button
          onClick={() => setActiveTab("videos")}
          style={{
            ...styles.tab,
            ...(activeTab === "videos" ? styles.activeTab : {}),
          }}
        >
          영상 관리
        </button>
      </div>

      {/* ====================================
          회원 관리
      ==================================== */}
      {activeTab === "users" && (
        <div style={styles.section}>
          <h2>회원 목록 {users.length}명</h2>

          <div style={styles.list}>
            {users.map((user) => {
              const suspended =
                user.suspended_until &&
                new Date(user.suspended_until) > new Date();

              return (
                <div key={user.id} style={styles.item}>
                  <div>
                    <strong>{user.display_name}</strong>

                    <p style={styles.small}>{user.id}</p>

                    <p style={styles.small}>권한: {user.role}</p>

                    {suspended && <p style={styles.warning}>정지 중</p>}
                  </div>

                  <div>
                    {user.role !== "admin" &&
                      (suspended ? (
                        <button
                          onClick={() => handleUnsuspend(user.id)}
                          style={styles.button}
                        >
                          정지 해제
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(user.id)}
                          style={styles.dangerButton}
                        >
                          30일 정지
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================================
          댓글 관리
      ==================================== */}
      {activeTab === "comments" && (
        <div style={styles.section}>
          <h2>댓글 {comments.length}개</h2>

          <div style={styles.list}>
            {comments.length === 0 ? (
              <p>댓글이 없습니다.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} style={styles.item}>
                  <div>
                    <strong>{comment.profile?.display_name || "사용자"}</strong>

                    <p>{comment.content}</p>

                    <p style={styles.small}>
                      영상: {comment.video?.title || "알 수 없음"}
                    </p>

                    <p style={styles.small}>
                      {new Date(comment.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    style={styles.dangerButton}
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ====================================
          영상 관리
      ==================================== */}
      {activeTab === "videos" && (
        <div style={styles.section}>
          <h2>영상 {videos.length}개</h2>

          <div style={styles.list}>
            {videos.map((video) => (
              <div key={video.id} style={styles.item}>
                <div style={styles.videoInfo}>
                  {video.thumbnail_url && (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      style={styles.thumbnail}
                    />
                  )}

                  <div>
                    <strong>{video.title}</strong>

                    <p style={styles.small}>카테고리: {video.category}</p>

                    <p style={styles.small}>조회수: {video.views}</p>

                    <p style={styles.small}>상태: {video.status}</p>
                  </div>
                </div>

                <div>
                  {video.status === "deleted" ? (
                    <button
                      onClick={() => handleRestoreVideo(video.id)}
                      style={styles.button}
                    >
                      복구
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      style={styles.dangerButton}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  center: {
    minHeight: "400px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  denied: {
    textAlign: "center",
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "12px",
  },

  message: {
    marginTop: "20px",
    marginBottom: "20px",
    padding: "12px",
    backgroundColor: "#eef8ee",
    color: "#267326",
    borderRadius: "8px",
  },

  tabs: {
    display: "flex",
    gap: "8px",
    marginTop: "30px",
    borderBottom: "1px solid #ddd",
    paddingBottom: "10px",
  },

  tab: {
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  activeTab: {
    backgroundColor: "#111",
    color: "#fff",
    borderColor: "#111",
  },

  section: {
    marginTop: "25px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  item: {
    backgroundColor: "#fff",
    padding: "18px",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  small: {
    margin: "5px 0",
    color: "#888",
    fontSize: "13px",
  },

  warning: {
    color: "#d00",
    fontWeight: "600",
  },

  button: {
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    padding: "9px 13px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  dangerButton: {
    border: "none",
    backgroundColor: "#d11",
    color: "#fff",
    padding: "9px 13px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  videoInfo: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  thumbnail: {
    width: "140px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "6px",
  },
};

export default Admin;
