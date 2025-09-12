import { useState } from 'react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import RaffleBanner from '../components/user/RaffleBanner';
import NumberSelection from '../components/user/NumberSelection';
import RegistrationForm from '../components/user/RegistrationForm';
import SuccessModal from '../components/shared/SuccessModal';

function HomePage() {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successNumber, setSuccessNumber] = useState<number | null>(null);

  const handleRegistrationSuccess = () => {
    setSuccessNumber(selectedNumber);
    setShowSuccess(true);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8">
      <Header />
      <main className="flex-grow">
        <RaffleBanner />
        <NumberSelection onSelectNumber={setSelectedNumber} selectedNumber={selectedNumber} />
        <RegistrationForm selectedNumber={selectedNumber} onSuccess={handleRegistrationSuccess} />
      </main>
      
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="🎉 Cadastro Realizado!"
        message="Seu número foi reservado com sucesso! Agora você pode acessar 'Meus Números' para solicitar números extras e aumentar suas chances de ganhar."
        selectedNumber={successNumber || undefined}
        autoClose={false}
        autoCloseTime={8000}
      />
      
      <Footer />
    </div>
  );
}

export default HomePage;