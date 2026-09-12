import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function MyVideos({ onSelectVideo }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingVideo, setEditingVideo] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("기타");
  const [tags, setTags] = useState("");

  const [newThumbnail, setNewThumbnail] = useState(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const categories = [
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
    loadMyVideos();
  }, []);

  // =========================
  // 내 영상 불러오기
  // =========================
  const loadMyVideos = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("owner_id", user.id)
      .neq("status", "deleted")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("내 영상 조회 오류:", error);
      setErrorMessage("영상을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    setVideos(data || []);
    setLoading(false);
  };

  // =========================
  // 수정 화면 열기
  // =========================
  const openEdit = (video) => {
    setEditingVideo(video);
    setTitle(video.title || "");
    setDescription(video.description || "");
    setCategory(video.category || "기타");
    setTags(Array.isArray(video.tags) ? video.tags.join(", ") : "");

    setNewThumbnail(null);
    setMessage("");
    setErrorMessage("");
  };

  // =========================
  // 수정 취소
  // =========================
  const cancelEdit = () => {
    setEditingVideo(null);
    setNewThumbnail(null);
    setMessage("");
    setErrorMessage("");
  };

  // =========================
  // 영상 수정
  // =========================
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editingVideo) return;

    if (!title.trim()) {
      setErrorMessage("제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      let thumbnailUrl = editingVideo.thumbnail_url;

      // 새 썸네일 업로드
      if (newThumbnail) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("로그인이 필요합니다.");
        }

        const extension =
          newThumbnail.name.split(".").pop()?.toLowerCase() || "jpg";

        const fileName = `${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("thumbnails")
          .upload(fileName, newThumbnail, {
            cacheControl: "3600",
            upsert: false,
            contentType: newThumbnail.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("thumbnails").getPublicUrl(fileName);

        thumbnailUrl = publicUrl;
      }

      const tagArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");

      const { error } = await supabase
        .from("videos")
        .update({
          title: title.trim(),
          description: description.trim(),
          category,
          tags: tagArray,
          thumbnail_url: thumbnailUrl,
        })
        .eq("id", editingVideo.id);

      if (error) {
        throw error;
      }

      setMessage("영상 수정 완료!");

      setEditingVideo(null);
      setNewThumbnail(null);

      await loadMyVideos();
    } catch (error) {
      console.error("영상 수정 오류:", error);

      setErrorMessage(error.message || "영상 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // 영상 삭제
  // =========================
  const handleDelete = async (videoId) => {
    const confirmed = window.confirm("정말 이 영상을 삭제하시겠습니까?");

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("videos")
      .update({
        status: "deleted",
      })
      .eq("id", videoId);

    if (error) {
      console.error("영상 삭제 오류:", error);
      setErrorMessage("영상 삭제에 실패했습니다.");
      return;
    }

    setMessage("영상이 삭제되었습니다.");

    await loadMyVideos();
  };

  if (loading) {
    return <h2>내 영상 불러오는 중...</h2>;
  }

  // =========================
  // 수정 화면
  // =========================
  if (editingVideo) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1>영상 수정</h1>

          <form onSubmit={handleUpdate}>
            <div style={styles.field}>
              <label style={styles.label}>제목</label>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>설명</label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                style={styles.textarea}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>카테고리</label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={styles.input}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>태그</label>

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="축구, 하이라이트, 손흥민"
                style={styles.input}
              />

              <p style={styles.help}>쉼표로 구분하세요.</p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>새 썸네일</label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewThumbnail(e.target.files?.[0] || null)}
              />

              {newThumbnail && <p style={styles.help}>{newThumbnail.name}</p>}
            </div>

            {message && <p style={styles.success}>{message}</p>}

            {errorMessage && <p style={styles.error}>{errorMessage}</p>}

            <div style={styles.actions}>
              <button
                type="submit"
                disabled={saving}
                style={styles.primaryButton}
              >
                {saving ? "저장 중..." : "저장"}
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                style={styles.secondaryButton}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================
  // 내 영상 목록
  // =========================
  return (
    <div>
      <h1>내 영상</h1>

      {message && <p style={styles.success}>{message}</p>}

      {errorMessage && <p style={styles.error}>{errorMessage}</p>}

      {videos.length === 0 ? (
        <div style={styles.empty}>
          <h2>업로드한 영상이 없습니다.</h2>
          <p>영상을 업로드하면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {videos.map((video) => (
            <div key={video.id} style={styles.card}>
              <div
                onClick={() => onSelectVideo(video.id)}
                style={styles.clickArea}
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
                  <h3>{video.title}</h3>

                  <p style={styles.meta}>
                    {video.category}
                    {" · "}
                    조회수 {video.views || 0}
                  </p>

                  <p style={styles.description}>
                    {video.description || "설명 없음"}
                  </p>
                </div>
              </div>

              <div style={styles.videoActions}>
                <button
                  onClick={() => openEdit(video)}
                  style={styles.editButton}
                >
                  수정
                </button>

                <button
                  onClick={() => handleDelete(video.id)}
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
}

const styles = {
  container: {
    maxWidth: "700px",
    margin: "0 auto",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  },

  field: {
    marginBottom: "20px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    resize: "vertical",
  },

  help: {
    color: "#888",
    fontSize: "13px",
  },

  actions: {
    display: "flex",
    gap: "10px",
  },

  primaryButton: {
    border: "none",
    backgroundColor: "#111",
    color: "#fff",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  success: {
    padding: "12px",
    backgroundColor: "#eef8ee",
    color: "#267326",
    borderRadius: "8px",
  },

  error: {
    padding: "12px",
    backgroundColor: "#fff0f0",
    color: "#c00",
    borderRadius: "8px",
  },

  empty: {
    backgroundColor: "#fff",
    textAlign: "center",
    padding: "60px 20px",
    borderRadius: "12px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },

  clickArea: {
    cursor: "pointer",
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
    padding: "15px",
  },

  meta: {
    color: "#888",
    fontSize: "13px",
  },

  description: {
    color: "#666",
    fontSize: "14px",
  },

  videoActions: {
    display: "flex",
    gap: "8px",
    padding: "0 15px 15px",
  },

  editButton: {
    flex: 1,
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    padding: "9px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  deleteButton: {
    flex: 1,
    border: "none",
    backgroundColor: "#d11",
    color: "#fff",
    padding: "9px",
    borderRadius: "7px",
    cursor: "pointer",
  },
};

export default MyVideos;
