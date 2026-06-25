import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/** Przycisk logowania przez Google. */
export default function GoogleLoginButton() {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        if (!credentialResponse.credential) {
          toast.error('Brak danych logowania Google.');
          return;
        }
        try {
          await googleLogin(credentialResponse.credential);
          navigate('/');
        } catch {
          toast.error('Logowanie przez Google nie powiodło się.');
        }
      }}
      onError={() => toast.error('Logowanie przez Google nie powiodło się.')}
      locale="pl"
      width="320"
    />
  );
}
