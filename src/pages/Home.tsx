import React from 'react';
import Banner from '../components/Banner';
import Cards from '../components/Cards';
import Testimonials from '../components/Testimonials';
import FloatingApplyButton from '../components/FloatingApplyButton';

const Home: React.FC = () => {
  return (
    <>
      <Banner />
      <Cards />
      <Testimonials />
      <FloatingApplyButton />
    </>
  );
};

export default Home;
