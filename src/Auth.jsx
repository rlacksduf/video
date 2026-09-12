import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function Auth() {
  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [loading, setLoading] = useState(false);

  // 이메일 인증 후 / 비밀번호 재설정 링크로
  // 돌아왔는지 확인
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("resetPassword");
        setMessage("새로운 비밀번호를 입력해주세요.");
        setErrorMessage("");
      }

      if (event === "SIGNED_IN") {
        setErrorMessage("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
  };

  // =========================
  // 로그인
  // =========================
  const handleLogin = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!email.trim() || !password) {
      setErrorMessage("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("로그인 오류:", error);

      setErrorMessage(
        error.message === "Email not confirmed"
          ? "이메일 인증을 먼저 완료해주세요."
          : "이메일 또는 비밀번호가 올바르지 않습니다.",
      );

      setLoading(false);
      return;
    }

    setMessage("로그인 성공!");
    setLoading(false);
  };

  // =========================
  // 회원가입
  // =========================
  const handleSignUp = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!email.trim() || !password) {
      setErrorMessage("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("회원가입 오류:", error);

      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("회원가입 성공! 이메일 인증을 완료해주세요.");

    setLoading(false);
  };

  // =========================
  // 비밀번호 재설정 이메일
  // =========================
  const handleResetRequest = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!email.trim()) {
      setErrorMessage("가입한 이메일을 입력해주세요.");
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error("비밀번호 재설정 요청 오류:", error);

      setErrorMessage(error.message || "재설정 이메일을 보내지 못했습니다.");

      setLoading(false);
      return;
    }

    setMessage("비밀번호 재설정 이메일을 보냈습니다. 이메일을 확인해주세요.");

    setLoading(false);
  };

  // =========================
  // 새 비밀번호 설정
  // =========================
  const handleNewPassword = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!newPassword || !confirmPassword) {
      setErrorMessage("새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("비밀번호 변경 오류:", error);

      setErrorMessage(error.message || "비밀번호 변경에 실패했습니다.");

      setLoading(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    setMessage("비밀번호가 변경되었습니다. 다시 로그인해주세요.");

    await supabase.auth.signOut();

    setMode("login");
    setLoading(false);
  };

  // =========================
  // 로그인 화면
  // =========================
  const renderLogin = () => {
    return (
      <>
        <h1>로그인</h1>

        <form onSubmit={handleLogin}>
          <div style={styles.field}>
            <label style={styles.label}>이메일</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>비밀번호</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div style={styles.links}>
          <button
            onClick={() => {
              clearMessages();
              setMode("signup");
            }}
            style={styles.linkButton}
          >
            회원가입
          </button>

          <button
            onClick={() => {
              clearMessages();
              setMode("resetRequest");
            }}
            style={styles.linkButton}
          >
            비밀번호 찾기
          </button>
        </div>
      </>
    );
  };

  // =========================
  // 회원가입 화면
  // =========================
  const renderSignup = () => {
    return (
      <>
        <h1>회원가입</h1>

        <form onSubmit={handleSignUp}>
          <div style={styles.field}>
            <label style={styles.label}>이메일</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>비밀번호</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <div style={styles.links}>
          <button
            onClick={() => {
              clearMessages();
              setMode("login");
            }}
            style={styles.linkButton}
          >
            로그인으로 돌아가기
          </button>
        </div>

        <p style={styles.helpText}>
          가입 후 입력한 이메일로 인증 메일이 전송됩니다.
        </p>
      </>
    );
  };

  // =========================
  // 비밀번호 찾기
  // =========================
  const renderResetRequest = () => {
    return (
      <>
        <h1>비밀번호 찾기</h1>

        <p style={styles.helpText}>
          가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
        </p>

        <form onSubmit={handleResetRequest}>
          <div style={styles.field}>
            <label style={styles.label}>이메일</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="가입한 이메일"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? "전송 중..." : "재설정 이메일 보내기"}
          </button>
        </form>

        <div style={styles.links}>
          <button
            onClick={() => {
              clearMessages();
              setMode("login");
            }}
            style={styles.linkButton}
          >
            로그인으로 돌아가기
          </button>
        </div>
      </>
    );
  };

  // =========================
  // 새 비밀번호
  // =========================
  const renderResetPassword = () => {
    return (
      <>
        <h1>새 비밀번호 설정</h1>

        <form onSubmit={handleNewPassword}>
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

          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {mode === "login" && renderLogin()}

        {mode === "signup" && renderSignup()}

        {mode === "resetRequest" && renderResetRequest()}

        {mode === "resetPassword" && renderResetPassword()}

        {message && <div style={styles.success}>{message}</div>}

        {errorMessage && <div style={styles.error}>{errorMessage}</div>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: "20px",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    boxSizing: "border-box",
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
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
  },

  primaryButton: {
    width: "100%",
    padding: "13px",
    border: "none",
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
  },

  links: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    marginTop: "18px",
  },

  linkButton: {
    border: "none",
    backgroundColor: "transparent",
    color: "#555",
    cursor: "pointer",
    padding: "5px",
  },

  helpText: {
    color: "#777",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  success: {
    marginTop: "18px",
    padding: "12px",
    backgroundColor: "#eef8ee",
    color: "#267326",
    borderRadius: "8px",
    fontSize: "14px",
  },

  error: {
    marginTop: "18px",
    padding: "12px",
    backgroundColor: "#fff0f0",
    color: "#c00",
    borderRadius: "8px",
    fontSize: "14px",
  },
};

export default Auth;
