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

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSession = async () => {
    const {
      data: { session: currentSession },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("세션 조회 오류:", error);
    }

    setSession(currentSession);

    if (currentSession?.user) {
      await loadProfile(currentSession.user.id);
    }

    setLoading(false);
  };

  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("프로필 조회 오류:", error);

      setProfile(null);
      return;
    }

    setProfile(data);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("로그아웃 오류:", error);
      return;
    }

    setSession(null);
    setProfile(null);

    setPage("home");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

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

  const openAdmin = () => {
    setPage("admin");

    setSelectedVideo(null);
    setSelectedImage(null);
  };

  const openVideo = (videoId) => {
    setSelectedVideo(videoId);
    setSelectedImage(null);

    setPage("video-detail");
  };

  const openImage = (imageId) => {
    setSelectedImage(imageId);
    setSelectedVideo(null);

    setPage("image-detail");
  };

  const goBackToImages = () => {
    setSelectedImage(null);
    setPage("images");
  };

  const goBackToHome = () => {
    setSelectedVideo(null);
    setPage("home");
  };

  if (loading) {
    return (
      <div className="xten-v2-loading-screen">
        <div className="xten-v2-spinner" />
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="xten-v2-app">
      {/* NAVBAR */}
      <header className="xten-v2-navbar">
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
              page === "mypage" ? "xten-v2-nav-item active" : "xten-v2-nav-item"
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

        <div className="xten-v2-nav-right">
          <button
            type="button"
            className="xten-v2-avatar"
            onClick={openProfile}
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

      {/* CONTENT */}
      <main className="xten-v2-main">
        {page === "home" && (
          <Home onSelectVideo={openVideo} onSelectImage={openImage} />
        )}

        {page === "images" && <Images onSelectImage={openImage} />}

        {page === "image-detail" && selectedImage && (
          <ImageDetail imageId={selectedImage} onBack={goBackToImages} />
        )}

        {page === "upload" && <Upload onDone={openHome} />}

        {page === "video-detail" && selectedVideo && (
          <VideoDetail videoId={selectedVideo} onBack={goBackToHome} />
        )}

        {page === "profile" && (
          <Profile
            profile={profile}
            onProfileUpdated={() => {
              if (session?.user?.id) {
                loadProfile(session.user.id);
              }
            }}
          />
        )}

        {page === "mypage" && (
          <MyPage
            profile={profile}
            onSelectVideo={openVideo}
            onSelectImage={openImage}
          />
        )}

        {page === "myvideos" && <MyVideos onSelectVideo={openVideo} />}

        {page === "admin" && profile?.role === "admin" && <Admin />}
      </main>
    </div>
  );
}

export default App;
