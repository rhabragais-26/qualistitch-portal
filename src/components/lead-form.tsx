

"use client";

import * as React from "react"
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, useFieldArray} from 'react-hook-form';
import * as z from 'zod';
import {useState, useEffect, useMemo} from 'react';

import {Button} from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {
  AlertTriangle,
  Building,
  CreditCard,
  Home,
  PackageCheck,
  Phone,
  PhoneForwarded,
  ShoppingBag,
  Truck,
  User,
  UserCheck,
  X,
  PlusCircle,
  Plus,
  Minus,
  CalculatorIcon,
  Ruler,
  Edit,
  Trash2,
} from 'lucide-react';
import {RadioGroup, RadioGroupItem} from './ui/radio-group';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import locations from '@/lib/ph-locations.json';
import { StatusBanner } from '@/components/ui/status-banner';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { EditOrderDialog } from './edit-order-dialog';
import type { Lead as LeadType } from './records-table';
import { getTierLabel } from '@/lib/pricing';
import { toTitleCase } from "@/lib/utils";


// Define the form schema using Zod
const orderSchema = z.object({
  productType: z.string().min(1, "Product type cannot be empty."),
  color: z.string().min(1, "Color cannot be empty."),
  size: z.string().min(1, "Size cannot be empty."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  embroidery: z.enum(['logo', 'logoAndText', 'name']),
  pricePerPatch: z.number().optional(),
});

export type Order = z.infer<typeof orderSchema>;

export const formSchema = z.object({
  customerName: z.string().min(1, {message: 'Customer name is required'}),
  companyName: z.string().optional(),
  mobileNo: z.string().optional(),
  landlineNo: z.string().optional(),
  isInternational: z.boolean().default(false),
  houseStreet: z.string().optional(),
  barangay: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  internationalAddress: z.string().optional(),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
  courier: z.string().optional(),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], {required_error: "You need to select an order type."}),
  orders: z.array(orderSchema).min(1, "Please add at least one order."),
}).refine(data => {
    if (data.mobileNo) return /^\d{4}-\d{3}-\d{4}$/.test(data.mobileNo) || data.mobileNo === '';
    return true;
}, {
    message: "Mobile number must be in 0000-000-0000 format.",
    path: ["mobileNo"],
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
          message: 'House/Street is required.',
        });
      }
      if (!data.barangay || data.barangay.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['barangay'],
          message: 'Barangay is required.',
        });
      }
      if (!data.city || data.city.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['city'],
          message: 'City/Municipality is required.',
        });
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

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};


type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber?: string;
  landlineNumber?: string;
  houseStreet?: string;
  barangay?: string;
  city?: string;
  province?: string;
};


const productTypes = [
  'Executive Jacket 1',
  'Executive Jacket v2 (with lines)',
  'Turtle Neck Jacket',
  'Corporate Jacket',
  'Reversible v1',
  'Reversible v2',
  'Polo Shirt (Coolpass)',
  'Polo Shirt (Cotton Blend)',
  'Patches',
  'Client Owned',
];

const jacketColors = [
  'Black', 'Brown', 'Dark Khaki', 'Light Khaki', 'Olive Green', 'Navy Blue',
  'Light Gray', 'Dark Gray', 'Khaki', 'Black/Khaki', 'Black/Navy Blue',
  'Army Green',
];

const poloShirtColors = [
    'White', 'Black', 'Light Gray', 'Dark Gray', 'Red', 'Maroon', 'Navy Blue', 'Royal Blue', 'Aqua Blue', 'Emerald Green', 'Golden Yellow', 'Slate Blue', 'Yellow', 'Orange', 'Dark Green', 'Green', 'Light Green', 'Pink', 'Fuchsia', 'Sky Blue', 'Oatmeal', 'Cream', 'Purple', 'Gold', 'Brown'
];


const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

const courierOptions = ['Lalamove', 'J&T', 'In-house', 'Pick-up', 'DHL', 'FedEx'];

type LeadFormProps = {
  onDirtyChange: (isDirty: boolean) => void;
  stagedOrders: Order[];
  setStagedOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  resetFormTrigger: number;
  onOrderTypeChange: (orderType: FormValues['orderType'] | undefined) => void;
  onSubmit: (values: FormValues) => void;
  isEditing?: boolean;
  initialLeadData?: (LeadType & { orderNumber: number; totalCustomerQuantity: number; }) | null;
};

export function LeadForm({ 
  onDirtyChange, 
  stagedOrders, 
  setStagedOrders, 
  resetFormTrigger, 
  onOrderTypeChange,
  onSubmit,
  isEditing = false,
  initialLeadData = null,
}: LeadFormProps) {
  const {toast} = useToast();
  const [dateString, setDateString] = useState('');
  const [timeString, setTimeString] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [newOrderProductType, setNewOrderProductType] = useState('');
  const [newOrderColor, setNewOrderColor] = useState('');
  const [sizeQuantities, setSizeQuantities] = useState(
    productSizes.map(size => ({ size, quantity: 0 }))
  );
  const [newOrderEmbroidery, setNewOrderEmbroidery] = useState<'logo' | 'logoAndText' | 'name'>('logo');
  const firestore = useFirestore();
  const [editingOrder, setEditingOrder] = useState<{order: Order, index: number} | null>(null);

  const [customerSuggestions, setCustomerSuggestions] = useState<Lead[]>([]);
  const [companySuggestions, setCompanySuggestions] = useState<Lead[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<{ name: string; province: string, type: string }[]>([]);
  const [barangaySuggestions, setBarangaySuggestions] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [customerStatus, setCustomerStatus] = useState<'New' | 'Repeat' | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [manualStatus, setManualStatus] = useState<'New' | 'Repeat' | null>(null);
  const [manualOrderCount, setManualOrderCount] = useState(0);
  const [manualTotalQuantity, setManualTotalQuantity] = useState(0);

  const [singleQuantity, setSingleQuantity] = useState(0);
  const [pricePerPatch, setPricePerPatch] = useState(0);
  const [formattedPrice, setFormattedPrice] = useState('');
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d.]/g, '');
    const numericValue = parseFloat(rawValue);

    if (!isNaN(numericValue)) {
      setPricePerPatch(numericValue);
      setFormattedPrice(rawValue);
    } else {
      setPricePerPatch(0);
      setFormattedPrice('');
    }
  };

  const handlePriceBlur = () => {
    if (pricePerPatch > 0) {
      setFormattedPrice(formatCurrency(pricePerPatch).replace('₱', ''));
    }
  };


  const citiesAndMunicipalities = useMemo(() => {
    return locations.provinces.flatMap(province =>
      province.municipalities.map(municipality => ({
        name: municipality.name,
        type: municipality.type,
        province: province.name,
        barangays: municipality.barangays,
      }))
    );
  }, []);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery);

  const inventoryQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory')) : null, [firestore]);
  const { data: inventoryItems } = useCollection<InventoryItem>(inventoryQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    defaultValues: {
      customerName: '',
      companyName: '',
      mobileNo: '',
      landlineNo: '',
      isInternational: false,
      houseStreet: '',
      barangay: '',
      city: '',
      province: '',
      internationalAddress: '',
      courier: undefined,
      orderType: undefined,
      priorityType: 'Regular',
      orders: [],
    },
  });
  
  const { control, handleSubmit, reset, watch, setValue, formState: { isDirty } } = form;
  
  useEffect(() => {
    if (resetFormTrigger > 0 && !isEditing) {
        reset({
            customerName: '',
            companyName: '',
            mobileNo: '',
            landlineNo: '',
            isInternational: false,
            houseStreet: '',
            barangay: '',
            city: '',
            province: '',
            internationalAddress: '',
            courier: undefined,
            orderType: undefined,
            priorityType: 'Regular',
            orders: [],
        });
        setSelectedLead(null);
        setManualStatus(null);
    }
  }, [resetFormTrigger, reset, isEditing]);

  useEffect(() => {
    if (isEditing && initialLeadData) {
      const { customerName, companyName, contactNumber, landlineNumber, location, houseStreet, barangay, city, province, courier, orderType, priorityType, isInternational } = initialLeadData as LeadType & { isInternational?: boolean };
      
      reset({
        customerName: customerName || '',
        companyName: companyName || '',
        mobileNo: contactNumber || '',
        landlineNo: landlineNumber || '',
        isInternational: isInternational || false,
        houseStreet: houseStreet || '',
        barangay: barangay || '',
        city: city || '',
        province: province || '',
        internationalAddress: isInternational ? location : '',
        courier: courier === '-' ? undefined : courier,
        orderType: orderType as any,
        priorityType: priorityType as any,
        orders: stagedOrders,
      });
    }
  }, [isEditing, initialLeadData, reset, stagedOrders]);

  
  const handleSuggestionClick = (lead: Lead) => {
    setSelectedLead(lead);
    setValue('customerName', toTitleCase(lead.customerName), { shouldDirty: true, shouldValidate: true });
    setValue('companyName', lead.companyName && lead.companyName !== '-' ? toTitleCase(lead.companyName) : '', { shouldDirty: true });
    setValue('mobileNo', lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber : '', { shouldDirty: true });
    setValue('landlineNo', lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber : '', { shouldDirty: true });
    setValue('houseStreet', lead.houseStreet ? toTitleCase(lead.houseStreet) : '', { shouldDirty: true });
    setValue('barangay', lead.barangay ? toTitleCase(lead.barangay) : '', { shouldDirty: true });
    setValue('city', lead.city ? toTitleCase(lead.city) : '', { shouldDirty: true });
    setValue('province', lead.province ? toTitleCase(lead.province) : '', { shouldDirty: true });
    setManualStatus(null);
    setCustomerSuggestions([]);
    setCompanySuggestions([]);
    setCitySuggestions([]);
    setBarangaySuggestions([]);
  };

  const handleCitySuggestionClick = (city: { name: string; province: string }) => {
    setValue('city', city.name, { shouldValidate: true, shouldDirty: true });
    setValue('province', city.province, { shouldValidate: true, shouldDirty: true });
    setValue('barangay', ''); // Reset barangay when city changes
    setCitySuggestions([]);
  };

  const handleBarangaySuggestionClick = (barangay: string) => {
    setValue('barangay', barangay, { shouldValidate: true, shouldDirty: true });
    setBarangaySuggestions([]);
  };

  const customerNameValue = watch('customerName');
  const companyNameValue = watch('companyName');
  const houseStreetValue = watch('houseStreet');
  const barangayValue = watch('barangay');
  const cityValue = watch('city');
  const provinceValue = watch('province');
  const isInternational = watch('isInternational');
  const orderTypeValue = watch('orderType');

  useEffect(() => {
    onOrderTypeChange(orderTypeValue);
  }, [orderTypeValue, onOrderTypeChange]);

  useEffect(() => {
    if (selectedLead && customerNameValue.toLowerCase() !== selectedLead.customerName.toLowerCase()) {
        setSelectedLead(null);
        setManualStatus(null);
    }
  }, [customerNameValue, selectedLead]);
  
  // Effect for setting initial status in edit mode
  useEffect(() => {
    if (isEditing && initialLeadData) {
      const isRepeat = initialLeadData.orderNumber > 1;
      setCustomerStatus(isRepeat ? 'Repeat' : 'New');
      setOrderCount(initialLeadData.orderNumber);
    }
  }, [isEditing, initialLeadData]);

  // Effect for dynamic status on new order form
  useEffect(() => {
    if (isEditing) return;

    if (!customerNameValue) {
      setCustomerStatus(null);
      setOrderCount(0);
      setManualStatus(null);
      return;
    }

    const matchingLeads = leads?.filter(
      (lead) => lead.customerName.toLowerCase() === customerNameValue.toLowerCase()
    ) || [];
    
    const dbOrderCount = matchingLeads.length;
    const totalOrderCount = dbOrderCount + (manualStatus === 'Repeat' ? manualOrderCount : 0);

    if (totalOrderCount > 0) {
      setCustomerStatus('Repeat');
      setOrderCount(totalOrderCount);
    } else {
      setCustomerStatus('New');
      setOrderCount(0);
    }
  }, [isEditing, customerNameValue, leads, manualStatus, manualOrderCount]);


  useEffect(() => {
    if (isEditing) {
        setCustomerSuggestions([]);
        return;
    };
    if (customerNameValue && leads && !selectedLead) {
        const uniqueSuggestions = leads.filter(
            (lead, index, self) =>
                lead.customerName.toLowerCase().includes(customerNameValue.toLowerCase()) &&
                self.findIndex((l) => l.customerName.toLowerCase() === lead.customerName.toLowerCase()) === index
        );
        setCustomerSuggestions(uniqueSuggestions);
    } else {
        setCustomerSuggestions([]);
    }
  }, [isEditing, customerNameValue, leads, selectedLead]);

  useEffect(() => {
     if (isEditing) {
        setCompanySuggestions([]);
        return;
    };
    if (companyNameValue && leads && !selectedLead) {
      const uniqueSuggestions = leads.filter(
        (lead, index, self) =>
          lead.companyName &&
          lead.companyName.toLowerCase().includes(companyNameValue.toLowerCase()) &&
          self.findIndex((l) => l.companyName?.toLowerCase() === lead.companyName?.toLowerCase()) === index
      );
      setCompanySuggestions(uniqueSuggestions);
    } else {
      setCompanySuggestions([]);
    }
  }, [isEditing, companyNameValue, leads, selectedLead]);

  useEffect(() => {
    if (isEditing) {
        setCitySuggestions([]);
        return;
    };
    if (cityValue && !selectedLead) {
      const filteredCities = citiesAndMunicipalities.filter(city =>
        city.name.toLowerCase().includes(cityValue.toLowerCase())
      ).slice(0, 10);
      setCitySuggestions(filteredCities);
    } else {
      setCitySuggestions([]);
    }
  }, [isEditing, cityValue, citiesAndMunicipalities, selectedLead]);

  useEffect(() => {
    if (isEditing) {
        setBarangaySuggestions([]);
        return;
    };
    if (barangayValue && cityValue && provinceValue && !selectedLead) {
        const selectedCity = citiesAndMunicipalities.find(
            c => c.name.toLowerCase() === cityValue.toLowerCase() && c.province.toLowerCase() === provinceValue.toLowerCase()
        );
        if (selectedCity && selectedCity.barangays) {
            const filteredBarangays = selectedCity.barangays
                .filter(b => b.toLowerCase().includes(barangayValue.toLowerCase()))
                .slice(0, 10);
            setBarangaySuggestions(filteredBarangays);
        } else {
            setBarangaySuggestions([]);
        }
    } else {
        setBarangaySuggestions([]);
    }
  }, [isEditing, barangayValue, cityValue, provinceValue, citiesAndMunicipalities, selectedLead]);


  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      setDayOfWeek(days[now.getDay()]);
      
      const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }).replace(/,/g, '');
      setDateString(dateStr);

      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setTimeString(timeStr);
    };
    if(!isEditing) {
      updateDateTime();
      const intervalId = setInterval(updateDateTime, 1000);
      return () => clearInterval(intervalId);
    }
  }, [isEditing]);
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "orders"
  });

  // Update form's orders whenever stagedOrders changes
  useEffect(() => {
    setValue('orders', stagedOrders);
  }, [stagedOrders, setValue]);

  const orderType = watch('orderType');

  useEffect(() => {
    if (orderType === 'MTO' || orderType === 'Stock (Jacket Only)') {
      setValue('priorityType', 'Rush');
    }
  }, [orderType, setValue]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const isPolo = newOrderProductType.includes('Polo Shirt');
  const isPatches = newOrderProductType === 'Patches';
  const isClientOwned = newOrderProductType === 'Client Owned';
  const showSingleQuantity = isPatches || isClientOwned;
  const availableColors = isPolo ? poloShirtColors : jacketColors;


  useEffect(() => {
    if (isPatches) {
      setNewOrderColor('N/A');
    } else if (!isClientOwned && !availableColors.includes(newOrderColor)) {
      setNewOrderColor('');
    }
  }, [newOrderProductType, isPatches, availableColors, newOrderColor, isClientOwned]);
  
  useEffect(() => {
     if (isPatches || isClientOwned) {
      setSizeQuantities([{ size: 'N/A', quantity: 0 }]);
    } else {
      setSizeQuantities(productSizes.map(size => ({ size, quantity: 0 })));
    }
  }, [isPatches, isClientOwned]);

  const handleMobileNoChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length <= 11) {
      let formattedValue = '';
      if (rawValue.length > 0) {
        formattedValue = rawValue.substring(0, 4);
      }
      if (rawValue.length > 4) {
        formattedValue += '-' + rawValue.substring(4, 7);
      }
      if (rawValue.length > 7) {
        formattedValue += '-' + rawValue.substring(7, 11);
      }
      field.onChange(formattedValue);
    }
  };

  const handleLandlineNoChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length <= 10) {
      let formattedValue = '';
      if (rawValue.length > 0) {
        formattedValue = rawValue.substring(0, 2);
      }
      if (rawValue.length > 2) {
        formattedValue += '-' + rawValue.substring(2, 6);
      }
      if (rawValue.length > 6) {
        formattedValue += '-' + rawValue.substring(6, 10);
      }
      field.onChange(formattedValue);
    }
  };

  
  const getRemainingStock = (order: z.infer<typeof orderSchema>) => {
    if (!inventoryItems) return 'N/A';
    const itemInInventory = inventoryItems.find(item =>
      item.productType === order.productType &&
      item.color === order.color &&
      item.size === order.size
    );
    const stock = itemInInventory ? itemInInventory.stock : 0;
    
    const alreadyOrderedQty = stagedOrders.reduce((sum, existingOrder) => {
        if (existingOrder.productType === order.productType &&
            existingOrder.color === order.color &&
            existingOrder.size === order.size) {
            return sum + existingOrder.quantity;
        }
        return sum;
    }, 0);

    return stock - alreadyOrderedQty;
  };
  
  const handleAddOrder = () => {
    if (!newOrderProductType) return;
    
    const newOrders: Order[] = [];
    
    if (showSingleQuantity) {
      if (singleQuantity > 0) {
        const orderToAdd: Order = {
          productType: newOrderProductType,
          color: newOrderColor || 'N/A',
          size: 'N/A',
          quantity: singleQuantity,
          embroidery: newOrderEmbroidery,
        };
        if (isPatches) {
          orderToAdd.pricePerPatch = pricePerPatch > 0 ? pricePerPatch : undefined;
        }
        newOrders.push(orderToAdd);
      }
    } else {
      sizeQuantities.forEach(item => {
        if (item.quantity > 0) {
          newOrders.push({
            productType: newOrderProductType,
            color: newOrderColor || 'N/A',
            size: item.size,
            quantity: item.quantity,
            embroidery: newOrderEmbroidery,
          });
        }
      });
    }

    if (newOrders.length > 0) {
        setStagedOrders(prev => [...prev, ...newOrders]);
        toast({
            title: `${newOrders.length} Order(s) Added!`,
            description: `The orders have been added to the list.`,
        });
        setSizeQuantities(productSizes.map(size => ({ size, quantity: 0 })));
        setSingleQuantity(0);
        setPricePerPatch(0);
        setFormattedPrice('');
    } else {
        toast({
            variant: 'destructive',
            title: 'No Orders to Add',
            description: 'Please enter a quantity.',
        });
    }
  };

  const handleSizeQuantityChange = (index: number, change: number) => {
    setSizeQuantities(current =>
      current.map((item, i) =>
        i === index
          ? { ...item, quantity: Math.max(0, item.quantity + change) }
          : item
      )
    );
  };
  
  const handleSizeQuantityInputChange = (index: number, value: string) => {
    setSizeQuantities(current =>
      current.map((item, i) =>
        i === index
          ? { ...item, quantity: value === '' ? 0 : parseInt(value, 10) || 0 }
          : item
      )
    );
  };
  
  const handleSaveStatus = (status: 'New' | 'Repeat', count: number, totalQty: number) => {
    setManualStatus(status);
    if (status === 'Repeat') {
        setManualOrderCount(count);
        setManualTotalQuantity(totalQty);
    }
    setIsStatusDialogOpen(false);
  };

  const concatenatedAddress = [houseStreetValue, barangayValue, cityValue, provinceValue].filter(Boolean).join(', ');

  const handleEditOrder = (order: Order, index: number) => {
    setEditingOrder({order, index});
  }

  const handleUpdateOrder = (updatedOrder: Order) => {
    if (editingOrder) {
      const updatedOrders = [...stagedOrders];
      updatedOrders[editingOrder.index] = updatedOrder;
      setStagedOrders(updatedOrders);
      setEditingOrder(null);
    }
  };

  const handleDeleteOrder = (index: number) => {
    const updatedOrders = [...stagedOrders];
    updatedOrders.splice(index, 1);
    setStagedOrders(updatedOrders);
  };

  return (
    <>
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader className='space-y-0 pb-2'>
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-0">
             {!isEditing && (
              <>
                <CardTitle className="font-headline text-2xl">
                  Create New Order
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Fill in the details below to create a record for customer and order.
                </CardDescription>
              </>
            )}
          </div>
          {!isEditing && (
            <div className="text-base text-muted-foreground font-mono whitespace-nowrap pt-1 text-right">
              <div>{dateString} - {dayOfWeek} | <span className="blinking-time">{timeString}</span></div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id={isEditing ? 'lead-form-edit' : 'lead-form'} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              
              {/* Customer and Contact Info */}
              <div className="space-y-3 pt-4">
                 <div className="flex justify-center items-center h-8 mb-4">
                  {customerStatus && customerNameValue && (
                    <div className={cn("animate-in fade-in-down flex items-center gap-2")}>
                      {customerStatus === 'Repeat' ? (
                         <div onClick={() => !isEditing && setIsStatusDialogOpen(true)} className={!isEditing ? 'cursor-pointer' : ''}>
                            <StatusBanner
                                text="Repeat Buyer"
                                backgroundClassName="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 animate-glowing-gold"
                                textColorClassName="text-yellow-900 font-bold"
                                borderClassName="border-yellow-500"
                                className='w-36'
                            />
                         </div>
                      ) : (
                        <div onClick={() => customerStatus === 'New' && !isEditing && setIsStatusDialogOpen(true)} className={customerStatus === 'New' && !isEditing ? 'cursor-pointer' : ''}>
                            <StatusBanner
                            text="New Customer"
                            backgroundColor="#FFFFFF"
                            textColorClassName="text-black font-bold"
                            borderClassName="shining-black-border"
                            className='w-36'
                            />
                        </div>
                      )}
                       {customerStatus === 'Repeat' && orderCount > 0 && (
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-yellow-500 text-black text-xs font-bold">
                            {orderCount}
                          </div>
                        )}
                    </div>
                  )}
                </div>
                <FormField control={form.control} name="customerName" render={({field}) => (
                  <FormItem className="relative mt-2">
                    <FormLabel className="flex items-center gap-2 text-black text-xs"><User className="h-4 w-4 text-primary" />Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" onBlur={() => setTimeout(() => setCustomerSuggestions([]), 150)} 
                        onChange={(e) => {
                            field.onChange(e);
                            if (manualStatus) {
                                setManualStatus(null);
                            }
                        }}
                      />
                    </FormControl>
                    {customerSuggestions.length > 0 && (
                      <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        <CardContent className="p-2 max-h-40 overflow-y-auto">
                          {customerSuggestions.map((lead) => (
                            <div key={lead.id} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleSuggestionClick(lead)}>
                              {toTitleCase(lead.customerName)}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="companyName" render={({field}) => (
                  <FormItem className="relative">
                    <FormLabel className="flex items-center gap-2 text-black text-xs"><Building className="h-4 w-4 text-primary" />Company Name (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" onBlur={() => setTimeout(() => setCompanySuggestions([]), 150)} />
                    </FormControl>
                    {companySuggestions.length > 0 && (
                      <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        <CardContent className="p-2 max-h-40 overflow-y-auto">
                          {companySuggestions.map((lead) => (
                            <div key={lead.id} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleSuggestionClick(lead)}>
                              {lead.companyName ? toTitleCase(lead.companyName) : ''}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-x-4 mb-3">
                  <FormField control={form.control} name="mobileNo" render={({field}) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-black text-xs"><Phone className="h-4 w-4 text-primary" />Mobile No. (Optional)</FormLabel>
                      <FormControl><Input type="tel" {...field} onChange={(e) => handleMobileNoChange(e, field)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="landlineNo" render={({field}) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-black text-xs"><PhoneForwarded className="h-4 w-4 text-primary" />Landline No. (Optional)</FormLabel>
                      <FormControl><Input type="tel" {...field} onChange={(e) => handleLandlineNoChange(e, field)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
              </div>

              {/* Address Info */}
              <div className="space-y-3">
                 {isInternational ? (
                    <FormField
                        control={form.control}
                        name="internationalAddress"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2 text-black text-xs"><Home className="h-4 w-4 text-primary" />International Address</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Enter the full international address"
                                        className="resize-y min-h-[120px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 ) : (
                    <>
                        <FormField control={form.control} name="houseStreet" render={({field}) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2 text-black text-xs"><Home className="h-4 w-4 text-primary" />House No., Street &amp; Others</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-x-4">
                        <FormField control={form.control} name="barangay" render={({field}) => (
                            <FormItem className="relative">
                            <FormLabel className="flex items-center gap-2 text-black text-xs">Barangay</FormLabel>
                            <FormControl>
                                <Input {...field} onBlur={() => setTimeout(() => setBarangaySuggestions([]), 150)} autoComplete="off" />
                            </FormControl>
                            {barangayValue && barangaySuggestions.length > 0 && !selectedLead && (
                                <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                <CardContent className="p-2 max-h-40 overflow-y-auto">
                                    {barangaySuggestions.map((barangay, index) => (
                                    <div key={index} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleBarangaySuggestionClick(barangay)}>
                                        {barangay}
                                    </div>
                                    ))}
                                </CardContent>
                                </Card>
                            )}
                            <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="city" render={({field}) => (
                            <FormItem className="relative">
                            <FormLabel className="flex items-center gap-2 text-black text-xs">City / Municipality</FormLabel>
                            <FormControl>
                                <Input {...field} onBlur={() => setTimeout(() => setCitySuggestions([]), 150)} autoComplete="off" />
                            </FormControl>
                            {cityValue && citySuggestions.length > 0 && !selectedLead && (
                                <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                <CardContent className="p-2 max-h-40 overflow-y-auto">
                                    {citySuggestions.map((city, index) => (
                                    <div key={index} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleCitySuggestionClick(city)}>
                                        <p className="font-semibold">{city.name} <span className="font-normal text-gray-500">({city.type})</span></p>
                                        <p className="text-xs text-gray-500">{city.province}</p>
                                    </div>
                                    ))}
                                </CardContent>
                                </Card>
                            )}
                            {cityValue && citySuggestions.length === 0 && !citiesAndMunicipalities.some(c => c.name.toLowerCase() === cityValue.toLowerCase()) && <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"><CardContent className='p-2'><p className='text-muted-foreground'>No results found</p></CardContent></Card>}
                            <FormMessage />
                            </FormItem>
                        )}/>
                        </div>
                        <FormField control={form.control} name="province" render={({field}) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2 text-black text-xs">Province</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}/>
                        <FormItem>
                            <FormLabel className="flex items-center gap-2 text-black text-xs">Complete Address</FormLabel>
                            <FormControl>
                            <Input readOnly value={concatenatedAddress} className="h-14 text-xs bg-muted" />
                            </FormControl>
                        </FormItem>
                    </>
                 )}
                 <div className='mt-4'>
                    <FormField
                        control={form.control}
                        name="isInternational"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="text-xs">
                                    Is this order for delivery outside the Philippines? (Check the box to add a custom address.)
                                    </FormLabel>
                                </div>
                            </FormItem>
                        )}
                    />
                </div>
              </div>
            </div>

            <Separator className="my-4" />
            
            <h3 className="font-headline text-xl mt-4">Order Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
              <FormField control={form.control} name="orderType" render={({field}) => (
                  <FormItem>
                  <FormLabel className="flex items-center gap-2 text-black text-xs shrink-0"><ShoppingBag className="h-4 w-4 text-primary" />Order Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger className={cn("text-xs w-full", !field.value && 'text-muted-foreground')}><SelectValue placeholder="Select Order Type" /></SelectTrigger></FormControl>
                      <SelectContent>{['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'].map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                  </FormItem>
              )}/>
              <FormField
              control={form.control}
              name="priorityType"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel className="flex items-center gap-2 text-black text-xs shrink-0">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      Priority Type
                  </FormLabel>
                  <FormControl>
                      <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex items-center justify-center space-x-4 pt-2"
                      disabled={orderType === 'MTO' || orderType === 'Stock (Jacket Only)'}
                      >
                      {['Rush', 'Regular'].map((option) => (
                          <FormItem key={option} className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value={option} /></FormControl>
                          <FormLabel className="font-normal text-black text-xs">{option}</FormLabel>
                          </FormItem>
                      ))}
                      </RadioGroup>
                  </FormControl>
                  </FormItem>
              )}
              />
              <FormField control={form.control} name="courier" render={({field}) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-2 text-black text-xs shrink-0"><Truck className="h-4 w-4 text-primary" />Courier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger className={cn("text-xs w-full", !field.value && 'text-muted-foreground')}><SelectValue placeholder="Select Courier" /></SelectTrigger></FormControl>
                    <SelectContent>{courierOptions.map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )}/>
            </div>

            <Separator className="my-4" />

            <div className="col-span-full">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-black">Orders</h3>
                <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline"><PlusCircle className="mr-2 h-4 w-4" />Add Order</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add Order Details</DialogTitle>
                      <DialogDescription>Select product details to add</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Product Type:</Label>
                        <Select onValueChange={setNewOrderProductType} value={newOrderProductType}>
                          <SelectTrigger><SelectValue placeholder="Select a Product Type" /></SelectTrigger>
                          <SelectContent>{productTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      {!isPatches && (
                        <div className='flex items-center gap-2'>
                          <Label>Color:</Label>
                           {isClientOwned ? (
                                <Input 
                                    placeholder="Enter color" 
                                    value={newOrderColor} 
                                    onChange={(e) => setNewOrderColor(e.target.value)}
                                />
                            ) : (
                                <Select onValueChange={setNewOrderColor} value={newOrderColor} disabled={isPatches}>
                                <SelectTrigger><SelectValue placeholder="Select a Color" /></SelectTrigger>
                                <SelectContent>{availableColors.map((color) => (<SelectItem key={color} value={color}>{color}</SelectItem>))}</SelectContent>
                                </Select>
                            )}
                        </div>
                      )}
                      {!isClientOwned && !isPatches && (
                          <div className="flex items-center gap-4">
                            <Label>Embroidery Option:</Label>
                            <RadioGroup onValueChange={(v) => setNewOrderEmbroidery(v as 'logo' | 'logoAndText' | 'name')} value={newOrderEmbroidery} className="flex">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="logo" id="emb-logo" /><Label htmlFor="emb-logo">Logo Only</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="logoAndText" id="emb-logoAndText" /><Label htmlFor="emb-logoAndText">Logo + Back Text</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="name" id="emb-name" /><Label htmlFor="emb-name">Name Only</Label></div>
                            </RadioGroup>
                          </div>
                      )}
                       {isPatches && (
                        <div className="flex items-center gap-2">
                          <Label className="whitespace-nowrap">Price per Patch:</Label>
                          <div className="relative w-full">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                            <Input
                              type="text"
                              value={formattedPrice}
                              onChange={handlePriceChange}
                              onBlur={handlePriceBlur}
                              placeholder="Enter price"
                              className="pl-7"
                            />
                          </div>
                        </div>
                      )}
                      <div className="space-y-4">
                         {showSingleQuantity ? (
                            <div className="flex items-center justify-center gap-4 pt-4">
                                <Label className="text-sm font-bold">Quantity</Label>
                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setSingleQuantity(q => Math.max(0, q - 1))}>
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                        type="text"
                                        value={singleQuantity}
                                        onChange={(e) => setSingleQuantity(parseInt(e.target.value, 10) || 0)}
                                        className="w-16 text-center"
                                    />
                                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setSingleQuantity(q => q + 1)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                               <Label>Size Quantities</Label>
                               <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    {sizeQuantities.map((item, index) => (
                                    <div key={item.size} className="flex items-center justify-start gap-4">
                                        <Label className="text-sm font-bold w-12">{item.size}</Label>
                                        <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSizeQuantityChange(index, -1)}>
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <Input
                                            type="text"
                                            value={item.quantity}
                                            onChange={(e) => handleSizeQuantityInputChange(index, e.target.value)}
                                            onBlur={(e) => { if (e.target.value === '') handleSizeQuantityInputChange(index, '0')}}
                                            className="w-14 text-center"
                                        />
                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSizeQuantityChange(index, 1)}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                        </div>
                                    </div>
                                    ))}
                               </div>
                            </>
                         )}
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
                      <Button
                        type="button"
                        onClick={handleAddOrder}
                        disabled={!newOrderProductType || (!isPatches && !isClientOwned && !newOrderColor) || (showSingleQuantity ? singleQuantity === 0 : sizeQuantities.every(sq => sq.quantity === 0))}
                      >
                        Add
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="mt-2 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2 px-4 text-black">Product</TableHead>
                      <TableHead className="py-2 px-4 text-black">Color</TableHead>
                      <TableHead className="py-2 px-4 text-black">Size</TableHead>
                      <TableHead className="py-2 px-4 text-black text-center">Qty</TableHead>
                      <TableHead className="text-right py-1 px-2 text-black pr-8">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagedOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-4 px-4 text-center text-muted-foreground">No orders added yet.</TableCell>
                      </TableRow>
                    ) : (
                      stagedOrders.map((order, index) => (
                        <TableRow key={index}>
                          <TableCell className="py-2 px-4 text-black">{order.productType}</TableCell>
                          <TableCell className="py-2 px-4 text-black">{order.color}</TableCell>
                          <TableCell className="py-2 px-4 text-black">{order.size}</TableCell>
                          <TableCell className="py-2 px-4 text-black text-center">{order.quantity}</TableCell>
                          <TableCell className="py-2 px-4 text-right">
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-gray-200" onClick={() => handleEditOrder(order, index)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-100">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the ordered item.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteOrder(index)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
     <SetCustomerStatusDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        currentStatus={customerStatus || 'New'}
        onSave={handleSaveStatus}
     />
    {editingOrder && (
        <EditOrderDialog 
        isOpen={!!editingOrder}
        onOpenChange={() => setEditingOrder(null)}
        order={editingOrder.order}
        onSave={handleUpdateOrder}
        onClose={() => setEditingOrder(null)}
        />
    )}
    </>
  );
}

function SetCustomerStatusDialog({
    isOpen,
    onClose,
    currentStatus,
    onSave,
}: {
    isOpen: boolean;
    onClose: () => void;
    currentStatus: 'New' | 'Repeat';
    onSave: (status: 'New' | 'Repeat', count: number, totalQty: number) => void;
}) {
    const [status, setStatus] = useState<'New' | 'Repeat'>(currentStatus);
    const [orderCount, setOrderCount] = useState(0);
    const [totalQuantity, setTotalQuantity] = useState(0);
    
    useEffect(() => {
        if (isOpen) {
            setStatus(currentStatus);
            setOrderCount(0);
            setTotalQuantity(0);
        }
    }, [isOpen, currentStatus]);

    const handleSaveClick = () => {
        onSave(status, orderCount, totalQuantity);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Set Customer Category</DialogTitle>
                </DialogHeader>
                 <div className="py-4 space-y-4 flex flex-col items-center">
                    <RadioGroup value={status} onValueChange={(v) => setStatus(v as 'New' | 'Repeat')} className="flex justify-center gap-8">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="New" id="status-new" />
                            <Label htmlFor="status-new" className="text-base">New Customer</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Repeat" id="status-repeat" />
                            <Label htmlFor="status-repeat" className="text-base">Repeat Buyer</Label>
                        </div>
                    </RadioGroup>
                    {status === 'Repeat' && (
                        <div className="space-y-3 pt-4 animate-in fade-in-50 flex flex-col items-center">
                            <div className="grid grid-cols-2 gap-4 items-center w-full max-w-sm">
                                <Label htmlFor="order-count" className="text-xs text-right">No of Times Ordered Before</Label>
                                <Input
                                    id="order-count"
                                    type="number"
                                    value={orderCount}
                                    onChange={(e) => setOrderCount(parseInt(e.target.value) || 0)}
                                    className="w-24 text-sm h-9"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 items-center w-full max-w-sm">
                                <Label htmlFor="total-quantity" className="text-xs text-right">Total Quantity Ordered Before</Label>
                                <Input
                                    id="total-quantity"
                                    type="number"
                                    value={totalQuantity}
                                    onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 0)}
                                    className="w-24 text-sm h-9"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveClick}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
