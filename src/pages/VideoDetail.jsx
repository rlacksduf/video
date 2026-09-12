import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

function VideoDetail({ videoId, onBack }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  // 영상 좋아요 / 저장
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // 댓글
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // 대댓글
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  // 댓글 좋아요
  const [commentLikes, setCommentLikes] = useState({});
  const [likedComments, setLikedComments] = useState({});

  // 이어보기
  const [resumeTime, setResumeTime] = useState(0);

  // 영상
  const videoRef = useRef(null);

  const [message, setMessage] = useState("");

  // 시청 기록 저장 타이머
  const saveTimerRef = useRef(null);

  useEffect(() => {
    loadVideo();
    loadComments();

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [videoId]);

  // ==================================================
  // 영상 불러오기
  // ==================================================
  const loadVideo = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .single();

    if (error) {
      console.error("영상 조회 오류:", error);
      setMessage("영상을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    setVideo(data);
    setLikeCount(data.likes_count || 0);

    // --------------------------------
    // 좋아요 / 저장 상태
    // --------------------------------
    if (user) {
      const { data: likeData, error: likeError } = await supabase
        .from("video_likes")
        .select("video_id")
        .eq("user_id", user.id)
        .eq("video_id", videoId)
        .maybeSingle();

      if (likeError) {
        console.error("좋아요 조회 오류:", likeError);
      }

      setLiked(!!likeData);

      const { data: savedData, error: savedError } = await supabase
        .from("saved_videos")
        .select("video_id")
        .eq("user_id", user.id)
        .eq("video_id", videoId)
        .maybeSingle();

      if (savedError) {
        console.error("저장 조회 오류:", savedError);
      }

      setSaved(!!savedData);

      // --------------------------------
      // 시청 기록 불러오기
      // --------------------------------
      const { data: historyData, error: historyError } = await supabase
        .from("watch_history")
        .select("progress_seconds")
        .eq("user_id", user.id)
        .eq("video_id", videoId)
        .maybeSingle();

      if (historyError) {
        console.error("시청 기록 조회 오류:", historyError);
      }

      if (historyData) {
        setResumeTime(Number(historyData.progress_seconds) || 0);
      } else {
        setResumeTime(0);
      }
    }

    // --------------------------------
    // 조회수 증가
    // --------------------------------
    const { error: viewError } = await supabase
      .from("videos")
      .update({
        views: (data.views || 0) + 1,
      })
      .eq("id", videoId);

    if (viewError) {
      console.error("조회수 증가 오류:", viewError);
    }

    setLoading(false);
  };

  // ==================================================
  // 영상 메타데이터 로드
  // ==================================================
  const handleVideoLoaded = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    // 저장된 위치가 영상 범위를 벗어나지 않는 경우에만 이동
    if (resumeTime > 0 && resumeTime < videoElement.duration - 3) {
      videoElement.currentTime = resumeTime;
    }
  };

  // ==================================================
  // 시청 위치 저장
  // ==================================================
  const saveWatchProgress = async (currentTime) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (!Number.isFinite(currentTime)) return;

    const { error } = await supabase.from("watch_history").upsert(
      {
        user_id: user.id,
        video_id: videoId,
        progress_seconds: currentTime,
        watched_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,video_id",
      },
    );

    if (error) {
      console.error("시청 기록 저장 오류:", error);
    }
  };

  // ==================================================
  // 영상 시간 변경
  // ==================================================
  const handleTimeUpdate = (e) => {
    const currentTime = e.currentTarget.currentTime;

    // 기존 타이머 제거
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 마지막 저장 후 약 5초 뒤 저장
    saveTimerRef.current = setTimeout(() => {
      saveWatchProgress(currentTime);
    }, 5000);
  };

  // ==================================================
  // 영상 종료
  // ==================================================
  const handleVideoEnded = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !video) return;

    // 끝까지 봤으면 기록 삭제
    // 다시 들어왔을 때 처음부터 볼 수 있도록
    const { error } = await supabase
      .from("watch_history")
      .delete()
      .eq("user_id", user.id)
      .eq("video_id", videoId);

    if (error) {
      console.error("시청 기록 삭제 오류:", error);
    }
  };

  // ==================================================
  // 영상 좋아요
  // ==================================================
  const handleLike = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    if (liked) {
      const { error } = await supabase
        .from("video_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", videoId);

      if (error) {
        console.error("좋아요 취소 오류:", error);
        return;
      }

      const newCount = Math.max(0, likeCount - 1);

      const { error: videoError } = await supabase
        .from("videos")
        .update({
          likes_count: newCount,
        })
        .eq("id", videoId);

      if (videoError) {
        console.error("좋아요 수 업데이트 오류:", videoError);
        return;
      }

      setLiked(false);
      setLikeCount(newCount);
    } else {
      const { error } = await supabase.from("video_likes").insert({
        user_id: user.id,
        video_id: videoId,
      });

      if (error) {
        console.error("좋아요 오류:", error);
        return;
      }

      const newCount = likeCount + 1;

      const { error: videoError } = await supabase
        .from("videos")
        .update({
          likes_count: newCount,
        })
        .eq("id", videoId);

      if (videoError) {
        console.error("좋아요 수 업데이트 오류:", videoError);
        return;
      }

      setLiked(true);
      setLikeCount(newCount);
    }
  };

  // ==================================================
  // 영상 저장
  // ==================================================
  const handleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    if (saved) {
      const { error } = await supabase
        .from("saved_videos")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", videoId);

      if (error) {
        console.error("저장 취소 오류:", error);
        return;
      }

      setSaved(false);
    } else {
      const { error } = await supabase.from("saved_videos").insert({
        user_id: user.id,
        video_id: videoId,
      });

      if (error) {
        console.error("저장 오류:", error);
        return;
      }

      setSaved(true);
    }
  };

  // ==================================================
  // 댓글 불러오기
  // ==================================================
  const loadComments = async () => {
    const { data: commentData, error: commentError } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("created_at", {
        ascending: true,
      });

    if (commentError) {
      console.error("댓글 조회 오류:", commentError);

      setComments([]);
      return;
    }

    if (!commentData || commentData.length === 0) {
      setComments([]);
      setCommentLikes({});
      setLikedComments({});
      return;
    }

    // 댓글 작성자 ID
    const userIds = [...new Set(commentData.map((comment) => comment.user_id))];

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    if (profileError) {
      console.error("프로필 조회 오류:", profileError);
    }

    const profileMap = {};

    (profiles || []).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    const formattedComments = commentData.map((comment) => ({
      ...comment,
      profiles: profileMap[comment.user_id] || {
        display_name: "사용자",
        avatar_url: null,
      },
    }));

    setComments(formattedComments);

    // --------------------------------
    // 댓글 좋아요
    // --------------------------------
    const commentIds = formattedComments.map((comment) => comment.id);

    if (commentIds.length === 0) {
      setCommentLikes({});
      setLikedComments({});
      return;
    }

    const { data: likesData, error: likesError } = await supabase
      .from("comment_likes")
      .select("user_id, comment_id")
      .in("comment_id", commentIds);

    if (likesError) {
      console.error("댓글 좋아요 조회 오류:", likesError);
      return;
    }

    const likeCountMap = {};
    const likedMap = {};

    (likesData || []).forEach((like) => {
      likeCountMap[like.comment_id] = (likeCountMap[like.comment_id] || 0) + 1;
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      (likesData || []).forEach((like) => {
        if (like.user_id === user.id) {
          likedMap[like.comment_id] = true;
        }
      });
    }

    setCommentLikes(likeCountMap);

    setLikedComments(likedMap);
  };

  // ==================================================
  // 댓글 작성
  // ==================================================
  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    const content = commentText.trim();

    if (!content) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    setCommentLoading(true);

    const { error } = await supabase.from("comments").insert({
      video_id: videoId,
      user_id: user.id,
      content,
      parent_id: null,
    });

    if (error) {
      console.error("댓글 작성 오류:", error);

      setMessage("댓글 작성에 실패했습니다.");

      setCommentLoading(false);
      return;
    }

    setCommentText("");

    await loadComments();

    setCommentLoading(false);
  };

  // ==================================================
  // 대댓글 작성
  // ==================================================
  const handleReplySubmit = async (e) => {
    e.preventDefault();

    const content = replyText.trim();

    if (!content || !replyTarget) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    setReplyLoading(true);

    const { error } = await supabase.from("comments").insert({
      video_id: videoId,
      user_id: user.id,
      content,
      parent_id: replyTarget,
    });

    if (error) {
      console.error("대댓글 작성 오류:", error);

      setMessage("대댓글 작성에 실패했습니다.");

      setReplyLoading(false);
      return;
    }

    setReplyTarget(null);
    setReplyText("");

    await loadComments();

    setReplyLoading(false);
  };

  // ==================================================
  // 댓글 좋아요
  // ==================================================
  const handleCommentLike = async (commentId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    const isLiked = !!likedComments[commentId];

    if (isLiked) {
      const { error } = await supabase
        .from("comment_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("comment_id", commentId);

      if (error) {
        console.error("댓글 좋아요 취소 오류:", error);
        return;
      }

      setLikedComments((prev) => ({
        ...prev,
        [commentId]: false,
      }));

      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: Math.max(0, (prev[commentId] || 0) - 1),
      }));
    } else {
      const { error } = await supabase.from("comment_likes").insert({
        user_id: user.id,
        comment_id: commentId,
      });

      if (error) {
        console.error("댓글 좋아요 오류:", error);
        return;
      }

      setLikedComments((prev) => ({
        ...prev,
        [commentId]: true,
      }));

      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || 0) + 1,
      }));
    }
  };

  // ==================================================
  // 댓글 삭제
  // ==================================================
  const handleCommentDelete = async (commentId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      console.error("댓글 삭제 오류:", error);
      return;
    }

    await loadComments();
  };

  // ==================================================
  // 로딩
  // ==================================================
  if (loading) {
    return (
      <div style={styles.center}>
        <h2>영상 불러오는 중...</h2>
      </div>
    );
  }

  if (!video) {
    return (
      <div>
        <p>{message || "영상을 찾을 수 없습니다."}</p>

        <button onClick={onBack}>뒤로가기</button>
      </div>
    );
  }

  // 부모 댓글
  const parentComments = comments.filter(
    (comment) => comment.parent_id === null,
  );

  // 대댓글
  const getReplies = (parentId) => {
    return comments.filter((comment) => comment.parent_id === parentId);
  };

  return (
    <div>
      {/* 뒤로가기 */}
      <button onClick={onBack} style={styles.backButton}>
        ← 뒤로가기
      </button>

      {/* ==================================
          영상
      ================================== */}
      <div style={styles.videoBox}>
        <video
          ref={videoRef}
          src={video.video_url}
          controls
          poster={video.thumbnail_url || undefined}
          style={styles.video}
          onLoadedMetadata={handleVideoLoaded}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
        />
      </div>

      {/* ==================================
          영상 정보
      ================================== */}
      <div style={styles.content}>
        <h1>{video.title}</h1>

        <p style={styles.meta}>
          조회수 {(video.views || 0) + 1}
          {" · "}
          {video.category}
        </p>

        {/* 좋아요 / 저장 */}
        <div style={styles.actions}>
          <button
            onClick={handleLike}
            style={{
              ...styles.actionButton,
              ...(liked ? styles.activeButton : {}),
            }}
          >
            👍 {liked ? "좋아요 취소" : "좋아요"} {likeCount}
          </button>

          <button
            onClick={handleSave}
            style={{
              ...styles.actionButton,
              ...(saved ? styles.activeButton : {}),
            }}
          >
            {saved ? "🔖 저장됨" : "🔖 저장"}
          </button>
        </div>

        {message && <p style={styles.message}>{message}</p>}

        <hr />

        <p style={styles.description}>{video.description || "설명 없음"}</p>

        {/* 태그 */}
        {video.tags?.length > 0 && (
          <div style={styles.tags}>
            {video.tags.map((tag) => (
              <span key={tag} style={styles.tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 이어보기 표시 */}
        {resumeTime > 0 && (
          <p style={styles.resumeText}>
            ▶ 이전 시청 위치 {Math.floor(resumeTime)}
            초에서 이어봤습니다.
          </p>
        )}
      </div>

      {/* ==================================
          댓글
      ================================== */}
      <div style={styles.commentSection}>
        <h2>댓글 {comments.length}개</h2>

        {/* 댓글 작성 */}
        <form onSubmit={handleCommentSubmit} style={styles.commentForm}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요."
            rows={4}
            style={styles.commentInput}
          />

          <button
            type="submit"
            disabled={commentLoading}
            style={styles.commentButton}
          >
            {commentLoading ? "작성 중..." : "댓글 작성"}
          </button>
        </form>

        {/* 댓글 목록 */}
        <div style={styles.commentList}>
          {parentComments.length === 0 ? (
            <p style={styles.emptyComment}>아직 댓글이 없습니다.</p>
          ) : (
            parentComments.map((comment) => {
              const replies = getReplies(comment.id);

              return (
                <div key={comment.id} style={styles.commentWrapper}>
                  {/* 부모 댓글 */}
                  <div style={styles.comment}>
                    <div style={styles.commentTop}>
                      <strong>
                        {comment.profiles?.display_name || "사용자"}
                      </strong>

                      <span style={styles.commentDate}>
                        {new Date(comment.created_at).toLocaleString("ko-KR")}
                      </span>
                    </div>

                    <p style={styles.commentText}>{comment.content}</p>

                    <div style={styles.commentActions}>
                      <button
                        onClick={() => handleCommentLike(comment.id)}
                        style={{
                          ...styles.smallButton,
                          ...(likedComments[comment.id]
                            ? styles.likedCommentButton
                            : {}),
                        }}
                      >
                        👍 {commentLikes[comment.id] || 0}
                      </button>

                      <button
                        onClick={() => {
                          setReplyTarget(
                            replyTarget === comment.id ? null : comment.id,
                          );
                          setReplyText("");
                        }}
                        style={styles.smallButton}
                      >
                        답글
                      </button>

                      <button
                        onClick={() => handleCommentDelete(comment.id)}
                        style={styles.deleteButton}
                      >
                        삭제
                      </button>
                    </div>

                    {/* 대댓글 작성 */}
                    {replyTarget === comment.id && (
                      <form
                        onSubmit={handleReplySubmit}
                        style={styles.replyForm}
                      >
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="답글을 입력하세요."
                          rows={2}
                          style={styles.replyInput}
                        />

                        <div>
                          <button
                            type="submit"
                            disabled={replyLoading}
                            style={styles.replyButton}
                          >
                            {replyLoading ? "작성 중..." : "답글 작성"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReplyTarget(null);
                              setReplyText("");
                            }}
                            style={styles.cancelButton}
                          >
                            취소
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* 대댓글 */}
                  {replies.length > 0 && (
                    <div style={styles.replyList}>
                      {replies.map((reply) => (
                        <div key={reply.id} style={styles.reply}>
                          <div style={styles.commentTop}>
                            <strong>
                              {reply.profiles?.display_name || "사용자"}
                            </strong>

                            <span style={styles.commentDate}>
                              {new Date(reply.created_at).toLocaleString(
                                "ko-KR",
                              )}
                            </span>
                          </div>

                          <p style={styles.commentText}>{reply.content}</p>

                          <div style={styles.commentActions}>
                            <button
                              onClick={() => handleCommentLike(reply.id)}
                              style={{
                                ...styles.smallButton,
                                ...(likedComments[reply.id]
                                  ? styles.likedCommentButton
                                  : {}),
                              }}
                            >
                              👍 {commentLikes[reply.id] || 0}
                            </button>

                            <button
                              onClick={() => handleCommentDelete(reply.id)}
                              style={styles.deleteButton}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "300px",
  },

  backButton: {
    marginBottom: "20px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "15px",
  },

  videoBox: {
    backgroundColor: "#000",
    borderRadius: "12px",
    overflow: "hidden",
  },

  video: {
    width: "100%",
    display: "block",
    maxHeight: "75vh",
  },

  content: {
    backgroundColor: "#fff",
    marginTop: "20px",
    padding: "24px",
    borderRadius: "12px",
  },

  meta: {
    color: "#777",
  },

  actions: {
    display: "flex",
    gap: "10px",
    margin: "20px 0",
  },

  actionButton: {
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },

  activeButton: {
    backgroundColor: "#111",
    color: "#fff",
    borderColor: "#111",
  },

  message: {
    color: "#d00",
    marginBottom: "15px",
  },

  description: {
    whiteSpace: "pre-wrap",
    lineHeight: "1.6",
  },

  tags: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "20px",
  },

  tag: {
    padding: "6px 10px",
    backgroundColor: "#eee",
    borderRadius: "20px",
    fontSize: "13px",
  },

  resumeText: {
    marginTop: "20px",
    padding: "10px 14px",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
    color: "#555",
    fontSize: "14px",
  },

  commentSection: {
    backgroundColor: "#fff",
    marginTop: "20px",
    padding: "24px",
    borderRadius: "12px",
  },

  commentForm: {
    marginTop: "20px",
  },

  commentInput: {
    width: "100%",
    padding: "12px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "8px",
    resize: "vertical",
    fontSize: "14px",
  },

  commentButton: {
    marginTop: "10px",
    padding: "10px 16px",
    border: "none",
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: "8px",
    cursor: "pointer",
  },

  commentList: {
    marginTop: "30px",
  },

  commentWrapper: {
    borderBottom: "1px solid #eee",
  },

  comment: {
    padding: "18px 0",
  },

  commentTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  commentDate: {
    color: "#999",
    fontSize: "12px",
  },

  commentText: {
    margin: "10px 0",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
  },

  commentActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  smallButton: {
    border: "none",
    backgroundColor: "#f3f3f3",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
  },

  likedCommentButton: {
    backgroundColor: "#111",
    color: "#fff",
  },

  deleteButton: {
    border: "none",
    background: "transparent",
    color: "#999",
    cursor: "pointer",
    padding: "6px",
    fontSize: "13px",
  },

  replyForm: {
    marginTop: "12px",
    paddingLeft: "20px",
  },

  replyInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    resize: "vertical",
  },

  replyButton: {
    marginTop: "8px",
    marginRight: "6px",
    border: "none",
    backgroundColor: "#111",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  cancelButton: {
    marginTop: "8px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  replyList: {
    marginLeft: "25px",
    borderLeft: "2px solid #eee",
    paddingLeft: "18px",
  },

  reply: {
    padding: "14px 0",
  },

  emptyComment: {
    color: "#888",
    textAlign: "center",
    padding: "30px 0",
  },
};

export default VideoDetail;
