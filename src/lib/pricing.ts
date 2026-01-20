

export type ProductGroup = 'GroupA' | 'GroupB' | 'GroupC' | 'GroupD' | 'GroupE' | 'GroupF';
export type EmbroideryOption = 'logo' | 'logoAndText' | 'name';
export type AddOnType = 'backLogo' | 'names' | 'programFeeLogo' | 'programFeeBackText' | 'rushFee' | 'plusSize';

const productGroupMapping: { [key: string]: ProductGroup } = {
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

const pricingTiers: {
  [key in ProductGroup]: {
    [key in 'logo' | 'logoAndText']: {
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
  GroupD: {
    logo: {
      tiers: [
        { min: 1, max: 3, price: 899 },
        { min: 4, max: 10, price: 849 },
        { min: 11, max: 50, price: 799 },
        { min: 51, max: 200, price: 749 },
        { min: 201, max: 300, price: 699 },
        { min: 301, max: 999, price: 649 },
        { min: 1000, max: Infinity, price: 599 },
      ],
    },
    logoAndText: {
      tiers: [
        { min: 1, max: 3, price: 999 },
        { min: 4, max: 10, price: 949 },
        { min: 11, max: 50, price: 899 },
        { min: 51, max: 200, price: 849 },
        { min: 201, max: 300, price: 799 },
        { min: 301, max: 999, price: 749 },
        { min: 1000, max: Infinity, price: 699 },
      ],
    },
  },
  GroupE: {
    logo: {
      tiers: [
        { min: 1, max: 3, price: 899 },
        { min: 4, max: 10, price: 799 },
        { min: 11, max: 50, price: 699 },
        { min: 51, max: 200, price: 649 },
        { min: 201, max: 300, price: 599 },
        { min: 301, max: 999, price: 549 },
        { min: 1000, max: Infinity, price: 499 },
      ],
    },
    logoAndText: {
      tiers: [
        { min: 1, max: 3, price: 999 },
        { min: 4, max: 10, price: 899 },
        { min: 11, max: 50, price: 799 },
        { min: 51, max: 200, price: 749 },
        { min: 201, max: 300, price: 699 },
        { min: 301, max: 999, price: 649 },
        { min: 1000, max: Infinity, price: 599 },
      ],
    },
  },
  GroupF: {
    logo: {
      tiers: [
        { min: 1, max: 3, price: 699 },
        { min: 4, max: 10, price: 649 },
        { min: 11, max: 50, price: 599 },
        { min: 51, max: 200, price: 549 },
        { min: 201, max: 300, price: 499 },
        { min: 301, max: 999, price: 449 },
        { min: 1000, max: Infinity, price: 399 },
      ],
    },
    logoAndText: {
      tiers: [
        { min: 1, max: 3, price: 799 },
        { min: 4, max: 10, price: 749 },
        { min: 11, max: 50, price: 699 },
        { min: 51, max: 200, price: 649 },
        { min: 201, max: 300, price: 599 },
        { min: 301, max: 999, price: 549 },
        { min: 1000, max: Infinity, price: 499 },
      ],
    },
  },
};

const addOnPricing: {
  [key in AddOnType]: { tiers: { min: number; max: number; price: number }[] };
} = {
  backLogo: {
    tiers: [
      { min: 1, max: 3, price: 200 },
      { min: 4, max: 10, price: 100 },
      { min: 11, max: Infinity, price: 50 },
    ],
  },
  names: {
    tiers: [
      { min: 1, max: 10, price: 100 },
      { min: 11, max: Infinity, price: 50 },
    ],
  },
  plusSize: {
    tiers: [{ min: 1, max: Infinity, price: 100 }],
  },
  programFeeLogo: {
    tiers: [{ min: 1, max: Infinity, price: 500 }],
  },
  programFeeBackText: {
    tiers: [{ min: 1, max: Infinity, price: 300 }],
  },
  rushFee: {
    tiers: [],
  },
  shippingFee: {
    tiers: [],
  }
};

export const getProductGroup = (productType: string): ProductGroup | null => {
  if (productType === 'Patches') return null; // Patches do not belong to a group for tier pricing
  return productGroupMapping[productType] || null;
};

export const getUnitPrice = (
  productType: string,
  quantity: number,
  embroidery: EmbroideryOption,
  patchPrice: number = 0,
  orderType?: 'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services'
): number => {
  if (productType === 'Client Owned') return 0;
  if (productType === 'Patches') return patchPrice;

  const group = getProductGroup(productType);
  if (!group) return 0;
  
  const embroideryForPricing = embroidery === 'name' ? 'logo' : (embroidery || 'logo');

  if (orderType === 'MTO' && group === 'GroupD' && quantity < 51) {
    if (embroideryForPricing === 'logo') {
      return 799;
    }
    if (embroideryForPricing === 'logoAndText') {
      return 899;
    }
  }
  
  if (orderType === 'MTO' && group === 'GroupE' && quantity < 51) {
    if (embroideryForPricing === 'logo') {
      return 699;
    }
    if (embroideryForPricing === 'logoAndText') {
      return 799;
    }
  }

  if (orderType === 'MTO' && group === 'GroupF' && quantity < 51) {
    if (embroideryForPricing === 'logo') {
      return 599;
    }
    if (embroideryForPricing === 'logoAndText') {
      return 699;
    }
  }

  const pricing = pricingTiers[group][embroideryForPricing];
  if (!pricing) return 0;
  const tier = pricing.tiers.find(t => quantity >= t.min && quantity <= t.max);

  return tier ? tier.price : 0;
};

export const getAddOnPrice = (addOnType: AddOnType, quantity: number): number => {
  const pricing = addOnPricing[addOnType];
  const tier = pricing.tiers.find(t => quantity >= t.min && quantity <= t.max);
  return tier ? tier.price : 0;
};


export const getTierLabel = (productType: string, quantity: number, embroidery: EmbroideryOption): string => {
  if (productType === 'Client Owned' || productType === 'Patches') {
      return 'N/A';
  }
  
  const group = getProductGroup(productType);
  if (!group) return '';

  const embroideryForPricing = embroidery === 'name' ? 'logo' : (embroidery || 'logo');
  const pricing = pricingTiers[group][embroideryForPricing];

  if (!pricing) return '';

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

export const getProgrammingFees = (
  quantity: number,
  embroidery: EmbroideryOption,
  isClientOwned: boolean = false,
  orderType?: 'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services'
): { logoFee: number; backTextFee: number } => {
  const specialOrderTypes = ["Services", "MTO", "Stock (Jacket Only)"];
  if (orderType && specialOrderTypes.includes(orderType)) {
    return { logoFee: 0, backTextFee: 0 };
  }
  
  if (embroidery === 'name') {
    return { logoFee: 0, backTextFee: 0 };
  }

  if (isClientOwned) {
    const logoFee = 500;
    const backTextFee = embroidery === 'logoAndText' ? 300 : 0;
    return { logoFee, backTextFee };
  }
  
  if (quantity >= 1 && quantity <= 3) {
    const logoFee = 500;
    const backTextFee = embroidery === 'logoAndText' ? 300 : 0;
    return { logoFee, backTextFee };
  }
  return { logoFee: 0, backTextFee: 0 };
};
