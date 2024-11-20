import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const entrySchema = z.object({
  painLevel: z.number().min(0).max(10),
  date: z.date(),
  notes: z.string(),
});

interface NewEntryFormProps {
  onSuccess?: () => void;
}

export function NewEntryForm({ onSuccess }: NewEntryFormProps) {
  const [sliderValue, setSliderValue] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      painLevel: 5,
      date: new Date(),
      notes: '',
    },
  });

  const date = watch('date');

  const onSubmit = async (data: z.infer<typeof entrySchema>) => {
    try {
      setIsSubmitting(true);
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, 'painEntries'), {
        userId: user.uid,
        painLevel: data.painLevel,
        date: Timestamp.fromDate(data.date),
        notes: data.notes,
        createdAt: Timestamp.fromDate(new Date()),
      });

      // Reset form
      reset({
        painLevel: 5,
        date: new Date(),
        notes: '',
      });
      setSliderValue(5);

      // Show success toast
      toast({
        title: "Entry Added",
        description: "Your pain entry has been successfully recorded.",
      });

      // Immediately invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['painEntries'] });

      // Call success callback
      onSuccess?.();

    } catch (error) {
      console.error('Error adding entry:', error);
      toast({
        title: "Error",
        description: "Failed to add your pain entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label>Pain Level: {sliderValue}</Label>
        <Slider
          min={0}
          max={10}
          step={1}
          value={[sliderValue]}
          onValueChange={(value) => {
            setSliderValue(value[0]);
            setValue('painLevel', value[0]);
          }}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => setValue('date', date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes..."
          {...register('notes')}
        />
        {errors.notes && (
          <p className="text-red-500 text-sm">{errors.notes.message}</p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Save Entry'}
      </Button>
    </form>
  );
}