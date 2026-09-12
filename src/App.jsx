import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import Auth from "./Auth";
import Profile from "./pages/Profile";
import Upload from "./pages/Upload";
import Home from "./pages/Home";
import VideoDetail from "./pages/VideoDetail";
import MyPage from "./pages/MyPage";
import MyVideos from "./pages/MyVideos";
import Admin from "./pages/Admin";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState("home");
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  const ensureProfile = async (user) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("프로필 조회 오류:", error);
      return;
    }

    if (data) {
      setProfile(data);
      return;
    }

    const displayName =
      user.user_metadata?.display_name || user.email?.split("@")[0] || "사용자";

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        display_name: displayName,
      })
      .select()
      .single();

    if (insertError) {
      console.error("프로필 생성 오류:", insertError);
      return;
    }

    setProfile(newProfile);
  };

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);

      if (session?.user) {
        await ensureProfile(session.user);
      }

      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user) {
        await ensureProfile(session.user);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("로그아웃 오류:", error);
      return;
    }

    setSession(null);
    setProfile(null);
    setPage("home");
    setSelectedVideoId(null);
  };

  const openVideo = (videoId) => {
    setSelectedVideoId(videoId);
    setPage("video");
  };

  const goHome = () => {
    setSelectedVideoId(null);
    setPage("home");
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>Xten 불러오는 중...</h2>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logo} onClick={goHome}>
          Xten
        </div>

        <nav style={styles.nav}>
          <button style={styles.navButton} onClick={goHome}>
            홈
          </button>

          <button style={styles.navButton} onClick={() => setPage("upload")}>
            업로드
          </button>

          <button style={styles.navButton} onClick={() => setPage("profile")}>
            프로필
          </button>

          <button style={styles.navButton} onClick={() => setPage("mypage")}>
            마이페이지
          </button>

          <button style={styles.navButton} onClick={() => setPage("myvideos")}>
            내 영상
          </button>

          {profile?.role === "admin" && (
            <button style={styles.adminButton} onClick={() => setPage("admin")}>
              관리자
            </button>
          )}

          <button style={styles.logoutButton} onClick={handleLogout}>
            로그아웃
          </button>
        </nav>
      </header>

      <main style={styles.main}>
        {page === "home" && <Home onSelectVideo={openVideo} />}

        {page === "upload" && <Upload />}

        {page === "profile" && <Profile />}

        {page === "mypage" && <MyPage onSelectVideo={openVideo} />}

        {page === "myvideos" && <MyVideos onSelectVideo={openVideo} />}

        {page === "admin" && <Admin />}

        {page === "video" && selectedVideoId && (
          <VideoDetail videoId={selectedVideoId} onBack={goHome} />
        )}
      </main>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },

  header: {
    minHeight: "64px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e5e5e5",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 30px",
    boxSizing: "border-box",
    gap: "20px",
    flexWrap: "wrap",
  },

  logo: {
    fontSize: "24px",
    fontWeight: "800",
    cursor: "pointer",
    letterSpacing: "-1px",
  },

  nav: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  navButton: {
    border: "none",
    backgroundColor: "transparent",
    padding: "9px 12px",
    cursor: "pointer",
    fontSize: "14px",
  },

  adminButton: {
    border: "none",
    backgroundColor: "#6d28d9",
    color: "#fff",
    padding: "9px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "14px",
  },

  logoutButton: {
    border: "none",
    backgroundColor: "#111",
    color: "#fff",
    padding: "9px 14px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "14px",
  },

  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

export default App;
