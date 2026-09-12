import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Profile() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

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

  const loadProfile = async () => {
    setLoading(true);

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
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("프로필 조회 오류:", error);
      setErrorMessage("프로필을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    setDisplayName(data?.display_name || "사용자");

    setAvatarUrl(data?.avatar_url || "");

    setLoading(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("프로필 사진은 5MB 이하로 올려주세요.");
      return;
    }

    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));

    setMessage("");
    setErrorMessage("");
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!displayName.trim()) {
      setErrorMessage("닉네임을 입력해주세요.");
      return;
    }

    setSavingProfile(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인 정보를 확인해주세요.");
      }

      let newAvatarUrl = avatarUrl;

      if (avatarFile) {
        const extension =
          avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";

        const filePath = `${user.id}/avatar.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: avatarFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        newAvatarUrl = `${publicUrl}?t=${Date.now()}`;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          avatar_url: newAvatarUrl,
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      setMessage("프로필이 저장되었습니다.");
    } catch (error) {
      console.error("프로필 수정 오류:", error);

      setErrorMessage(error.message || "프로필 수정에 실패했습니다.");
    } finally {
      setSavingProfile(false);
    }
  };

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
      setErrorMessage(error.message);
      setChangingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    setMessage("비밀번호가 변경되었습니다.");

    setChangingPassword(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage("로그아웃에 실패했습니다.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "정말 계정을 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
    );

    if (!confirmed) return;

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

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      setErrorMessage("계정 탈퇴 처리 중 오류가 발생했습니다.");
      setDeletingAccount(false);
      return;
    }

    await supabase.auth.signOut();

    setDeletingAccount(false);
    setMessage("계정 탈퇴 처리가 완료되었습니다.");
  };

  if (loading) {
    return (
      <div className="xten-content-loading">
        <div className="xten-spinner" />
        <p>프로필 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="xten-profile">
      <div className="xten-page-head">
        <div>
          <div className="xten-home-kicker">ACCOUNT</div>

          <h1 className="xten-page-title">프로필</h1>

          <p className="xten-page-description">
            계정과 보안 정보를 관리하세요.
          </p>
        </div>
      </div>

      <div className="xten-profile-layout">
        <section className="xten-card xten-profile-main">
          <div className="xten-card-heading">
            <div>
              <span>PROFILE</span>
              <h2>프로필 정보</h2>
            </div>
          </div>

          <div className="xten-avatar-section">
            <div className="xten-large-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="프로필" />
              ) : (
                <span>{displayName?.charAt(0) || "U"}</span>
              )}
            </div>

            <div className="xten-avatar-info">
              <strong>{displayName || "사용자"}</strong>

              <p>프로필 사진은 5MB 이하의 이미지를 사용할 수 있습니다.</p>

              <label className="xten-outline-button">
                사진 변경
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  hidden
                />
              </label>
            </div>
          </div>

          <div className="xten-divider" />

          <form onSubmit={handleProfileSave}>
            <div className="xten-profile-block">
              <div className="xten-block-title">
                <span>01</span>
                <div>
                  <strong>기본 정보</strong>
                  <p>닉네임과 이메일</p>
                </div>
              </div>

              <div className="xten-form-stack">
                <div className="xten-field">
                  <label>이메일</label>

                  <input
                    value={email}
                    disabled
                    className="xten-input xten-input-disabled"
                  />
                </div>

                <div className="xten-field">
                  <label>닉네임</label>

                  <input
                    value={displayName}
                    maxLength={30}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="xten-input"
                    placeholder="닉네임"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="xten-btn xten-btn-primary"
              >
                {savingProfile ? "저장 중..." : "프로필 저장"}
              </button>
            </div>
          </form>

          <div className="xten-divider" />

          <form onSubmit={handlePasswordChange}>
            <div className="xten-profile-block">
              <div className="xten-block-title">
                <span>02</span>
                <div>
                  <strong>비밀번호</strong>
                  <p>안전한 비밀번호로 계정을 보호하세요.</p>
                </div>
              </div>

              <div className="xten-form-stack">
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
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="xten-btn"
              >
                {changingPassword ? "변경 중..." : "비밀번호 변경"}
              </button>
            </div>
          </form>

          {message && <div className="xten-success">{message}</div>}

          {errorMessage && <div className="xten-error">{errorMessage}</div>}
        </section>

        <aside className="xten-profile-side">
          <section className="xten-card xten-account-card">
            <div className="xten-card-heading">
              <div>
                <span>ACCOUNT</span>
                <h2>계정 관리</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="xten-btn xten-full-button"
            >
              로그아웃
            </button>
          </section>

          <section className="xten-danger-card">
            <div className="xten-danger-icon">!</div>

            <div>
              <span>DELETE ACCOUNT</span>
              <h3>계정 탈퇴</h3>

              <p>프로필 정보가 삭제되며 이 작업은 되돌릴 수 없습니다.</p>
            </div>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? "처리 중..." : "계정 탈퇴"}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Profile;
