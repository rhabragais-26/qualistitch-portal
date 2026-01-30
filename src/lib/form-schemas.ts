import * as z from 'zod';

export const orderSchema = z.object({
  id: z.string().optional(), // Keep track of original order if needed
  productType: z.string().min(1, "Product type cannot be empty."),
  color: z.string().min(1, "Color cannot be empty."),
  size: z.string().min(1, "Size cannot be empty."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  embroidery: z.enum(['logo', 'logoAndText', 'name']).optional(),
  pricePerPatch: z.number().optional(),
});

export type Order = z.infer<typeof orderSchema>;

const baseFormSchema = z.object({
  customerName: z.string().min(1, {message: 'Customer name is required'}),
  companyName: z.string().optional(),
  mobileNo: z.string().optional(),
  mobileNo2: z.string().optional(),
  landlineNo: z.string().optional(),
  isInternational: z.boolean().default(false),
  houseStreet: z.string().optional(),
  barangay: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  internationalAddress: z.string().optional(),
  courier: z.string().optional(),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services', 'Item Sample'], {required_error: "You need to select an order type."}),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
  orders: z.array(orderSchema).min(1, "Please add at least one order."),
});


export const formSchema = baseFormSchema.refine(data => {
    if (data.mobileNo) return /^\d{4}-\d{3}-\d{4}$/.test(data.mobileNo) || data.mobileNo === '';
    return true;
}, {
    message: "Mobile number must be in 0000-000-0000 format.",
    path: ["mobileNo"],
}).refine(data => {
    if (data.mobileNo2) return /^\d{4}-\d{3}-\d{4}$/.test(data.mobileNo2) || data.mobileNo2 === '';
    return true;
}, {
    message: "Mobile number must be in 0000-000-0000 format.",
    path: ["mobileNo2"],
}).refine(data => {
    if (data.landlineNo) return /^\d{2}-\d{4}-\d{4}$/.test(data.landlineNo) || data.landlineNo === '';
    return true;
}, {
    message: "Landline number must be in 00-0000-0000 format.",
    path: ["landlineNo"],
}).superRefine((data, ctx) => {
    if (data.isInternational) {
      if (!data.internationalAddress || data.internationalAddress.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['internationalAddress'],
          message: 'International address is required.',
        });
      }
    } else {
      if (!data.houseStreet || data.houseStreet.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['houseStreet'],
          message: 'House No., Street, Village, Landmark & Others is required.',
        });
      }
      if (!data.barangay) {
        // Allow custom barangay, so no check here
      }
      if (!data.city) {
         // Allow custom city
      }
      if (!data.province || data.province.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['province'],
          message: 'Province is required.',
        });
      }
    }
  });

export type FormValues = z.infer<typeof formSchema>;

export const quotationFormSchema = baseFormSchema.extend({
  customerName: z.string().optional(),
  houseStreet: z.string().optional(),
  barangay: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  priorityType: z.enum(['Rush', 'Regular']).optional(),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services', 'Item Sample']).optional(),
  orders: z.array(orderSchema).optional(),
});

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;