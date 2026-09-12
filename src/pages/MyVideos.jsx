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
      setErrorMessage("영상을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    setVideos(data || []);
    setLoading(false);
  };

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

  const cancelEdit = () => {
    setEditingVideo(null);
    setNewThumbnail(null);
    setMessage("");
    setErrorMessage("");
  };

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
        .filter(Boolean);

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

      if (error) throw error;

      setMessage("영상 수정이 완료되었습니다.");

      setEditingVideo(null);
      setNewThumbnail(null);

      await loadMyVideos();
    } catch (error) {
      setErrorMessage(error.message || "영상 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (videoId) => {
    const confirmed = window.confirm("정말 이 영상을 삭제하시겠습니까?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("videos")
      .update({
        status: "deleted",
      })
      .eq("id", videoId);

    if (error) {
      setErrorMessage("영상 삭제에 실패했습니다.");
      return;
    }

    setMessage("영상이 삭제되었습니다.");

    await loadMyVideos();
  };

  if (loading) {
    return (
      <div className="xten-content-loading">
        <div className="xten-spinner" />
        <p>내 영상 불러오는 중...</p>
      </div>
    );
  }

  if (editingVideo) {
    return (
      <div className="xten-myvideos">
        <div className="xten-page-head">
          <div>
            <div className="xten-home-kicker">MY CONTENT</div>

            <h1 className="xten-page-title">영상 수정</h1>

            <p className="xten-page-description">
              업로드한 영상 정보를 수정하세요.
            </p>
          </div>
        </div>

        <section className="xten-card xten-edit-card">
          <form onSubmit={handleUpdate}>
            <div className="xten-form-stack">
              <div className="xten-field">
                <label>제목</label>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="xten-input"
                />
              </div>

              <div className="xten-field">
                <label>설명</label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={7}
                  className="xten-textarea"
                />
              </div>

              <div className="xten-field">
                <label>카테고리</label>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="xten-select"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xten-field">
                <label>태그</label>

                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="축구, 하이라이트, Xten"
                  className="xten-input"
                />

                <small>쉼표로 구분하세요.</small>
              </div>

              <div className="xten-field">
                <label>새 썸네일</label>

                <label className="xten-file-picker">
                  <span>🖼️</span>

                  <strong>
                    {newThumbnail ? newThumbnail.name : "새 썸네일 선택"}
                  </strong>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setNewThumbnail(e.target.files?.[0] || null)
                    }
                    hidden
                  />
                </label>
              </div>
            </div>

            {message && <div className="xten-success">{message}</div>}

            {errorMessage && <div className="xten-error">{errorMessage}</div>}

            <div className="xten-edit-actions">
              <button
                type="submit"
                disabled={saving}
                className="xten-btn xten-btn-primary"
              >
                {saving ? "저장 중..." : "변경사항 저장"}
              </button>

              <button type="button" onClick={cancelEdit} className="xten-btn">
                취소
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="xten-myvideos">
      <div className="xten-page-head">
        <div>
          <div className="xten-home-kicker">MY CONTENT</div>

          <h1 className="xten-page-title">내 영상</h1>

          <p className="xten-page-description">업로드한 콘텐츠를 관리하세요.</p>
        </div>

        <div className="xten-page-count">{videos.length}개</div>
      </div>

      {message && (
        <div className="xten-success xten-page-message">{message}</div>
      )}

      {errorMessage && (
        <div className="xten-error xten-page-message">{errorMessage}</div>
      )}

      {videos.length === 0 ? (
        <div className="xten-empty-card">
          <div className="xten-empty-icon">🎬</div>

          <h2>업로드한 영상이 없습니다.</h2>

          <p>영상을 업로드하면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="xten-myvideos-grid">
          {videos.map((video) => (
            <article key={video.id} className="xten-myvideo-card">
              <button
                type="button"
                className="xten-myvideo-media"
                onClick={() => onSelectVideo(video.id)}
              >
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} />
                ) : (
                  <div className="xten-no-thumbnail">
                    <b>▶</b>
                    <span>THUMBNAIL</span>
                  </div>
                )}
              </button>

              <div className="xten-myvideo-body">
                <h3>{video.title}</h3>

                <p>
                  {video.category} · 조회수 {video.views || 0}
                </p>

                <span>{video.description || "설명 없음"}</span>
              </div>

              <div className="xten-myvideo-actions">
                <button
                  type="button"
                  onClick={() => openEdit(video)}
                  className="xten-btn"
                >
                  수정
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(video.id)}
                  className="xten-btn danger"
                >
                  삭제
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyVideos;
