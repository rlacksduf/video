import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

function VideoDetail({ videoId, onBack }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const [commentLikes, setCommentLikes] = useState({});
  const [likedComments, setLikedComments] = useState({});

  const [resumeTime, setResumeTime] = useState(0);

  const [message, setMessage] = useState("");

  const videoRef = useRef(null);
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
      setMessage("영상을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    setVideo(data);
    setLikeCount(data.likes_count || 0);

    if (user) {
      const { data: likeData } = await supabase
        .from("video_likes")
        .select("video_id")
        .eq("user_id", user.id)
        .eq("video_id", videoId)
        .maybeSingle();

      setLiked(!!likeData);

      const { data: savedData } = await supabase
        .from("saved_videos")
        .select("video_id")
        .eq("user_id", user.id)
        .eq("video_id", videoId)
        .maybeSingle();

      setSaved(!!savedData);

      const { data: historyData } = await supabase
        .from("watch_history")
        .select("progress_seconds")
        .eq("user_id", user.id)
        .eq("video_id", videoId)
        .maybeSingle();

      setResumeTime(
        historyData ? Number(historyData.progress_seconds) || 0 : 0,
      );
    }

    const { error: viewError } = await supabase.rpc("increment_video_view", {
      p_video_id: videoId,
    });

    if (viewError) {
      console.warn("조회수 증가 오류:", viewError);
    }

    setLoading(false);
  };

  const handleVideoLoaded = () => {
    const element = videoRef.current;

    if (!element) return;

    if (
      resumeTime > 0 &&
      Number.isFinite(element.duration) &&
      resumeTime < element.duration - 3
    ) {
      element.currentTime = resumeTime;
    }
  };

  const saveWatchProgress = async (currentTime) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (!Number.isFinite(currentTime)) return;

    await supabase.from("watch_history").upsert(
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
  };

  const handleTimeUpdate = (e) => {
    const currentTime = e.currentTarget.currentTime;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveWatchProgress(currentTime);
    }, 5000);
  };

  const handleVideoEnded = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("watch_history")
      .delete()
      .eq("user_id", user.id)
      .eq("video_id", videoId);
  };

  const handleLike = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    const { data, error } = await supabase.rpc("toggle_video_like", {
      p_video_id: videoId,
    });

    if (error) {
      console.error("좋아요 처리 오류:", error);
      setMessage("좋아요 처리에 실패했습니다.");
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) return;

    setLiked(Boolean(result.liked));
    setLikeCount(Number(result.likes_count) || 0);
  };

  const handleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    if (saved) {
      await supabase
        .from("saved_videos")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", videoId);

      setSaved(false);
    } else {
      await supabase.from("saved_videos").insert({
        user_id: user.id,
        video_id: videoId,
      });

      setSaved(true);
    }
  };

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setComments([]);
      return;
    }

    if (!data?.length) {
      setComments([]);
      setCommentLikes({});
      setLikedComments({});
      return;
    }

    const userIds = [...new Set(data.map((item) => item.user_id))];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = {};

    (profiles || []).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    const formatted = data.map((comment) => ({
      ...comment,
      profiles: profileMap[comment.user_id] || {
        display_name: "사용자",
        avatar_url: null,
      },
    }));

    setComments(formatted);

    const commentIds = formatted.map((comment) => comment.id);

    const { data: likesData } = await supabase
      .from("comment_likes")
      .select("user_id, comment_id")
      .in("comment_id", commentIds);

    const countMap = {};
    const likedMap = {};

    (likesData || []).forEach((like) => {
      countMap[like.comment_id] = (countMap[like.comment_id] || 0) + 1;
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

    setCommentLikes(countMap);
    setLikedComments(likedMap);
  };

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
      setMessage("댓글 작성에 실패했습니다.");
      setCommentLoading(false);
      return;
    }

    setCommentText("");

    await loadComments();

    setCommentLoading(false);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();

    const content = replyText.trim();

    if (!content || !replyTarget) return;

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
      setReplyLoading(false);
      setMessage("대댓글 작성에 실패했습니다.");
      return;
    }

    setReplyTarget(null);
    setReplyText("");

    await loadComments();

    setReplyLoading(false);
  };

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
      await supabase
        .from("comment_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("comment_id", commentId);

      setLikedComments((prev) => ({
        ...prev,
        [commentId]: false,
      }));

      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: Math.max(0, (prev[commentId] || 0) - 1),
      }));
    } else {
      await supabase.from("comment_likes").insert({
        user_id: user.id,
        comment_id: commentId,
      });

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

  const handleCommentDelete = async (commentId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    await loadComments();
  };

  if (loading) {
    return (
      <div className="xten-content-loading">
        <div className="xten-spinner" />
        <p>영상 불러오는 중...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="xten-empty-card">
        <div className="xten-empty-icon">▶</div>

        <h2>{message || "영상을 찾을 수 없습니다."}</h2>

        <button
          type="button"
          className="xten-btn xten-btn-primary"
          onClick={onBack}
        >
          돌아가기
        </button>
      </div>
    );
  }

  const parentComments = comments.filter(
    (comment) => comment.parent_id === null,
  );

  const getReplies = (parentId) =>
    comments.filter((comment) => comment.parent_id === parentId);

  return (
    <div className="xten-detail">
      <button type="button" onClick={onBack} className="xten-back">
        ← 뒤로가기
      </button>

      <section className="xten-player">
        <video
          ref={videoRef}
          src={video.video_url}
          controls
          poster={video.thumbnail_url || undefined}
          onLoadedMetadata={handleVideoLoaded}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
        />
      </section>

      <section className="xten-card xten-detail-info">
        <span className="xten-detail-category">{video.category}</span>

        <h1>{video.title}</h1>

        <div className="xten-detail-meta">
          <span>조회수 {(video.views || 0) + 1}</span>

          <span>·</span>

          <span>{video.category}</span>
        </div>

        <div className="xten-detail-actions">
          <button
            type="button"
            onClick={handleLike}
            className={`xten-action-btn ${liked ? "active" : ""}`}
          >
            {liked ? "♥" : "♡"}
            <span>좋아요</span>
            <b>{likeCount}</b>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`xten-action-btn ${saved ? "active" : ""}`}
          >
            {saved ? "🔖" : "▫"}
            <span>{saved ? "저장됨" : "저장"}</span>
          </button>
        </div>

        {message && <div className="xten-detail-message">{message}</div>}

        <div className="xten-divider" />

        <p className="xten-detail-description">
          {video.description || "설명 없음"}
        </p>

        {video.tags?.length > 0 && (
          <div className="xten-detail-tags">
            {video.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}

        {resumeTime > 0 && (
          <div className="xten-resume">
            <span>▶</span>

            <p>
              이전 시청 위치 <b>{Math.floor(resumeTime)}초</b>
              에서 이어봅니다.
            </p>
          </div>
        )}
      </section>

      <section className="xten-card xten-comments">
        <div className="xten-comments-title">
          <div>
            <span>COMMUNITY</span>
            <h2>댓글</h2>
          </div>

          <b>{comments.length}</b>
        </div>

        <form onSubmit={handleCommentSubmit} className="xten-comment-form">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요."
            className="xten-textarea"
            rows={4}
          />

          <button
            type="submit"
            disabled={commentLoading}
            className="xten-btn xten-btn-primary"
          >
            {commentLoading ? "작성 중..." : "댓글 작성"}
          </button>
        </form>

        {parentComments.length === 0 ? (
          <div className="xten-comment-empty">
            <strong>아직 댓글이 없습니다.</strong>
            <p>첫 번째 댓글을 남겨보세요.</p>
          </div>
        ) : (
          <div className="xten-comment-list">
            {parentComments.map((comment) => {
              const replies = getReplies(comment.id);

              return (
                <div key={comment.id} className="xten-comment-group">
                  <CommentItem
                    comment={comment}
                    liked={!!likedComments[comment.id]}
                    likes={commentLikes[comment.id] || 0}
                    onLike={() => handleCommentLike(comment.id)}
                    onReply={() => {
                      setReplyTarget(
                        replyTarget === comment.id ? null : comment.id,
                      );
                      setReplyText("");
                    }}
                    onDelete={() => handleCommentDelete(comment.id)}
                  />

                  {replyTarget === comment.id && (
                    <form
                      onSubmit={handleReplySubmit}
                      className="xten-reply-form"
                    >
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="답글을 입력하세요."
                        rows={2}
                        className="xten-textarea"
                      />

                      <div>
                        <button
                          type="submit"
                          disabled={replyLoading}
                          className="xten-btn xten-btn-primary"
                        >
                          {replyLoading ? "작성 중..." : "답글 작성"}
                        </button>

                        <button
                          type="button"
                          className="xten-btn"
                          onClick={() => {
                            setReplyTarget(null);
                            setReplyText("");
                          }}
                        >
                          취소
                        </button>
                      </div>
                    </form>
                  )}

                  {replies.length > 0 && (
                    <div className="xten-replies">
                      {replies.map((reply) => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          liked={!!likedComments[reply.id]}
                          likes={commentLikes[reply.id] || 0}
                          reply
                          onLike={() => handleCommentLike(reply.id)}
                          onDelete={() => handleCommentDelete(reply.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function CommentItem({
  comment,
  liked,
  likes,
  reply,
  onLike,
  onReply,
  onDelete,
}) {
  const displayName = comment.profiles?.display_name || "사용자";

  return (
    <article className={`xten-comment ${reply ? "reply" : ""}`}>
      <div className="xten-comment-head">
        <div className="xten-comment-user">
          {comment.profiles?.avatar_url ? (
            <img src={comment.profiles.avatar_url} alt="" />
          ) : (
            <span>{displayName.charAt(0)}</span>
          )}

          <strong>{displayName}</strong>
        </div>

        <time>{new Date(comment.created_at).toLocaleString("ko-KR")}</time>
      </div>

      <p className="xten-comment-text">{comment.content}</p>

      <div className="xten-comment-actions">
        <button
          type="button"
          className={liked ? "active" : ""}
          onClick={onLike}
        >
          ♥ {likes}
        </button>

        {onReply && (
          <button type="button" onClick={onReply}>
            답글
          </button>
        )}

        <button type="button" className="danger" onClick={onDelete}>
          삭제
        </button>
      </div>
    </article>
  );
}

export default VideoDetail;
