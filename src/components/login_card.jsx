import { Waveform } from "@phosphor-icons/react";
import { useLanguage } from "../i18n.jsx";
import "../styles/auth.css";

function LoginCard({ error = "", isLoading = false, mode = "page", onSignIn }) {
  const { t } = useLanguage();

  return (
    <section
      className={`login-card login-card-${mode}`}
      aria-label="Google sign in"
    >
      <div className="login-card-brand">
        <Waveform size={48} weight="bold" />
        <strong>Musee</strong>
      </div>

      <p>{t("auth.loginDescription")}</p>

      {error ? <span className="login-card-error">{error}</span> : null}

      <button
        className="google-login-button"
        type="button"
        disabled={isLoading}
        onClick={onSignIn}
      >
        <span className="google-mark" aria-hidden="true">
          G
        </span>
        {isLoading ? t("auth.connecting") : t("auth.loginWithGoogle")}
      </button>
    </section>
  );
}

export default LoginCard;
