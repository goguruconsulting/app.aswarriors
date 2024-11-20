import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { PainChart } from './PainChart';
import type { PainEntry } from '@/lib/types';

const defaultDateRange = {
  from: new Date(new Date().setDate(new Date().getDate() - 30)),
  to: new Date(),
};

export function PainEntriesTable() {
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const { toast } = useToast();

  const { data: entries = [], isLoading, error, refetch } = useQuery({
    queryKey: ['painEntries'],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];

      const q = query(
        collection(db, 'painEntries'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        userId: doc.data().userId,
        painLevel: doc.data().painLevel,
        notes: doc.data().notes,
        date: doc.data().date instanceof Timestamp ? doc.data().date.toDate() : new Date(doc.data().date),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      })) as PainEntry[];
    },
    staleTime: 0, // Consider data immediately stale
    cacheTime: 0, // Don't cache the data
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const filteredEntries = useMemo(() => {
    if (!entries || !dateRange?.from || !dateRange?.to) return [];
    return entries.filter(
      entry => entry.date >= dateRange.from && entry.date <= dateRange.to
    ).sort((a, b) => b.date.getTime() - a.date.getTime()); // Ensure newest entries appear first
  }, [entries, dateRange]);

  const handleDelete = async (entryId: string) => {
    try {
      await deleteDoc(doc(db, 'painEntries', entryId));
      refetch();
      toast({
        title: "Entry Deleted",
        description: "The pain entry has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete the entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading entries. Please try again later.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PainChart 
        entries={entries}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Pain History</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No pain entries found. Add your first entry using the button above.
            </p>
          ) : filteredEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No entries found for the selected date range.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Pain Level</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(entry.date, 'PPP')}</TableCell>
                    <TableCell>{entry.painLevel}</TableCell>
                    <TableCell className="max-w-md truncate">{entry.notes}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this pain entry? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(entry.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}