import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

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
          <div className="hidden md:flex space-x-6">
            <Link to="/" className="text-gray-700 hover:text-black px-3 py-2 rounded-md text-sm font-medium">Home</Link>
            <Link to="/why-us" className="text-gray-700 hover:text-black px-3 py-2 rounded-md text-sm font-medium">Why Us?</Link>
            <Link to="/services" className="text-gray-700 hover:text-black px-3 py-2 rounded-md text-sm font-medium">Services</Link>
            <Link to="/about-us" className="text-gray-700 hover:text-black px-3 py-2 rounded-md text-sm font-medium">About Us</Link>
            <Link to="/contact" className="text-gray-700 hover:text-black px-3 py-2 rounded-md text-sm font-medium">Contact</Link>
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
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
            <Link to="/" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium" onClick={toggleMenu}>Home</Link>
            <Link to="/why-us" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium" onClick={toggleMenu}>Why Us?</Link>
            <Link to="/services" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium" onClick={toggleMenu}>Services</Link>
            <Link to="/about-us" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium" onClick={toggleMenu}>About Us</Link>
            <Link to="/contact" className="text-gray-700 hover:text-black block px-3 py-2 rounded-md text-base font-medium" onClick={toggleMenu}>Contact</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
