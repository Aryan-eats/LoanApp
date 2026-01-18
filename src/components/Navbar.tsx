import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Home, ShieldCheck, Briefcase, Calculator, Info, Phone, Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className={`bg-white shadow-md fixed w-full z-50 top-0 left-0 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="shrink-0 flex items-center">
            <Link to="/">
              <img src="/logo.png" alt="Logo" className="h-16 w-auto" />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-4">
            <Link to="/" className="text-gray-700 hover:text-black px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1.5">
              <Home size={16} /> Home
            </Link>
            <Link to="/why-us" className="text-gray-700 hover:text-black px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1.5">
              <ShieldCheck size={16} /> Why Us?
            </Link>
            <Link to="/services" className="text-gray-700 hover:text-black px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1.5">
              <Briefcase size={16} /> Services
            </Link>
            <Link to="/calculator" className="text-gray-700 hover:text-black px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1.5">
              <Calculator size={16} /> EMI Calculator
            </Link>
            <Link to="/about-us" className="text-gray-700 hover:text-black px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1.5">
              <Info size={16} /> About Us
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-black px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1.5">
              <Phone size={16} /> Contact
            </Link>
            <Link to="/login" className="bg-black text-white hover:bg-gray-800 font-semibold py-2 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 ml-2">
              Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={toggleMenu}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-black focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <Menu size={24} />
              ) : (
                <X size={24} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
            <Link to="/" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2" onClick={toggleMenu}>
              <Home size={20} /> Home
            </Link>
            <Link to="/why-us" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2" onClick={toggleMenu}>
              <ShieldCheck size={20} /> Why Us?
            </Link>
            <Link to="/services" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2" onClick={toggleMenu}>
              <Briefcase size={20} /> Services
            </Link>
            <Link to="/calculator" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2" onClick={toggleMenu}>
              <Calculator size={20} /> EMI Calculator
            </Link>
            <Link to="/about-us" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2" onClick={toggleMenu}>
              <Info size={20} /> About Us
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2" onClick={toggleMenu}>
              <Phone size={20} /> Contact
            </Link>
            <Link to="/login" className="bg-black text-white hover:bg-gray-800 block px-3 py-2 rounded-full text-base font-semibold text-center mt-2" onClick={toggleMenu}>
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
