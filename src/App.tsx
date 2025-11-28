import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import WhyUs from './pages/WhyUs';
import Services from './pages/Services';
import AboutUs from './pages/AboutUs';
import Contact from './pages/Contact';
import ApplicationForm from './components/ApplicationForm';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans text-gray-900">
        <Navbar />
        <main className="grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/why-us" element={<WhyUs />} />
            <Route path="/services" element={<Services />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/apply" element={<div className="pt-24 pb-12 px-4"><ApplicationForm /></div>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
