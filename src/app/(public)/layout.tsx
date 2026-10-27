import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import BottomNav from '@/components/public/BottomNav';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lmn-site min-h-screen bg-bg text-ink">
      <Navbar />
      {children}
      <Footer />
      <BottomNav />
    </div>
  );
}
