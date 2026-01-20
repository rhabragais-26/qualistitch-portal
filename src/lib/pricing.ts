

// This type represents the structure of the pricing configuration stored in Firestore.
export type PricingConfig = {
  productGroupMapping: { [key: string]: ProductGroup };
  pricingTiers: {
    [key in ProductGroup]: {
      [key in 'logo' | 'logoAndText']: {
        tiers: { min: number; max: number; price: number }[];
      };
    };
  };
  addOnPricing: {
    [key in AddOnType]: { tiers: { min: number; max: number; price: number }[] };
  };
};

export type ProductGroup = 'GroupA' | 'GroupB' | 'GroupC' | 'GroupD' | 'GroupE' | 'GroupF';
export type EmbroideryOption = 'logo' | 'logoAndText' | 'name';
export type AddOnType = 'backLogo' | 'names' | 'programFeeLogo' | 'programFeeBackText' | 'rushFee' | 'plusSize' | 'shippingFee';


export const getProductGroup = (productType: string, pricingConfig: PricingConfig): ProductGroup | null => {
  if (productType === 'Patches') return null; // Patches do not belong to a group for tier pricing
  return pricingConfig.productGroupMapping[productType] || null;
};

export const getUnitPrice = (
  productType: string,
  quantity: number,
  embroidery: EmbroideryOption,
  pricingConfig: PricingConfig,
  patchPrice: number = 0,
  orderType?: 'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services'
): number => {
  if (productType === 'Client Owned') return 0;
  if (productType === 'Patches') return patchPrice;

  const group = getProductGroup(productType, pricingConfig);
  if (!group) return 0;
  
  const embroideryForPricing = embroidery === 'name' ? 'logo' : (embroidery || 'logo');

  if (orderType === 'MTO' && group === 'GroupD' && quantity < 51) {
    return embroideryForPricing === 'logo' ? 799 : 899;
  }
  
  if (orderType === 'MTO' && group === 'GroupE' && quantity < 51) {
    return embroideryForPricing === 'logo' ? 699 : 799;
  }

  if (orderType === 'MTO' && group === 'GroupF' && quantity < 51) {
    return embroideryForPricing === 'logo' ? 599 : 699;
  }

  const pricing = pricingConfig.pricingTiers[group]?.[embroideryForPricing];
  if (!pricing) return 0;
  const tier = pricing.tiers.find(t => quantity >= t.min && quantity <= t.max);

  return tier ? tier.price : 0;
};

export const getAddOnPrice = (addOnType: AddOnType, quantity: number, pricingConfig: PricingConfig): number => {
  const pricing = pricingConfig.addOnPricing[addOnType];
  if (!pricing) return 0;
  const tier = pricing.tiers.find(t => quantity >= t.min && quantity <= t.max);
  return tier ? tier.price : 0;
};


export const getTierLabel = (productType: string, quantity: number, embroidery: EmbroideryOption, pricingConfig: PricingConfig): string => {
  if (productType === 'Client Owned' || productType === 'Patches') {
      return 'N/A';
  }
  
  const group = getProductGroup(productType, pricingConfig);
  if (!group) return '';

  const embroideryForPricing = embroidery === 'name' ? 'logo' : (embroidery || 'logo');
  const pricing = pricingConfig.pricingTiers[group]?.[embroideryForPricing];

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
