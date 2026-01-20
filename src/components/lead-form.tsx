
"use client";

import * as React from "react"
import {zodResolver} from '@hookform/resolvers/zod';
import { useFormContext, useFieldArray, FormProvider, useForm } from 'react-hook-form';
import * as z from 'zod';
import {useState, useEffect, useMemo, useCallback} from 'react';

import {Button} from '@/components/ui/button';
import {
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import locations from '@/lib/ph-locations.json';
import { StatusBanner } from '@/components/ui/status-banner';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { EditOrderDialog } from './edit-order-dialog';
import type { Lead as LeadType } from './records-table';
import { getTierLabel } from '@/lib/pricing';
import { toTitleCase, formatCurrency } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';


// Define the form schema using Zod
const orderSchema = z.object({
  id: z.string().optional(), // Keep track of original order if needed
  productType: z.string().min(1, "Product type cannot be empty."),
  color: z.string().min(1, "Color cannot be empty."),
  size: z.string().min(1, "Size cannot be empty."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  embroidery: z.enum(['logo', 'logoAndText', 'name']).optional(),
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
  courier: z.string().optional(),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], {required_error: "You need to select an order type."}),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
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
  stagedOrders: Order[];
  setStagedOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  onOrderTypeChange: (orderType: FormValues['orderType'] | undefined) => void;
  isEditing?: boolean;
  initialLeadData?: (LeadType & { orderNumber: number; totalCustomerQuantity: number; }) | null;
  onDirtyChange?: (isDirty: boolean) => void;
  isReadOnly?: boolean;
};

export function LeadForm({ 
  stagedOrders, 
  setStagedOrders, 
  onOrderTypeChange,
  isEditing = false,
  initialLeadData = null,
  onDirtyChange,
  isReadOnly
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
  const [barangaySuggestions, setBarangaySuggestions] = useState<{ barangay: string; city: string; province: string; showCity: boolean }[]>([]);
  const [provinceSuggestions, setProvinceSuggestions] = useState<string[]>([]);
  
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
  const [activeField, setActiveField] = useState<string | null>(null);
  
  const form = useFormContext<FormValues>();
  const { control, watch, setValue, formState, reset } = form;

  // Watch for form state changes to report dirtiness
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(formState.isDirty);
    }
  }, [formState.isDirty, onDirtyChange]);
  

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitizedValue = value.replace(/[^0-9.]/g, '');
    const parts = sanitizedValue.split('.');
    if (parts.length > 2) {
      return;
    }
    setFormattedPrice(sanitizedValue);
    setPricePerPatch(parseFloat(sanitizedValue) || 0);
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

  const allProvinces = useMemo(() => {
    return locations.provinces.map(p => p.name).sort();
  }, []);

  const allBarangays = useMemo(() => {
    const barangayList: { barangay: string, city: string, province: string }[] = [];
    const barangayCounts: { [key: string]: number } = {};

    locations.provinces.forEach(province => {
        province.municipalities.forEach(municipality => {
            municipality.barangays.forEach(barangay => {
                const lowerCaseBarangay = barangay.toLowerCase();
                barangayCounts[lowerCaseBarangay] = (barangayCounts[lowerCaseBarangay] || 0) + 1;
                barangayList.push({ barangay, city: municipality.name, province: province.name });
            });
        });
    });

    return barangayList.map(b => ({
        ...b,
        showCity: barangayCounts[b.barangay.toLowerCase()] > 1
    }));
  }, []);


  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery);

  const inventoryQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory')) : null, [firestore]);
  const { data: inventoryItems } = useCollection<InventoryItem>(inventoryQuery);

  
  useEffect(() => {
    if (isEditing && initialLeadData) {
      setStagedOrders(initialLeadData.orders || []);
    }
  }, [isEditing, initialLeadData, setStagedOrders]);

  
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
    setActiveField(null);
    setCustomerSuggestions([]);
    setCompanySuggestions([]);
    setCitySuggestions([]);
    setBarangaySuggestions([]);
  };

  const handleCitySuggestionClick = (city: { name: string; province: string }) => {
    setValue('city', city.name, { shouldValidate: true, shouldDirty: true });
    setValue('province', city.province, { shouldValidate: true, shouldDirty: true });
    if (!barangayValue) {
        setValue('barangay', '', { shouldDirty: true });
    }
    setActiveField(null);
  };

  const handleBarangaySuggestionClick = (b: { barangay: string, city: string, province: string }) => {
    setValue('barangay', b.barangay, { shouldValidate: true, shouldDirty: true });
    setValue('city', b.city, { shouldValidate: true, shouldDirty: true });
    setValue('province', b.province, { shouldValidate: true, shouldDirty: true });
    setActiveField(null);
  };

  const handleProvinceSuggestionClick = (province: string) => {
    setValue('province', province, { shouldValidate: true, shouldDirty: true });
    setValue('city', '', { shouldDirty: true });
    setValue('barangay', '', { shouldDirty: true });
    setActiveField(null);
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

  const part1 = [houseStreetValue, barangayValue].filter(Boolean).join(' ');
  const part2 = [cityValue, provinceValue].filter(Boolean).join(', ');
  const concatenatedAddress = [part1, part2].filter(Boolean).join(', ');

  useEffect(() => {
    if (selectedLead && customerNameValue.toLowerCase() !== selectedLead.customerName.toLowerCase()) {
        setSelectedLead(null);
        setManualStatus(null);
        // If name is cleared entirely, clear other fields
        if (!customerNameValue) {
            setValue('companyName', '', { shouldDirty: true });
            setValue('mobileNo', '', { shouldDirty: true });
            setValue('landlineNo', '', { shouldDirty: true });
            setValue('houseStreet', '', { shouldDirty: true });
            setValue('barangay', '', { shouldDirty: true });
            setValue('city', '', { shouldDirty: true });
            setValue('province', '', { shouldDirty: true });
            setValue('internationalAddress', '', { shouldDirty: true });
            setCustomerSuggestions([]);
            setCompanySuggestions([]);
        }
    }
  }, [customerNameValue, selectedLead, setValue]);
  
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
    if (activeField === 'customerName' && customerNameValue && leads && !selectedLead) {
        const uniqueSuggestions = leads.filter(
            (lead, index, self) =>
                lead.customerName.toLowerCase().includes(customerNameValue.toLowerCase()) &&
                self.findIndex((l) => l.customerName.toLowerCase() === lead.customerName.toLowerCase()) === index
        );
        setCustomerSuggestions(uniqueSuggestions);
    } else {
        setCustomerSuggestions([]);
    }
  }, [isEditing, customerNameValue, leads, selectedLead, activeField]);

  useEffect(() => {
     if (isEditing) {
        setCompanySuggestions([]);
        return;
    };
    if (activeField === 'companyName' && companyNameValue && leads && !selectedLead) {
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
  }, [isEditing, companyNameValue, leads, selectedLead, activeField]);

  useEffect(() => {
    if (activeField === 'city' && cityValue && !selectedLead) {
      const filteredCities = citiesAndMunicipalities.filter(city =>
        city.name.toLowerCase().includes(cityValue.toLowerCase())
      ).slice(0, 10);
      setCitySuggestions(filteredCities);
    } else {
      setCitySuggestions([]);
    }
  }, [cityValue, citiesAndMunicipalities, selectedLead, activeField]);
  
  useEffect(() => {
    if (activeField === 'barangay' && barangayValue && !selectedLead) {
        const suggestions = allBarangays.filter(b => b.barangay.toLowerCase().includes(barangayValue.toLowerCase())).slice(0, 10);
        setBarangaySuggestions(suggestions);
    } else {
      setBarangaySuggestions([]);
    }
  }, [barangayValue, allBarangays, selectedLead, activeField]);
  
  useEffect(() => {
    if (activeField === 'province' && provinceValue && !selectedLead) {
        const filteredProvinces = allProvinces.filter(p => p.toLowerCase().includes(provinceValue.toLowerCase())).slice(0, 10);
        setProvinceSuggestions(filteredProvinces);
    } else {
        setProvinceSuggestions([]);
    }
  }, [provinceValue, allProvinces, selectedLead, activeField]);


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
  
  const handleStagedOrderQuantityChange = (index: number, change: number) => {
    setStagedOrders(currentOrders => {
        const newOrders = [...currentOrders];
        const newQuantity = (newOrders[index].quantity || 0) + change;
        if (newQuantity >= 1) {
            newOrders[index] = { ...newOrders[index], quantity: newQuantity };
        }
        return newOrders;
    });
  };

  const handleSaveStatus = (status: 'New' | 'Repeat', count: number, totalQty: number) => {
    setManualStatus(status);
    if (status === 'Repeat') {
        setManualOrderCount(count);
        setManualTotalQuantity(totalQty);
    }
    setIsStatusDialogOpen(false);
  };

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
    <fieldset disabled={isReadOnly} className="space-y-4">
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader className='space-y-0 pb-2'>
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-0">
             {isEditing ? (
                <CardTitle className="text-xl font-bold">Customer Details</CardTitle>
             ) : (
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
        <div className="space-y-4">
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
                      <Input {...field} autoComplete="off"
                        onFocus={() => setActiveField('customerName')}
                        onBlur={() => setTimeout(() => { if (activeField === 'customerName') setActiveField(null); }, 150)} 
                        onChange={(e) => {
                            field.onChange(e);
                            if (isEditing) return;
                            if (manualStatus) {
                                setManualStatus(null);
                            }
                        }}
                      />
                    </FormControl>
                    {!isEditing && customerSuggestions.length > 0 && customerNameValue && (
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
                      <Input {...field} autoComplete="off" 
                        onFocus={() => setActiveField('companyName')}
                        onBlur={() => setTimeout(() => { if (activeField === 'companyName') setActiveField(null); }, 150)}
                      />
                    </FormControl>
                    {!isEditing && companySuggestions.length > 0 && companyNameValue && (
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
                            <FormLabel className="flex items-center gap-2 text-black text-xs"><Home className="h-4 w-4 text-primary" />House No., Street, Village, Landmark & Others</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-x-4">
                        <FormField control={form.control} name="barangay" render={({field}) => (
                            <FormItem className="relative">
                            <FormLabel className="flex items-center gap-2 text-black text-xs">Barangay</FormLabel>
                            <FormControl>
                                <Input {...field} onFocus={() => setActiveField('barangay')} onBlur={() => setTimeout(() => { if (activeField === 'barangay') setActiveField(null);}, 150)} autoComplete="off" />
                            </FormControl>
                            {barangayValue && barangaySuggestions.length > 0 && !selectedLead && activeField === 'barangay' && (
                                <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                <CardContent className="p-2 max-h-40 overflow-y-auto">
                                    {barangaySuggestions.map((b, index) => (
                                    <div key={index} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleBarangaySuggestionClick(b)}>
                                        <p className="font-semibold">{b.barangay}</p>
                                        {b.showCity && <p className="text-xs text-gray-500">({b.city})</p>}
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
                                <Input {...field} onFocus={() => setActiveField('city')} onBlur={() => setTimeout(() => { if (activeField === 'city') setActiveField(null);}, 150)} autoComplete="off" />
                            </FormControl>
                            {cityValue && citySuggestions.length > 0 && !selectedLead && activeField === 'city' && (
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
                            <FormMessage />
                            </FormItem>
                        )}/>
                        </div>
                        <FormField control={form.control} name="province" render={({field}) => (
                          <FormItem className="relative">
                            <FormLabel className="flex items-center gap-2 text-black text-xs">Province</FormLabel>
                            <FormControl><Input {...field} onFocus={() => setActiveField('province')} onBlur={() => setTimeout(() => { if (activeField === 'province') setActiveField(null);}, 150)} autoComplete="off" /></FormControl>
                            {provinceValue && provinceSuggestions.length > 0 && !selectedLead && activeField === 'province' && (
                                <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                <CardContent className="p-2 max-h-40 overflow-y-auto">
                                    {provinceSuggestions.map((province, index) => (
                                        <div key={index} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleProvinceSuggestionClick(province)}>
                                            {province}
                                        </div>
                                    ))}
                                </CardContent>
                                </Card>
                            )}
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
                                        Is this order for delivery outside the Philippines? <span className="italic text-muted-foreground">(Check the box to add a custom address.)</span>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={cn("text-xs w-full", !field.value && "text-muted-foreground")}>
                            <SelectValue placeholder="Select Order Type" />
                        </SelectTrigger>
                      </FormControl>
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
                  <FormMessage />
                  </FormItem>
              )}
              />
              <FormField control={form.control} name="courier" render={({field}) => {
                const allCourierOptions = useMemo(() => {
                    if (field.value && !courierOptions.includes(field.value)) {
                        return [field.value, ...courierOptions];
                    }
                    return courierOptions;
                }, [field.value]);

                return (
                <FormItem>
                    <FormLabel className="flex items-center gap-2 text-black text-xs shrink-0"><Truck className="h-4 w-4 text-primary" />Courier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger className={cn("text-xs w-full", !field.value && "text-muted-foreground")}>
                            <SelectValue placeholder="Select Courier" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>{allCourierOptions.map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )}}/>
            </div>

            <Separator className="my-4" />

            <div className="col-span-full">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-black">Orders</h3>
                <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" disabled={isReadOnly}><PlusCircle className="mr-2 h-4 w-4" />Add Order</Button>
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
                      <TableHead className="py-1 px-2 text-black text-center align-middle">Product</TableHead>
                      <TableHead className="py-1 px-2 text-black text-center align-middle">Color</TableHead>
                      <TableHead className="py-1 px-2 text-black text-center align-middle">Size</TableHead>
                      <TableHead className="py-1 px-2 text-black text-center align-middle">Qty</TableHead>
                      <TableHead className="py-1 px-2 text-black text-center align-middle whitespace-normal">Remaining Stocks</TableHead>
                      <TableHead className="py-1 px-2 text-black text-center align-middle">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagedOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-4 px-4 text-center text-muted-foreground">No orders added yet.</TableCell>
                      </TableRow>
                    ) : (
                      stagedOrders.map((order, index) => {
                        const remainingStock = getRemainingStock(order);
                        const isNegative = typeof remainingStock === 'number' && remainingStock < 0;
                        return (
                        <TableRow key={order.id || index}>
                          <TableCell className="py-1 px-2 text-black text-center align-middle">{order.productType}</TableCell>
                          <TableCell className="py-1 px-2 text-black text-center align-middle">{order.color}</TableCell>
                          <TableCell className="py-1 px-2 text-black text-center align-middle">{order.size}</TableCell>
                          <TableCell className="py-1 px-2 text-black text-center align-middle">
                            <div className="flex items-center justify-center gap-1">
                                <Button
                                    type="button"
                                    size="icon"
                                    className="h-5 w-5 bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => handleStagedOrderQuantityChange(index, -1)}
                                    disabled={isReadOnly}
                                >
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <div className="w-12 h-7 flex items-center justify-center text-sm border rounded-md">
                                    {order.quantity}
                                </div>
                                <Button
                                    type="button"
                                    size="icon"
                                    className="h-5 w-5 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleStagedOrderQuantityChange(index, 1)}
                                    disabled={isReadOnly}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                          </TableCell>
                           <TableCell className={cn("py-1 px-2 text-black font-bold text-center align-middle", isNegative && "text-destructive")}>
                             {remainingStock}
                           </TableCell>
                          <TableCell className="py-1 px-2 text-center align-middle">
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-gray-200" onClick={() => handleEditOrder(order, index)} disabled={isReadOnly}>
                                <Edit className="h-4 w-4" />
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-100" disabled={isReadOnly}>
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
                      )})
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
        </div>
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
    </fieldset>
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

    