'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFirestore, useUser, setDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

// --- Form Schema and Type ---
const formSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  smallTicketInquiries: z.coerce.number().min(0, "Cannot be negative."),
  mediumTicketInquiries: z.coerce.number().min(0, "Cannot be negative."),
  largeTicketInquiries: z.coerce.number().min(0, "Cannot be negative."),
  xlTicketInquiries: z.coerce.number().min(0, "Cannot be negative."),
});

type FormValues = z.infer<typeof formSchema>;

// --- Inquiry Data Type ---
type CampaignInquiry = {
    id: string;
    date: string;
    smallTicketInquiries: number;
    mediumTicketInquiries: number;
    largeTicketInquiries: number;
    xlTicketInquiries: number;
    submittedBy: string;
    timestamp: string;
};

// --- Form Component ---
function CampaignInquiryForm() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      smallTicketInquiries: 0,
      mediumTicketInquiries: 0,
      largeTicketInquiries: 0,
      xlTicketInquiries: 0,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!firestore || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit inquiries.' });
        return;
    }

    const docId = `${format(values.date, 'yyyy-MM-dd')}_${userProfile.nickname}`;
    const inquiryRef = doc(firestore, 'campaign_inquiries', docId);

    const data = {
        id: docId,
        date: values.date.toISOString(),
        smallTicketInquiries: values.smallTicketInquiries,
        mediumTicketInquiries: values.mediumTicketInquiries,
        largeTicketInquiries: values.largeTicketInquiries,
        xlTicketInquiries: values.xlTicketInquiries,
        submittedBy: userProfile.nickname,
        timestamp: new Date().toISOString(),
    };
    
    setDocumentNonBlocking(inquiryRef, data, { merge: true });

    toast({
        title: 'Success!',
        description: `Inquiries for ${format(values.date, 'PPP')} have been saved.`,
    });
    
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Daily Ad Inquiries</CardTitle>
        <CardDescription>Enter the number of inquiries received for each ad ticket size per day.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="smallTicketInquiries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Small Ticket Inquiries (1-10 pcs)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mediumTicketInquiries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medium Ticket Inquiries (11-50 pcs)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="largeTicketInquiries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Large Ticket Inquiries (51-300 pcs)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="xlTicketInquiries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>XL Ticket Inquiries (301+ pcs)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">Save Inquiries</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// --- Table Component ---
function CampaignInquiriesTable() {
  const firestore = useFirestore();
  const inquiriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'campaign_inquiries'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: inquiries, isLoading, error } = useCollection<CampaignInquiry>(inquiriesQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Inquiry Logs</CardTitle>
        <CardDescription>A log of recently submitted daily inquiries.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead className="text-right">Small</TableHead>
                <TableHead className="text-right">Medium</TableHead>
                <TableHead className="text-right">Large</TableHead>
                <TableHead className="text-right">XL</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive">
                    Error loading data: {error.message}
                  </TableCell>
                </TableRow>
              ) : inquiries && inquiries.length > 0 ? (
                inquiries.map(inquiry => {
                    const total = inquiry.smallTicketInquiries + inquiry.mediumTicketInquiries + inquiry.largeTicketInquiries + inquiry.xlTicketInquiries;
                    return (
                        <TableRow key={inquiry.id}>
                            <TableCell>{format(new Date(inquiry.date), 'PPP')}</TableCell>
                            <TableCell>{inquiry.submittedBy}</TableCell>
                            <TableCell className="text-right">{inquiry.smallTicketInquiries}</TableCell>
                            <TableCell className="text-right">{inquiry.mediumTicketInquiries}</TableCell>
                            <TableCell className="text-right">{inquiry.largeTicketInquiries}</TableCell>
                            <TableCell className="text-right">{inquiry.xlTicketInquiries}</TableCell>
                            <TableCell className="text-right font-bold">{total}</TableCell>
                        </TableRow>
                    )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No inquiry data has been logged yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


// --- Main Page Component ---
export default function CampaignsPage() {
  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
            <div className="xl:col-span-2">
                <CampaignInquiryForm />
            </div>
            <div className="xl:col-span-3">
                <CampaignInquiriesTable />
            </div>
        </div>
      </main>
    </Header>
  );
}
