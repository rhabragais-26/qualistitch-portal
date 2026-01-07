'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState, useRef } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TriangleAlert, Upload, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useFirestore } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const formSchema = z.object({
  caseType: z.enum(['Return to Sender (RTS)', 'Quality Errors', 'Replacement'], {
    required_error: 'You need to select a case type.',
  }),
  remarks: z.string().min(10, { message: 'Remarks must be at least 10 characters.' }),
  image: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function OperationalCasesForm() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      caseType: undefined,
      remarks: '',
      image: '',
    },
  });
  
  const { control, handleSubmit, reset, setValue } = form;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setValue('image', result, { shouldValidate: true });
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue('image', '', { shouldValidate: true });
    setImagePreview(null);
    if(imageUploadRef.current) {
        imageUploadRef.current.value = '';
    }
  };

  function onSubmit(values: FormValues) {
    if (!firestore) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Firestore is not available. Please try again later.'
        });
        return;
    }
    const caseId = uuidv4();
    const operationalCasesRef = collection(firestore, 'operationalCases');
    const caseDocRef = doc(operationalCasesRef, caseId);
    
    const submissionData = {
        id: caseId,
        ...values,
        submissionDateTime: new Date().toISOString(),
    };

    setDocumentNonBlocking(caseDocRef, submissionData, { merge: false });
    
    toast({
      title: 'Case Recorded!',
      description: `The ${values.caseType} case has been successfully recorded.`,
    });
    
    reset();
    setImagePreview(null);
    if(imageUploadRef.current) {
        imageUploadRef.current.value = '';
    }
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-black">Record Operational Case</CardTitle>
        <CardDescription className="text-gray-600">
          Document issues like RTS, quality errors, or replacements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={control}
              name="caseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-black">
                    <TriangleAlert className="h-4 w-4 text-primary" /> Case Type
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Case Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Return to Sender (RTS)">Return to Sender (RTS)</SelectItem>
                      <SelectItem value="Quality Errors">Quality Errors</SelectItem>
                      <SelectItem value="Replacement">Replacement</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Remarks/Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain the reason for this case in detail..."
                      className="resize-y min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
                control={control}
                name="image"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-black">Upload Image (Optional)</FormLabel>
                        <FormControl>
                             <div 
                                className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center cursor-pointer"
                                onClick={() => imageUploadRef.current?.click()}
                              >
                                {imagePreview ? (
                                  <>
                                    <Image src={imagePreview} alt="Image preview" width={200} height={200} className="mx-auto max-h-[200px] w-auto rounded-md" />
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={handleRemoveImage}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <div className="text-gray-500">
                                    <Upload className="mx-auto h-12 w-12" />
                                    <p>Click to upload an image</p>
                                  </div>
                                )}
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  ref={imageUploadRef} 
                                  onChange={handleImageUpload}
                                  className="hidden" 
                                />
                              </div>
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                )}
            />


            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" size="lg" onClick={() => {
                reset();
                setImagePreview(null);
                if(imageUploadRef.current) imageUploadRef.current.value = '';
              }}>
                Reset
              </Button>
              <Button type="submit" size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold">
                Save Case
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
