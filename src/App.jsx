import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import Auth from "./Auth";

import Home from "./pages/Home";
import Images from "./pages/Images";
import ImageDetail from "./pages/ImageDetail";

import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import VideoDetail from "./pages/VideoDetail";
import MyPage from "./pages/MyPage";
import MyVideos from "./pages/MyVideos";
import Admin from "./pages/Admin";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState("home");

  const [selectedVideo, setSelectedVideo] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);

  /*
   * ========================================
   * SESSION
   * ========================================
   */

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("세션 조회 오류:", error);
      }

      setSession(currentSession);

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    initialize();

    /*
     * 인증 상태가 변경되었을 때
     * 현재 화면의 사용자 정보도 함께 갱신
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (!newSession?.user) {
        setProfile(null);

        setPage("home");

        setSelectedVideo(null);
        setSelectedImage(null);

        setLoading(false);

        return;
      }

      /*
       * auth 콜백 내부에서 바로 다른 Supabase
       * 요청을 겹치게 하지 않도록 다음 tick에서 실행
       */
      setTimeout(async () => {
        if (!mounted) return;

        await loadProfile(newSession.user.id);

        if (mounted) {
          setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * ========================================
   * PROFILE
   * ========================================
   */

  const loadProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("프로필 조회 오류:", error);

      setProfile(null);

      return null;
    }

    setProfile(data || null);

    return data || null;
  };

  const refreshProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      return;
    }

    await loadProfile(user.id);
  };

  /*
   * ========================================
   * LOGOUT
   * ========================================
   */

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("로그아웃 오류:", error);

      alert("로그아웃에 실패했습니다.\n\n" + error.message);

      return;
    }

    setSession(null);
    setProfile(null);

    setPage("home");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

  /*
   * ========================================
   * PAGE NAVIGATION
   * ========================================
   */

  const openHome = () => {
    setPage("home");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

  const openImages = () => {
    setPage("images");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

  const openUpload = () => {
    setPage("upload");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

  const openProfile = () => {
    setPage("profile");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

  const openMyPage = () => {
    setPage("mypage");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

  const openMyVideos = () => {
    setPage("myvideos");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

  const openAdmin = () => {
    if (profile?.role !== "admin") {
      setPage("home");
      return;
    }

    setPage("admin");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

  /*
   * ========================================
   * VIDEO
   * ========================================
   */

  const openVideo = (videoId) => {
    if (!videoId) return;

    setSelectedVideo(videoId);
    setSelectedImage(null);

    setPage("video-detail");
  };

  const goBackToHome = () => {
    setSelectedVideo(null);
    setPage("home");
  };

  /*
   * ========================================
   * IMAGE
   * ========================================
   */

  const openImage = (imageId) => {
    if (!imageId) return;

    setSelectedImage(imageId);
    setSelectedVideo(null);

    setPage("image-detail");
  };

  const goBackToImages = () => {
    setSelectedImage(null);
    setPage("images");
  };

  /*
   * ========================================
   * LOADING
   * ========================================
   */

  if (loading) {
    return (
      <div className="xten-v2-loading-screen">
        <div className="xten-v2-spinner" />

        <p>불러오는 중...</p>
      </div>
    );
  }

  /*
   * ========================================
   * AUTH
   * ========================================
   */

  if (!session) {
    return <Auth />;
  }

  /*
   * ========================================
   * APP
   * ========================================
   */

  return (
    <div className="xten-v2-app">
      {/* =====================================
          NAVBAR
      ====================================== */}

      <header className="xten-v2-navbar">
        {/* LOGO */}

        <div
          className="xten-v2-logo"
          onClick={openHome}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              openHome();
            }
          }}
        >
          <span className="xten-v2-logo-x">X</span>

          <span className="xten-v2-logo-ten">TEN</span>
        </div>

        {/* NAV */}

        <nav className="xten-v2-nav">
          <button
            type="button"
            className={
              page === "home" ? "xten-v2-nav-item active" : "xten-v2-nav-item"
            }
            onClick={openHome}
          >
            홈
          </button>

          <button
            type="button"
            className={
              page === "images" || page === "image-detail"
                ? "xten-v2-nav-item active"
                : "xten-v2-nav-item"
            }
            onClick={openImages}
          >
            이미지
          </button>

          <button
            type="button"
            className={
              page === "upload" ? "xten-v2-nav-item active" : "xten-v2-nav-item"
            }
            onClick={openUpload}
          >
            업로드
          </button>

          <button
            type="button"
            className={
              page === "mypage" || page === "myvideos"
                ? "xten-v2-nav-item active"
                : "xten-v2-nav-item"
            }
            onClick={openMyPage}
          >
            마이페이지
          </button>

          {profile?.role === "admin" && (
            <button
              type="button"
              className={
                page === "admin"
                  ? "xten-v2-nav-item active"
                  : "xten-v2-nav-item"
              }
              onClick={openAdmin}
            >
              관리자
            </button>
          )}
        </nav>

        {/* RIGHT */}

        <div className="xten-v2-nav-right">
          <button
            type="button"
            className="xten-v2-avatar"
            onClick={openProfile}
            aria-label="프로필"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="프로필" />
            ) : (
              <span>
                {(profile?.display_name || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          <button
            type="button"
            className="xten-v2-logout"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* =====================================
          CONTENT
      ====================================== */}

      <main className="xten-v2-main">
        {/* HOME */}

        {page === "home" && (
          <Home
            onSelectVideo={openVideo}
            onSelectImage={openImage}
            onOpenImages={openImages}
          />
        )}

        {/* IMAGE LIST */}

        {page === "images" && <Images onSelectImage={openImage} />}

        {/* IMAGE DETAIL */}

        {page === "image-detail" && selectedImage && (
          <ImageDetail imageId={selectedImage} onBack={goBackToImages} />
        )}

        {/* UPLOAD */}

        {page === "upload" && <Upload onDone={openHome} />}

        {/* VIDEO DETAIL */}

        {page === "video-detail" && selectedVideo && (
          <VideoDetail videoId={selectedVideo} onBack={goBackToHome} />
        )}

        {/* PROFILE */}

        {page === "profile" && (
          <Profile profile={profile} onProfileUpdated={refreshProfile} />
        )}

        {/* MY PAGE */}

        {page === "mypage" && (
          <MyPage
            profile={profile}
            onSelectVideo={openVideo}
            onSelectImage={openImage}
            onProfileUpdated={refreshProfile}
          />
        )}

        {/* MY VIDEOS */}

        {page === "myvideos" && <MyVideos onSelectVideo={openVideo} />}

        {/* ADMIN */}

        {page === "admin" && profile?.role === "admin" && <Admin />}
      </main>
    </div>
  );
}

export default App;
