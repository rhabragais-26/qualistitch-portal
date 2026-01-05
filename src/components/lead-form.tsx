"use client";

import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import * as z from 'zod';

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
  Package,
  Phone,
  ShoppingBag,
  User,
  UserCheck,
} from 'lucide-react';
import {RadioGroup, RadioGroupItem} from './ui/radio-group';

// Define the form schema using Zod
const formSchema = z.object({
  customerName: z.string().min(2, {message: 'Customer name must be at least 2 characters.'}),
  contactNo: z.string().min(10, {message: 'Please enter a valid contact number.'}),
  location: z.string().min(2, {message: 'Location is required.'}),
  paymentType: z.enum(['Partially Paid', 'Fully Paid', 'COD']),
  csr: z.string().min(2, {message: 'CSR name is required.'}),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services']),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
  productType: z.string().min(2, {message: 'Product type is required.'}),
  productSource: z.string().min(2, {message: 'Product source is required.'}),
});

type FormValues = z.infer<typeof formSchema>;

const formFields: {
  name: keyof FormValues;
  label: string;
  icon: React.ElementType;
  placeholder?: string;
  type: 'input' | 'select' | 'radio';
  options?: string[];
}[] = [
  {name: 'customerName', label: 'Customer/Company Name', icon: User, placeholder: '', type: 'input'},
  {name: 'contactNo', label: 'Contact No.', icon: Phone, placeholder: '', type: 'input'},
  {name: 'location', label: 'Location', icon: MapPin, placeholder: '', type: 'input'},
  {name: 'paymentType', label: 'Payment Type', icon: CreditCard, type: 'select', options: ['Partially Paid', 'Fully Paid', 'COD']},
  {name: 'csr', label: 'CSR', icon: UserCheck, placeholder: '', type: 'input'},
  {name: 'orderType', label: 'Order Type', icon: ShoppingBag, type: 'select', options: ['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services']},
  {name: 'priorityType', label: 'Priority Type', icon: AlertTriangle, type: 'radio', options: ['Rush', 'Regular']},
  {name: 'productType', label: 'Product Type', icon: Package, placeholder: '', type: 'input'},
  {name: 'productSource', label: 'Product Source', icon: Building, placeholder: '', type: 'input'},
];

export function LeadForm() {
  const {toast} = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      contactNo: '',
      location: '',
      csr: '',
      orderType: 'MTO',
      priorityType: 'Regular',
      productType: '',
      productSource: '',
    },
  });

  function onSubmit(values: FormValues) {
    // In a real app, you'd send this data to a server.
    console.log(values);

    toast({
      title: 'Lead Submitted!',
      description: 'The new lead for ' + values.customerName + ' has been successfully recorded.',
    });

    form.reset();
  }

  return (
    <Card className="w-full max-w-4xl shadow-xl animate-in fade-in-50 duration-500">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">New Lead Entry</CardTitle>
        <CardDescription>Fill in the details below to create a new lead. All fields are required.</CardDescription>
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
                          <Input placeholder={fieldInfo.placeholder} {...field} />
                        </FormControl>
                      ) : fieldInfo.type === 'select' ? (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={`Select a ${fieldInfo.label.toLowerCase()}`} />
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
                            defaultValue={field.value}
                            className="flex items-center space-x-4 pt-2 pl-8"
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

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" className="shadow-md transition-transform active:scale-95">
                Submit Lead
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
