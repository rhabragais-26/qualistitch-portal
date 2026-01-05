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
  Minus
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
  contactNo: z.string().min(10, {message: 'Please enter a valid contact number.'}).regex(/^[0-9]+$/, {message: "Contact number must be in numerical format."}),
  location: z.string().min(2, {message: 'Location is required.'}),
  paymentType: z.enum(['Partially Paid', 'Fully Paid', 'COD'], {required_error: "You need to select a payment type."}),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], {required_error: "You need to select an order type."}),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
  productSource: z.enum(['Client Provided', 'Stock'], {required_error: "You need to select a product source."}),
  csr: z.enum(['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'], {required_error: "You need to select a CSR."}),
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
  {name: 'location', label: 'Location', icon: MapPin, type: 'input'},
  {name: 'paymentType', label: 'Payment Type', icon: CreditCard, type: 'select', options: ['Partially Paid', 'Fully Paid', 'COD'], placeholder: "Select Payment Type"},
  {name: 'orderType', label: 'Order Type', icon: ShoppingBag, type: 'select', options: ['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], placeholder: 'Select Order Type'},
  {name: 'csr', label: 'CSR', icon: UserCheck, type: 'select', options: ['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'], placeholder: 'Select CSR'},
  {name: 'priorityType', label: 'Priority Type', icon: AlertTriangle, type: 'radio', options: ['Rush', 'Regular'], className: "md:justify-center"},
  {name: 'productSource', label: 'Product Source', icon: Building, type: 'radio', options: ['Client Provided', 'Stock'], className: "md:justify-center"},
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

export function LeadForm() {
  const {toast} = useToast();
  const [dateTime, setDateTime] = useState('');
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [newOrderProductType, setNewOrderProductType] = useState('');
  const [newOrderColor, setNewOrderColor] = useState('');
  const [newOrderSize, setNewOrderSize] = useState('');
  const [newOrderQuantity, setNewOrderQuantity] = useState<number | string>(0);
  const firestore = useFirestore();


  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setDateTime(now.toLocaleString());
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
      location: '',
      paymentType: undefined,
      orderType: undefined,
      priorityType: 'Regular',
      productSource: 'Stock',
      csr: undefined,
      orders: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orders"
  });

  const handleReset = () => {
    form.reset({
      customerName: '',
      companyName: '',
      contactNo: '',
      location: '',
      paymentType: undefined,
      orderType: undefined,
      priorityType: 'Regular',
      productSource: 'Stock',
      csr: undefined,
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

  function onSubmit(values: FormValues) {
    const leadId = uuidv4();
    const leadsRef = collection(firestore, 'leads');
    const leadDocRef = doc(leadsRef, leadId);

    const submissionData = {
      id: leadId,
      customerName: toTitleCase(values.customerName),
      companyName: toTitleCase(values.companyName || ''),
      contactNumber: values.contactNo,
      location: toTitleCase(values.location),
      paymentType: values.paymentType,
      csr: values.csr,
      orderType: values.orderType,
      priorityType: values.priorityType,
      productType: values.orders.map(o => o.productType).join(', '),
      productSource: values.productSource,
      orders: values.orders,
      submissionDateTime: new Date().toISOString(),
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
    if (newOrderProductType && newOrderColor && newOrderSize && quantity > 0) {
      append({
        productType: newOrderProductType,
        color: newOrderColor,
        size: newOrderSize,
        quantity: quantity
      });
      toast({
        title: 'Order Added!',
        description: 'The order has been added to the list.',
      });
      setNewOrderProductType('');
      setNewOrderColor('');
      setNewOrderSize('');
      setNewOrderQuantity(0);
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
          <div className="text-sm text-muted-foreground font-mono whitespace-nowrap pt-1">
            {dateTime}
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
                          <Input type={fieldInfo.type} {...field} />
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
                        <TableHead className="py-2 text-card-foreground">Quantity</TableHead>
                        <TableHead className="text-right py-2 text-card-foreground">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="py-2 text-card-foreground">{form.getValues(`orders.${index}.productType`)}</TableCell>
                          <TableCell className="py-2 text-card-foreground">{form.getValues(`orders.${index}.color`)}</TableCell>
                          <TableCell className="py-2 text-card-foreground">{form.getValues(`orders.${index}.size`)}</TableCell>
                          <TableCell className="py-2 text-card-foreground">{form.getValues(`orders.${index}.quantity`)}</TableCell>
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
                        <div className="flex items-center gap-2">
                          <FormLabel className='text-sm'>Color:</FormLabel>
                          <Select onValueChange={setNewOrderColor} value={newOrderColor}>
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
                        <RadioGroup onValueChange={setNewOrderSize} value={newOrderSize} className="flex items-center space-x-2">
                          <FormLabel className='text-sm'>Size:</FormLabel>
                          <Select onValueChange={setNewOrderSize} value={newOrderSize}>
                            <SelectTrigger className="w-[100px]">
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
                        </RadioGroup>
                      </div>
                       <div className="flex items-center gap-2 justify-center">
                        <FormLabel>Quantity:</FormLabel>
                        <Button type="button" variant="outline" size="icon" onClick={() => setNewOrderQuantity(q => Math.max(0, (typeof q === 'string' ? parseInt(q, 10) || 0 : q) - 1))} disabled={newOrderQuantity === 0}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="text"
                          value={newOrderQuantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^[0-9\b]+$/.test(value)) {
                              setNewOrderQuantity(value === '' ? '' : parseInt(value, 10));
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              setNewOrderQuantity(0);
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
                      <Button type="button" onClick={handleAddOrder} disabled={!newOrderProductType || !newOrderColor || !newOrderSize || newOrderQuantity === 0}>
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
