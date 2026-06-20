import LoadingState from './loading_state.jsx'
import LoginCard from './login_card.jsx'
import { useLanguage } from '../i18n.jsx'

function AuthGate({ auth, children }) {
  const { t } = useLanguage()

  if (auth.isLoading) {
    return (
      <section className="page-section auth-page">
        <LoadingState title={t('auth.loadingTitle')} description={t('auth.loadingDescription')} />
      </section>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <section className="page-section auth-page">
        <LoginCard
          error={auth.isConfigured ? auth.error : t('auth.configMissing')}
          isLoading={auth.isSigningIn}
          onSignIn={auth.signInWithGoogle}
        />
      </section>
    )
  }

  return children
}

export default AuthGate
