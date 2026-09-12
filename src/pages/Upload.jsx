import { useState } from "react";
import { supabase } from "../lib/supabase";

function Upload() {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("기타");
  const [tags, setTags] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!supabase) {
      setMessage("Supabase 연결을 확인해주세요.");
      return;
    }

    if (!videoFile) {
      setMessage("영상을 선택해주세요.");
      return;
    }

    if (!title.trim()) {
      setMessage("영상 제목을 입력해주세요.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 현재 로그인한 사용자 가져오기
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      // 파일 확장자
      const videoExtension =
        videoFile.name.split(".").pop()?.toLowerCase() || "mp4";

      // 고유 파일 이름
      const videoFileName = `${user.id}/${crypto.randomUUID()}.${videoExtension}`;

      // 1. 영상 업로드
      const { error: videoUploadError } = await supabase.storage
        .from("videos")
        .upload(videoFileName, videoFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: videoFile.type,
        });

      if (videoUploadError) {
        throw videoUploadError;
      }

      // 2. 영상 공개 URL 가져오기
      const {
        data: { publicUrl: videoUrl },
      } = supabase.storage.from("videos").getPublicUrl(videoFileName);

      // 3. 썸네일 업로드
      let thumbnailUrl = null;

      if (thumbnailFile) {
        const thumbnailExtension =
          thumbnailFile.name.split(".").pop()?.toLowerCase() || "jpg";

        const thumbnailFileName = `${user.id}/${crypto.randomUUID()}.${thumbnailExtension}`;

        const { error: thumbnailUploadError } = await supabase.storage
          .from("thumbnails")
          .upload(thumbnailFileName, thumbnailFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: thumbnailFile.type,
          });

        if (thumbnailUploadError) {
          throw thumbnailUploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("thumbnails").getPublicUrl(thumbnailFileName);

        thumbnailUrl = publicUrl;
      }

      // 4. 태그 문자열 → 배열
      const tagArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");

      // 5. DB에 영상 정보 저장
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

      if (insertError) {
        throw insertError;
      }

      setMessage("영상 업로드 성공!");

      // 입력값 초기화
      setVideoFile(null);
      setThumbnailFile(null);
      setTitle("");
      setDescription("");
      setCategory("기타");
      setTags("");

      // 파일 input 초기화를 위해 key 변경 대신 form reset을 사용하려면
      // 아래처럼 직접 DOM을 건드리지 않아도 되지만,
      // 현재는 메시지와 상태 초기화만 처리한다.
    } catch (error) {
      console.error(error);
      setMessage(error.message || "업로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>영상 업로드</h1>

        <form onSubmit={handleUpload}>
          {/* 영상 */}
          <div style={styles.field}>
            <label style={styles.label}>영상 파일</label>

            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                setVideoFile(e.target.files?.[0] || null);
              }}
            />

            {videoFile && (
              <p style={styles.fileInfo}>선택된 영상: {videoFile.name}</p>
            )}
          </div>

          {/* 썸네일 */}
          <div style={styles.field}>
            <label style={styles.label}>썸네일</label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setThumbnailFile(e.target.files?.[0] || null);
              }}
            />

            {thumbnailFile && (
              <p style={styles.fileInfo}>선택된 썸네일: {thumbnailFile.name}</p>
            )}
          </div>

          {/* 제목 */}
          <div style={styles.field}>
            <label style={styles.label}>제목</label>

            <input
              type="text"
              placeholder="영상 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              maxLength={200}
            />
          </div>

          {/* 설명 */}
          <div style={styles.field}>
            <label style={styles.label}>설명</label>

            <textarea
              placeholder="영상 설명을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
              rows={6}
            />
          </div>

          {/* 카테고리 */}
          <div style={styles.field}>
            <label style={styles.label}>카테고리</label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={styles.input}
            >
              <option value="기타">기타</option>
              <option value="게임">게임</option>
              <option value="음악">음악</option>
              <option value="스포츠">스포츠</option>
              <option value="교육">교육</option>
              <option value="브이로그">브이로그</option>
              <option value="엔터테인먼트">엔터테인먼트</option>
              <option value="뉴스">뉴스</option>
            </select>
          </div>

          {/* 태그 */}
          <div style={styles.field}>
            <label style={styles.label}>태그</label>

            <input
              type="text"
              placeholder="예: 축구, 손흥민, 하이라이트"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={styles.input}
            />

            <p style={styles.help}>태그는 쉼표(,)로 구분하세요.</p>
          </div>

          {/* 업로드 버튼 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "업로드 중..." : "영상 업로드"}
          </button>
        </form>

        {/* 결과 메시지 */}
        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "40px 20px",
  },

  card: {
    maxWidth: "700px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
  },

  title: {
    marginBottom: "30px",
  },

  field: {
    marginBottom: "22px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
  },

  textarea: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
    resize: "vertical",
  },

  button: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#111",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },

  fileInfo: {
    marginTop: "8px",
    fontSize: "14px",
    color: "#666",
  },

  help: {
    marginTop: "6px",
    fontSize: "13px",
    color: "#777",
  },

  message: {
    marginTop: "20px",
    padding: "12px",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
  },
};

export default Upload;
