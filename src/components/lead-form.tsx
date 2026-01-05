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
  PlusCircle
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
import { Separator } from './ui/separator';

// Define the form schema using Zod
const formSchema = z.object({
  customerName: z.string().min(2, {message: 'Customer name must be at least 2 characters.'}),
  contactNo: z.string().min(10, {message: 'Please enter a valid contact number.'}),
  location: z.string().min(2, {message: 'Location is required.'}),
  paymentType: z.enum(['Partially Paid', 'Fully Paid', 'COD'], {required_error: "You need to select a payment type."}),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], {required_error: "You need to select an order type."}),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
  productSource: z.enum(['Client Provided', 'Stock'], {required_error: "You need to select a product source."}),
  csr: z.enum(['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'], {required_error: "You need to select a CSR."}),
  orders: z.array(z.object({ value: z.string().min(1, "Order cannot be empty.") })).optional()
});

type FormValues = z.infer<typeof formSchema>;

const formFields: {
  name: keyof Omit<FormValues, 'orders'>;
  label: string;
  icon: React.ElementType;
  type: 'input' | 'select' | 'radio';
  options?: string[];
  placeholder?: string;
  className?: string;
}[] = [
  {name: 'customerName', label: 'Customer/Company Name', icon: User, type: 'input'},
  {name: 'contactNo', label: 'Contact No.', icon: Phone, type: 'input'},
  {name: 'location', label: 'Location', icon: MapPin, type: 'input'},
  {name: 'paymentType', label: 'Payment Type', icon: CreditCard, type: 'select', options: ['Partially Paid', 'Fully Paid', 'COD'], placeholder: "Select Payment Type"},
  {name: 'orderType', label: 'Order Type', icon: ShoppingBag, type: 'select', options: ['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'], placeholder: 'Select Order Type'},
  {name: 'csr', label: 'CSR', icon: UserCheck, type: 'select', options: ['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'], placeholder: 'Select CSR'},
  {name: 'priorityType', label: 'Priority Type', icon: AlertTriangle, type: 'radio', options: ['Rush', 'Regular'], className: "md:justify-center"},
  {name: 'productSource', label: 'Product Source', icon: Building, type: 'radio', options: ['Client Provided', 'Stock'], className: "md:justify-center"},
];

export function LeadForm() {
  const {toast} = useToast();
  const [dateTime, setDateTime] = useState('');

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

  function onSubmit(values: FormValues) {
    const submissionData = {
      ...values,
      submissionDateTime: new Date().toLocaleString(),
    };
    // In a real app, you'd send this data to a server.
    console.log(submissionData);

    toast({
      title: 'Lead Submitted!',
      description: 'The new lead for ' + values.customerName + ' has been successfully recorded.',
    });

    handleReset();
  }

  return (
    <Card className="w-full max-w-4xl shadow-xl animate-in fade-in-50 duration-500">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-3xl">Create New Lead Entry for Master Tracker</CardTitle>
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
                      <FormLabel className="flex items-center gap-2">
                        <fieldInfo.icon className="h-4 w-4 text-primary" />
                        {fieldInfo.label}
                      </FormLabel>
                      {fieldInfo.type === 'input' ? (
                        <FormControl>
                          <Input {...field} />
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
                                <FormLabel className="font-normal">{option}</FormLabel>
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
              <FormLabel>Orders</FormLabel>
              <div className="space-y-4 mt-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`orders.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder={`Order #${index + 1}`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                 <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ value: "" })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Order
                  </Button>
              </div>
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
