import React from 'react';
import Banner from '../components/Banner';
import Cards from '../components/Cards';
import Testimonials from '../components/Testimonials';

const Home: React.FC = () => {
  return (
    <>
      <Banner />
      <Cards />
      <Testimonials />
    </>
  );
};

export default Home;
