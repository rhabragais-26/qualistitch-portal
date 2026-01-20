
export const initialProductGroupMapping = {
  'Executive Jacket 1': 'GroupA',
  'Executive Jacket v2 (with lines)': 'GroupA',
  'Turtle Neck Jacket': 'GroupA',
  'Reversible v1': 'GroupB',
  'Reversible v2': 'GroupB',
  'Corporate Jacket': 'GroupC',
  'Polo Shirt (Smilee) - Cool Pass': 'GroupD',
  'Polo Shirt (Smilee) - Cotton Blend': 'GroupD',
  'Polo Shirt (Lifeline)': 'GroupE',
  'Polo Shirt (Blue Corner)': 'GroupE',
  'Polo Shirt (Softex)': 'GroupF',
};

export const initialPricingTiers = {
  GroupA: {
    logo: {
      tiers: [
        { min: 1, max: 3, price: 1299 },
        { min: 4, max: 10, price: 999 },
        { min: 11, max: 50, price: 899 },
        { min: 51, max: 200, price: 849 },
        { min: 201, max: 300, price: 799 },
        { min: 301, max: 999, price: 749 },
        { min: 1000, max: Infinity, price: 699 },
      ],
    },
    name: {
      tiers: [
        { min: 1, max: 3, price: 1299 },
        { min: 4, max: 10, price: 999 },
        { min: 11, max: 50, price: 899 },
        { min: 51, max: 200, price: 849 },
        { min: 201, max: 300, price: 799 },
        { min: 301, max: 999, price: 749 },
        { min: 1000, max: Infinity, price: 699 },
      ],
    },
    logoAndText: {
      tiers: [
        { min: 1, max: 3, price: 1399 },
        { min: 4, max: 10, price: 1099 },
        { min: 11, max: 50, price: 999 },
        { min: 51, max: 200, price: 949 },
        { min: 201, max: 300, price: 899 },
        { min: 301, max: 999, price: 849 },
        { min: 1000, max: Infinity, price: 799 },
      ],
    },
  },
  GroupB: {
    logo: { tiers: [ { min: 1, max: 3, price: 1599 }, { min: 4, max: 10, price: 1299 }, { min: 11, max: 50, price: 1199 }, { min: 51, max: 200, price: 1149 }, { min: 201, max: 300, price: 1099 }, { min: 301, max: 999, price: 1049 }, { min: 1000, max: Infinity, price: 999 }, ], },
    name: { tiers: [ { min: 1, max: 3, price: 1599 }, { min: 4, max: 10, price: 1299 }, { min: 11, max: 50, price: 1199 }, { min: 51, max: 200, price: 1149 }, { min: 201, max: 300, price: 1099 }, { min: 301, max: 999, price: 1049 }, { min: 1000, max: Infinity, price: 999 }, ], },
    logoAndText: { tiers: [ { min: 1, max: 3, price: 1599 }, { min: 4, max: 10, price: 1399 }, { min: 11, max: 50, price: 1299 }, { min: 51, max: 200, price: 1249 }, { min: 201, max: 300, price: 1199 }, { min: 301, max: 999, price: 1149 }, { min: 1000, max: Infinity, price: 1099 }, ], },
  },
  GroupC: {
    logo: { tiers: [ { min: 1, max: 3, price: 1399 }, { min: 4, max: 10, price: 1099 }, { min: 11, max: 50, price: 999 }, { min: 51, max: 200, price: 949 }, { min: 201, max: 300, price: 899 }, { min: 301, max: 999, price: 849 }, { min: 1000, max: Infinity, price: 799 }, ], },
    name: { tiers: [ { min: 1, max: 3, price: 1399 }, { min: 4, max: 10, price: 1099 }, { min: 11, max: 50, price: 999 }, { min: 51, max: 200, price: 949 }, { min: 201, max: 300, price: 899 }, { min: 301, max: 999, price: 849 }, { min: 1000, max: Infinity, price: 799 }, ], },
    logoAndText: { tiers: [ { min: 1, max: 3, price: 1499 }, { min: 4, max: 10, price: 1199 }, { min: 11, max: 50, price: 1099 }, { min: 51, max: 200, price: 1049 }, { min: 201, max: 300, price: 999 }, { min: 301, max: 999, price: 849 }, { min: 1000, max: Infinity, price: 899 }, ], },
  },
  GroupD: {
    logo: { tiers: [ { min: 1, max: 3, price: 899 }, { min: 4, max: 10, price: 849 }, { min: 11, max: 50, price: 799 }, { min: 51, max: 200, price: 749 }, { min: 201, max: 300, price: 699 }, { min: 301, max: 999, price: 649 }, { min: 1000, max: Infinity, price: 599 }, ], },
    name: { tiers: [ { min: 1, max: 3, price: 899 }, { min: 4, max: 10, price: 849 }, { min: 11, max: 50, price: 799 }, { min: 51, max: 200, price: 749 }, { min: 201, max: 300, price: 699 }, { min: 301, max: 999, price: 649 }, { min: 1000, max: Infinity, price: 599 }, ], },
    logoAndText: { tiers: [ { min: 1, max: 3, price: 999 }, { min: 4, max: 10, price: 949 }, { min: 11, max: 50, price: 899 }, { min: 51, max: 200, price: 849 }, { min: 201, max: 300, price: 799 }, { min: 301, max: 999, price: 749 }, { min: 1000, max: Infinity, price: 699 }, ], },
  },
  GroupE: {
    logo: { tiers: [ { min: 1, max: 3, price: 899 }, { min: 4, max: 10, price: 799 }, { min: 11, max: 50, price: 699 }, { min: 51, max: 200, price: 649 }, { min: 201, max: 300, price: 599 }, { min: 301, max: 999, price: 549 }, { min: 1000, max: Infinity, price: 499 }, ], },
    name: { tiers: [ { min: 1, max: 3, price: 899 }, { min: 4, max: 10, price: 799 }, { min: 11, max: 50, price: 699 }, { min: 51, max: 200, price: 649 }, { min: 201, max: 300, price: 599 }, { min: 301, max: 999, price: 549 }, { min: 1000, max: Infinity, price: 499 }, ], },
    logoAndText: { tiers: [ { min: 1, max: 3, price: 999 }, { min: 4, max: 10, price: 899 }, { min: 11, max: 50, price: 799 }, { min: 51, max: 200, price: 749 }, { min: 201, max: 300, price: 699 }, { min: 301, max: 999, price: 649 }, { min: 1000, max: Infinity, price: 599 }, ], },
  },
  GroupF: {
    logo: { tiers: [ { min: 1, max: 3, price: 699 }, { min: 4, max: 10, price: 649 }, { min: 11, max: 50, price: 599 }, { min: 51, max: 200, price: 549 }, { min: 201, max: 300, price: 499 }, { min: 301, max: 999, price: 449 }, { min: 1000, max: Infinity, price: 399 }, ], },
    name: { tiers: [ { min: 1, max: 3, price: 699 }, { min: 4, max: 10, price: 649 }, { min: 11, max: 50, price: 599 }, { min: 51, max: 200, price: 549 }, { min: 201, max: 300, price: 499 }, { min: 301, max: 999, price: 449 }, { min: 1000, max: Infinity, price: 399 }, ], },
    logoAndText: { tiers: [ { min: 1, max: 3, price: 799 }, { min: 4, max: 10, price: 749 }, { min: 11, max: 50, price: 699 }, { min: 51, max: 200, price: 649 }, { min: 201, max: 300, price: 599 }, { min: 301, max: 999, price: 549 }, { min: 1000, max: Infinity, price: 499 }, ], },
  },
};

export const initialAddOnPricing = {
  backLogo: { tiers: [ { min: 1, max: 3, price: 200 }, { min: 4, max: 10, price: 100 }, { min: 11, max: Infinity, price: 50 }, ], },
  names: { tiers: [ { min: 1, max: Infinity, price: 100 }, ], },
  plusSize: { tiers: [{ min: 1, max: Infinity, price: 100 }], },
  programFeeLogo: { tiers: [{ min: 1, max: Infinity, price: 500 }], },
  programFeeBackText: { tiers: [{ min: 1, max: Infinity, price: 300 }], },
  rushFee: { tiers: [], },
  shippingFee: { tiers: [], }
};

export const initialPricingConfig = {
    productGroupMapping: initialProductGroupMapping,
    pricingTiers: initialPricingTiers,
    addOnPricing: initialAddOnPricing,
}
