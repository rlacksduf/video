import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Profile() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  // =========================
  // 프로필 불러오기
  // =========================
  const loadProfile = async () => {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("로그인 정보를 가져오지 못했습니다.");
      setLoading(false);
      return;
    }

    setEmail(user.email || "");

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("프로필 조회 오류:", error);
      setErrorMessage("프로필을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    setDisplayName(data?.display_name || "사용자");
    setLoading(false);
  };

  // =========================
  // 프로필 수정
  // =========================
  const handleProfileSave = async (e) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setErrorMessage("닉네임을 입력해주세요.");
      return;
    }

    setSavingProfile(true);
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("로그인 정보를 확인해주세요.");
      setSavingProfile(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("프로필 수정 오류:", error);
      setErrorMessage("프로필 수정에 실패했습니다.");
      setSavingProfile(false);
      return;
    }

    setMessage("프로필 수정 완료!");
    setSavingProfile(false);
  };

  // =========================
  // 비밀번호 변경
  // =========================
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!newPassword) {
      setErrorMessage("새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("비밀번호는 6자 이상으로 입력해주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("비밀번호 변경 오류:", error);
      setErrorMessage(error.message || "비밀번호 변경에 실패했습니다.");
      setChangingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    setMessage("비밀번호가 변경되었습니다.");
    setChangingPassword(false);
  };

  // =========================
  // 로그아웃
  // =========================
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("로그아웃 오류:", error);
      setErrorMessage("로그아웃에 실패했습니다.");
    }
  };

  // =========================
  // 계정 탈퇴
  // =========================
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "정말 계정을 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingAccount(true);
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("로그인 정보를 확인해주세요.");
      setDeletingAccount(false);
      return;
    }

    /*
      중요:
      Supabase 클라이언트에서는 auth.users를 직접 삭제할 수 없다.
      그래서 여기서는 먼저 profiles와 사용자 관련 데이터를 삭제하고
      마지막에 로그아웃한다.

      auth.users 자체를 완전히 삭제하려면
      Supabase Edge Function + service_role 같은 서버 측 처리가 필요하다.
    */

    // 사용자 프로필 삭제
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      console.error("프로필 삭제 오류:", profileError);
      setErrorMessage("계정 탈퇴 처리 중 오류가 발생했습니다.");
      setDeletingAccount(false);
      return;
    }

    // 로그아웃
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      console.error("탈퇴 후 로그아웃 오류:", logoutError);
    }

    setDeletingAccount(false);
    setMessage("계정 탈퇴 처리가 완료되었습니다.");
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>프로필 불러오는 중...</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>프로필</h1>

        {/* =========================
            기본 정보
        ========================= */}
        <section style={styles.section}>
          <h2>기본 정보</h2>

          <div style={styles.field}>
            <label style={styles.label}>이메일</label>

            <input value={email} disabled style={styles.disabledInput} />
          </div>

          <form onSubmit={handleProfileSave}>
            <div style={styles.field}>
              <label style={styles.label}>닉네임</label>

              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={styles.input}
                maxLength={30}
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              style={styles.primaryButton}
            >
              {savingProfile ? "저장 중..." : "프로필 저장"}
            </button>
          </form>
        </section>

        <hr />

        {/* =========================
            비밀번호 변경
        ========================= */}
        <section style={styles.section}>
          <h2>비밀번호 변경</h2>

          <form onSubmit={handlePasswordChange}>
            <div style={styles.field}>
              <label style={styles.label}>새 비밀번호</label>

              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6자 이상"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>새 비밀번호 확인</label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              style={styles.primaryButton}
            >
              {changingPassword ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </section>

        <hr />

        {/* 메시지 */}
        {message && <div style={styles.success}>{message}</div>}

        {errorMessage && <div style={styles.error}>{errorMessage}</div>}

        {/* =========================
            계정 관리
        ========================= */}
        <section style={styles.section}>
          <h2>계정 관리</h2>

          <button onClick={handleLogout} style={styles.secondaryButton}>
            로그아웃
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            style={styles.dangerButton}
          >
            {deletingAccount ? "탈퇴 처리 중..." : "계정 탈퇴"}
          </button>
        </section>
      </div>
    </div>
  );
}

const styles = {
  center: {
    minHeight: "300px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    maxWidth: "700px",
    margin: "0 auto",
  },

  card: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.06)",
  },

  section: {
    margin: "25px 0",
  },

  field: {
    marginBottom: "18px",
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
    fontSize: "15px",
  },

  disabledInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "15px",
    backgroundColor: "#f3f3f3",
    color: "#777",
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
    color: "#111",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    marginRight: "10px",
  },

  dangerButton: {
    border: "none",
    backgroundColor: "#d11",
    color: "#fff",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  success: {
    backgroundColor: "#eef8ee",
    color: "#267326",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "15px",
  },

  error: {
    backgroundColor: "#fff0f0",
    color: "#c00",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "15px",
  },
};

export default Profile;
