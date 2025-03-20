import React, { useState, useEffect } from 'react';
import { useCurrencyStore } from '../store/currencyStore';
import { CurrencyDetails } from '../store/enquiryStore';

interface CurrencyProps {
  addCurrency: (currency: CurrencyDetails | undefined) => void;
  initialCurrency?: CurrencyDetails;
}

export default function Currency({ addCurrency, initialCurrency }: CurrencyProps) {
  const { currencies, loading, fetchCurrencies } = useCurrencyStore();
  const [selectedCurrency, setSelectedCurrency] = useState<string>(initialCurrency?.id || '');

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  useEffect(() => {
    if (currencies.length > 0 && !initialCurrency) {
      // Set the default currency to the first element in the currencies array
      const defaultCurrency = currencies[0];
      setSelectedCurrency(defaultCurrency.id || "");
      addCurrency({
        id: defaultCurrency.id!,
        name: defaultCurrency.name,
        symbol: defaultCurrency.symbol,
        mandatory: defaultCurrency.mandatory,
      });
    } else if (initialCurrency) {
      // If an initial currency is provided, set it as the selected currency
      setSelectedCurrency(initialCurrency.id);
    }
  }, [currencies, initialCurrency, addCurrency]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCurrency(value);
    
    if (!value) {
      addCurrency(undefined);
      return;
    }

    const selectedCurrency = currencies.find(c => c.id === value);
    if (selectedCurrency) {
      addCurrency({
        id: selectedCurrency.id!,
        name: selectedCurrency.name,
        symbol: selectedCurrency.symbol,
        mandatory: selectedCurrency.mandatory,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Currency</h3>
      </div>

      <div className="relative">
        <select
          value={selectedCurrency}
          onChange={handleCurrencyChange}
          disabled={loading}
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
        >
          <option value="">Select Currency</option>
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.name} ({currency.symbol})
              {currency.mandatory ? ' *' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}