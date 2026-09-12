import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function ImageDetail({ imageId, onBack }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadImage();
  }, [imageId]);

  const loadImage = async () => {
    if (!imageId) {
      setImage(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("image_posts")
      .select("*")
      .eq("id", imageId)
      .single();

    if (error) {
      console.error("이미지 상세 조회 오류:", error);
      setImage(null);
    } else {
      setImage(data);
    }

    setLoading(false);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: image?.title || "XTEN 이미지",
          url: window.location.href,
        });

        return;
      }

      await navigator.clipboard.writeText(window.location.href);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("공유 오류:", error);
    }
  };

  if (loading) {
    return (
      <div className="xten-v2-loading-box large">
        <div className="xten-v2-spinner" />
        <p>이미지를 불러오는 중...</p>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="xten-v2-empty-box large">
        <strong>이미지를 찾을 수 없습니다.</strong>

        <p>삭제되었거나 존재하지 않는 이미지입니다.</p>

        <button
          type="button"
          className="xten-v2-primary-button"
          onClick={onBack}
        >
          돌아가기
        </button>
      </div>
    );
  }

  const imageUrl = image.image_url || image.url || image.imageUrl;

  return (
    <div className="xten-v2-image-detail">
      <div className="xten-v2-detail-top">
        <button type="button" className="xten-v2-back-button" onClick={onBack}>
          ← 돌아가기
        </button>

        <span>XTEN IMAGE</span>
      </div>

      <section className="xten-v2-viewer">
        {imageUrl ? (
          <img src={imageUrl} alt={image.title || "업로드 이미지"} />
        ) : (
          <div className="xten-v2-no-image">
            <strong>IMAGE</strong>
            <p>이미지를 불러올 수 없습니다.</p>
          </div>
        )}
      </section>

      <section className="xten-v2-image-detail-info">
        <div className="xten-v2-detail-title-row">
          <div>
            <span>IMAGE</span>

            <h1>{image.title || "제목 없음"}</h1>

            {image.created_at && (
              <p>{new Date(image.created_at).toLocaleDateString("ko-KR")}</p>
            )}
          </div>

          <button
            type="button"
            className="xten-v2-share-button"
            onClick={handleShare}
          >
            {copied ? "복사됨" : "공유"}
          </button>
        </div>

        {image.description && (
          <div className="xten-v2-description">
            <strong>설명</strong>

            <p>{image.description}</p>
          </div>
        )}

        {Array.isArray(image.tags) && image.tags.length > 0 && (
          <div className="xten-v2-tags">
            {image.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ImageDetail;
