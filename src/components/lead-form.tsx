
"use client";

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
import {useToast} from '@/hooks/use-toast';
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
import { collection, doc, query } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/firestore-writes';
import { v4 as uuidv4 } from 'uuid';
import locations from '@/lib/ph-locations.json';
import { Calculator } from './calculator';
import { SizeChartDialog } from './size-chart-dialog';
import { StatusBanner } from '@/components/ui/status-banner';
import { Label } from './ui/label';

// Define the form schema using Zod
const orderSchema = z.object({
  productType: z.string().min(1, "Product type cannot be empty."),
  color: z.string().min(1, "Color cannot be empty."),
  size: z.string().min(1, "Size cannot be empty."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
});

const formSchema = z.object({
  customerName: z.string().min(1, {message: 'Customer name is required'}),
  companyName: z.string().optional(),
  mobileNo: z.string().optional(),
  landlineNo: z.string().optional(),
  houseStreet: z.string().min(1, {message: 'House/Street is required.'}),
  barangay: z.string().min(1, {message: 'Barangay is required.'}),
  city: z.string().min(1, {message: 'City/Municipality is required.'}),
  province: z.string().min(1, {message: 'Province is required.'}),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
  courier: z.string().optional(),
  paymentType: z.enum(['Partially Paid', 'Fully Paid', 'COD'], {required_error: "You need to select a payment type."}),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], {required_error: "You need to select an order type."}),
  salesRepresentative: z.enum(['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'], {required_error: "You need to select a CSR."}),
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
});

type FormValues = z.infer<typeof formSchema>;

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

type LeadFormProps = {
  onDirtyChange: (isDirty: boolean) => void;
};

export function LeadForm({ onDirtyChange }: LeadFormProps) {
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
  const firestore = useFirestore();

  const [customerSuggestions, setCustomerSuggestions] = useState<Lead[]>([]);
  const [companySuggestions, setCompanySuggestions] = useState<Lead[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<{ name: string; province: string, type: string }[]>([]);
  const [barangaySuggestions, setBarangaySuggestions] = useState<string[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [isSizeChartDragging, setIsSizeChartDragging] = useState(false);
  const [isCalculatorDragging, setIsCalculatorDragging] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [customerStatus, setCustomerStatus] = useState<'New' | 'Repeat' | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [manualStatus, setManualStatus] = useState<'New' | 'Repeat' | null>(null);
  const [manualOrderCount, setManualOrderCount] = useState(0);
  const [manualTotalQuantity, setManualTotalQuantity] = useState(0);

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
    defaultValues: {
      customerName: '',
      companyName: '',
      mobileNo: '',
      landlineNo: '',
      houseStreet: '',
      barangay: '',
      city: '',
      province: '',
      courier: undefined,
      paymentType: undefined,
      orderType: undefined,
      priorityType: 'Regular',
      salesRepresentative: undefined,
      orders: [],
    },
  });
  
  const { control, handleSubmit, reset, watch, setValue, formState: { isDirty } } = form;

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
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

  useEffect(() => {
    if (selectedLead && customerNameValue.toLowerCase() !== selectedLead.customerName.toLowerCase()) {
        setSelectedLead(null);
        setManualStatus(null); // Reset manual status if name changes
    }
  }, [customerNameValue, selectedLead]);

  useEffect(() => {
    if (!customerNameValue) {
      setCustomerStatus(null);
      setOrderCount(0);
      setManualStatus(null);
      return;
    }
    
    if (manualStatus === 'Repeat') {
      setCustomerStatus('Repeat');
      setOrderCount(manualOrderCount);
      return;
    }

    const matchingLeads = leads?.filter(
      (lead) => lead.customerName.toLowerCase() === customerNameValue.toLowerCase()
    ) || [];

    if (matchingLeads.length > 0) {
      setCustomerStatus('Repeat');
      setOrderCount(matchingLeads.length);
    } else {
      setCustomerStatus('New');
      setOrderCount(0);
    }
  }, [customerNameValue, leads, manualStatus, manualOrderCount]);


  useEffect(() => {
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
  }, [customerNameValue, leads, selectedLead]);

  useEffect(() => {
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
  }, [companyNameValue, leads, selectedLead]);

  useEffect(() => {
    if (cityValue && !selectedLead) {
      const filteredCities = citiesAndMunicipalities.filter(city =>
        city.name.toLowerCase().includes(cityValue.toLowerCase())
      ).slice(0, 10);
      setCitySuggestions(filteredCities);
    } else {
      setCitySuggestions([]);
    }
  }, [cityValue, citiesAndMunicipalities, selectedLead]);

  useEffect(() => {
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
  }, [barangayValue, cityValue, provinceValue, citiesAndMunicipalities, selectedLead]);


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
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "orders"
  });

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
  const availableColors = isPolo ? poloShirtColors : jacketColors;


  useEffect(() => {
    if (isPatches) {
      setNewOrderColor('N/A');
    } else if (!availableColors.includes(newOrderColor)) {
      setNewOrderColor('');
    }
  }, [newOrderProductType, isPatches, availableColors, newOrderColor]);
  
  useEffect(() => {
     if (isPatches) {
      setSizeQuantities(productSizes.map(size => ({ size: 'N/A', quantity: 0 })));
    } else {
      setSizeQuantities(productSizes.map(size => ({ size, quantity: 0 })));
    }
  }, [isPatches]);

  const handleReset = () => {
    reset({
      customerName: '',
      companyName: '',
      mobileNo: '',
      landlineNo: '',
      houseStreet: '',
      barangay: '',
      city: '',
      province: '',
      courier: undefined,
      paymentType: undefined,
      orderType: undefined,
      priorityType: 'Regular',
      salesRepresentative: undefined,
      orders: [],
    });
    setSelectedLead(null);
    setManualStatus(null);
  }

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

  function onSubmit(values: FormValues) {
    if (!firestore) return;
    const leadId = uuidv4();
    const leadsRef = collection(firestore, 'leads');
    const leadDocRef = doc(leadsRef, leadId);
    const now = new Date().toISOString();

    const submissionData = {
      id: leadId,
      customerName: toTitleCase(values.customerName),
      companyName: values.companyName ? toTitleCase(values.companyName) : '-',
      contactNumber: values.mobileNo || '-',
      landlineNumber: values.landlineNo || '-',
      houseStreet: toTitleCase(values.houseStreet),
      barangay: toTitleCase(values.barangay),
      city: toTitleCase(values.city),
      province: toTitleCase(values.province),
      location: [values.houseStreet, values.barangay, values.city, values.province].filter(Boolean).map(toTitleCase).join(', '),
      courier: values.courier || '-',
      paymentType: values.paymentType,
      salesRepresentative: values.salesRepresentative,
      orderType: values.orderType,
      priorityType: values.priorityType,
      productType: values.orders.map(o => o.productType).join(', '),
      orders: values.orders,
      submissionDateTime: now,
      lastModified: now,
    };

    setDocumentNonBlocking(leadDocRef, submissionData, { merge: false });

    toast({
      title: 'Lead Submitted!',
      description: 'The new lead for ' + toTitleCase(values.customerName) + ' has been successfully recorded.',
    });

    handleReset();
  }
  
  const getRemainingStock = (order: z.infer<typeof orderSchema>) => {
    if (!inventoryItems) return 'N/A';
    const itemInInventory = inventoryItems.find(item =>
      item.productType === order.productType &&
      item.color === order.color &&
      item.size === order.size
    );
    const stock = itemInInventory ? itemInInventory.stock : 0;
    
    const alreadyOrderedQty = fields.reduce((sum, existingOrder) => {
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
    const isProductPatches = newOrderProductType === 'Patches';
    const color = isProductPatches ? 'N/A' : newOrderColor;
    let ordersAddedCount = 0;

    if (newOrderProductType && color) {
      sizeQuantities.forEach(item => {
        if (item.quantity > 0) {
          append({
            productType: newOrderProductType,
            color: color,
            size: isProductPatches ? 'N/A' : item.size,
            quantity: item.quantity
          });
          ordersAddedCount++;
        }
      });
    }

    if (ordersAddedCount > 0) {
        toast({
            title: `${ordersAddedCount} Order(s) Added!`,
            description: `The orders have been added to the list.`,
        });
        setSizeQuantities(productSizes.map(size => ({ size, quantity: 0 })));
    } else {
        toast({
            variant: 'destructive',
            title: 'No Orders to Add',
            description: 'Please enter a quantity for at least one size.',
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

  return (
    <>
    {showCalculator && <Calculator onClose={() => setShowCalculator(false)} onDraggingChange={setIsCalculatorDragging} />}
    {showSizeChart && <SizeChartDialog onClose={() => setShowSizeChart(false)} onDraggingChange={setIsSizeChartDragging} />}
    <Card className={cn("w-full mx-auto shadow-xl animate-in fade-in-50 duration-500 bg-white text-black max-w-6xl", (isSizeChartDragging || isCalculatorDragging) && 'select-none')}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
              <CardTitle className="font-headline text-2xl">Create New Order</CardTitle>
               <div className="flex items-center gap-4 mt-2">
                <CardDescription className="text-gray-600">Fill in the details below to create a record for customer and order.</CardDescription>
                <div className="h-8">
                  {customerStatus && (
                    <div className={cn("animate-in fade-in-down flex items-center gap-2")}>
                      {customerStatus === 'Repeat' ? (
                         <div onClick={() => setIsStatusDialogOpen(true)} className="cursor-pointer">
                            <StatusBanner
                                text="Repeat Buyer"
                                backgroundClassName="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 animate-glowing-gold"
                                textColorClassName="text-yellow-900 font-bold"
                                borderClassName="border-yellow-500"
                            />
                         </div>
                      ) : (
                        <div onClick={() => setIsStatusDialogOpen(true)} className="cursor-pointer">
                            <StatusBanner
                            text="New Customer"
                            backgroundColor="#FFFFFF"
                            textColorClassName="text-black font-bold"
                            borderClassName="shining-black-border"
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
              </div>
          </div>
          <div className="text-base text-muted-foreground font-mono whitespace-nowrap pt-1 text-right">
            <div>{dateString} - {dayOfWeek} | <span className="blinking-time">{timeString}</span></div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <div className="flex gap-4">
              {/* Left Column */}
              <div className="w-1/2 flex flex-col gap-y-3">
                 <div className="grid grid-cols-2 gap-x-2">
                    <FormField control={form.control} name="customerName" render={({field}) => (
                      <FormItem className="relative">
                        <div className="flex items-center gap-2">
                          <FormLabel className="flex items-center gap-2 text-black text-xs"><User className="h-4 w-4 text-primary" />Customer Name</FormLabel>
                        </div>
                        <FormControl>
                          <Input {...field} autoComplete="off" onBlur={() => setTimeout(() => setCustomerSuggestions([]), 150)} />
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
                    <FormField control={form.control} name="mobileNo" render={({field}) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-black text-xs"><Phone className="h-4 w-4 text-primary" />Mobile No. (Optional)</FormLabel>
                        <FormControl><Input type="tel" {...field} onChange={(e) => handleMobileNoChange(e, field)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="companyName" render={({field}) => (
                      <FormItem className="relative pt-2">
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
                    <FormField control={form.control} name="landlineNo" render={({field}) => (
                      <FormItem className="pt-2">
                        <FormLabel className="flex items-center gap-2 text-black text-xs"><PhoneForwarded className="h-4 w-4 text-primary" />Landline No. (Optional)</FormLabel>
                        <FormControl><Input type="tel" {...field} onChange={(e) => handleLandlineNoChange(e, field)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                </div>
                
                <div className='pt-2 flex flex-col gap-y-3'>
                      <FormField control={form.control} name="houseStreet" render={({field}) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-black text-xs"><Home className="h-4 w-4 text-primary" />House No., Street & Others</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}/>
                      <div className="grid grid-cols-2 gap-x-2">
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
                            <Input readOnly value={concatenatedAddress} className="h-20 text-xs bg-muted" />
                          </FormControl>
                      </FormItem>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-3 pt-2">
                  <FormField control={form.control} name="salesRepresentative" render={({field}) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-black text-xs"><UserCheck className="h-4 w-4 text-primary" />CSR</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger className={cn("text-xs w-full", !field.value && 'text-muted-foreground')}><SelectValue placeholder="Select CSR" /></SelectTrigger></FormControl>
                        <SelectContent>{['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'].map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
              </div>

              <Separator orientation="vertical" className="h-auto"/>
              
              {/* Right Column */}
              <div className="w-1/2 flex flex-col gap-y-3">
                <div className="grid grid-cols-2 gap-4">
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
                    <FormField control={form.control} name="paymentType" render={({field}) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2 text-black text-xs shrink-0"><CreditCard className="h-4 w-4 text-primary" />Payment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl><SelectTrigger className={cn("text-xs w-full", !field.value && 'text-muted-foreground')}><SelectValue placeholder="Select Payment Type" /></SelectTrigger></FormControl>
                            <SelectContent>{['Partially Paid', 'Fully Paid', 'COD'].map((option) => (<SelectItem key={option} value={option}>{option === 'COD' ? 'COD (Cash on Delivery)' : option}</SelectItem>))}</SelectContent>
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
                            className="flex items-center space-x-4 pt-2 pl-8"
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
                          <SelectContent>{['Lalamove', 'J&T', 'In-house', 'Pick-up'].map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                    )}/>
                </div>

                <div className="pt-2">
                  <FormLabel className="text-black">Orders</FormLabel>
                  <div className="space-y-2 mt-2">
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="py-2 text-black text-xs">Product</TableHead>
                            <TableHead className="py-2 text-black text-xs">Color</TableHead>
                            <TableHead className="py-2 text-black text-xs">Size</TableHead>
                            <TableHead className="py-2 text-black text-center text-xs">Qty</TableHead>
                            <TableHead className="py-2 text-black text-center text-xs">Stock</TableHead>
                            <TableHead className="text-right py-2 text-black text-xs">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const remaining = getRemainingStock(field);
                            return (
                              <TableRow key={field.id}>
                                <TableCell className="py-2 text-black text-xs">{field.productType}</TableCell>
                                <TableCell className="py-2 text-black text-xs">{field.color}</TableCell>
                                <TableCell className="py-2 text-black text-xs">{field.size}</TableCell>
                                <TableCell className="py-1 text-black text-xs">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => update(index, { ...field, quantity: Math.max(1, field.quantity - 1) })}>
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center">{field.quantity}</span>
                                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => update(index, { ...field, quantity: field.quantity + 1 })}>
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className={cn("py-2 text-center font-medium text-xs", typeof remaining === 'number' && remaining < 0 ? 'text-red-500' : 'text-black')}>
                                  {typeof remaining === 'number' ? remaining : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive h-8 w-8">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" onClick={() => setIsOrderDialogOpen(true)}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Order
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Add Order Details</DialogTitle>
                          <DialogDescription>Select product details to add</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <FormLabel>Product Type:</FormLabel>
                            <Select onValueChange={setNewOrderProductType} value={newOrderProductType}>
                              <SelectTrigger><SelectValue placeholder="Select a Product Type" /></SelectTrigger>
                              <SelectContent>{productTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div className='flex items-center gap-2'>
                            <FormLabel>Color:</FormLabel>
                            <Select onValueChange={setNewOrderColor} value={newOrderColor} disabled={isPatches}>
                              <SelectTrigger><SelectValue placeholder="Select a Color" /></SelectTrigger>
                              <SelectContent>{availableColors.map((color) => (<SelectItem key={color} value={color}>{color}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                           <div className="space-y-4">
                            {!isPatches && <FormLabel>Size Quantities</FormLabel>}
                             <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                {sizeQuantities.map((item, index) => (
                                    <div key={item.size} className="flex items-center justify-start gap-4">
                                        {!isPatches && <FormLabel className="text-sm font-bold w-12">{item.size}</FormLabel>}
                                        <div className={cn("flex items-center gap-2", isPatches && "w-full justify-center")}>
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
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
                           <Button 
                            type="button" 
                            onClick={handleAddOrder} 
                            disabled={!newOrderProductType || (!isPatches && !newOrderColor) || sizeQuantities.every(sq => sq.quantity === 0)}
                          >
                            Add
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <FormField control={form.control} name="orders" render={({ field }) => (<FormItem><FormMessage /></FormItem>)} />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-4 col-span-full">
              <div className="flex gap-4">
                 <Button type="button" variant="outline" onClick={() => setShowCalculator(true)}>
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Show Calculator
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowSizeChart(true)}>
                  <Ruler className="mr-2 h-4 w-4" />
                  Check Size Chart
                </Button>
              </div>
              <div className="flex gap-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline">Reset</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>This action will clear all the fields in the form.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold">
                  Submit
                </Button>
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

    const handleSaveClick = () => {
        onSave(status, orderCount, totalQuantity);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Set Customer Category</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <RadioGroup value={status} onValueChange={(v) => setStatus(v as 'New' | 'Repeat')}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="New" id="status-new" />
                            <Label htmlFor="status-new">New Customer</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Repeat" id="status-repeat" />
                            <Label htmlFor="status-repeat">Repeat Buyer</Label>
                        </div>
                    </RadioGroup>
                    {status === 'Repeat' && (
                        <div className="space-y-4 pl-6 animate-in fade-in-50">
                            <div className="grid grid-cols-2 gap-4 items-center">
                                <Label htmlFor="order-count">No of Times Ordered Before</Label>
                                <Input
                                    id="order-count"
                                    type="number"
                                    value={orderCount}
                                    onChange={(e) => setOrderCount(parseInt(e.target.value) || 0)}
                                    className="w-24"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 items-center">
                                <Label htmlFor="total-quantity">Total Quantity Ordered Before</Label>
                                <Input
                                    id="total-quantity"
                                    type="number"
                                    value={totalQuantity}
                                    onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 0)}
                                    className="w-24"
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

