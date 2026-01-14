
export type ProductGroup = 'GroupA' | 'GroupB' | 'GroupC';
export type EmbroideryOption = 'logo' | 'logoAndText';

const productGroupMapping: { [key: string]: ProductGroup } = {
  'Executive Jacket 1': 'GroupA',
  'Executive Jacket v2 (with lines)': 'GroupA',
  'Turtle Neck Jacket': 'GroupA',
  'Reversible v1': 'GroupB',
  'Reversible v2': 'GroupB',
  'Corporate Jacket': 'GroupC',
};

const pricingTiers: {
  [key in ProductGroup]: {
    [key in EmbroideryOption]: {
      tiers: { min: number; max: number; price: number }[];
    };
  };
} = {
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
    logo: {
      tiers: [
        { min: 1, max: 3, price: 1599 },
        { min: 4, max: 10, price: 1299 },
        { min: 11, max: 50, price: 1199 },
        { min: 51, max: 200, price: 1149 },
        { min: 201, max: 300, price: 1099 },
        { min: 301, max: 999, price: 1049 },
        { min: 1000, max: Infinity, price: 999 },
      ],
    },
    logoAndText: {
      tiers: [
        { min: 1, max: 3, price: 1599 },
        { min: 4, max: 10, price: 1399 },
        { min: 11, max: 50, price: 1299 },
        { min: 51, max: 200, price: 1249 },
        { min: 201, max: 300, price: 1199 },
        { min: 301, max: 999, price: 1149 },
        { min: 1000, max: Infinity, price: 1099 },
      ],
    },
  },
  GroupC: {
    logo: {
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
    logoAndText: {
      tiers: [
        { min: 1, max: 3, price: 1499 },
        { min: 4, max: 10, price: 1199 },
        { min: 11, max: 50, price: 1099 },
        { min: 51, max: 200, price: 1049 },
        { min: 201, max: 300, price: 999 },
        { min: 301, max: 999, price: 849 },
        { min: 1000, max: Infinity, price: 899 },
      ],
    },
  },
};

export const getProductGroup = (productType: string): ProductGroup | null => {
  return productGroupMapping[productType] || null;
};

export const getUnitPrice = (productType: string, quantity: number, embroidery: EmbroideryOption): number => {
  const group = getProductGroup(productType);
  if (!group) return 0;

  const pricing = pricingTiers[group][embroidery];
  const tier = pricing.tiers.find(t => quantity >= t.min && quantity <= t.max);

  return tier ? tier.price : 0;
};

export const getTierLabel = (productType: string, quantity: number, embroidery: EmbroideryOption): string => {
  const group = getProductGroup(productType);
  if (!group) return '';

  const pricing = pricingTiers[group][embroidery];
  const tier = pricing.tiers.find(t => quantity >= t.min && quantity <= t.max);

  if (!tier) return '';

  if (tier.max === Infinity) {
    return `${tier.min} pcs & above`;
  }
  if (tier.min === tier.max) {
      return `${tier.min} pc(s)`;
  }
  return `${tier.min}–${tier.max} pcs`;
};

export const getProgrammingFees = (quantity: number, embroidery: EmbroideryOption): { logoFee: number; backTextFee: number } => {
  if (quantity >= 1 && quantity <= 3) {
    const logoFee = 500;
    const backTextFee = embroidery === 'logoAndText' ? 300 : 0;
    return { logoFee, backTextFee };
  }
  return { logoFee: 0, backTextFee: 0 };
};
