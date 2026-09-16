import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

function MyPage({ profile, onSelectVideo, onSelectImage }) {
  const fileInputRef = useRef(null);

  const [videos, setVideos] = useState([]);
  const [images, setImages] = useState([]);

  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadingImages, setLoadingImages] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState(profile?.avatar_url || "");

  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    setPreviewUrl(profile?.avatar_url || "");
  }, [profile?.avatar_url]);

  useEffect(() => {
    loadVideos();
    loadImages();
  }, []);

  const loadVideos = async () => {
    setLoadingVideos(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setVideos([]);
      setLoadingVideos(false);
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
      setVideos([]);
    } else {
      setVideos(data || []);
    }

    setLoadingVideos(false);
  };

  const loadImages = async () => {
    setLoadingImages(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setImages([]);
      setLoadingImages(false);
      return;
    }

    const { data, error } = await supabase
      .from("image_posts")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("내 이미지 조회 오류:", error);

      setImages([]);
    } else {
      setImages(data || []);
    }

    setLoadingImages(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("프로필 이미지는 5MB 이하만 업로드할 수 있습니다.");
      return;
    }

    setSelectedFile(file);
    setMessage("");

    const objectUrl = URL.createObjectURL(file);

    setPreviewUrl(objectUrl);
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const fileExt =
        selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";

      /*
       * 사용자별 고정 파일명 사용
       * -> 새 프로필 사진 업로드 시 기존 사진을 덮어씀
       */
      const filePath = `${user.id}/avatar.${fileExt}`;

      /*
       * 기존 확장자 파일 정리
       */
      const possibleExtensions = ["jpg", "jpeg", "png", "webp", "gif"];

      const oldPaths = possibleExtensions
        .filter((ext) => ext !== fileExt)
        .map((ext) => `${user.id}/avatar.${ext}`);

      if (oldPaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from("avatars")
          .remove(oldPaths);

        if (removeError) {
          console.warn("기존 프로필 이미지 삭제 경고:", removeError);
        }
      }

      /*
       * 새 이미지 업로드
       */
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile, {
          upsert: true,
          cacheControl: "3600",
          contentType: selectedFile.type,
        });

      if (uploadError) {
        console.error("프로필 이미지 업로드 오류:", uploadError);

        throw new Error(uploadError.message);
      }

      /*
       * Public URL 가져오기
       */
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error("프로필 이미지 URL을 가져오지 못했습니다.");
      }

      /*
       * 캐시 방지용 timestamp
       */
      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      /*
       * profile 업데이트
       */
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: finalUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("프로필 업데이트 오류:", updateError);

        throw new Error(updateError.message);
      }

      setPreviewUrl(finalUrl);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage("프로필 이미지가 변경되었습니다.");
    } catch (error) {
      console.error("프로필 이미지 처리 오류:", error);

      alert("프로필 이미지 변경에 실패했습니다.\n\n" + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeSelectedImage = () => {
    setSelectedFile(null);

    setPreviewUrl(profile?.avatar_url || "");

    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayName = profile?.display_name || "사용자";

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="xten-mypage">
      {/* ========================================
          HEADER
      ========================================= */}

      <section className="xten-mypage-header">
        <div>
          <span>MY XTEN</span>

          <h1>마이페이지</h1>

          <p>프로필과 내가 업로드한 콘텐츠를 관리하세요.</p>
        </div>
      </section>

      {/* ========================================
          PROFILE
      ========================================= */}

      <section className="xten-mypage-profile">
        <div className="xten-mypage-profile-main">
          {/* AVATAR */}
          <div className="xten-mypage-avatar-area">
            <button
              type="button"
              className="xten-mypage-avatar"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="프로필" />
              ) : (
                <span>{initial}</span>
              )}

              <div className="xten-mypage-avatar-overlay">
                <strong>{uploading ? "업로드 중" : "변경"}</strong>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />

            <button
              type="button"
              className="xten-mypage-avatar-change"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              사진 선택
            </button>
          </div>

          {/* PROFILE INFO */}
          <div className="xten-mypage-profile-info">
            <span className="xten-mypage-label">PROFILE</span>

            <h2>{displayName}</h2>

            <p>{profile?.role === "admin" ? "관리자" : "XTEN 사용자"}</p>

            {profile?.created_at && (
              <span className="xten-mypage-joined">
                가입일{" "}
                {new Date(profile.created_at).toLocaleDateString("ko-KR")}
              </span>
            )}

            {selectedFile && (
              <div className="xten-mypage-selected-file">
                <span>선택된 파일</span>

                <strong>{selectedFile.name}</strong>
              </div>
            )}

            {message && <p className="xten-mypage-success">{message}</p>}

            <div className="xten-mypage-avatar-actions">
              <button
                type="button"
                className="xten-mypage-primary-button"
                onClick={handleAvatarUpload}
                disabled={uploading || !selectedFile}
              >
                {uploading ? "업로드 중..." : "프로필 사진 저장"}
              </button>

              {selectedFile && (
                <button
                  type="button"
                  className="xten-mypage-secondary-button"
                  onClick={removeSelectedImage}
                  disabled={uploading}
                >
                  취소
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PROFILE SIDE INFO */}
        <div className="xten-mypage-profile-side">
          <div>
            <span>ROLE</span>

            <strong>{profile?.role === "admin" ? "ADMIN" : "USER"}</strong>
          </div>

          <div>
            <span>VIDEOS</span>

            <strong>{videos.length}</strong>
          </div>

          <div>
            <span>IMAGES</span>

            <strong>{images.length}</strong>
          </div>
        </div>
      </section>

      {/* ========================================
          MY VIDEOS
      ========================================= */}

      <section className="xten-mypage-section">
        <div className="xten-mypage-section-head">
          <div>
            <span>MY VIDEOS</span>

            <h2>내 영상</h2>

            <p>내가 업로드한 영상입니다.</p>
          </div>

          <strong>{videos.length}개</strong>
        </div>

        {loadingVideos ? (
          <div className="xten-mypage-loading">
            <div className="xten-v2-spinner" />
          </div>
        ) : videos.length === 0 ? (
          <div className="xten-mypage-empty">
            <span>VIDEO</span>

            <h3>아직 업로드한 영상이 없습니다.</h3>

            <p>영상을 업로드하면 이곳에서 확인할 수 있습니다.</p>
          </div>
        ) : (
          <div className="xten-mypage-video-grid">
            {videos.map((video) => (
              <article
                key={video.id}
                className="xten-mypage-video-card"
                onClick={() => onSelectVideo?.(video.id)}
              >
                <div className="xten-mypage-video-thumb">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} />
                  ) : (
                    <div>▶</div>
                  )}
                </div>

                <div className="xten-mypage-video-info">
                  <span>{video.category || "기타"}</span>

                  <h3>{video.title}</h3>

                  <p>
                    조회수 {video.views || 0}
                    {" · "}
                    좋아요 {video.likes_count || 0}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ========================================
          MY IMAGES
      ========================================= */}

      <section className="xten-mypage-section">
        <div className="xten-mypage-section-head">
          <div>
            <span>MY IMAGES</span>

            <h2>내 이미지</h2>

            <p>내가 업로드한 이미지입니다.</p>
          </div>

          <strong>{images.length}개</strong>
        </div>

        {loadingImages ? (
          <div className="xten-mypage-loading">
            <div className="xten-v2-spinner" />
          </div>
        ) : images.length === 0 ? (
          <div className="xten-mypage-empty">
            <span>IMAGE</span>

            <h3>아직 업로드한 이미지가 없습니다.</h3>

            <p>이미지를 업로드하면 이곳에서 확인할 수 있습니다.</p>
          </div>
        ) : (
          <div className="xten-mypage-image-grid">
            {images.map((image) => {
              const imageUrl = image.image_url || image.url || image.imageUrl;

              return (
                <article
                  key={image.id}
                  className="xten-mypage-image-card"
                  onClick={() => onSelectImage?.(image.id)}
                >
                  <div className="xten-mypage-image-thumb">
                    {imageUrl ? (
                      <img src={imageUrl} alt={image.title || "이미지"} />
                    ) : (
                      <div>IMAGE</div>
                    )}
                  </div>

                  <div className="xten-mypage-image-info">
                    <h3>{image.title || "제목 없음"}</h3>

                    {image.description && <p>{image.description}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default MyPage;
