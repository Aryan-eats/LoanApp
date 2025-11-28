export interface FeaturedLoan {
  title: string;
  category: string;
  description: string;
  image: string;
}

export const featuredLoans: FeaturedLoan[] = [
  {
    title: 'Home Loan',
    category: 'Home Loans',
    description: 'Get the keys to your dream home with our competitive interest rates.',
    image: '/homeloan.png',
  },
  {
    title: 'Car Loan',
    category: 'Vehicle Loans',
    description: 'Drive away in your new car sooner with our fast approval process.',
    image: '/carloan.png',
  },
  {
    title: 'Personal Loan',
    category: 'Personal Loans',
    description: 'Flexible personal loans for travel, weddings, or unexpected expenses.',
    image: '/personalloan.png',
  },
  {
    title: 'Business Loan',
    category: 'Business Loans',
    description: 'Fuel your business growth with capital tailored to your needs.',
    image: '/businessloan.png',
  },
];
