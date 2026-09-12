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
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("회원가입 성공! 이메일 인증을 완료해주세요.");

    setLoading(false);
  };

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
      setErrorMessage(error.message || "재설정 이메일을 보내지 못했습니다.");

      setLoading(false);
      return;
    }

    setMessage("비밀번호 재설정 이메일을 보냈습니다. 이메일을 확인해주세요.");

    setLoading(false);
  };

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
      setErrorMessage(error.message || "비밀번호 변경에 실패했습니다.");

      setLoading(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    await supabase.auth.signOut();

    setMessage("비밀번호가 변경되었습니다. 다시 로그인해주세요.");

    setMode("login");
    setLoading(false);
  };

  const renderLogin = () => (
    <>
      <div className="xten-auth-brand">
        <div className="xten-auth-logo">
          Xten<span>.</span>
        </div>

        <p>영상과 콘텐츠를 즐기는 공간</p>
      </div>

      <div className="xten-auth-heading">
        <span>WELCOME BACK</span>
        <h1>로그인</h1>
        <p>계정에 로그인하여 Xten을 이용하세요.</p>
      </div>

      <form onSubmit={handleLogin} className="xten-auth-form">
        <div className="xten-field">
          <label>이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력하세요"
            className="xten-input"
          />
        </div>

        <div className="xten-field">
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className="xten-input"
          />
        </div>

        <button type="submit" disabled={loading} className="xten-auth-submit">
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="xten-auth-links">
        <button
          type="button"
          onClick={() => {
            clearMessages();
            setMode("signup");
          }}
        >
          회원가입
        </button>

        <span>·</span>

        <button
          type="button"
          onClick={() => {
            clearMessages();
            setMode("resetRequest");
          }}
        >
          비밀번호 찾기
        </button>
      </div>
    </>
  );

  const renderSignup = () => (
    <>
      <div className="xten-auth-heading">
        <span>JOIN XTEN</span>
        <h1>회원가입</h1>
        <p>Xten 계정을 만들어보세요.</p>
      </div>

      <form onSubmit={handleSignUp} className="xten-auth-form">
        <div className="xten-field">
          <label>이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력하세요"
            className="xten-input"
          />
        </div>

        <div className="xten-field">
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            className="xten-input"
          />
        </div>

        <button type="submit" disabled={loading} className="xten-auth-submit">
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <div className="xten-auth-back">
        <button
          type="button"
          onClick={() => {
            clearMessages();
            setMode("login");
          }}
        >
          로그인으로 돌아가기
        </button>
      </div>

      <p className="xten-auth-help">
        가입 후 입력한 이메일로 인증 메일이 전송됩니다.
      </p>
    </>
  );

  const renderResetRequest = () => (
    <>
      <div className="xten-auth-heading">
        <span>ACCOUNT</span>
        <h1>비밀번호 찾기</h1>
        <p>가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</p>
      </div>

      <form onSubmit={handleResetRequest} className="xten-auth-form">
        <div className="xten-field">
          <label>이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="가입한 이메일"
            className="xten-input"
          />
        </div>

        <button type="submit" disabled={loading} className="xten-auth-submit">
          {loading ? "전송 중..." : "재설정 이메일 보내기"}
        </button>
      </form>

      <div className="xten-auth-back">
        <button
          type="button"
          onClick={() => {
            clearMessages();
            setMode("login");
          }}
        >
          로그인으로 돌아가기
        </button>
      </div>
    </>
  );

  const renderResetPassword = () => (
    <>
      <div className="xten-auth-heading">
        <span>SECURITY</span>
        <h1>새 비밀번호</h1>
        <p>새롭게 사용할 비밀번호를 설정하세요.</p>
      </div>

      <form onSubmit={handleNewPassword} className="xten-auth-form">
        <div className="xten-field">
          <label>새 비밀번호</label>

          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="6자 이상"
            className="xten-input"
          />
        </div>

        <div className="xten-field">
          <label>새 비밀번호 확인</label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="새 비밀번호 다시 입력"
            className="xten-input"
          />
        </div>

        <button type="submit" disabled={loading} className="xten-auth-submit">
          {loading ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </>
  );

  return (
    <div className="xten-auth-page">
      <div className="xten-auth-glow" />

      <div className="xten-auth-card">
        {mode === "login" && renderLogin()}
        {mode === "signup" && renderSignup()}
        {mode === "resetRequest" && renderResetRequest()}
        {mode === "resetPassword" && renderResetPassword()}

        {message && <div className="xten-success">{message}</div>}

        {errorMessage && <div className="xten-error">{errorMessage}</div>}
      </div>
    </div>
  );
}

export default Auth;
