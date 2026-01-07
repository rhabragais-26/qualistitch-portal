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
  MapPin,
  Phone,
  ShoppingBag,
  User,
  UserCheck,
  X,
  PlusCircle,
  Plus,
  Minus,
  PhoneForwarded,
  Truck,
  PackageCheck,
  Home,
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

// Define the form schema using Zod
const orderSchema = z.object({
  productType: z.string().min(1, "Product type cannot be empty."),
  color: z.string().min(1, "Color cannot be empty."),
  size: z.string().min(1, "Size cannot be empty."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
});

const formSchema = z.object({
  customerName: z.string().min(2, {message: 'Customer name must be at least 2 characters.'}),
  companyName: z.string().optional(),
  mobileNo: z.string().optional(),
  landlineNo: z.string().optional(),
  houseStreet: z.string().min(2, {message: 'House/Street is required.'}),
  barangay: z.string().min(2, {message: 'Barangay is required.'}),
  city: z.string().min(2, {message: 'City is required.'}),
  province: z.string().min(2, {message: 'Province is required.'}),
  courier: z.string().optional(),
  paymentType: z.enum(['Partially Paid', 'Fully Paid', 'COD'], {required_error: "You need to select a payment type."}),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], {required_error: "You need to select an order type."}),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
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
  const [newOrderSize, setNewOrderSize] = useState('');
  const [newOrderQuantity, setNewOrderQuantity] = useState<number | string>(1);
  const firestore = useFirestore();

  const [customerSuggestions, setCustomerSuggestions] = useState<Lead[]>([]);
  const [companySuggestions, setCompanySuggestions] = useState<Lead[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<{ field: keyof Lead, suggestions: string[] }>({ field: 'houseStreet', suggestions: [] });


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

  const handleSuggestionClick = (lead: Lead) => {
    setValue('customerName', toTitleCase(lead.customerName));
    setValue('companyName', lead.companyName ? toTitleCase(lead.companyName) : '');
    setValue('mobileNo', lead.contactNumber || '');
    setValue('landlineNo', lead.landlineNumber || '');
    setValue('houseStreet', lead.houseStreet ? toTitleCase(lead.houseStreet) : '');
    setValue('barangay', lead.barangay ? toTitleCase(lead.barangay) : '');
    setValue('city', lead.city ? toTitleCase(lead.city) : '');
    setValue('province', lead.province ? toTitleCase(lead.province) : '');
    setCustomerSuggestions([]);
    setCompanySuggestions([]);
    setAddressSuggestions({ field: 'houseStreet', suggestions: [] });
  };
  
  const handleAddressSuggestionClick = (field: keyof Lead, value: string) => {
    setValue(field as any, value, { shouldValidate: true });
    setAddressSuggestions({ field: 'houseStreet', suggestions: [] });
  };

  const customerNameValue = watch('customerName');
  const companyNameValue = watch('companyName');
  const houseStreetValue = watch('houseStreet');
  const barangayValue = watch('barangay');
  const cityValue = watch('city');
  const provinceValue = watch('province');

  useEffect(() => {
    if (customerNameValue && leads) {
      const uniqueSuggestions = leads.filter(
        (lead, index, self) =>
          lead.customerName.toLowerCase().includes(customerNameValue.toLowerCase()) &&
          self.findIndex((l) => l.customerName.toLowerCase() === lead.customerName.toLowerCase()) === index
      );
      setCustomerSuggestions(uniqueSuggestions);
    } else {
      setCustomerSuggestions([]);
    }
  }, [customerNameValue, leads]);

  useEffect(() => {
    if (companyNameValue && leads) {
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
  }, [companyNameValue, leads]);
  
  const useAddressSuggestions = (fieldName: keyof Lead, value: string) => {
    useEffect(() => {
      if (value && leads) {
        const uniqueSuggestions = Array.from(new Set(
            leads
            .map(lead => lead[fieldName] as string)
            .filter(fieldValue => fieldValue && fieldValue.toLowerCase().includes(value.toLowerCase()))
        ));
        setAddressSuggestions({ field: fieldName, suggestions: uniqueSuggestions });
      } else {
        setAddressSuggestions({ field: fieldName, suggestions: [] });
      }
    }, [value, leads, fieldName]);
  };
  
  useAddressSuggestions('houseStreet', houseStreetValue);
  useAddressSuggestions('barangay', barangayValue);
  useAddressSuggestions('city', cityValue);
  useAddressSuggestions('province', provinceValue);


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
      setNewOrderSize('N/A');
    } else if (!availableColors.includes(newOrderColor)) {
      setNewOrderColor('');
    }
  }, [newOrderProductType, isPatches, availableColors, newOrderColor]);

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
  }

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

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
  
  const currentRemainingStock = useMemo(() => {
    if (!inventoryItems || !newOrderProductType || !newOrderColor || !newOrderSize) {
      return null;
    }
    const itemInInventory = inventoryItems.find(item =>
      item.productType === newOrderProductType &&
      item.color === newOrderColor &&
      item.size === newOrderSize
    );
    return itemInInventory ? itemInInventory.stock : 0;
  }, [inventoryItems, newOrderProductType, newOrderColor, newOrderSize]);

  const getRemainingStock = (order: z.infer<typeof orderSchema>) => {
    if (!inventoryItems) return 'N/A';
    const itemInInventory = inventoryItems.find(item =>
      item.productType === order.productType &&
      item.color === order.color &&
      item.size === order.size
    );
    const stock = itemInInventory ? itemInInventory.stock : 0;
    
    // Sum quantities of the same item already in the order list
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
    const quantity = typeof newOrderQuantity === 'string' ? parseInt(newOrderQuantity, 10) : newOrderQuantity;
    const isProductPatches = newOrderProductType === 'Patches';
    const color = isProductPatches ? 'N/A' : newOrderColor;
    const size = isProductPatches ? 'N/A' : newOrderSize;

    if (newOrderProductType && color && size && quantity > 0) {
      append({
        productType: newOrderProductType,
        color: color,
        size: size,
        quantity: quantity
      });
      toast({
        title: 'Order Added!',
        description: 'The order has been added to the list.',
      });
      setNewOrderProductType('');
      setNewOrderColor('');
      setNewOrderSize('');
      setNewOrderQuantity(1);
    }
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity >= 1) {
      const currentOrder = fields[index];
      update(index, { ...currentOrder, quantity: newQuantity });
    }
  };

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-xl text-black">Create New Lead Entry for Master Tracker</CardTitle>
            <CardDescription className="text-gray-600">Fill in the details below to create a new lead. All fields are required.</CardDescription>
          </div>
          <div className="text-sm text-muted-foreground font-mono whitespace-nowrap pt-1 text-right">
            <div>{dateString} - {dayOfWeek} | <span className="blinking-time">{timeString}</span></div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-12">

              {/* Left Column */}
              <div className="lg:col-span-3 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  
                  <FormField control={form.control} name="customerName" render={({field}) => (
                    <FormItem className="relative">
                      <FormLabel className="flex items-center gap-2 text-black text-xs"><User className="h-4 w-4 text-primary" />Customer Name</FormLabel>
                      <FormControl><Input {...field} autoComplete="off" className="h-9 text-xs w-[2in]" /></FormControl>
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
                      <FormControl><Input {...field} autoComplete="off" className="h-9 text-xs w-[2in]" /></FormControl>
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

                  <FormField control={form.control} name="mobileNo" render={({field}) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-black text-xs"><Phone className="h-4 w-4 text-primary" />Mobile No. (Optional)</FormLabel>
                      <FormControl><Input type="tel" {...field} onChange={(e) => handleMobileNoChange(e, field)} className="h-9 text-xs w-[2in]" /></FormControl>
                       <FormMessage />
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="landlineNo" render={({field}) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-black text-xs"><PhoneForwarded className="h-4 w-4 text-primary" />Landline No. (Optional)</FormLabel>
                      <FormControl><Input type="tel" {...field} onChange={(e) => handleLandlineNoChange(e, field)} className="h-9 text-xs w-[2in]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>

                <div className="border rounded-md p-4 relative mt-4">
                  <p className="absolute -top-3 left-4 bg-white px-2 text-xs font-medium text-gray-600">Location</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
                    <FormField control={form.control} name="houseStreet" render={({field}) => (
                      <FormItem className="relative md:col-span-2">
                        <FormLabel className="flex items-center gap-2 text-black text-xs"><Home className="h-4 w-4 text-primary" />House No., Street & Others</FormLabel>
                        <FormControl><Input {...field} className="h-9 text-xs w-[4in]" /></FormControl>
                        {addressSuggestions.field === 'houseStreet' && addressSuggestions.suggestions.length > 0 && (
                          <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                            <CardContent className="p-2 max-h-40 overflow-y-auto">
                              {addressSuggestions.suggestions.map((suggestion, index) => (
                                <div key={index} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleAddressSuggestionClick('houseStreet', suggestion)}>
                                  {suggestion}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="barangay" render={({field}) => (
                      <FormItem className="relative">
                        <FormLabel className="flex items-center gap-2 text-black text-xs"><MapPin className="h-4 w-4 text-primary" />Barangay</FormLabel>
                        <FormControl><Input {...field} className="h-9 text-xs w-[2in]" /></FormControl>
                         {addressSuggestions.field === 'barangay' && addressSuggestions.suggestions.length > 0 && (
                          <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                            <CardContent className="p-2 max-h-40 overflow-y-auto">
                              {addressSuggestions.suggestions.map((suggestion, index) => (
                                <div key={index} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleAddressSuggestionClick('barangay', suggestion)}>
                                  {suggestion}
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
                        <FormLabel className="flex items-center gap-2 text-black text-xs"><MapPin className="h-4 w-4 text-primary" />City</FormLabel>
                        <FormControl><Input {...field} className="h-9 text-xs w-[2in]" /></FormControl>
                        {addressSuggestions.field === 'city' && addressSuggestions.suggestions.length > 0 && (
                          <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                            <CardContent className="p-2 max-h-40 overflow-y-auto">
                              {addressSuggestions.suggestions.map((suggestion, index) => (
                                <div key={index} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleAddressSuggestionClick('city', suggestion)}>
                                  {suggestion}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="province" render={({field}) => (
                      <FormItem className="relative">
                        <FormLabel className="flex items-center gap-2 text-black text-xs"><MapPin className="h-4 w-4 text-primary" />Province</FormLabel>
                        <FormControl><Input {...field} className="h-9 text-xs w-[2in]" /></FormControl>
                        {addressSuggestions.field === 'province' && addressSuggestions.suggestions.length > 0 && (
                          <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                            <CardContent className="p-2 max-h-40 overflow-y-auto">
                              {addressSuggestions.suggestions.map((suggestion, index) => (
                                <div key={index} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleAddressSuggestionClick('province', suggestion)}>
                                  {suggestion}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <FormField control={form.control} name="salesRepresentative" render={({field}) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-black text-xs"><UserCheck className="h-4 w-4 text-primary" />CSR</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger className={cn("h-9 text-xs w-[2in]", !field.value && 'text-muted-foreground')}><SelectValue placeholder="Select CSR" /></SelectTrigger></FormControl>
                        <SelectContent>{['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'].map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-2 space-y-6">
                 <FormField control={form.control} name="orderType" render={({field}) => (
                    <FormItem className="flex items-center gap-4">
                      <FormLabel className="w-28 flex items-center gap-2 text-black text-xs shrink-0"><ShoppingBag className="h-4 w-4 text-primary" />Order Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger className={cn("h-9 text-xs w-full", !field.value && 'text-muted-foreground')}><SelectValue placeholder="Select Order Type" /></SelectTrigger></FormControl>
                        <SelectContent>{['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'].map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                      </Select>
                       <FormMessage />
                    </FormItem>
                  )}/>
                 <FormField control={form.control} name="priorityType" render={({field}) => (
                    <FormItem className="flex items-center gap-4">
                      <FormLabel className="w-28 flex items-center gap-2 text-black text-xs shrink-0"><AlertTriangle className="h-4 w-4 text-primary" />Priority Type</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4 h-9" disabled={(orderType === 'MTO' || orderType === 'Stock (Jacket Only)')}>
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
                  )}/>
                 <FormField control={form.control} name="courier" render={({field}) => (
                    <FormItem className="flex items-center gap-4">
                      <FormLabel className="w-28 flex items-center gap-2 text-black text-xs shrink-0"><Truck className="h-4 w-4 text-primary" />Courier (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger className={cn("h-9 text-xs w-full", !field.value && 'text-muted-foreground')}><SelectValue placeholder="Select Courier" /></SelectTrigger></FormControl>
                        <SelectContent>{['Lalamove', 'J&T', 'In-house'].map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                      </Select>
                       <FormMessage />
                    </FormItem>
                  )}/>
                 <FormField control={form.control} name="paymentType" render={({field}) => (
                    <FormItem className="flex items-center gap-4">
                      <FormLabel className="w-28 flex items-center gap-2 text-black text-xs shrink-0"><CreditCard className="h-4 w-4 text-primary" />Payment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger className={cn("h-9 text-xs w-full", !field.value && 'text-muted-foreground')}><SelectValue placeholder="Select Payment Type" /></SelectTrigger></FormControl>
                        <SelectContent>{['Partially Paid', 'Fully Paid', 'COD'].map((option) => (<SelectItem key={option} value={option}>{option === 'COD' ? 'COD (Cash on Delivery)' : option}</SelectItem>))}</SelectContent>
                      </Select>
                       <FormMessage />
                    </FormItem>
                  )}/>

                <div>
                  <FormLabel className="text-black">Orders</FormLabel>
                  <div className="space-y-4 mt-2">
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
                                <TableCell className="py-2 text-black text-xs">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateQuantity(index, field.quantity - 1)} disabled={field.quantity <= 1}>
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center">{field.quantity}</span>
                                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateQuantity(index, field.quantity + 1)}>
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
                        <Button type="button" variant="outline" onClick={() => setIsOrderDialogOpen(true)} className="h-9 text-xs">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Order
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
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
                          <div className='grid grid-cols-2 gap-4'>
                            <div className="space-y-2">
                              <FormLabel>Color:</FormLabel>
                              <Select onValueChange={setNewOrderColor} value={newOrderColor} disabled={isPatches}>
                                <SelectTrigger><SelectValue placeholder="Select a Color" /></SelectTrigger>
                                <SelectContent>{availableColors.map((color) => (<SelectItem key={color} value={color}>{color}</SelectItem>))}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <FormLabel>Size:</FormLabel>
                              <Select onValueChange={setNewOrderSize} value={newOrderSize} disabled={isPatches}>
                                <SelectTrigger><SelectValue placeholder="Size" /></SelectTrigger>
                                <SelectContent>{productSizes.map((size) => (<SelectItem key={size} value={size}>{size}</SelectItem>))}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {currentRemainingStock !== null && !isPatches && (
                              <div className="flex items-center gap-2 text-sm">
                                <PackageCheck className="h-4 w-4 text-green-600" />
                                <span>Available Stock:</span>
                                <span className="font-bold">{currentRemainingStock}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 justify-center">
                              <FormLabel>Quantity:</FormLabel>
                              <Button type="button" variant="outline" size="icon" onClick={() => setNewOrderQuantity(q => Math.max(1, (typeof q === 'string' ? parseInt(q, 10) || 1 : q) - 1))} disabled={newOrderQuantity === 1}>
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input type="text" value={newOrderQuantity}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^[1-9][0-9]*$/.test(value)) {setNewOrderQuantity(value === '' ? '' : parseInt(value, 10));}
                                }}
                                onBlur={(e) => {if (e.target.value === '' || parseInt(e.target.value, 10) < 1) {setNewOrderQuantity(1);}}}
                                className="w-16 text-center"
                              />
                              <Button type="button" variant="outline" size="icon" onClick={() => setNewOrderQuantity(q => (typeof q === 'string' ? parseInt(q, 10) || 0 : q) + 1)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
                          <Button type="button" onClick={handleAddOrder} disabled={!newOrderProductType || (!isPatches && (!newOrderColor || !newOrderSize)) || newOrderQuantity === 0}>Add</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <FormField control={form.control} name="orders" render={({ field }) => (<FormItem><FormMessage /></FormItem>)} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 gap-4 col-span-full">
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
