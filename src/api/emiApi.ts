export const calculateEmi = async (
  loanAmount: number,
  interestRate: number,
  years: number,
  startDate?: string
) => {
  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  const apiHost = import.meta.env.VITE_RAPIDAPI_HOST;

  if (!apiKey || !apiHost) {
    throw new Error('API configuration is missing. Please check your .env file.');
  }

  const encodedParams = new URLSearchParams();
  encodedParams.append('loan_amount', String(loanAmount));
  encodedParams.append('interest_rate', String(interestRate));
  encodedParams.append('loan_term', String(years));

  if (startDate) {
    encodedParams.append('start_date', startDate);
  }

  const options = {
    method: 'POST',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: encodedParams
  };

  const response = await fetch(`https://${apiHost}/`, options);

  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }

  return await response.json();
};
