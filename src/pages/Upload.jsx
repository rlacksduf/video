import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Upload() {
  const [type, setType] = useState("video");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("일반");
  const [tags, setTags] = useState("");

  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [videoPreview, setVideoPreview] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const categories = [
    "일반",
    "게임",
    "음악",
    "브이로그",
    "공부",
    "스포츠",
    "IT",
    "기타",
  ];

  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [videoPreview, imagePreview, thumbnailPreview]);

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError("");
    setMessage("");
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("썸네일은 이미지 파일만 가능합니다.");
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
    setMessage("");
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("일반");
    setTags("");

    setVideoFile(null);
    setThumbnailFile(null);
    setImageFile(null);

    setVideoPreview("");
    setImagePreview("");
    setThumbnailPreview("");
  };

  const uploadFile = async (bucket, file, path) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return data.publicUrl;
  };

  const handleUpload = async () => {
    setMessage("");
    setError("");

    if (!supabase) {
      setError("Supabase 연결이 설정되지 않았습니다.");
      return;
    }

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (type === "video" && !videoFile) {
      setError("업로드할 동영상을 선택해주세요.");
      return;
    }

    if (type === "image" && !imageFile) {
      setError("업로드할 이미지를 선택해주세요.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const safeName = (fileName) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

      const timestamp = Date.now();

      const tagArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (type === "video") {
        const videoPath = `${user.id}/${timestamp}_${safeName(videoFile.name)}`;

        const videoUrl = await uploadFile("videos", videoFile, videoPath);

        let thumbnailUrl = null;

        if (thumbnailFile) {
          const thumbnailPath = `${user.id}/${timestamp}_thumb_${safeName(
            thumbnailFile.name,
          )}`;

          thumbnailUrl = await uploadFile(
            "thumbnails",
            thumbnailFile,
            thumbnailPath,
          );
        }

        const { error: insertError } = await supabase.from("videos").insert({
          owner_id: user.id,
          title: title.trim(),
          description: description.trim(),
          thumbnail_url: thumbnailUrl,
          video_url: videoUrl,
          category,
          tags: tagArray,
          status: "published",
        });

        if (insertError) throw insertError;
      } else {
        const imagePath = `${user.id}/${timestamp}_${safeName(imageFile.name)}`;

        const imageUrl = await uploadFile("images", imageFile, imagePath);

        const { error: insertError } = await supabase
          .from("image_posts")
          .insert({
            owner_id: user.id,
            title: title.trim(),
            description: description.trim(),
            image_url: imageUrl,
            category,
            tags: tagArray,
          });

        if (insertError) throw insertError;
      }

      setMessage(
        type === "video"
          ? "영상이 성공적으로 업로드되었습니다."
          : "이미지가 성공적으로 업로드되었습니다.",
      );

      resetForm();
    } catch (err) {
      console.error("업로드 오류:", err);

      setError(err.message || "업로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="xten-upload">
      <div className="xten-upload-heading">
        <div>
          <div className="xten-home-kicker">XTEN STUDIO</div>

          <h1 className="xten-page-title">업로드</h1>

          <p className="xten-page-description">
            콘텐츠를 업로드하고 Xten에 공유하세요.
          </p>
        </div>
      </div>

      <div className="xten-upload-type">
        <button
          type="button"
          className={type === "video" ? "active" : ""}
          onClick={() => {
            setType("video");
            setError("");
            setMessage("");
          }}
        >
          <span>🎬</span>

          <div>
            <strong>영상</strong>
            <small>동영상 업로드</small>
          </div>
        </button>

        <button
          type="button"
          className={type === "image" ? "active" : ""}
          onClick={() => {
            setType("image");
            setError("");
            setMessage("");
          }}
        >
          <span>🖼️</span>

          <div>
            <strong>이미지</strong>
            <small>이미지 업로드</small>
          </div>
        </button>
      </div>

      <div className="xten-upload-layout">
        <section className="xten-card xten-upload-media">
          <div className="xten-card-heading">
            <div>
              <span>MEDIA</span>

              <h2>{type === "video" ? "영상 파일" : "이미지 파일"}</h2>
            </div>
          </div>

          {type === "video" ? (
            <>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                hidden
              />

              {videoPreview ? (
                <div className="xten-media-preview xten-video-preview">
                  <video src={videoPreview} controls />
                </div>
              ) : (
                <label htmlFor="video-upload" className="xten-drop-zone">
                  <div className="xten-drop-icon">🎬</div>

                  <strong>영상 파일을 선택하세요</strong>

                  <p>MP4, MOV, WEBM 등</p>

                  <span>파일 선택</span>
                </label>
              )}

              {videoFile && (
                <div className="xten-file-card">
                  <div className="xten-file-icon">🎬</div>

                  <div className="xten-file-info">
                    <strong>{videoFile.name}</strong>

                    <span>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>

                  <label htmlFor="video-upload" className="xten-file-change">
                    변경
                  </label>
                </div>
              )}

              <div className="xten-thumbnail-area">
                <div className="xten-subheading">
                  <div>
                    <span>OPTIONAL</span>
                    <h3>썸네일</h3>
                    <p>영상 대표 이미지를 설정합니다.</p>
                  </div>

                  <em>선택 사항</em>
                </div>

                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  hidden
                />

                <label
                  htmlFor="thumbnail-upload"
                  className="xten-thumbnail-card"
                >
                  <div className="xten-thumbnail-preview">
                    {thumbnailPreview ? (
                      <img src={thumbnailPreview} alt="썸네일 미리보기" />
                    ) : (
                      <span>🖼️</span>
                    )}
                  </div>

                  <div>
                    <strong>
                      {thumbnailFile ? thumbnailFile.name : "썸네일 추가"}
                    </strong>

                    <p>JPG · PNG · WEBP</p>
                  </div>
                </label>
              </div>
            </>
          ) : (
            <>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />

              {imagePreview ? (
                <div className="xten-image-preview">
                  <img src={imagePreview} alt="이미지 미리보기" />
                </div>
              ) : (
                <label
                  htmlFor="image-upload"
                  className="xten-drop-zone xten-image-drop-zone"
                >
                  <div className="xten-drop-icon">🖼️</div>

                  <strong>이미지 파일을 선택하세요</strong>

                  <p>JPG, PNG, WEBP 등</p>

                  <span>파일 선택</span>
                </label>
              )}

              {imageFile && (
                <div className="xten-file-card">
                  <div className="xten-file-icon">🖼️</div>

                  <div className="xten-file-info">
                    <strong>{imageFile.name}</strong>

                    <span>{(imageFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>

                  <label htmlFor="image-upload" className="xten-file-change">
                    변경
                  </label>
                </div>
              )}
            </>
          )}
        </section>

        <section className="xten-card xten-upload-form-card">
          <div className="xten-card-heading">
            <div>
              <span>DETAILS</span>
              <h2>게시물 정보</h2>
            </div>
          </div>

          <div className="xten-form-stack">
            <div className="xten-field">
              <label>제목</label>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="게시물 제목"
                className="xten-input"
              />
            </div>

            <div className="xten-field">
              <label>설명</label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="게시물에 대한 설명"
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

              <small>쉼표(,)로 구분합니다.</small>
            </div>
          </div>

          {error && <div className="xten-error">{error}</div>}

          {message && <div className="xten-success">{message}</div>}

          <button
            type="button"
            className="xten-upload-submit"
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="xten-spinner small" />
                업로드 중...
              </>
            ) : (
              <>
                <span>↑</span>
                {type === "video" ? "영상 업로드" : "이미지 업로드"}
              </>
            )}
          </button>
        </section>
      </div>
    </div>
  );
}

export default Upload;
