"use client";

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, useFieldArray} from 'react-hook-form';
import * as z from 'zod';
import {useState, useEffect} from 'react';

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
import { useFirestore } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  contactNo: z.string().regex(/^\d{4}-\d{3}-\d{4}$/, {message: 'Contact number must be in 0000-000-0000 format.'}),
  landlineNo: z.string().regex(/^\d{2}-\d{4}-\d{4}$/, {message: 'Landline number must be in 00-0000-0000 format.'}).optional().or(z.literal('')),
  location: z.string().min(2, {message: 'Location is required.'}),
  paymentType: z.enum(['Partially Paid', 'Fully Paid', 'COD'], {required_error: "You need to select a payment type."}),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], {required_error: "You need to select an order type."}),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
  salesRepresentative: z.enum(['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'], {required_error: "You need to select a CSR."}),
  orders: z.array(orderSchema).min(1, "Please add at least one order."),
});

type FormValues = z.infer<typeof formSchema>;

const formFields: {
  name: keyof Omit<FormValues, 'orders'>;
  label: string;
  icon: React.ElementType;
  type: 'input' | 'tel' | 'select' | 'radio';
  options?: string[];
  placeholder?: string;
  className?: string;
}[] = [
  {name: 'customerName', label: 'Customer Name', icon: User, type: 'input'},
  {name: 'companyName', label: 'Company Name (Optional)', icon: Building, type: 'input'},
  {name: 'contactNo', label: 'Contact No.', icon: Phone, type: 'tel'},
  {name: 'landlineNo', label: 'Landline No. (Optional)', icon: PhoneForwarded, type: 'tel'},
  {name: 'location', label: 'Location', icon: MapPin, type: 'input'},
  {name: 'paymentType', label: 'Payment Type', icon: CreditCard, type: 'select', options: ['Partially Paid', 'Fully Paid', 'COD'], placeholder: "Select Payment Type"},
  {name: 'orderType', label: 'Order Type', icon: ShoppingBag, type: 'select', options: ['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], placeholder: 'Select Order Type'},
  {name: 'salesRepresentative', label: 'CSR', icon: UserCheck, type: 'select', options: ['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'], placeholder: 'Select CSR'},
  {name: 'priorityType', label: 'Priority Type', icon: AlertTriangle, type: 'radio', options: ['Rush', 'Regular'], className: "md:justify-center"},
];

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

const productColors = [
  'Black',
  'Brown',
  'Dark Khaki',
  'Light Khaki',
  'Olive Green',
  'Navy Blue',
  'Light Gray',
  'Dark Gray',
  'Khaki',
  'Black/Khaki',
  'Black/Navy Blue',
  'Army Green',
  'Polo Color',
]

const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

type LeadFormProps = {
  onDirtyChange: (isDirty: boolean) => void;
};

export function LeadForm({ onDirtyChange }: LeadFormProps) {
  const {toast} = useToast();
  const [dateTime, setDateTime] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [newOrderProductType, setNewOrderProductType] = useState('');
  const [newOrderColor, setNewOrderColor] = useState('');
  const [newOrderSize, setNewOrderSize] = useState('');
  const [newOrderQuantity, setNewOrderQuantity] = useState<number | string>(1);
  const firestore = useFirestore();


  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      setDayOfWeek(days[now.getDay()]);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[now.getMonth()];
      const day = String(now.getDate()).padStart(2, '0');
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      setDateTime(`${month}-${day}-${year} ${strTime}`);
    };
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      companyName: '',
      contactNo: '',
      landlineNo: '',
      location: '',
      paymentType: undefined,
      orderType: undefined,
      priorityType: 'Regular',
      salesRepresentative: undefined,
      orders: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "orders"
  });

  const { isDirty } = form.formState;

  const orderType = form.watch('orderType');

  useEffect(() => {
    if (orderType === 'MTO' || orderType === 'Stock (Jacket Only)') {
      form.setValue('priorityType', 'Rush');
    }
  }, [orderType, form.setValue]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const isPatches = newOrderProductType === 'Patches';

  useEffect(() => {
    if (isPatches) {
      setNewOrderColor('N/A');
      setNewOrderSize('N/A');
    } else {
      setNewOrderColor('');
      setNewOrderSize('');
    }
  }, [isPatches]);

  const handleReset = () => {
    form.reset({
      customerName: '',
      companyName: '',
      contactNo: '',
      landlineNo: '',
      location: '',
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

  const handleContactNoChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
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
    const leadId = uuidv4();
    const leadsRef = collection(firestore, 'leads');
    const leadDocRef = doc(leadsRef, leadId);
    const now = new Date().toISOString();

    const submissionData = {
      id: leadId,
      customerName: toTitleCase(values.customerName),
      companyName: values.companyName ? toTitleCase(values.companyName) : '-',
      contactNumber: values.contactNo,
      landlineNumber: values.landlineNo || '-',
      location: toTitleCase(values.location),
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
    <Card className="w-full max-w-4xl shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-xl text-card-foreground">Create New Lead Entry for Master Tracker</CardTitle>
            <CardDescription>Fill in the details below to create a new lead. All fields are required.</CardDescription>
          </div>
          <div className="text-sm text-muted-foreground font-mono whitespace-nowrap pt-1 text-right">
            <div>{dateTime}</div>
            <div>{dayOfWeek}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {formFields.map((fieldInfo) => (
                <FormField
                  key={fieldInfo.name}
                  control={form.control}
                  name={fieldInfo.name}
                  render={({field}) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-card-foreground">
                        <fieldInfo.icon className="h-4 w-4 text-primary" />
                        {fieldInfo.label}
                      </FormLabel>
                      {fieldInfo.type === 'input' || fieldInfo.type === 'tel' ? (
                        <FormControl>
                          <Input
                            type={fieldInfo.type}
                            {...field}
                            onChange={(e) => {
                              if (fieldInfo.name === 'contactNo') {
                                handleContactNoChange(e, field);
                              } else if (fieldInfo.name === 'landlineNo') {
                                handleLandlineNoChange(e, field);
                              } else {
                                field.onChange(e);
                              }
                            }}
                          />
                        </FormControl>
                      ) : fieldInfo.type === 'select' ? (
                         <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className={cn(!field.value && 'text-muted-foreground')}>
                              <SelectValue placeholder={fieldInfo.placeholder || `Select a ${fieldInfo.label.toLowerCase()}`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fieldInfo.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option === 'COD' ? 'COD (Cash on Delivery)' : option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className={cn("flex items-center space-x-4 pt-2", fieldInfo.className)}
                            disabled={fieldInfo.name === 'priorityType' && (orderType === 'MTO' || orderType === 'Stock (Jacket Only)')}
                          >
                            {fieldInfo.options?.map((option) => (
                              <FormItem key={option} className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value={option} />
                                </FormControl>
                                <FormLabel className="font-normal text-card-foreground">{option}</FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <Separator />
            
            <div>
              <FormLabel className="text-card-foreground">Orders</FormLabel>
              <div className="space-y-4 mt-2">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2 text-card-foreground">Product Type</TableHead>
                        <TableHead className="py-2 text-card-foreground">Color</TableHead>
                        <TableHead className="py-2 text-card-foreground">Size</TableHead>
                        <TableHead className="py-2 text-card-foreground text-center">Quantity</TableHead>
                        <TableHead className="text-right py-2 text-card-foreground">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="py-2 text-card-foreground">{field.productType}</TableCell>
                          <TableCell className="py-2 text-card-foreground">{field.color}</TableCell>
                          <TableCell className="py-2 text-card-foreground">{field.size}</TableCell>
                          <TableCell className="py-2 text-card-foreground">
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
                          <TableCell className="text-right py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="text-destructive hover:text-destructive h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                 <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOrderDialogOpen(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Order Details</DialogTitle>
                      <DialogDescription>
                        Select product details to add
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <FormLabel>Product Type:</FormLabel>
                        <Select onValueChange={setNewOrderProductType} value={newOrderProductType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a Product Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {productTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className="space-y-2">
                          <FormLabel>Color:</FormLabel>
                          <Select onValueChange={setNewOrderColor} value={newOrderColor} disabled={isPatches}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a Color" />
                            </SelectTrigger>
                            <SelectContent>
                              {productColors.map((color) => (
                                <SelectItem key={color} value={color}>
                                  {color}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <FormLabel>Size:</FormLabel>
                          <Select onValueChange={setNewOrderSize} value={newOrderSize} disabled={isPatches}>
                            <SelectTrigger>
                              <SelectValue placeholder="Size" />
                            </SelectTrigger>
                            <SelectContent>
                              {productSizes.map((size) => (
                                <SelectItem key={size} value={size}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                       <div className="flex items-center gap-2 justify-center">
                        <FormLabel>Quantity:</FormLabel>
                        <Button type="button" variant="outline" size="icon" onClick={() => setNewOrderQuantity(q => Math.max(1, (typeof q === 'string' ? parseInt(q, 10) || 1 : q) - 1))} disabled={newOrderQuantity === 1}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="text"
                          value={newOrderQuantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^[1-9][0-9]*$/.test(value)) {
                                setNewOrderQuantity(value === '' ? '' : parseInt(value, 10));
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '' || parseInt(e.target.value, 10) < 1) {
                              setNewOrderQuantity(1);
                            }
                          }}
                          className="w-16 text-center"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => setNewOrderQuantity(q => (typeof q === 'string' ? parseInt(q, 10) || 0 : q) + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Close
                        </Button>
                      </DialogClose>
                      <Button type="button" onClick={handleAddOrder} disabled={!newOrderProductType || (!isPatches && (!newOrderColor || !newOrderSize)) || newOrderQuantity === 0}>
                        Add
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <FormField
                control={form.control}
                name="orders"
                render={({ field }) => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" size="lg">
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will clear all the fields in the form.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit" size="lg" className="shadow-md transition-transform active:scale-95">
                Submit
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
