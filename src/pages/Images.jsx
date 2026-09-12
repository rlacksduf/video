import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Images({ onSelectImage }) {
  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("image_posts")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("이미지 조회 오류:", error);

      setImages([]);
    } else {
      setImages(data || []);
    }

    setLoading(false);
  };

  return (
    <div className="xten-v2-gallery">
      <section className="xten-v2-gallery-header">
        <div>
          <span>IMAGE</span>

          <h1>이미지 갤러리</h1>

          <p>업로드된 이미지를 한곳에서 확인하세요.</p>
        </div>

        <strong>{images.length}개</strong>
      </section>

      {loading ? (
        <div className="xten-v2-loading-box">
          <div className="xten-v2-spinner" />
          <p>이미지를 불러오는 중...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="xten-v2-empty-box large">
          <strong>아직 이미지가 없습니다.</strong>

          <p>업로드된 이미지가 없습니다.</p>
        </div>
      ) : (
        <div className="xten-v2-gallery-grid">
          {images.map((image) => {
            const imageUrl = image.image_url || image.url || image.imageUrl;

            return (
              <article
                key={image.id}
                className="xten-v2-image-card"
                onClick={() => onSelectImage(image.id)}
              >
                <div className="xten-v2-image-thumb">
                  {imageUrl ? (
                    <img src={imageUrl} alt={image.title || "이미지"} />
                  ) : (
                    <div>IMAGE</div>
                  )}

                  <span className="xten-v2-image-open">보기</span>
                </div>

                <div className="xten-v2-image-info">
                  <h3>{image.title || "제목 없음"}</h3>

                  {image.description && <p>{image.description}</p>}

                  <span>
                    {image.created_at
                      ? new Date(image.created_at).toLocaleDateString("ko-KR")
                      : ""}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Images;
